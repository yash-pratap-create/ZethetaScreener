'use client';

import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { flexRender, SortingState, VisibilityState } from '@tanstack/react-table';
import { useVirtualGrid } from '@/hooks/useVirtualGrid';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useUIStore } from '@/stores/uiStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { Stock } from '@/types';

// ── Price cell with flash + receipt-to-render latency instrumentation ─────────
const FlashCell = memo(function FlashCell({
  symbol,
  children,
}: {
  symbol: string;
  children: React.ReactNode;
}) {
  const flash = useRealtimeStore((s) => s.flashMap[symbol]);
  const lastUpdated = useRealtimeStore((s) => s.priceUpdates[symbol]?.lastUpdated);
  const reportLatency = useRealtimeStore.getState().reportLatency;

  // Measure receipt-to-render latency: useEffect fires after paint
  useEffect(() => {
    if (flash && lastUpdated) {
      const latency = Date.now() - lastUpdated;
      if (latency >= 0 && latency < 5000) {
        reportLatency(latency);
      }
    }
  }, [flash?.expiresAt, lastUpdated, reportLatency]);

  return (
    <span
      className={flash ? (flash.direction === 'up' ? 'flash-green' : 'flash-red') : ''}
      key={flash?.expiresAt}
    >
      {children}
    </span>
  );
});

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (!direction) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-25">
        <path d="M7 10l5-5 5 5H7zm0 4l5 5 5-5H7z"/>
      </svg>
    );
  }
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-accent-primary"
      style={{ color: 'var(--color-accent-primary)' }}
    >
      {direction === 'asc'
        ? <path d="M7 10l5-5 5 5H7z"/>
        : <path d="M7 14l5 5 5-5H7z"/>
      }
    </svg>
  );
}

// ── Star watchlist button ─────────────────────────────────────────────────────
const WatchlistStar = memo(function WatchlistStar({ symbol }: { symbol: string }) {
  const isWatched = useWatchlistStore((s) => s.isWatched(symbol));
  const toggleWatch = useWatchlistStore((s) => s.toggleWatch);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleWatch(symbol); }}
      className="opacity-40 hover:opacity-100 transition-opacity"
      aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill={isWatched ? '#f59e0b' : 'none'}
        stroke={isWatched ? '#f59e0b' : 'currentColor'}
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  );
});

