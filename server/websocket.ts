import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getBulkPrices } from './lib/yahoo.ts';
import { getCache } from './lib/redis.ts';
import { EGX_TICKERS } from './lib/egxTickers.ts';
import { logger } from './lib/logger.ts';

const UPDATE_INTERVAL = 60000;
const PING_INTERVAL = 30000;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });
  logger.info('✅ WebSocket Server initialized');

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
      const initialData = await fetchAndCachePrices();
      if (initialData && initialData.length > 0) {
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

  // Update loop كل 60 ثانية
  setInterval(async () => {
    if (wss.clients.size === 0) return; // مفيش clients = مفيش داعي نجيب بيانات

    try {
      const data = await fetchAndCachePrices();
      if (!data || data.length === 0) {
        logger.warn('⚠️ No price data available for broadcast');
        return;
      }

      let sentCount = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          safeSend(client, { type: 'PRICES_UPDATE', data });
          sentCount++;
        }
      });
      logger.info(`📡 Prices broadcast to ${sentCount} clients`);
    } catch (err) {
      logger.error('❌ WebSocket broadcast error', { error: err });
    }
  }, UPDATE_INTERVAL);
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

async function fetchAndCachePrices() {
  try {
    const prices = await getBulkPrices(EGX_TICKERS);
    return prices;
  } catch (error) {
    logger.error('Yahoo Finance fetch error, using cache', { error });
    const cachedPrices = await Promise.all(
      EGX_TICKERS.map(ticker => getCache(`stock:price:${ticker}`))
    );
    return cachedPrices.filter(Boolean);
  }
}
