import { useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getAccessToken } from '../lib/auth/tokens';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const WS_BASE  = process.env.EXPO_PUBLIC_WS_URL ?? API_URL.replace(/^http/, 'ws');

type StockPrice = {
  symbol:        string;
  price:         number;
  change:        number;
  changePercent: number;
  volume:        number;
};

type PriceListener   = (patch: Record<string, StockPrice>) => void;
type ConnectListener = (connected: boolean) => void;

// ─── Shared WebSocket singleton ──────────────────────────────────
const priceListeners   = new Set<PriceListener>();
const connectListeners = new Set<ConnectListener>();

/**
 * Maps each hook instance (by Symbol id) to its current ticker list.
 * Union of all values = tickers to subscribe to.
 */
const hookTickers = new Map<symbol, string[]>();

let ws:             WebSocket | null                     = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay  = 1_000;
let singletonConn   = false;
let connecting      = false; // guards against concurrent connectShared() calls

function getUnionTickers(): string[] {
  const s = new Set<string>();
  hookTickers.forEach((arr) => arr.forEach((t) => s.add(t)));
  return Array.from(s);
}

/** Safe send — captures the socket reference to avoid null race. */
function sendSubscribe(socket?: WebSocket | null) {
  const target  = socket ?? ws;
  const tickers = getUnionTickers();
  if (target && target.readyState === WebSocket.OPEN && tickers.length > 0) {
    target.send(JSON.stringify({ type: 'SUBSCRIBE', tickers }));
  }
}

async function connectShared() {
  // Prevent concurrent connection attempts during the async token fetch.
  if (connecting || ws) return;
  connecting = true;

  try {
    const token = await getAccessToken();
    if (!token || hookTickers.size === 0) return;

    // Double-check: another call might have connected while we awaited the token.
    if (ws) return;

    // Capture as a local so all closures reference this specific socket,
    // not the module-level `ws` which may be reassigned later.
    const socket = new WebSocket(WS_BASE);
    ws = socket;

    socket.onopen = () => {
      // Bail out if this socket is no longer the active one.
      if (ws !== socket) { socket.close(); return; }

      reconnectDelay = 1_000;
      singletonConn  = true;
      connectListeners.forEach((l) => l(true));
      socket.send(JSON.stringify({ type: 'AUTH', token }));
      // Small delay so auth is processed before subscribe.
      setTimeout(() => sendSubscribe(socket), 500);
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type?: string; data?: unknown };
        if (
          (msg.type === 'PRICES_UPDATE' ||
           msg.type === 'INITIAL_PRICES' ||
           msg.type === 'PRICES') &&
          Array.isArray(msg.data)
        ) {
          const patch: Record<string, StockPrice> = {};
          for (const item of msg.data as Array<Record<string, unknown>>) {
            const key = (item.ticker ?? item.symbol) as string | undefined;
            if (!key) continue;
            patch[key] = {
              symbol:        key,
              price:         Number(item.price)         || 0,
              change:        Number(item.change)        || 0,
              changePercent: Number(item.changePercent) || 0,
              volume:        Number(item.volume)        || 0,
            };
          }
          if (Object.keys(patch).length > 0) {
            priceListeners.forEach((l) => l(patch));
          }
        }
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      // Only update global state if this is still the active socket.
      if (ws === socket) {
        ws            = null;
        singletonConn = false;
        connectListeners.forEach((l) => l(false));
        if (hookTickers.size > 0) {
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
            void connectShared();
          }, reconnectDelay);
        }
      }
    };

    socket.onerror = () => socket.close();
  } finally {
    connecting = false;
  }
}

function teardownShared() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  const socket = ws;
  ws            = null;
  singletonConn = false;
  connecting    = false;
  socket?.close();
}

// Register AppState listener once at module level (not per hook)
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    teardownShared();
  } else if (state === 'active' && hookTickers.size > 0 && !ws && !connecting) {
    void connectShared();
  }
});

// ─── Hook ─────────────────────────────────────────────────────────
export function useLivePrices(tickers: string[] = []) {
  const [prices, setPrices]         = useState<Record<string, StockPrice>>({});
  const [isConnected, setConnected] = useState(singletonConn);
  const hookIdRef                   = useRef<symbol>(Symbol());

  // ── Sync tickers into the global map ────────────────────────────
  const tickersKey = tickers.join(',');
  useEffect(() => {
    const prev    = hookTickers.get(hookIdRef.current) ?? [];
    hookTickers.set(hookIdRef.current, tickers);

    const prevSet = new Set(prev);
    const hasNew  = tickers.some((t) => !prevSet.has(t));
    if (hasNew) sendSubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey]);

  // ── Mount / unmount lifecycle ────────────────────────────────────
  useEffect(() => {
    const hookId = hookIdRef.current;
    hookTickers.set(hookId, tickers);

    const onPrices: PriceListener = (patch) => {
      const mine     = hookTickers.get(hookId) ?? [];
      const relevant = Object.entries(patch).filter(([k]) => mine.includes(k));
      if (relevant.length > 0) {
        setPrices((prev) => ({ ...prev, ...Object.fromEntries(relevant) }));
      }
    };

    const onConn: ConnectListener = (v) => setConnected(v);

    priceListeners.add(onPrices);
    connectListeners.add(onConn);

    if (!ws && !connecting) void connectShared();

    return () => {
      priceListeners.delete(onPrices);
      connectListeners.delete(onConn);
      hookTickers.delete(hookId);
      if (hookTickers.size === 0) teardownShared();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prices, isConnected };
}