// ── Status bar ────────────────────────────────────────────────────────────────
function StatusBar({
  totalCount,
  filteredCount,
  durationMs,
}: {
  totalCount: number;
  filteredCount: number;
  durationMs: number;
}) {
  const monoStyle = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  return (
    <div
      className="flex items-center justify-between px-3 flex-shrink-0"
      style={{
        height: 24,
        background: 'var(--color-bg-surface-2)',
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-muted)',
      }}
      suppressHydrationWarning
    >
      <div className="flex items-center gap-3">
        <span style={{ ...monoStyle, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
          ROWS
        </span>
        <span style={{ ...monoStyle, color: 'var(--color-accent-primary)', fontWeight: 600 }}>
          {filteredCount.toLocaleString()}
        </span>
        <span style={{ ...monoStyle, color: 'var(--color-text-dim)' }}>of {totalCount.toLocaleString()}</span>
        {durationMs > 0 && (
          <>
            <span style={{ color: 'var(--color-border-strong)', fontSize: 9 }}>│</span>
            <span style={{ ...monoStyle, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>FILTER</span>
            <span style={{
              ...monoStyle,
              fontWeight: 600,
              color: durationMs < 10 ? 'var(--color-positive)' : durationMs < 50 ? '#f9a825' : 'var(--color-negative)',
            }}>
              {durationMs.toFixed(1)}ms
            </span>
          </>
        )}
      </div>
      <span style={{ ...monoStyle, fontSize: 9, color: 'var(--color-text-dim)', fontWeight: 700, letterSpacing: '0.06em' }}>
        VIRTUAL SCROLL · {filteredCount.toLocaleString()} ROWS
      </span>
    </div>
  );
}

// ── Main grid ─────────────────────────────────────────────────────────────────
interface StockGridProps {
  stocks: Stock[];
  totalCount: number;
  filteredCount: number;
  filterDurationMs: number;
}

export function StockGrid({ stocks, totalCount, filteredCount, filterDurationMs }: StockGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnVisibility = useUIStore((s) => s.columnVisibility) as VisibilityState;
  const rowHeight = useUIStore((s) => s.rowHeight);
  const openChart = useUIStore((s) => s.openChart);

  const handleOpenChart = useCallback(
    (symbol: string) => openChart(symbol),
    [openChart],
  );

  const { table, rows, rowVirtualizer } = useVirtualGrid({
    stocks,
    containerRef,
    sorting,
    onSortingChange: setSorting,
    columnVisibility,
    onOpenChart: handleOpenChart,
    rowHeight,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalHeight - virtualItems[virtualItems.length - 1].end
      : 0;

  const activeSort = sorting[0];
  const sortColumn = activeSort ? String(activeSort.id) : 'None';
  const sortDirection = activeSort ? (activeSort.desc ? 'descending' : 'ascending') : 'none';
  const totalCols = table.getVisibleLeafColumns().length + 1;

  // Terminal header style
  const thStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface-2)',
    borderBottom: '1px solid var(--color-border-strong)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap' as const,
    padding: '4px 8px',
    cursor: 'default',
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Status announcement for screen readers */}
      <div id="grid-status" role="status" aria-live="polite" className="sr-only">
        Showing {filteredCount} of {totalCount} stocks.
        Sorted by {sortColumn} {sortDirection}.
      </div>

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto min-h-0 relative"
        style={{ background: 'var(--color-bg-base)' }}
        role="region"
        aria-label="Stock screener results region"
      >
        <table
          className="screener-table"
          role="grid"
          aria-label="Stock Screener Results"
          aria-rowcount={filteredCount + 1}
          aria-colcount={totalCols}
          aria-describedby="grid-status"
          style={{ minWidth: table.getTotalSize() }}
        >
          {/* Sticky thead */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} role="row" aria-rowindex={1}>
                {/* Star column */}
                <th
                  role="columnheader"
                  aria-colindex={1}
                  className="w-7"
                  style={{ ...thStyle, width: 28, padding: '4px 6px' }}
                />
                {headerGroup.headers.map((header, i) => (
                  <th
                    key={header.id}
                    role="columnheader"
                    aria-colindex={i + 2}
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        header.column.toggleSorting();
                      }
                    }}
                    style={{
                      ...thStyle,
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      color: header.column.getIsSorted()
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-text-muted)',
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon direction={header.column.getIsSorted()} />
                      )}
                    </div>
                    {/* Resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`resize-handle ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Virtual tbody */}
          <tbody>
            {paddingTop > 0 && (
              <tr style={{ border: 'none' }}>
                <td colSpan={totalCols} style={{ height: paddingTop, padding: 0, border: 'none' }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const stock = row.original;
              const isEven = virtualRow.index % 2 === 0;

              return (
                <tr
                  key={row.id}
                  role="row"
                  aria-rowindex={virtualRow.index + 2}
                  style={{
                    background: isEven ? 'transparent' : 'rgba(255,255,255,0.013)',
                    borderBottom: '1px solid rgba(28,34,54,0.6)',
                    height: rowHeight,
                  }}
                  className="group"
                  data-index={virtualRow.index}
                >
                  {/* Watchlist star */}
                  <td role="gridcell" aria-colindex={1} className="w-7" style={{ verticalAlign: 'middle', paddingLeft: 6 }}>
                    <WatchlistStar symbol={stock.symbol} />
                  </td>

                  {row.getVisibleCells().map((cell, i) => {
                    const isPriceCell =
                      cell.column.id === 'lastPrice' || cell.column.id === 'changePercent';
                    const isNumeric = ['lastPrice','changePercent','volume','marketCap','pe','pb','roe','rsi14','beta','atr','adx'].includes(cell.column.id);

                    return (
                      <td
                        key={cell.id}
                        role="gridcell"
                        aria-colindex={i + 2}
                        tabIndex={-1}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.columnDef.minSize,
                          verticalAlign: 'middle',
                          paddingLeft: 8,
                          paddingRight: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: isNumeric ? '"JetBrains Mono", monospace' : undefined,
                          fontSize: isNumeric ? 11 : 12,
                          fontVariantNumeric: isNumeric ? 'tabular-nums' : undefined,
                        }}
                      >
                        {isPriceCell ? (
                          <FlashCell symbol={stock.symbol}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </FlashCell>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr style={{ border: 'none' }}>
                <td colSpan={totalCols} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
              </tr>
            )}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredCount === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ color: 'var(--color-text-dim)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}>
              NO RESULTS — ADJUST FILTERS
            </p>
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        totalCount={totalCount}
        filteredCount={filteredCount}
        durationMs={filterDurationMs}
      />
    </div>
  );
}
