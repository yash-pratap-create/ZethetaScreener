'use client';
import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filterStore';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { applyFilters } from '@/lib/filterEngine';
import { saveStocksToOfflineCache, getStocksFromOfflineCache } from '@/lib/db';
import { Stock } from '@/types';
interface UseStockScreenerOptions {
  enabled?: boolean;
  refetchInterval?: number;
}
export function useStockScreener(options: UseStockScreenerOptions = {}) {
  const { enabled = true, refetchInterval = 5 * 60 * 1000 } = options;
  const { activeGroup, searchQuery } = useFilterStore();
  const priceUpdates = useRealtimeStore((s) => s.priceUpdates);
  const watchlists = useWatchlistStore((s) => s.watchlists);
  const activeWatchlistId = useWatchlistStore((s) => s.activeWatchlistId);
  const queryClient = useQueryClient();
  const {
    data: allStocks = [],
    isLoading,
    error,
  } = useQuery<Stock[]>({
    queryKey: ['stocks', 'universe'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stocks');
        if (!res.ok) throw new Error(`Failed to fetch stocks: ${res.status}`);
        const json = await res.json();
        const stocksList = Array.isArray(json) ? json : (json.data ?? []);
        if (stocksList.length > 0) {
          saveStocksToOfflineCache(stocksList);
        }
        return stocksList;
      } catch (err) {
        console.warn('Network call failed, attempting to read IndexedDB offline cache...', err);
        const cached = await getStocksFromOfflineCache();
        if (cached && cached.length > 0) {
          return cached;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval,
    enabled,
  });
  const mergedStocks = useMemo<Stock[]>(() => {
    if (!allStocks.length) return allStocks;
    const activeSymbols = useWatchlistStore.getState().getActiveSymbols();
    const watchlistSymbols = new Set(activeSymbols.map((s) => s.toUpperCase()));
    return allStocks.map((stock) => {
      const update = priceUpdates[stock.symbol];
      const isWatched = watchlistSymbols.has(stock.symbol.toUpperCase());
      if (!update) return { ...stock, isWatched } as Stock;
      return { ...stock, ...update, isWatched } as Stock;
    });
  }, [allStocks, priceUpdates, watchlists, activeWatchlistId]);
  const filterResult = useMemo(
    () => applyFilters(Array.isArray(mergedStocks) ? mergedStocks : [], activeGroup, searchQuery),
    [mergedStocks, activeGroup, searchQuery],
  );
  const prefetchStockDetail = useCallback(
    (symbol: string) => {
      queryClient.prefetchQuery({
        queryKey: ['stock', symbol, 'detail'],
        queryFn: async () => {
          const r = await fetch(`/api/stocks/${symbol}`);
          if (!r.ok) throw new Error(`${r.status}`);
          const json = await r.json();
          return json.success ? json.data : json;
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient],
  );
  return {
    stocks: Array.isArray(filterResult.data) ? filterResult.data : [],
    totalCount: filterResult.totalCount,
    filteredCount: filterResult.filteredCount,
    filterDurationMs: filterResult.durationMs,
    isLoading,
    error,
    prefetchStockDetail,
  };
}
export function useStockBySymbol(symbol: string) {
  const priceUpdates = useRealtimeStore((s) => s.priceUpdates);
  const { data: stock, isLoading } = useQuery<Stock | null>({
    queryKey: ['stock', symbol, 'detail'],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.data : json;
    },
    staleTime: 60 * 1000,
    enabled: Boolean(symbol),
  });
  const mergedStock = useMemo(() => {
    if (!stock) return null;
    const update = priceUpdates[symbol];
    if (!update) return stock;
    return { ...stock, ...update } as Stock;
  }, [stock, priceUpdates, symbol]);
  return { stock: mergedStock, isLoading };
}
