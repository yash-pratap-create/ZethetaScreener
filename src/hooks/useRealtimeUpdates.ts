'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { WSPriceUpdate } from '@/types';
import { gaussianRandom, simulateNextPrice } from '@/lib/indicators';
import type { Sector } from '@/types';
const SECTOR_CORRELATION = 0.6;
const sectorShocks = new Map<Sector, number>();
function refreshSectorShocks(sectors: Sector[]) {
  for (const s of sectors) sectorShocks.set(s, gaussianRandom());
}
const livePrices = new Map<string, number>();
const liveVolumes = new Map<string, number>();
const stockSigmas = new Map<string, number>();
function initializeLivePrices() {
  const universe = getStockUniverse();
  for (const s of universe) {
    livePrices.set(s.symbol, s.lastPrice);
    liveVolumes.set(s.symbol, s.volume);
    stockSigmas.set(s.symbol, 0.008 + Math.random() * 0.025);
  }
}
export function useRealtimeUpdates() {
  const {
    applyBatchUpdate,
    setConnectionStatus,
    incrementReconnect,
    resetReconnect,
    tickHeartbeat,
  } = useRealtimeStore.getState();
  const frameRef = useRef<number>(0);
  const pendingUpdates = useRef<WSPriceUpdate[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isRunningRef = useRef(false);
  const symbols = useRef<string[]>([]);
  const flushUpdates = useCallback(() => {
    const batch = pendingUpdates.current.splice(0);
    if (batch.length > 0) {
      applyBatchUpdate(batch);
    }
    frameRef.current = 0;
  }, [applyBatchUpdate]);
  const scheduleFlush = useCallback(() => {
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(flushUpdates);
    }
  }, [flushUpdates]);
  const generateBatch = useCallback(() => {
    if (!isRunningRef.current) return;
    const batchSize = Math.floor(Math.random() * 30) + 10;
    const now = Date.now();
    const dt = 1 / (252 * 6.5 * 60 * 2);
    const universe = getStockUniverse();
    const sectors = [...new Set(universe.map((s) => s.sector))] as Sector[];
    refreshSectorShocks(sectors);
    for (let i = 0; i < batchSize; i++) {
      const symbol = symbols.current[Math.floor(Math.random() * symbols.current.length)];
      if (!symbol) continue;
      const stock = universe.find((s) => s.symbol === symbol);
      const prevPrice = livePrices.get(symbol) ?? stock?.lastPrice ?? 100;
      const sigma = stockSigmas.get(symbol) ?? 0.015;
      const sectorShock = sectorShocks.get(stock?.sector as Sector) ?? 0;
      const idiosyncratic = gaussianRandom();
      const combinedShock =
        SECTOR_CORRELATION * sectorShock + Math.sqrt(1 - SECTOR_CORRELATION ** 2) * idiosyncratic;
      const drift = combinedShock * 0.0001;
      const newPrice = simulateNextPrice(prevPrice, sigma, drift, dt);
      livePrices.set(symbol, newPrice);
      const prevVolume = liveVolumes.get(symbol) ?? 1000000;
      const newVolume = prevVolume + Math.floor(Math.random() * 50000);
      liveVolumes.set(symbol, newVolume);
      const baseClose = stock?.previousClose ?? prevPrice;
      pendingUpdates.current.push({
        symbol,
        price: newPrice,
        change: newPrice - baseClose,
        changePct: ((newPrice - baseClose) / baseClose) * 100,
        volume: newVolume,
        timestamp: now,
      });
    }
    scheduleFlush();
  }, [scheduleFlush]);
  const connect = useCallback(() => {
    if (isRunningRef.current) return;
    if (symbols.current.length === 0) {
      initializeLivePrices();
      symbols.current = Array.from(livePrices.keys());
    }
    setConnectionStatus('connecting');
    connectDelayTimerRef.current = setTimeout(
      () => {
        isRunningRef.current = true;
        setConnectionStatus('connected');
        resetReconnect();
        reconnectAttemptsRef.current = 0;
        const tick = () => {
          if (!isRunningRef.current) return;
          generateBatch();
          tickHeartbeat();
          const delay = 500 + Math.random() * 500;
          intervalRef.current = setTimeout(tick, delay);
        };
        tick();
      },
      800 + Math.random() * 400,
    );
  }, [generateBatch, setConnectionStatus, resetReconnect, tickHeartbeat]);
  const disconnect = useCallback(() => {
    isRunningRef.current = false;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
    if (connectDelayTimerRef.current) {
      clearTimeout(connectDelayTimerRef.current);
      connectDelayTimerRef.current = null;
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current += 1;
    incrementReconnect();
    const backoff = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), 30000);
    setConnectionStatus('connecting');
    backoffTimerRef.current = setTimeout(() => {
      connect();
    }, backoff);
  }, [disconnect, connect, incrementReconnect, setConnectionStatus]);
  useEffect(() => {
    connect();
    return () => {
      disconnect();
      setConnectionStatus('disconnected');
    };
  }, [connect, disconnect, setConnectionStatus]);
  return { reconnect, disconnect };
}
