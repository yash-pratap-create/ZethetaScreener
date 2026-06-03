'use client';

import { useMemo, useCallback } from 'react';
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, SortingState, VisibilityState, OnChangeFn } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Stock } from '@/types';
import {
  PriceCell, ChangeCell, VolumeCell, MarketCapCell, RSICell,
  BadgeCell, MACD_COLORS, BB_COLORS, VOL_COLORS,
  SymbolCell, CompanyCell, SectorBadgeCell, CapBadgeCell,
  PeCell, PbCell, RoeCell, RoceCell, PromoterCell,
  DividendYieldCell, DebtCell, GrowthCell, BetaCell,
  Week52HighCell, Week52LowCell,
} from '@/components/ui/Cells';
import React from 'react';

// ── Column helper (spec pattern: createColumnHelper) ──────────────────────────
const columnHelper = createColumnHelper<Stock>();

// ── Column definitions ────────────────────────────────────────────────────────
function buildColumns(onOpenChart: (symbol: string) => void) {
  return [
    columnHelper.accessor('symbol', {
      header: 'Symbol',
      size: 85, minSize: 70,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'text' },
      cell: (info) => <SymbolCell value={info.getValue()} onOpenChart={onOpenChart} />,
    }),
    columnHelper.accessor('companyName', {
      header: 'Company',
      size: 170, minSize: 120,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      cell: (info) => <CompanyCell value={info.getValue()} />,
    }),
    columnHelper.accessor('sector', {
      header: 'Sector',
      size: 110, minSize: 80,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'select' },
      cell: (info) => <SectorBadgeCell value={info.getValue()} />,
    }),
    columnHelper.accessor('marketCapCategory', {
      header: 'Cap',
      size: 80, minSize: 65,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'select' },
      cell: (info) => <CapBadgeCell value={info.getValue()} />,
    }),
    columnHelper.accessor('lastPrice', {
      header: 'LTP',
      size: 100, minSize: 80,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range', unit: 'INR' },
      cell: (info) => <PriceCell value={info.getValue()} />,
    }),
    columnHelper.accessor('changePercent', {
      header: '% Change',
      size: 90, minSize: 70,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range' },
      cell: (info) => <ChangeCell value={info.getValue()} />,
    }),
    columnHelper.accessor('volume', {
      header: 'Volume',
      size: 90, minSize: 70,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range' },
      cell: (info) => (
        <VolumeCell value={info.getValue()} avgVolume={info.row.original.avgVolume20D} />
      ),
    }),
    columnHelper.accessor('marketCap', {
      header: 'Mkt Cap',
      size: 110, minSize: 85,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range', unit: 'Cr' },
      cell: (info) => <MarketCapCell value={info.getValue()} />,
    }),
    columnHelper.accessor('pe', {
      header: 'P/E',
      size: 65, minSize: 50,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range' },
      cell: (info) => <PeCell value={info.getValue()} />,
    }),
    columnHelper.accessor('pb', {
      header: 'P/B',
      size: 65, minSize: 50,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <PbCell value={info.getValue()} />,
    }),
    columnHelper.accessor('roe', {
      header: 'ROE %',
      size: 75, minSize: 60,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range' },
      cell: (info) => <RoeCell value={info.getValue()} />,
    }),
    columnHelper.accessor('roce', {
      header: 'ROCE %',
      size: 80, minSize: 60,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <RoceCell value={info.getValue()} />,
    }),
    columnHelper.accessor('rsi14', {
      header: 'RSI(14)',
      size: 70, minSize: 55,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range', min: 0, max: 100 },
      cell: (info) => <RSICell value={info.getValue()} />,
    }),
    columnHelper.accessor('macdSignal', {
      header: 'MACD',
      size: 80, minSize: 65,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'select', options: ['Bullish', 'Bearish', 'Neutral'] },
      cell: (info) => <BadgeCell value={info.getValue()} colorMap={MACD_COLORS} />,
    }),
    columnHelper.accessor('bollingerPosition', {
      header: 'BB Pos',
      size: 75, minSize: 60,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'select', options: ['Above', 'Within', 'Below'] },
      cell: (info) => <BadgeCell value={info.getValue()} colorMap={BB_COLORS} />,
    }),
    columnHelper.accessor('volumeVsAvg', {
      header: 'Vol/Avg',
      size: 70, minSize: 55,
      enableSorting: true,
      sortingFn: 'alphanumeric',
      meta: { filterType: 'select', options: ['3x', '2x', 'Above', 'Below'] },
      cell: (info) => <BadgeCell value={info.getValue()} colorMap={VOL_COLORS} />,
    }),
    columnHelper.accessor('promoterHolding', {
      header: 'Promoter',
      size: 85, minSize: 65,
      enableSorting: true,
      sortingFn: 'basic',
      meta: { filterType: 'range' },
      cell: (info) => <PromoterCell value={info.getValue()} />,
    }),
    columnHelper.accessor('dividendYield', {
      header: 'Div Yld',
      size: 75, minSize: 60,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <DividendYieldCell value={info.getValue()} />,
    }),
    columnHelper.accessor('debtToEquity', {
      header: 'D/E',
      size: 60, minSize: 50,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <DebtCell value={info.getValue()} />,
    }),
    columnHelper.accessor('revenueGrowthYoY', {
      header: 'Rev Gr',
      size: 75, minSize: 60,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <GrowthCell value={info.getValue()} />,
    }),
    columnHelper.accessor('profitGrowthYoY', {
      header: 'PAT Gr',
      size: 75, minSize: 60,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <GrowthCell value={info.getValue()} />,
    }),
    columnHelper.accessor('beta', {
      header: 'Beta',
      size: 60, minSize: 50,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <BetaCell value={info.getValue()} />,
    }),
    columnHelper.accessor('week52High', {
      header: '52W H',
      size: 90, minSize: 70,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <Week52HighCell value={info.getValue()} />,
    }),
    columnHelper.accessor('week52Low', {
      header: '52W L',
      size: 90, minSize: 70,
      enableSorting: true,
      sortingFn: 'basic',
      cell: (info) => <Week52LowCell value={info.getValue()} />,
    }),
  ];
}

// ── useVirtualGrid hook ───────────────────────────────────────────────────────
interface UseVirtualGridOptions {
  stocks: Stock[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnVisibility: VisibilityState;
  onOpenChart: (symbol: string) => void;
  rowHeight: number;
}

export function useVirtualGrid({
  stocks, containerRef, sorting, onSortingChange, columnVisibility, onOpenChart, rowHeight,
}: UseVirtualGridOptions) {
  const columns = useMemo(() => buildColumns(onOpenChart), [onOpenChart]);

  const table = useReactTable({
    data: stocks,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getRowId: (row) => row.symbol,
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,         // fixed height → O(1) scroll calc
    overscan: 15,                          // 15 rows above/below viewport
    measureElement: undefined,             // disable variable height measurement
  });

  return { table, rows, rowVirtualizer };
}
