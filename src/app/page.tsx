'use client';
import { Suspense, lazy, useCallback } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { FilterSidebar } from '@/components/FilterPanel/FilterSidebar';
import { StockGrid } from '@/components/DataGrid/StockGrid';
import { HeatmapView } from '@/components/Heatmap/HeatmapView';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useStockScreener } from '@/hooks/useStockScreener';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
const ChartModal = lazy(() =>
  import('@/components/Chart/ChartModal').then((m) => ({ default: m.ChartModal })),
);
function GridSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2" aria-busy="true" aria-label="Loading stock data">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="skeleton h-9 rounded" style={{ opacity: 1 - i * 0.04 }} />
      ))}
    </div>
  );
}
function RealtimeProvider() {
  useRealtimeUpdates();
  return null;
}
function MarketPulseBar() {
  const { stocks, filteredCount, filterDurationMs, isLoading } = useStockScreener();
  if (isLoading || stocks.length === 0) {
    return (
      <div
        className="flex items-center gap-4 px-3 flex-shrink-0"
        style={{
          height: 26,
          background: 'var(--color-bg-pane)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="skeleton h-2 w-56 rounded" />
      </div>
    );
  }
  const advancing = stocks.filter((s) => s.changePercent > 0).length;
  const declining = stocks.filter((s) => s.changePercent < 0).length;
  const unchanged = stocks.length - advancing - declining;
  const topGainer = stocks.reduce<(typeof stocks)[0] | null>(
    (b, s) => (s.changePercent > (b?.changePercent ?? -Infinity) ? s : b),
    null,
  );
  const topLoser = stocks.reduce<(typeof stocks)[0] | null>(
    (b, s) => (s.changePercent < (b?.changePercent ?? Infinity) ? s : b),
    null,
  );
  const SEP = (
    <span style={{ color: 'var(--color-border-strong)', margin: '0 6px', fontSize: 10 }}>│</span>
  );
  const labelStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
  };
  const valStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  };
  return (
    <div
      className="flex items-center px-3 flex-shrink-0 overflow-x-auto"
      style={{
        height: 26,
        background: 'var(--color-bg-pane)',
        borderBottom: '1px solid var(--color-border)',
        scrollbarWidth: 'none',
        gap: 0,
      }}
      suppressHydrationWarning
    >
      <div className="flex items-center gap-1 flex-shrink-0">
        <span style={{ ...labelStyle, color: 'var(--color-positive)', fontSize: 8 }}>▲</span>
        <span style={{ ...valStyle, color: 'var(--color-positive)' }}>
          {advancing.toLocaleString()}
        </span>
        <span style={{ ...labelStyle, marginLeft: 2 }}>ADV</span>
      </div>
      {SEP}

      <div className="flex items-center gap-1 flex-shrink-0">
        <span style={{ ...labelStyle, color: 'var(--color-negative)', fontSize: 8 }}>▼</span>
        <span style={{ ...valStyle, color: 'var(--color-negative)' }}>
          {declining.toLocaleString()}
        </span>
        <span style={{ ...labelStyle, marginLeft: 2 }}>DEC</span>
      </div>
      {SEP}

      <div className="flex items-center gap-1 flex-shrink-0">
        <span style={{ ...labelStyle, color: 'var(--color-neutral)', fontSize: 8 }}>─</span>
        <span style={{ ...valStyle, color: 'var(--color-text-secondary)' }}>
          {unchanged.toLocaleString()}
        </span>
        <span style={{ ...labelStyle, marginLeft: 2 }}>UNCH</span>
      </div>
      {SEP}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span style={labelStyle}>SHOWING</span>
        <span style={{ ...valStyle, color: 'var(--color-accent-primary)' }}>
          {filteredCount.toLocaleString()}
        </span>
        <span style={{ ...labelStyle }}>/ {stocks.length.toLocaleString()}</span>
      </div>

      {filterDurationMs > 0 && (
        <>
          {SEP}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span style={labelStyle}>FILTER</span>
            <span
              style={{
                ...valStyle,
                fontSize: 10,
                color:
                  filterDurationMs < 10
                    ? 'var(--color-positive)'
                    : filterDurationMs < 50
                      ? '#f9a825'
                      : 'var(--color-negative)',
              }}
            >
              {filterDurationMs.toFixed(1)}ms
            </span>
          </div>
        </>
      )}

      {SEP}

      {topGainer && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span style={labelStyle}>BEST</span>
          <span style={{ ...valStyle, fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {topGainer.symbol}
          </span>
          <span style={{ ...valStyle, fontSize: 10, color: 'var(--color-positive)' }}>
            +{topGainer.changePercent.toFixed(2)}%
          </span>
        </div>
      )}
      {SEP}

      {topLoser && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span style={labelStyle}>WORST</span>
          <span style={{ ...valStyle, fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {topLoser.symbol}
          </span>
          <span style={{ ...valStyle, fontSize: 10, color: 'var(--color-negative)' }}>
            {topLoser.changePercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
function ScreenerView() {
  const { stocks, totalCount, filteredCount, filterDurationMs, isLoading } = useStockScreener();
  const { isSidebarCollapsed, isChartOpen, selectedSymbol, closeChart, viewMode } = useUIStore();
  const handleCloseChart = useCallback(() => closeChart(), [closeChart]);
  if (isLoading) return <GridSkeleton />;
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {!isSidebarCollapsed && (
        <div className="flex-shrink-0 border-r" style={{ borderColor: 'var(--color-border)' }}>
          <ErrorBoundary feature="FilterPanel">
            <FilterSidebar />
          </ErrorBoundary>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <ErrorBoundary feature="DataGrid">
          {viewMode === 'heatmap' ? (
            <HeatmapView stocks={stocks} />
          ) : (
            <StockGrid
              stocks={stocks}
              totalCount={totalCount}
              filteredCount={filteredCount}
              filterDurationMs={filterDurationMs}
            />
          )}
        </ErrorBoundary>
      </div>

      {isChartOpen && selectedSymbol && (
        <ErrorBoundary feature="Chart">
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Loading chart…
                </div>
              </div>
            }
          >
            <ChartModal symbol={selectedSymbol} onClose={handleCloseChart} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
import { useLatestAnnouncement } from '@/stores/realtimeStore';
function ScreenReaderLiveAnnouncer() {
  const latestAnnouncement = useLatestAnnouncement();
  return (
    <div role="status" aria-live="assertive" className="sr-only" id="websocket-price-announcer">
      {latestAnnouncement}
    </div>
  );
}
export default function ScreenerPage() {
  useKeyboardShortcuts();
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <ScreenReaderLiveAnnouncer />
      <RealtimeProvider />
      <Topbar />
      <MarketPulseBar />
      <Suspense fallback={<GridSkeleton />}>
        <ScreenerView />
      </Suspense>
    </div>
  );
}
