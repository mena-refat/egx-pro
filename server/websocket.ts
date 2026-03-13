import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EGX_TICKERS } from './lib/egxTickers.ts';
import { logger } from './lib/logger.ts';
import type { StockQuote } from './services/market-data/types.ts';
import { marketDataService } from './services/market-data/market-data.service.ts';

const PING_INTERVAL = 30000;

export function setupWebSocket(server: Server): { broadcastPrices: (quotes: Map<string, StockQuote>) => void } {
  const wss = new WebSocketServer({ server });
  logger.info('✅ WebSocket Server initialized');

  /** يُستدعى من startPolling بعد كل دورة جلب — يبث للـ clients التنسيق الذي يتوقعه الـ frontend */
  function broadcastPrices(quotes: Map<string, StockQuote>) {
    if (wss.clients.size === 0) return;
    const data = Array.from(quotes.values()).map((q) => ({
      ticker: q.symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: q.volume,
    }));
    if (data.length === 0) return;
    const payload = { type: 'PRICES_UPDATE' as const, data };
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        safeSend(client, payload);
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

  wss.on('connection', async (ws, req) => {
    const extWs = ws as WebSocket & { isAlive?: boolean; userId?: string };

    // ── Auth Check ──────────────────────────────────────────
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const { verifyAccessToken } = await import('../src/lib/auth.ts');
      const payload = verifyAccessToken(token) as { sub?: string };
      if (!payload?.sub) throw new Error('Invalid token');
      extWs.userId = payload.sub;
    } catch {
      ws.close(1008, 'Invalid or expired token');
      return;
    }
    // ── End Auth Check ──────────────────────────────────────

    extWs.isAlive = true;
    logger.info('🔌 New client connected', { total: wss.clients.size });

    // Pong handler
    extWs.on('pong', () => { extWs.isAlive = true; });

    // ابعت الأسعار فوراً لما حد يتصل
    try {
      const initialData = await fetchCurrentPrices();
      if (initialData.length > 0) {
        safeSend(ws, { type: 'INITIAL_PRICES', data: initialData });
      }
    } catch (err) {
      logger.error('Failed to send initial prices', { error: err });
    }

    ws.on('close', () => {
      logger.info('🔌 Client disconnected', { remaining: wss.clients.size });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket client error', { message: err.message });
    });
  });

  return { broadcastPrices };
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

/** يُستخدم فقط لإرسال الأسعار الأولية لـ client متصل حديثاً */
async function fetchCurrentPrices(): Promise<Array<{ ticker: string; price: number; change: number; changePercent: number; volume: number }>> {
  try {
    const quotes = await marketDataService.getQuotes([...EGX_TICKERS]);
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
