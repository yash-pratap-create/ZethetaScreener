'use client';

import { memo } from 'react';

// ── Formatting helpers (shared across cells) ──────────────────────────────────
export const fmtINR = (v: number) =>
  '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

export const fmtVol = (v: number) => {
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
};

export const fmtCap = (v: number) => {
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + 'L Cr';
  if (v >= 1000)   return '₹' + (v / 1000).toFixed(1) + 'K Cr';
  return '₹' + v.toFixed(0) + ' Cr';
};

// ── PriceCell ─────────────────────────────────────────────────────────────────
export const PriceCell = memo(
  function PriceCell({ value }: { value: number }) {
    return (
      <span className="font-mono font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
        {fmtINR(value)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── ChangeCell ────────────────────────────────────────────────────────────────
export const ChangeCell = memo(
  function ChangeCell({
    value,
    showAbsolute = false,
    absolute,
  }: {
    value: number;       // percent
    showAbsolute?: boolean;
    absolute?: number;
  }) {
    const isPos = value >= 0;
    const color = isPos ? '#22c55e' : '#ef4444';
    const arrow = isPos ? '▲' : '▼';

    return (
      <span className="font-mono font-semibold tabular-nums flex items-center gap-1" style={{ color }}>
        <span style={{ fontSize: '0.6em' }}>{arrow}</span>
        {fmtPct(value)}
        {showAbsolute && absolute !== undefined && (
          <span className="text-xs opacity-70">{fmtINR(Math.abs(absolute))}</span>
        )}
      </span>
    );
  },
  (prev, next) => prev.value === next.value && prev.absolute === next.absolute && prev.showAbsolute === next.showAbsolute,
);

// ── VolumeCell ────────────────────────────────────────────────────────────────
export const VolumeCell = memo(
  function VolumeCell({
    value,
    avgVolume,
  }: {
    value: number;
    avgVolume?: number;
  }) {
    const ratio = avgVolume ? value / avgVolume : 1;
    const isHigh = ratio >= 2;

    return (
      <span
        className="font-mono text-sm tabular-nums"
        style={{ color: isHigh ? '#f59e0b' : 'var(--color-text-secondary)', fontWeight: isHigh ? 600 : 400 }}
      >
        {fmtVol(value)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value && prev.avgVolume === next.avgVolume,
);

// ── MarketCapCell ─────────────────────────────────────────────────────────────
export const MarketCapCell = memo(
  function MarketCapCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
        {fmtCap(value)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── RSICell ───────────────────────────────────────────────────────────────────
export const RSICell = memo(
  function RSICell({ value }: { value: number }) {
    const color =
      value > 70 ? '#ef4444' :
      value < 30 ? '#22c55e' :
      'var(--color-text-secondary)';
    const label = value > 70 ? 'OB' : value < 30 ? 'OS' : '';

    return (
      <span className="font-mono text-sm tabular-nums" style={{ color }}>
        {value.toFixed(1)}
        {label && <span className="text-xs ml-1 opacity-70">{label}</span>}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── BadgeCell (for enum fields: MACD, Bollinger, VolumeVsAvg) ─────────────────
export const BadgeCell = memo(
  function BadgeCell({
    value,
    colorMap,
  }: {
    value: string;
    colorMap: Record<string, { bg: string; text: string }>;
  }) {
    const style = colorMap[value] ?? { bg: 'transparent', text: 'var(--color-text-muted)' };
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-semibold"
        style={{ background: style.bg, color: style.text }}
      >
        {value}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── SymbolCell ─────────────────────────────────────────────────────────────────
export const SymbolCell = memo(
  function SymbolCell({ value, onOpenChart }: { value: string; onOpenChart: (s: string) => void }) {
    return (
      <button
        onClick={() => onOpenChart(value)}
        className="font-mono font-bold hover:underline text-left"
        style={{ color: 'var(--color-accent-primary)' }}
        aria-label={`Open chart for ${value}`}
      >
        {value}
      </button>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── CompanyCell ────────────────────────────────────────────────────────────────
export const CompanyCell = memo(
  function CompanyCell({ value }: { value: string }) {
    return (
      <span className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }} title={value}>
        {value}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── SectorBadgeCell ───────────────────────────────────────────────────────────
export const SectorBadgeCell = memo(
  function SectorBadgeCell({ value }: { value: string }) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-surface-3)', color: 'var(--color-text-muted)' }}>
        {value}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── CapBadgeCell ──────────────────────────────────────────────────────────────
const CAP_COLORS: Record<string, string> = {
  'Large Cap': '#4f8ef7', 'Mid Cap': '#818cf8',
  'Small Cap': '#a78bfa', 'Micro Cap': 'var(--color-text-muted)',
};

export const CapBadgeCell = memo(
  function CapBadgeCell({ value }: { value: string }) {
    return (
      <span className="text-xs font-semibold" style={{ color: CAP_COLORS[value] }}>
        {value.replace(' Cap', '')}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── PeCell ────────────────────────────────────────────────────────────────────
export const PeCell = memo(
  function PeCell({ value }: { value: number | null }) {
    return (
      <span className="font-mono text-sm tabular-nums">
        {value == null ? '—' : value.toFixed(1)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── PbCell ────────────────────────────────────────────────────────────────────
export const PbCell = memo(
  function PbCell({ value }: { value: number }) {
    return <span className="font-mono text-sm tabular-nums">{value.toFixed(2)}</span>;
  },
  (prev, next) => prev.value === next.value,
);

// ── RoeCell ───────────────────────────────────────────────────────────────────
export const RoeCell = memo(
  function RoeCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums" style={{ color: value >= 15 ? '#22c55e' : value < 0 ? '#ef4444' : 'inherit' }}>
        {value.toFixed(1)}%
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── RoceCell ──────────────────────────────────────────────────────────────────
export const RoceCell = memo(
  function RoceCell({ value }: { value: number }) {
    return <span className="font-mono text-sm tabular-nums">{value.toFixed(1)}%</span>;
  },
  (prev, next) => prev.value === next.value,
);

// ── PromoterCell ──────────────────────────────────────────────────────────────
export const PromoterCell = memo(
  function PromoterCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums" style={{ color: value >= 50 ? '#22c55e' : 'inherit' }}>
        {value.toFixed(1)}%
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── DividendYieldCell ─────────────────────────────────────────────────────────
export const DividendYieldCell = memo(
  function DividendYieldCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums">
        {value > 0 ? value.toFixed(2) + '%' : '—'}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── DebtCell ──────────────────────────────────────────────────────────────────
export const DebtCell = memo(
  function DebtCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums" style={{ color: value > 2 ? '#ef4444' : 'inherit' }}>
        {value.toFixed(2)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── GrowthCell (revenue/profit growth) ────────────────────────────────────────
export const GrowthCell = memo(
  function GrowthCell({ value }: { value: number }) {
    return (
      <span className="font-mono text-sm tabular-nums" style={{ color: value >= 0 ? '#22c55e' : '#ef4444' }}>
        {fmtPct(value)}
      </span>
    );
  },
  (prev, next) => prev.value === next.value,
);

// ── BetaCell ──────────────────────────────────────────────────────────────────
export const BetaCell = memo(
  function BetaCell({ value }: { value: number }) {
    return <span className="font-mono text-sm tabular-nums">{value.toFixed(2)}</span>;
  },
  (prev, next) => prev.value === next.value,
);

// ── Week52Cell (52-week high/low) ─────────────────────────────────────────────
export const Week52HighCell = memo(
  function Week52HighCell({ value }: { value: number }) {
    return <span className="font-mono text-sm tabular-nums text-green-400">{fmtINR(value)}</span>;
  },
  (prev, next) => prev.value === next.value,
);

export const Week52LowCell = memo(
  function Week52LowCell({ value }: { value: number }) {
    return <span className="font-mono text-sm tabular-nums text-red-400">{fmtINR(value)}</span>;
  },
  (prev, next) => prev.value === next.value,
);

// ── Colour maps for enum badges ───────────────────────────────────────────────
export const MACD_COLORS: Record<string, { bg: string; text: string }> = {
  Bullish: { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
  Bearish: { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' },
  Neutral: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
};

export const BB_COLORS: Record<string, { bg: string; text: string }> = {
  Above:  { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  Within: { bg: 'rgba(79,142,247,0.12)',  text: '#4f8ef7' },
  Below:  { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
};

export const VOL_COLORS: Record<string, { bg: string; text: string }> = {
  '3x':   { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
  '2x':   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  Above:  { bg: 'rgba(79,142,247,0.12)', text: '#4f8ef7' },
  Below:  { bg: 'transparent',            text: 'var(--color-text-muted)' },
};
