import React, { useMemo, memo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Stock } from '@/types';
import { useRealtimeStore } from '@/stores/realtimeStore';

interface HeatmapViewProps {
  stocks: Stock[];
}

const HeatmapCell = memo(function HeatmapCell({
  stock,
  onClick
}: {
  stock: Stock;
  onClick: (symbol: string) => void;
}) {
  const { highContrastMode } = useUIStore();
  const priceUpdate = useRealtimeStore((s) => s.priceUpdates[stock.symbol]);
  const changePct = priceUpdate?.changePercent ?? stock.changePercent;
  
  // Calculate color based on changePct
  // Max intensity at +/- 5%
  const intensity = Math.min(Math.abs(changePct) / 5, 1);
  
  let bgColor = '';
  if (changePct > 0) {
    // Green
    bgColor = highContrastMode 
      ? `rgba(0, 255, 255, ${0.2 + 0.8 * intensity})`
      : `rgba(34, 197, 94, ${0.2 + 0.8 * intensity})`;
  } else if (changePct < 0) {
    // Red
    bgColor = highContrastMode
      ? `rgba(255, 0, 255, ${0.2 + 0.8 * intensity})`
      : `rgba(239, 68, 68, ${0.2 + 0.8 * intensity})`;
  } else {
    // Gray
    bgColor = 'var(--color-bg-surface-3)';
  }

  // Calculate a proportional flex size (min 1, max 5) based on market cap relative to others
  // Actually, standard flex block is easier: just use flexGrow for a 'treemap' feel
  const flexGrow = Math.max(1, Math.min(10, Math.floor(stock.marketCap / 10000)));

  return (
    <div
      onClick={() => onClick(stock.symbol)}
      className="cursor-pointer transition-transform hover:scale-[1.02] hover:z-10 relative group border border-black/10 overflow-hidden flex flex-col items-center justify-center"
      style={{
        backgroundColor: bgColor,
        flexGrow,
        flexShrink: 0,
        flexBasis: `${Math.max(60, flexGrow * 10)}px`,
        height: `${Math.max(60, flexGrow * 10)}px`,
        minWidth: '60px',
        color: Math.abs(changePct) > 1 || highContrastMode ? '#fff' : 'var(--color-text-primary)'
      }}
      title={`${stock.symbol}: ${changePct.toFixed(2)}%`}
    >
      <span className="font-bold text-xs font-mono mix-blend-difference text-white">{stock.symbol}</span>
      <span className="text-[10px] font-mono mix-blend-difference text-white/80">{changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
    </div>
  );
});

export function HeatmapView({ stocks }: HeatmapViewProps) {
  const { openChart } = useUIStore();
  
  // Limit to top 500 by Market Cap for performance and readability
  const displayStocks = useMemo(() => {
    return [...stocks].sort((a, b) => b.marketCap - a.marketCap).slice(0, 500);
  }, [stocks]);

  return (
    <div className="flex-1 overflow-auto p-1" style={{ background: 'var(--color-bg-base)' }}>
      {displayStocks.length === 0 ? (
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
          No stocks match your filters
        </div>
      ) : (
        <div className="flex flex-wrap align-content-start gap-1 p-1">
          {displayStocks.map(stock => (
            <HeatmapCell key={stock.symbol} stock={stock} onClick={openChart} />
          ))}
        </div>
      )}
    </div>
  );
}
