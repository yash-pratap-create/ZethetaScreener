import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Stock, WSPriceUpdate } from '@/types';

interface PriceFlash {
  direction: 'up' | 'down';
  expiresAt: number;
}

interface RealtimeState {
  // Live prices (symbol → partial stock) — plain object for Immer compatibility
  priceUpdates: Record<string, Partial<Stock>>;
  // Flash signals for cell animation
  flashMap: Record<string, PriceFlash>;
  // Connection status
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  lastHeartbeat: number;
  updatesPerSecond: number;
  avgLatency: number;
  latestAnnouncement: string;
  _updateCounter: number;
  _lastCountReset: number;
  _latencySamples: number[];
}

interface RealtimeActions {
  applyBatchUpdate: (updates: WSPriceUpdate[]) => void;
  setConnectionStatus: (status: RealtimeState['connectionStatus']) => void;
  incrementReconnect: () => void;
  resetReconnect: () => void;
  clearFlash: (symbol: string) => void;
  tickHeartbeat: () => void;
  reportLatency: (ms: number) => void;
  setAnnouncement: (msg: string) => void;
}

export type RealtimeStore = RealtimeState & RealtimeActions;

export const useRealtimeStore = create<RealtimeStore>()(
  immer((set, get) => ({
    priceUpdates: {},
    flashMap: {},
    connectionStatus: 'disconnected',
    reconnectAttempts: 0,
    lastHeartbeat: 0,
    updatesPerSecond: 0,
    avgLatency: 0,
    latestAnnouncement: '',
    _updateCounter: 0,
    _lastCountReset: Date.now(),
    _latencySamples: [],

    applyBatchUpdate: (updates) => {
      set((state) => {
        const now = Date.now();
        for (const u of updates) {
          const prevPrice = state.priceUpdates[u.symbol]?.lastPrice;
          state.priceUpdates[u.symbol] = {
            lastPrice: u.price,
            changeAbsolute: u.change,
            changePercent: u.changePct,
            volume: u.volume,
            lastUpdated: u.timestamp,
          };

          if (prevPrice !== undefined) {
            const dir: 'up' | 'down' = u.price >= prevPrice ? 'up' : 'down';
            state.flashMap[u.symbol] = {
              direction: dir,
              expiresAt: now + 300,
            };
          }

          // Screen reader announcements for WebSocket update (Section A10.2)
          try {
            const selectedSymbol = require('./uiStore').useUIStore.getState().selectedSymbol;
            if (selectedSymbol && u.symbol === selectedSymbol.toUpperCase()) {
              const dirText = u.changePct >= 0 ? 'up' : 'down';
              state.latestAnnouncement = `${u.symbol}: Price updated to ${u.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}, ${dirText} ${Math.abs(u.changePct).toFixed(1)} percent.`;
            }
          } catch (err) {}
        }

        // UPS tracking
        state._updateCounter += updates.length;
        const elapsed = now - state._lastCountReset;
        if (elapsed >= 1000) {
          state.updatesPerSecond = Math.round(
            (state._updateCounter / elapsed) * 1000,
          );
          state._updateCounter = 0;
          state._lastCountReset = now;
        }
      });
    },

    setConnectionStatus: (status) =>
      set((state) => {
        state.connectionStatus = status;
      }),

    incrementReconnect: () =>
      set((state) => {
        state.reconnectAttempts += 1;
      }),

    resetReconnect: () =>
      set((state) => {
        state.reconnectAttempts = 0;
      }),

    clearFlash: (symbol) =>
      set((state) => {
        delete state.flashMap[symbol];
      }),

    tickHeartbeat: () =>
      set((state) => {
        state.lastHeartbeat = Date.now();
      }),

    reportLatency: (ms) =>
      set((state) => {
        state._latencySamples.push(ms);
        // Keep rolling window of last 100 samples
        if (state._latencySamples.length > 100) {
          state._latencySamples.splice(0, state._latencySamples.length - 100);
        }
        const sum = state._latencySamples.reduce((a, b) => a + b, 0);
        state.avgLatency = Math.round((sum / state._latencySamples.length) * 10) / 10;
      }),

    setAnnouncement: (msg) =>
      set((state) => {
        state.latestAnnouncement = msg;
      }),
  })),
);

// Selector hooks (avoid re-renders)
export const useConnectionStatus = () =>
  useRealtimeStore((s) => s.connectionStatus);

export const useUpdatesPerSecond = () =>
  useRealtimeStore((s) => s.updatesPerSecond);

export const usePriceUpdate = (symbol: string) =>
  useRealtimeStore((s) => s.priceUpdates[symbol]);

export const useFlash = (symbol: string) =>
  useRealtimeStore((s) => s.flashMap[symbol]);

export const useAvgLatency = () =>
  useRealtimeStore((s) => s.avgLatency);

export const useLatestAnnouncement = () =>
  useRealtimeStore((s) => s.latestAnnouncement);
