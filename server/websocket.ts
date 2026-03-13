import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './lib/logger.ts';
import type { StockQuote } from './services/market-data/types.ts';
import { marketDataService } from './services/market-data/market-data.service.ts';

const PING_INTERVAL = 30000;
/** ثوانٍ ينتظر السيرفر فيها رسالة AUTH بعد الاتصال قبل ما يغلق الـ connection */
const AUTH_TIMEOUT_MS = 10_000;
/** Initial prices fetch timeout */
const INITIAL_PRICES_TIMEOUT_MS = 5_000;
const MAX_CONNECTIONS_PER_IP = 5;

export function setupWebSocket(server: Server): {
  broadcastPrices: (quotes: Map<string, StockQuote>) => void;
  getClientCount: () => number;
  closeWss: () => void;
} {
  const allowedOrigins = [
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  const wss = new WebSocketServer({
    server,
    verifyClient: ({ origin }, callback) => {
      // In dev allow all origins; in prod enforce allowlist
      if (process.env.NODE_ENV !== 'production') {
        callback(true);
        return;
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(true);
      } else {
        logger.warn('WebSocket rejected — unknown origin', { origin });
        callback(false, 403, 'Forbidden');
      }
    },
  });
  logger.info('✅ WebSocket Server initialized');

  /** Per-IP connection tracking */
  const connectionsByIp = new Map<string, number>();

  /** يُستدعى من startPolling — يبث لكل عميل فقط الأسعار الخاصة بالـ tickers المشترك فيها */
  function broadcastPrices(quotes: Map<string, StockQuote>) {
    if (wss.clients.size === 0) return;
    const allData = Array.from(quotes.values()).map((q) => ({
      ticker: q.symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: q.volume,
    }));
    if (allData.length === 0) return;
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const ext = client as ExtendedWs;
      const subs = ext.subscribedTickers;
      const data =
        subs && subs.size > 0
          ? allData.filter((row) => subs.has(row.ticker))
          : allData;
      if (data.length > 0) {
        safeSend(client, { type: 'PRICES_UPDATE' as const, data });
        count++;
      }
    });
    if (count > 0) logger.info(`📡 Prices broadcast to ${count} clients`);
  }

  // Ping كل 30 ثانية للتأكد إن الـ clients لسه متصلين
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as WebSocket & { isAlive?: boolean };
      if (extWs.isAlive === false) {
        logger.info('🔌 Terminating dead WebSocket connection');
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, PING_INTERVAL);

  wss.on('close', () => clearInterval(pingInterval));

  /** Per-client subscribed tickers; empty Set = receive all (backward compat) */
  type ExtendedWs = WebSocket & {
    isAlive?: boolean;
    userId?: string;
    authenticated?: boolean;
    subscribedTickers?: Set<string>;
  };

  wss.on('connection', async (ws, req) => {
    const extWs = ws as ExtendedWs;
    const clientIp = req.socket.remoteAddress ?? 'unknown';

    // ── Per-IP Rate Limiting ────────────────────────────────
    const ipCount = (connectionsByIp.get(clientIp) ?? 0) + 1;
    if (ipCount > MAX_CONNECTIONS_PER_IP) {
      ws.close(1008, 'Too many connections');
      return;
    }
    connectionsByIp.set(clientIp, ipCount);
    ws.on('close', () => {
      const remaining = (connectionsByIp.get(clientIp) ?? 1) - 1;
      if (remaining <= 0) connectionsByIp.delete(clientIp);
      else connectionsByIp.set(clientIp, remaining);
      logger.info('🔌 Client disconnected', { remaining: wss.clients.size });
    });
    // ── End Rate Limiting ────────────────────────────────────

    extWs.isAlive = true;
    extWs.authenticated = false;

    // Pong handler
    extWs.on('pong', () => { extWs.isAlive = true; });

    // ── Auth: expect { type: 'AUTH', token: '...' } as first message ──
    const authTimeout = setTimeout(() => {
      if (!extWs.authenticated) {
        ws.close(1008, 'Authentication timeout');
      }
    }, AUTH_TIMEOUT_MS);

    extWs.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; token?: string; tickers?: string[] };

        if (!extWs.authenticated) {
          if (msg.type !== 'AUTH' || !msg.token) {
            ws.close(1008, 'Authentication required');
            return;
          }
          const { verifyAccessToken } = await import('../src/lib/auth.ts');
          const payload = verifyAccessToken(msg.token) as { sub?: string };
          if (!payload?.sub) throw new Error('Invalid token');
          clearTimeout(authTimeout);
          extWs.userId = payload.sub;
          extWs.authenticated = true;
          extWs.subscribedTickers = new Set<string>();
          logger.info('🔌 New client authenticated', { total: wss.clients.size });
          try {
            const initialData = await Promise.race([
              fetchCurrentPrices(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), INITIAL_PRICES_TIMEOUT_MS)
              ),
            ]);
            if (initialData.length > 0) {
              safeSend(ws, { type: 'INITIAL_PRICES', data: initialData });
            }
          } catch (err) {
            logger.error('Failed to send initial prices', { error: err });
          }
          return;
        }

        if (msg.type === 'SUBSCRIBE' && Array.isArray(msg.tickers)) {
          extWs.subscribedTickers = new Set(
            msg.tickers.filter((t): t is string => typeof t === 'string' && t.length > 0)
          );
        }
      } catch {
        if (!extWs.authenticated) ws.close(1008, 'Invalid or expired token');
      }
    });
    // ── End Auth / SUBSCRIBE ─────────────────────────────────

    ws.on('error', (err) => {
      logger.error('WebSocket client error', { message: err.message });
    });
  });

  return {
    broadcastPrices,
    getClientCount: () => wss.clients.size,
    closeWss: () => {
      clearInterval(pingInterval);
      wss.close();
    },
  };
}

// Safe send — مش بيكسر لو الـ connection اتقطع
function safeSend(ws: WebSocket, data: unknown) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    logger.error('Failed to send WebSocket message', { error: err });
  }
}

/** يُستخدم فقط لإرسال الأسعار الأولية لـ client متصل حديثاً — يقرأ من الـ cache فقط بدون Yahoo fetch */
async function fetchCurrentPrices(): Promise<Array<{ ticker: string; price: number; change: number; changePercent: number; volume: number }>> {
  try {
    const { EGX_TICKERS } = await import('./lib/egxTickers.ts');
    const quotes = await marketDataService.getCachedQuotes([...EGX_TICKERS]);
    return Array.from(quotes.values()).map((q) => ({
      ticker: q.symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: q.volume,
    }));
  } catch (error) {
    logger.error('Market data fetch error', { error });
    return [];
  }
}
