'use client';

import { useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useConnectionStatus, useUpdatesPerSecond, useAvgLatency } from '@/stores/realtimeStore';
import { useFilterStore } from '@/stores/filterStore';
import { useStockScreener } from '@/hooks/useStockScreener';
import { useRealtimeStore } from '@/stores/realtimeStore';

// ── Market Index Chip ─────────────────────────────────────────────────────────
function IndexChip({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: number;
}) {
  const isUp = change >= 0;
  return (
    <div className="market-chip">
      <span style={{ color: 'var(--color-text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
        {value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
      <span style={{ color: isUp ? 'var(--color-positive)' : 'var(--color-negative)', fontSize: 10 }}>
        {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
      </span>
    </div>
  );
}

// ── Live Market Indices (computed from mock stock universe) ───────────────────
function MarketIndices() {
  const { stocks } = useStockScreener();
  const priceUpdates = useRealtimeStore((s) => s.priceUpdates);

  const indices = useMemo(() => {
    if (stocks.length === 0) return null;

    // Compute indices from the mock data universe
    const nifty50 = stocks.filter((s) => s.indexMembership?.includes('NIFTY50'));
    const sensex  = stocks.filter((s) => s.indexMembership?.includes('SENSEX'));
    const midcap  = stocks.filter((s) => s.indexMembership?.includes('MIDCAP150'));

    const avgChange = (arr: typeof stocks) => {
      if (!arr.length) return 0;
      return arr.reduce((sum, s) => {
        const live = priceUpdates[s.symbol]?.changePercent;
        return sum + (live ?? s.changePercent);
      }, 0) / arr.length;
    };

    return [
      { label: 'NIFTY 50',  value: 24_315,  change: avgChange(nifty50) },
      { label: 'SENSEX',    value: 80_218,  change: avgChange(sensex)  },
      { label: 'NIFTY MID', value: 12_847,  change: avgChange(midcap)  },
    ];
  }, [stocks, priceUpdates]);

  if (!indices) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5">
      {indices.map((idx) => (
        <IndexChip key={idx.label} {...idx} />
      ))}
    </div>
  );
}

// ── Connection Status Pill ────────────────────────────────────────────────────
function ConnectionPill() {
  const status = useConnectionStatus();
  const ups    = useUpdatesPerSecond();
  const latency = useAvgLatency();

  const cfg = {
    connected:    { dot: '#00c853', label: 'LIVE' },
    connecting:   { dot: '#f9a825', label: 'CONN…' },
    disconnected: { dot: '#546e7a', label: 'OFFLINE' },
    error:        { dot: '#ff1744', label: 'ERROR' },
  }[status];

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded"
      style={{ background: 'var(--color-bg-surface-2)', border: '1px solid var(--color-border)' }}
      aria-live="polite"
      aria-label={`Connection: ${cfg.label}`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'connected' || status === 'connecting' ? 'status-dot-pulse' : ''}`}
        style={{ background: cfg.dot }}
      />
      <span className="mono-num font-bold tracking-wider" style={{ color: cfg.dot, fontSize: 9 }}>
        {cfg.label}
      </span>
      {status === 'connected' && (
        <>
          <span style={{ color: 'var(--color-border-strong)', fontSize: 9 }}>│</span>
          <span className="mono-num" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
            {ups}<span style={{ color: 'var(--color-text-dim)' }}>UPS</span>
          </span>
          {latency > 0 && (
            <>
              <span style={{ color: 'var(--color-border-strong)', fontSize: 9 }}>│</span>
              <span
                className="mono-num"
                style={{
                  fontSize: 9,
                  color: latency < 30 ? 'var(--color-positive)' : latency < 80 ? '#f9a825' : 'var(--color-negative)',
                }}
              >
                {latency}ms
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── View Mode Toggle ──────────────────────────────────────────────────────────
function ViewModeToggle() {
  const { viewMode, setViewMode } = useUIStore();
  return (
    <div
      className="hidden sm:flex items-center overflow-hidden"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xs)',
      }}
    >
      {(['grid', 'heatmap'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className="px-2.5 py-1 transition-colors"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: viewMode === mode ? 'var(--color-accent-primary)' : 'transparent',
            color: viewMode === mode ? '#fff' : 'var(--color-text-muted)',
            borderRight: mode === 'grid' ? '1px solid var(--color-border)' : 'none',
          }}
          aria-pressed={viewMode === mode}
        >
          {mode === 'grid' ? '≡ Grid' : '⊞ Map'}
        </button>
      ))}
    </div>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export function Topbar() {
  const { theme, toggleTheme, toggleSidebar, isSidebarCollapsed } = useUIStore();
  const { searchQuery, setSearchQuery, activeGroup } = useFilterStore();
  const { stocks } = useStockScreener();
  const activeFilterCount = activeGroup.rules.length;

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-3 px-3 h-11"
      style={{
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 0 var(--color-border)',
        transition: 'background-color var(--transition-slow)',
      }}
    >
      {/* ── Sidebar Toggle + Logo ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Open filters' : 'Close filters'}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/>
          </svg>
        </button>

        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #5c6ef0 100%)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
              <path d="M3 3v18h18M7 16l4-4 4 4 4-8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="gradient-text font-bold" style={{ fontSize: 13, letterSpacing: '-0.01em' }}>
            ZETHETA
          </span>
          <span
            className="hidden sm:block px-1 rounded"
            style={{
              background: 'var(--color-bg-surface-2)',
              border: '1px solid var(--color-border)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.1em',
            }}
          >
            SCREENER
          </span>
        </div>
      </div>

      {/* ── Market Indices ── */}
      <MarketIndices />

      {/* ── Search (grows to fill) ── */}
      <div className="flex-1 min-w-0 max-w-sm">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--color-text-muted)' }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <label htmlFor="stock-search" className="sr-only">Search stocks by symbol, company, or sector</label>
          <input
            id="stock-search"
            name="stock-search"
            type="search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Symbol, company, sector…"
            className="w-full pl-8 pr-3 py-1.5 text-xs"
            style={{
              background: 'var(--color-bg-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--color-text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-accent-primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            aria-label="Search stocks"
          />
          {searchQuery && (
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--color-text-muted)' }}
            >
              ESC
            </span>
          )}
        </div>
      </div>

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ConnectionPill />

        {activeFilterCount > 0 && (
          <div
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded"
            style={{
              background: 'rgba(30,136,229,0.12)',
              border: '1px solid rgba(30,136,229,0.25)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--color-accent-primary)',
              letterSpacing: '0.06em',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v2.586l-6 6V20l-4-2v-5.414L4 6.586V4z"/>
            </svg>
            {activeFilterCount}F
          </div>
        )}

        <ViewModeToggle />

        {/* Export CSV */}
        <button
          onClick={() => import('@/lib/exportUtils').then(m => m.exportToCSV(stocks))}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded transition-colors"
          style={{
            border: '1px solid var(--color-border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--color-text-muted)',
            background: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          aria-label="Export to CSV"
        >
          ↓ CSV
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          {theme === 'dark' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 16a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm-9-9a1 1 0 0 1 0 2H1a1 1 0 0 1 0-2h2zm20 0a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2h2zM5.64 5.64a1 1 0 0 1 1.42 0l1.41 1.41a1 1 0 0 1-1.41 1.42L5.64 7.06a1 1 0 0 1 0-1.42zm12.73 12.73a1 1 0 0 1 1.41 0 1 1 0 0 1 0 1.41l-1.41 1.41a1 1 0 0 1-1.41-1.41l1.41-1.41zm-12.73 0l1.41 1.41a1 1 0 0 1-1.41 1.41L4.22 19.78a1 1 0 0 1 1.42-1.41zm12.73-12.73l1.41-1.41a1 1 0 0 1 1.41 1.42l-1.41 1.41a1 1 0 0 1-1.41-1.42z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
