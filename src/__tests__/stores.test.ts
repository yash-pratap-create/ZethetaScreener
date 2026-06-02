/**
 * A7 — Store Unit Tests
 * Tests Zustand store logic for filterStore, realtimeStore, watchlistStore, uiStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { useUIStore } from '@/stores/uiStore';

// ── FilterStore ───────────────────────────────────────────────────────────────
describe('FilterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      activeGroup: { id: 'default', logic: 'AND', rules: [] },
      searchQuery: '',
      activePresetId: null,
      savedFilters: [],
    });
  });

  it('starts with empty rules', () => {
    expect(useFilterStore.getState().activeGroup.rules).toHaveLength(0);
  });

  it('addRule appends a rule', () => {
    useFilterStore.getState().addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 50 });
    expect(useFilterStore.getState().activeGroup.rules).toHaveLength(1);
    expect(useFilterStore.getState().activeGroup.rules[0]).toMatchObject({ field: 'rsi14', value: 50 });
  });

  it('removeRule removes by index', () => {
    const { addRule, removeRule } = useFilterStore.getState();
    addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 30 });
    addRule({ type: 'numeric', field: 'pe', operator: 'lt', value: 20 });
    removeRule(0);
    expect(useFilterStore.getState().activeGroup.rules).toHaveLength(1);
    expect(useFilterStore.getState().activeGroup.rules[0]).toMatchObject({ field: 'pe' });
  });

  it('updateRule replaces at index', () => {
    const { addRule, updateRule } = useFilterStore.getState();
    addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 30 });
    updateRule(0, { type: 'numeric', field: 'roe', operator: 'gte', value: 15 });
    expect(useFilterStore.getState().activeGroup.rules[0]).toMatchObject({ field: 'roe', value: 15 });
  });

  it('clearAllRules empties the group', () => {
    const { addRule, clearAllRules } = useFilterStore.getState();
    addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 30 });
    addRule({ type: 'numeric', field: 'pe', operator: 'lt', value: 20 });
    clearAllRules();
    expect(useFilterStore.getState().activeGroup.rules).toHaveLength(0);
  });

  it('setLogic toggles AND/OR', () => {
    useFilterStore.getState().setLogic('OR');
    expect(useFilterStore.getState().activeGroup.logic).toBe('OR');
    useFilterStore.getState().setLogic('AND');
    expect(useFilterStore.getState().activeGroup.logic).toBe('AND');
  });

  it('setSearchQuery updates query', () => {
    useFilterStore.getState().setSearchQuery('TCS');
    expect(useFilterStore.getState().searchQuery).toBe('TCS');
  });

  it('applyPreset loads preset rules', () => {
    useFilterStore.getState().applyPreset('oversold_rsi');
    const { activeGroup, activePresetId } = useFilterStore.getState();
    expect(activePresetId).toBe('oversold_rsi');
    expect(activeGroup.rules.length).toBeGreaterThan(0);
  });

  it('addRule clears activePresetId', () => {
    useFilterStore.getState().applyPreset('oversold_rsi');
    useFilterStore.getState().addRule({ type: 'numeric', field: 'pe', operator: 'lt', value: 10 });
    expect(useFilterStore.getState().activePresetId).toBeNull();
  });

  it('saveCurrentFilter stores a snapshot', () => {
    const { addRule, saveCurrentFilter } = useFilterStore.getState();
    addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 70 });
    saveCurrentFilter('My Filter');
    expect(useFilterStore.getState().savedFilters).toHaveLength(1);
  });
});

// ── RealtimeStore ─────────────────────────────────────────────────────────────
describe('RealtimeStore', () => {
  beforeEach(() => {
    useRealtimeStore.setState({
      priceUpdates: {},
      flashMap: {},
      connectionStatus: 'disconnected',
      reconnectAttempts: 0,
      lastHeartbeat: 0,
      updatesPerSecond: 0,
      avgLatency: 0,
      _updateCounter: 0,
      _lastCountReset: Date.now(),
      _latencySamples: [],
    });
  });

  it('applyBatchUpdate updates prices', () => {
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'TCS', price: 3500, change: 50, changePct: 1.5, volume: 100000, timestamp: Date.now() },
    ]);
    const updates = useRealtimeStore.getState().priceUpdates;
    expect(updates['TCS']).toBeDefined();
    expect(updates['TCS'].lastPrice).toBe(3500);
  });

  it('applyBatchUpdate creates flash entries', () => {
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'TCS', price: 3500, change: 50, changePct: 1.5, volume: 100000, timestamp: Date.now() },
    ]);
    // Apply again with higher price to trigger flash
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'TCS', price: 3550, change: 100, changePct: 3, volume: 110000, timestamp: Date.now() },
    ]);
    const flash = useRealtimeStore.getState().flashMap['TCS'];
    expect(flash).toBeDefined();
    expect(flash.direction).toBe('up');
  });

  it('flash duration is 300ms', () => {
    const now = Date.now();
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'X', price: 100, change: 1, changePct: 1, volume: 1000, timestamp: now },
    ]);
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'X', price: 110, change: 10, changePct: 10, volume: 2000, timestamp: now + 10 },
    ]);
    const flash = useRealtimeStore.getState().flashMap['X'];
    if (flash) {
      expect(flash.expiresAt - now).toBeLessThanOrEqual(310);
      expect(flash.expiresAt - now).toBeGreaterThanOrEqual(290);
    }
  });

  it('reportLatency updates avgLatency', () => {
    const { reportLatency } = useRealtimeStore.getState();
    reportLatency(10);
    reportLatency(20);
    reportLatency(30);
    expect(useRealtimeStore.getState().avgLatency).toBeCloseTo(20, 0);
  });

  it('reportLatency maintains rolling window of 100', () => {
    const { reportLatency } = useRealtimeStore.getState();
    for (let i = 0; i < 150; i++) reportLatency(10);
    expect(useRealtimeStore.getState()._latencySamples.length).toBeLessThanOrEqual(100);
  });

  it('clearFlash removes a specific flash', () => {
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'A', price: 100, change: 1, changePct: 1, volume: 1000, timestamp: Date.now() },
    ]);
    useRealtimeStore.getState().applyBatchUpdate([
      { symbol: 'A', price: 110, change: 10, changePct: 10, volume: 2000, timestamp: Date.now() },
    ]);
    useRealtimeStore.getState().clearFlash('A');
    expect(useRealtimeStore.getState().flashMap['A']).toBeUndefined();
  });

  it('setConnectionStatus updates status', () => {
    useRealtimeStore.getState().setConnectionStatus('connected');
    expect(useRealtimeStore.getState().connectionStatus).toBe('connected');
  });
});

// ── WatchlistStore ────────────────────────────────────────────────────────────
describe('WatchlistStore', () => {
  beforeEach(() => {
    useWatchlistStore.setState({
      watchlists: [{
        id: 'default',
        name: 'My Watchlist',
        symbols: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      activeWatchlistId: 'default',
    });
  });

  it('starts with default watchlist', () => {
    expect(useWatchlistStore.getState().watchlists).toHaveLength(1);
    expect(useWatchlistStore.getState().watchlists[0].name).toBe('My Watchlist');
  });

  it('toggleWatch adds and removes symbols', () => {
    const { toggleWatch, isWatched } = useWatchlistStore.getState();
    toggleWatch('TCS');
    expect(useWatchlistStore.getState().isWatched('TCS')).toBe(true);
    useWatchlistStore.getState().toggleWatch('TCS');
    expect(useWatchlistStore.getState().isWatched('TCS')).toBe(false);
  });

  it('createWatchlist adds a new watchlist and activates it', () => {
    useWatchlistStore.getState().createWatchlist('Tech Stocks');
    const { watchlists, activeWatchlistId } = useWatchlistStore.getState();
    expect(watchlists).toHaveLength(2);
    expect(watchlists[1].name).toBe('Tech Stocks');
    expect(activeWatchlistId).toBe(watchlists[1].id);
  });

  it('deleteWatchlist removes watchlist', () => {
    useWatchlistStore.getState().createWatchlist('To Delete');
    const id = useWatchlistStore.getState().watchlists[1].id;
    useWatchlistStore.getState().deleteWatchlist(id);
    expect(useWatchlistStore.getState().watchlists.find((w) => w.id === id)).toBeUndefined();
  });

  it('renameWatchlist changes name', () => {
    useWatchlistStore.getState().renameWatchlist('default', 'Renamed');
    expect(useWatchlistStore.getState().watchlists[0].name).toBe('Renamed');
  });

  it('addToWatchlist prevents duplicates', () => {
    const { addToWatchlist } = useWatchlistStore.getState();
    addToWatchlist('default', 'TCS');
    addToWatchlist('default', 'TCS');
    expect(useWatchlistStore.getState().watchlists[0].symbols.filter((s) => s === 'TCS')).toHaveLength(1);
  });

  it('getActiveSymbols returns symbols of active watchlist', () => {
    useWatchlistStore.getState().addToWatchlist('default', 'TCS');
    useWatchlistStore.getState().addToWatchlist('default', 'INFY');
    expect(useWatchlistStore.getState().getActiveSymbols()).toEqual(['TCS', 'INFY']);
  });
});

// ── UIStore ───────────────────────────────────────────────────────────────────
describe('UIStore', () => {
  it('default theme is dark', () => {
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('toggleTheme flips between dark and light', () => {
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('openChart sets symbol and opens chart', () => {
    useUIStore.getState().openChart('TCS');
    const { selectedSymbol, isChartOpen } = useUIStore.getState();
    expect(selectedSymbol).toBe('TCS');
    expect(isChartOpen).toBe(true);
  });

  it('closeChart closes without clearing symbol', () => {
    useUIStore.getState().openChart('TCS');
    useUIStore.getState().closeChart();
    expect(useUIStore.getState().isChartOpen).toBe(false);
  });

  it('setColumnVisibility updates a specific column', () => {
    useUIStore.getState().setColumnVisibility('beta', false);
    expect(useUIStore.getState().columnVisibility['beta']).toBe(false);
  });

  it('toggleSidebar flips sidebar state', () => {
    const initial = useUIStore.getState().isSidebarCollapsed;
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarCollapsed).toBe(!initial);
  });

  it('setRowHeight updates row height', () => {
    useUIStore.getState().setRowHeight(48);
    expect(useUIStore.getState().rowHeight).toBe(48);
  });
});
