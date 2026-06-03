import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Watchlist } from '@/types';
interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
}
interface WatchlistActions {
  createWatchlist: (name: string) => void;
  deleteWatchlist: (id: string) => void;
  renameWatchlist: (id: string, name: string) => void;
  addToWatchlist: (id: string, symbol: string) => void;
  removeFromWatchlist: (id: string, symbol: string) => void;
  setActiveWatchlist: (id: string | null) => void;
  isWatched: (symbol: string) => boolean;
  toggleWatch: (symbol: string) => void;
  getActiveSymbols: () => string[];
}
export const useWatchlistStore = create<WatchlistState & WatchlistActions>()(
  immer(
    devtools(
      persist(
        (set, get) => ({
          watchlists: [
            {
              id: 'default',
              name: 'My Watchlist',
              symbols: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          activeWatchlistId: 'default',
          createWatchlist: (name) =>
            set((state) => {
              const id = `wl-${Date.now()}`;
              state.watchlists.push({
                id,
                name,
                symbols: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              state.activeWatchlistId = id;
            }),
          deleteWatchlist: (id) =>
            set((state) => {
              const idx = state.watchlists.findIndex((w) => w.id === id);
              if (idx !== -1) state.watchlists.splice(idx, 1);
              if (state.activeWatchlistId === id) {
                state.activeWatchlistId = state.watchlists[0]?.id ?? null;
              }
            }),
          renameWatchlist: (id, name) =>
            set((state) => {
              const wl = state.watchlists.find((w) => w.id === id);
              if (wl) {
                wl.name = name;
                wl.updatedAt = Date.now();
              }
            }),
          addToWatchlist: (id, symbol) =>
            set((state) => {
              const wl = state.watchlists.find((w) => w.id === id);
              if (wl && !wl.symbols.includes(symbol)) {
                wl.symbols.push(symbol);
                wl.updatedAt = Date.now();
              }
            }),
          removeFromWatchlist: (id, symbol) =>
            set((state) => {
              const wl = state.watchlists.find((w) => w.id === id);
              if (wl) {
                const idx = wl.symbols.indexOf(symbol);
                if (idx !== -1) wl.symbols.splice(idx, 1);
                wl.updatedAt = Date.now();
              }
            }),
          setActiveWatchlist: (id) =>
            set((state) => {
              state.activeWatchlistId = id;
            }),
          isWatched: (symbol) => {
            const { watchlists, activeWatchlistId } = get();
            const wl = watchlists.find((w) => w.id === activeWatchlistId);
            return wl?.symbols.includes(symbol) ?? false;
          },
          toggleWatch: (symbol) => {
            const { watchlists, activeWatchlistId } = get();
            const wl = watchlists.find((w) => w.id === activeWatchlistId);
            if (!wl) return;
            if (wl.symbols.includes(symbol)) {
              get().removeFromWatchlist(wl.id, symbol);
            } else {
              get().addToWatchlist(wl.id, symbol);
            }
          },
          getActiveSymbols: () => {
            const { watchlists, activeWatchlistId } = get();
            const wl = watchlists.find((w) => w.id === activeWatchlistId);
            return wl?.symbols ?? [];
          },
        }),
        { name: 'zetheta-watchlists' },
      ),
      { name: 'WatchlistStore' },
    ),
  ),
);
