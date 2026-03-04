import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getBulkPrices } from './lib/yahoo.ts';
import { getCache } from './lib/redis.ts';
import { EGX_TICKERS } from './lib/egxTickers.ts';

const UPDATE_INTERVAL = 60000;
const PING_INTERVAL = 30000;

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });
  console.log('✅ WebSocket Server initialized');

  // Ping كل 30 ثانية للتأكد إن الـ clients لسه متصلين
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as WebSocket & { isAlive?: boolean };
      if (extWs.isAlive === false) {
        console.log('🔌 Terminating dead WebSocket connection');
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, PING_INTERVAL);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', async (ws) => {
    const extWs = ws as WebSocket & { isAlive?: boolean };
    extWs.isAlive = true;
    console.log('🔌 New client connected. Total:', wss.clients.size);

    // Pong handler
    extWs.on('pong', () => { extWs.isAlive = true; });

    // ابعت الأسعار فوراً لما حد يتصل
    try {
      const initialData = await fetchAndCachePrices();
      if (initialData && initialData.length > 0) {
        safeSend(ws, { type: 'INITIAL_PRICES', data: initialData });
      }
    } catch (err) {
      console.error('Failed to send initial prices:', err);
    }

    ws.on('close', () => {
      console.log('🔌 Client disconnected. Remaining:', wss.clients.size);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });
  });

  // Update loop كل 60 ثانية
  setInterval(async () => {
    if (wss.clients.size === 0) return; // مفيش clients = مفيش داعي نجيب بيانات

    try {
      const data = await fetchAndCachePrices();
      if (!data || data.length === 0) {
        console.warn('⚠️ No price data available for broadcast');
        return;
      }

      let sentCount = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          safeSend(client, { type: 'PRICES_UPDATE', data });
          sentCount++;
        }
      });
      console.log(`📡 Prices broadcast to ${sentCount} clients`);
    } catch (err) {
      console.error('❌ WebSocket broadcast error:', err);
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
    console.error('Failed to send WebSocket message:', err);
  }
}

async function fetchAndCachePrices() {
  try {
    const prices = await getBulkPrices(EGX_TICKERS);
    return prices;
  } catch (error) {
    console.error('Yahoo Finance fetch error, using cache:', error);
    const cachedPrices = await Promise.all(
      EGX_TICKERS.map(ticker => getCache(`stock:price:${ticker}`))
    );
    return cachedPrices.filter(Boolean);
  }
}
