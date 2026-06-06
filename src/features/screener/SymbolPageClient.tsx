'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { Stock, ChartTimeframe } from '@/types';
import { usePriceUpdate, useFlash, useConnectionStatus, useRealtimeStore } from '@/stores/realtimeStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI, OHLCVBar } from '@/lib/indicators';

interface SymbolPageClientProps {
  stock: Stock;
}

interface FundDetails {
  balanceSheet: {
    year: string;
    totalAssets: number;
    totalLiabilities: number;
    shareholdersEquity: number;
  }[];
  incomeStatement: {
    year: string;
    revenue: number;
    ebitda: number;
    netIncome: number;
  }[];
  ratios: {
    currentRatio: number;
    debtToEquity: number;
    interestCoverage: number;
  };
}

const TIMEFRAME_CONFIG: Record<
  ChartTimeframe,
  { label: string; bars: number; interval: number }
> = {
  '1D':  { label: '1 Day',   bars: 390, interval: 60 },      // 1-min bars (intraday)
  '1W':  { label: '1 Week',  bars: 250, interval: 1800 },    // 30-min bars
  '1M':  { label: '1 Month', bars: 220, interval: 7200 },    // 2-hour bars
  '3M':  { label: '3 Months', bars: 250, interval: 86400 },   // 1-day bars (minimum 252 days)
  '6M':  { label: '6 Months', bars: 130, interval: 86400 * 2 }, // 2-day bars
  '1Y':  { label: '1 Year',   bars: 252, interval: 86400 },   // 1-day bars (standard financial year)
};

// Intraday standard random walk
function generateCandlestickData(
  basePrice: number,
  count: number,
  startTime: number,
  interval: number,
) {
  const candles: { time: number; open: number; high: number; low: number; close: number }[] = [];
  const volumes: { time: number; value: number; color: string }[] = [];
  let currentPrice = basePrice * 0.95; // start lower for positive slope

  for (let i = 0; i < count; i++) {
    const time = startTime + i * interval;
    // Box-Muller random shock
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random() || 0.0001;
    const shock = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const priceChange = currentPrice * (0.0008 + shock * 0.006); // upward drift
    const open = currentPrice;
    const close = currentPrice + priceChange;
    const high = Math.max(open, close) + currentPrice * (Math.random() * 0.004);
    const low = Math.min(open, close) - currentPrice * (Math.random() * 0.004);

    candles.push({ time, open, high, low, close });

    const isUp = close >= open;
    const color = isUp ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const volBase = 50000 + Math.random() * 200000;
    const volValue = Math.round(volBase * (1.0 + Math.abs(priceChange) / currentPrice * 12.0));
    volumes.push({ time, value: volValue, color });

    currentPrice = close;
  }

  return { candles, volumes };
}

export function SymbolPageClient({ stock: baseStock }: SymbolPageClientProps) {
  const symbol = baseStock.symbol.toUpperCase();
  const livePrice = usePriceUpdate(symbol);
  const flash = useFlash(symbol);
  const connStatus = useConnectionStatus();

  // Combine initial stock details with real-time WebSocket price updates
  const stock = useMemo(() => {
    if (!livePrice) return baseStock;
    return { ...baseStock, ...livePrice } as Stock;
  }, [baseStock, livePrice]);

  const { watchlists, toggleWatch, isWatched } = useWatchlistStore();
  const watched = isWatched(symbol);

  // Fundamentals fetch
  const { data: fundamentals, isLoading: funLoading } = useQuery<{ success: boolean; data: FundDetails }>({
    queryKey: ['stock', symbol, 'fundamentals'],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/fundamentals`);
      if (!res.ok) throw new Error('Failed to fetch fundamentals');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Chart setup states
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('3M');
  const [showTable, setShowTable] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [barsData, setBarsData] = useState<OHLCVBar[]>([]);

  // Indicators toggle
  const [activeIndicators, setActiveIndicators] = useState<Record<string, boolean>>({
    sma50: false,
    sma200: false,
    ema20: true,
    bollinger: false,
    volumeProfile: true,
  });

  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const vpCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);

  const seriesRefs = useRef<{
    candle: ISeriesApi<'Candlestick'> | null;
    volume: ISeriesApi<'Histogram'> | null;
    sma50: ISeriesApi<'Line'> | null;
    sma200: ISeriesApi<'Line'> | null;
    ema20: ISeriesApi<'Line'> | null;
    bbUpper: ISeriesApi<'Line'> | null;
    bbMiddle: ISeriesApi<'Line'> | null;
    bbLower: ISeriesApi<'Line'> | null;
    rsi: ISeriesApi<'Line'> | null;
  }>({
    candle: null,
    volume: null,
    sma50: null,
    sma200: null,
    ema20: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    rsi: null,
  });

  // Toggle active indicator helper
  const toggleIndicator = useCallback((ind: string) => {
    setActiveIndicators((prev) => ({ ...prev, [ind]: !prev[ind] }));
  }, []);

  // Sync timeframe data loading
  const loadData = useCallback(() => {
    const cfg = TIMEFRAME_CONFIG[timeframe];
    const now = Math.floor(Date.now() / 1000);
    const { candles, volumes } = generateCandlestickData(
      stock.lastPrice, cfg.bars, now - cfg.bars * cfg.interval, cfg.interval,
    );
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const bars: OHLCVBar[] = sorted.map((c, i) => ({
      ...c,
      volume: volumes[i]?.value ?? 0,
    }));

    setBarsData(bars);
    setFocusedIndex(bars.length - 1);
  }, [stock.lastPrice, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Volume Profile rendering helper
  const drawVolumeProfile = useCallback((bars: OHLCVBar[]) => {
    if (!vpCanvasRef.current || !activeIndicators.volumeProfile || bars.length === 0) {
      if (vpCanvasRef.current) {
        const ctx = vpCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, vpCanvasRef.current.width, vpCanvasRef.current.height);
      }
      return;
    }

    const canvas = vpCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic scale based on canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Split prices into 24 profile buckets (Volume Profile strip)
    const prices = bars.map((b) => b.close);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const bucketsCount = 24;
    const bucketSize = range / bucketsCount;

    const buckets = Array.from({ length: bucketsCount }, () => ({ buyVol: 0, sellVol: 0, total: 0 }));

    bars.forEach((b) => {
      const idx = Math.min(
        bucketsCount - 1,
        Math.floor((b.close - minP) / bucketSize),
      );
      const isUp = b.close >= b.open;
      const vol = b.volume ?? 0;
      if (isUp) {
        buckets[idx].buyVol += vol;
      } else {
        buckets[idx].sellVol += vol;
      }
      buckets[idx].total += vol;
    });

    const maxVol = Math.max(...buckets.map((b) => b.total)) || 1;
    const barHeight = canvas.height / bucketsCount;

    // Draw horizontal volume distribution bars from the left side
    for (let i = 0; i < bucketsCount; i++) {
      const b = buckets[i];
      const yTop = canvas.height - (i + 1) * barHeight;
      const barWidth = (b.total / maxVol) * (canvas.width * 0.25); // max 25% width
      const xStart = 0;

      const buyRatio = b.total > 0 ? b.buyVol / b.total : 0.5;
      const buyWidth = barWidth * buyRatio;
      const sellWidth = barWidth - buyWidth;

      if (sellWidth > 0) {
        ctx.fillStyle = highContrastMode ? 'rgba(255, 0, 255, 0.22)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(xStart, yTop, sellWidth, barHeight - 1);
      }
      if (buyWidth > 0) {
        ctx.fillStyle = highContrastMode ? 'rgba(0, 255, 255, 0.22)' : 'rgba(34, 197, 94, 0.22)';
        ctx.fillRect(xStart + sellWidth, yTop, buyWidth, barHeight - 1);
      }
    }
  }, [activeIndicators.volumeProfile, highContrastMode]);

  // Redraw overlays when indicator states, bars, or color mode changes
  const updateOverlays = useCallback((bars: OHLCVBar[]) => {
    if (!seriesRefs.current.candle || bars.length === 0) return;

    const toTime = (t: number) => t as import('lightweight-charts').Time;

    // EMA 20 Overlay
    if (activeIndicators.ema20 && seriesRefs.current.ema20) {
      const emaData = calculateEMA(bars, 20);
      seriesRefs.current.ema20.setData(emaData.map((d) => ({ time: toTime(d.time), value: d.value })));
    } else if (seriesRefs.current.ema20) {
      seriesRefs.current.ema20.setData([]);
    }

    // SMA 50 Overlay
    if (activeIndicators.sma50 && seriesRefs.current.sma50) {
      const sma50Data = calculateSMA(bars, 50);
      seriesRefs.current.sma50.setData(sma50Data.map((d) => ({ time: toTime(d.time), value: d.value })));
    } else if (seriesRefs.current.sma50) {
      seriesRefs.current.sma50.setData([]);
    }

    // SMA 200 Overlay
    if (activeIndicators.sma200 && seriesRefs.current.sma200) {
      const sma200Data = calculateSMA(bars, 200);
      seriesRefs.current.sma200.setData(sma200Data.map((d) => ({ time: toTime(d.time), value: d.value })));
    } else if (seriesRefs.current.sma200) {
      seriesRefs.current.sma200.setData([]);
    }

    // Bollinger Bands
    if (activeIndicators.bollinger && seriesRefs.current.bbUpper && seriesRefs.current.bbMiddle && seriesRefs.current.bbLower) {
      const bbData = calculateBollingerBands(bars, 20, 2);
      seriesRefs.current.bbUpper.setData(bbData.map((d) => ({ time: toTime(d.time), value: d.upper })));
      seriesRefs.current.bbMiddle.setData(bbData.map((d) => ({ time: toTime(d.time), value: d.middle })));
      seriesRefs.current.bbLower.setData(bbData.map((d) => ({ time: toTime(d.time), value: d.lower })));
    } else {
      if (seriesRefs.current.bbUpper) seriesRefs.current.bbUpper.setData([]);
      if (seriesRefs.current.bbMiddle) seriesRefs.current.bbMiddle.setData([]);
      if (seriesRefs.current.bbLower) seriesRefs.current.bbLower.setData([]);
    }

    // RSI sub-chart
    if (seriesRefs.current.rsi) {
      const rsiPoints = calculateRSI(bars, 14);
      seriesRefs.current.rsi.setData(rsiPoints.map((d) => ({ time: toTime(d.time), value: d.value })));
    }

    drawVolumeProfile(bars);
  }, [activeIndicators, drawVolumeProfile]);

  // Initialise charts
  useEffect(() => {
    if (showTable || !mainRef.current || !rsiRef.current) return;

    // Main Chart setup
    const chart = createChart(mainRef.current, {
      layout: {
        background: { color: 'var(--color-bg-surface-2, #181c20)' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
    });
    mainChart.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: highContrastMode ? '#00ffff' : '#22c55e',
      downColor: highContrastMode ? '#ff00ff' : '#ef4444',
      wickUpColor: highContrastMode ? '#00ffff' : '#22c55e',
      wickDownColor: highContrastMode ? '#ff00ff' : '#ef4444',
      borderVisible: false,
    });
    seriesRefs.current.candle = candleSeries;

    // Batch indicator line additions
    seriesRefs.current.ema20 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'EMA(20)' });
    seriesRefs.current.sma50 = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'SMA(50)' });
    seriesRefs.current.sma200 = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2, title: 'SMA(200)' });
    seriesRefs.current.bbUpper = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.65)', lineWidth: 1, lineStyle: 2 });
    seriesRefs.current.bbMiddle = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.4)', lineWidth: 1 });
    seriesRefs.current.bbLower = chart.addSeries(LineSeries, { color: 'rgba(99, 102, 241, 0.65)', lineWidth: 1, lineStyle: 2 });

    // RSI sub-chart setup
    const rsiSubChart = createChart(rsiRef.current, {
      layout: {
        background: { color: 'var(--color-bg-surface-2, #181c20)' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
    });
    rsiChart.current = rsiSubChart;

    const rsiLineSeries = rsiSubChart.addSeries(LineSeries, {
      color: '#fb7185',
      lineWidth: 2,
      priceScaleId: 'right',
    });
    seriesRefs.current.rsi = rsiLineSeries;

    // Sync scales
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) rsiSubChart.timeScale().setVisibleLogicalRange(range);
    });
    rsiSubChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) chart.timeScale().setVisibleLogicalRange(range);
    });

    // Populate data
    if (barsData.length > 0) {
      const toTime = (t: number) => t as import('lightweight-charts').Time;
      candleSeries.setData(
        barsData.map((b) => ({ time: toTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close })),
      );
      updateOverlays(barsData);
    }

    // Resize triggers
    const resizeObserver = new ResizeObserver(() => {
      if (mainRef.current && mainChart.current) mainChart.current.resize(mainRef.current.clientWidth, mainRef.current.clientHeight);
      if (rsiRef.current && rsiChart.current) rsiChart.current.resize(rsiRef.current.clientWidth, rsiRef.current.clientHeight);
      if (barsData.length > 0) drawVolumeProfile(barsData);
    });
    if (mainRef.current) resizeObserver.observe(mainRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      rsiSubChart.remove();
      mainChart.current = null;
      rsiChart.current = null;
    };
  }, [showTable, highContrastMode, barsData, updateOverlays, drawVolumeProfile]);

  // Synchronise overlay redraws when overlays states toggle
  useEffect(() => {
    if (!showTable && barsData.length > 0) {
      updateOverlays(barsData);
    }
  }, [activeIndicators, barsData, showTable, updateOverlays]);

  // Keyboard Chart crosshair navigation (ArrowLeft, ArrowRight, Enter for announcement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!barsData.length || focusedIndex === null) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, (prev ?? barsData.length - 1) - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(barsData.length - 1, (prev ?? 0) + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const candle = barsData[focusedIndex];
        if (candle) {
          const dateStr = new Date(candle.time * 1000).toLocaleDateString();
          const msg = `${symbol} focused candle for ${dateStr}: Open ${candle.open.toFixed(2)}, High ${candle.high.toFixed(2)}, Low ${candle.low.toFixed(2)}, Close ${candle.close.toFixed(2)}, Volume ${(candle.volume ?? 0).toLocaleString()}.`;
          useRealtimeStore.getState().setAnnouncement(msg);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barsData, focusedIndex, symbol]);

  // Display metadata for active candle or live details
  const activeCandle = focusedIndex !== null && barsData[focusedIndex] ? barsData[focusedIndex] : null;
  const displayInfo = activeCandle
    ? { o: activeCandle.open, h: activeCandle.high, l: activeCandle.low, c: activeCandle.close, v: activeCandle.volume }
    : { o: stock.dayOpen, h: stock.dayHigh, l: stock.dayLow, c: stock.lastPrice, v: stock.volume };

  const diffAbsolute = stock.changeAbsolute;
  const diffPercent = stock.changePercent;
  const isUp = diffPercent >= 0;

  // Flash styling triggers
  const getFlashStyle = () => {
    if (!flash) return {};
    const color = flash.direction === 'up'
      ? 'rgba(34, 197, 94, 0.22)'
      : 'rgba(239, 68, 68, 0.22)';
    return { backgroundColor: color, transition: 'background-color 0.15s ease' };
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      
      {/* Breadcrumb Navigation & Star Watchlist */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-accent-primary transition-colors">Screener</Link>
          <span>/</span>
          <span className="text-text-primary font-semibold">{symbol} Details</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleWatch(symbol)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:bg-hover/10"
            style={{
              borderColor: watched ? '#f59e0b' : 'var(--color-border)',
              color: watched ? '#f59e0b' : 'var(--color-text-secondary)',
              background: watched ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
            }}
            aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={watched ? '#f59e0b' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {watched ? 'Watched' : 'Watch'}
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs font-semibold hover:bg-hover/10 transition-colors"
          >
            Back to Grid
          </Link>
        </div>
      </div>

      {/* Corporate Meta Header and Real-time Pricing */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 rounded-xl border border-border bg-surface-2 gap-6" style={getFlashStyle()}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight font-mono">{symbol}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-3 border border-border text-text-secondary font-medium">{stock.sector}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-medium">{stock.marketCapCategory}</span>
          </div>
          <p className="text-sm text-text-secondary font-medium">{stock.companyName} • <span className="text-text-muted">{stock.industry}</span></p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Listed on {stock.exchange}</p>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tracking-tight text-text-primary">
              ₹{stock.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-semibold font-mono flex items-center ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(diffAbsolute).toFixed(2)} ({isUp ? '+' : ''}{diffPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted uppercase font-bold">
            <span className={`w-2 h-2 rounded-full ${connStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {connStatus === 'connected' ? 'Live WebSocket Price Feed' : 'Connecting WebSocket...'}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart & Sidebar Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Visual Chart panel */}
        <div className="xl:col-span-3 flex flex-col p-4 rounded-xl border border-border bg-surface-2 space-y-4" style={{ minHeight: '520px' }}>
          
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Timeframes */}
              <div className="flex border border-border rounded-lg p-0.5 bg-surface-3">
                {(Object.keys(TIMEFRAME_CONFIG) as ChartTimeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => { setTimeframe(tf); setFocusedIndex(null); }}
                    className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${
                      timeframe === tf
                        ? 'bg-accent-primary text-white font-bold shadow'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* High Contrast */}
              <button
                onClick={() => setHighContrastMode((p) => !p)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                  highContrastMode
                    ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                    : 'border-border text-text-muted hover:text-text-primary'
                }`}
              >
                High Contrast
              </button>

              {/* Data Table swap */}
              <button
                onClick={() => setShowTable((p) => !p)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                  showTable
                    ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                    : 'border-border text-text-muted hover:text-text-primary'
                }`}
              >
                {showTable ? 'View Chart' : 'View Table'}
              </button>
            </div>

            {/* Overlays Toggles */}
            {!showTable && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(activeIndicators).map(([key, active]) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                      active
                        ? 'bg-surface-3 border border-accent-primary/40 text-accent-primary font-bold'
                        : 'bg-surface-3/50 border border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {key === 'volumeProfile' ? 'Vol Prof' : key.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Displays active crosshair metrics */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-surface-3 px-3 py-2 rounded-lg text-xs font-mono border border-border/60">
            <span className="text-text-muted uppercase text-[9px] font-bold font-sans">Metrics:</span>
            <span className="text-text-secondary">O: <strong className="text-text-primary">{displayInfo.o?.toFixed(2)}</strong></span>
            <span className="text-text-secondary">H: <strong className="text-green-400">{displayInfo.h?.toFixed(2)}</strong></span>
            <span className="text-text-secondary">L: <strong className="text-red-400">{displayInfo.l?.toFixed(2)}</strong></span>
            <span className="text-text-secondary">C: <strong className="text-text-primary" style={{ fontWeight: 700 }}>{displayInfo.c?.toFixed(2)}</strong></span>
            <span className="text-text-secondary">V: <strong className="text-text-primary">{(displayInfo.v ?? 0).toLocaleString()}</strong></span>
            {activeCandle && (
              <span className="text-[10px] text-accent-primary bg-accent-primary/5 px-1.5 py-0.5 rounded uppercase font-bold font-sans ml-auto">Keyboard Navigating</span>
            )}
          </div>

          {/* Swaps Lightweight Chart canvas with Accessible <table> grid */}
          {showTable ? (
            <div className="flex-1 overflow-auto max-h-[380px] border border-border rounded-lg bg-surface-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-2 text-text-secondary sticky top-0 border-b border-border z-10 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5">Open</th>
                    <th className="py-2.5 text-green-400">High</th>
                    <th className="py-2.5 text-red-400">Low</th>
                    <th className="py-2.5">Close</th>
                    <th className="py-2.5 px-3">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {barsData.map((bar, idx) => (
                    <tr key={idx} className="border-b hover:bg-hover/10" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2 px-3 font-mono">{new Date(bar.time * 1000).toLocaleDateString()} {new Date(bar.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 font-mono">{bar.open.toFixed(2)}</td>
                      <td className="py-2 text-green-400 font-mono" style={{ color: highContrastMode ? '#00ffff' : '#22c55e' }}>{bar.high.toFixed(2)}</td>
                      <td className="py-2 text-red-400 font-mono" style={{ color: highContrastMode ? '#ff00ff' : '#ef4444' }}>{bar.low.toFixed(2)}</td>
                      <td className="py-2 font-mono" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{bar.close.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono">{(bar.volume ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4 min-h-[340px]">
              {/* Candlestick main canvas */}
              <div className="flex-[3] relative border border-border/40 rounded-lg overflow-hidden min-h-[220px]">
                <div ref={mainRef} className="absolute inset-0" />
                <canvas
                  ref={vpCanvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 2 }}
                />
              </div>
              {/* Synced RSI sub-chart */}
              <div className="flex-[1] relative border border-border/40 rounded-lg overflow-hidden min-h-[90px]">
                <div ref={rsiRef} className="absolute inset-0" />
                <div className="absolute top-2 left-2 text-[9px] uppercase tracking-wider font-bold bg-surface-2/80 px-1.5 py-0.5 rounded text-accent-secondary" style={{ zIndex: 5, color: '#fb7185' }}>RSI (14)</div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Key Fundamental Metrics */}
        <div className="xl:col-span-1 p-5 rounded-xl border border-border bg-surface-2 flex flex-col space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary border-b border-border pb-2">Technical Stats</h2>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-4 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">RSI (14)</span>
              <span className="font-mono font-bold text-text-primary">{stock.rsi14.toFixed(1)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Beta</span>
              <span className="font-mono font-bold text-text-primary">{stock.beta.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">ATR</span>
              <span className="font-mono font-bold text-text-primary">₹{stock.atr.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">MACD Signal</span>
              <span className={`font-semibold font-mono ${stock.macdSignal === 'Bullish' ? 'text-green-400' : stock.macdSignal === 'Bearish' ? 'text-red-400' : 'text-text-secondary'}`}>
                {stock.macdSignal}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Bollinger Position</span>
              <span className="font-semibold font-mono text-text-primary">{stock.bollingerPosition}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Volume vs Avg</span>
              <span className="font-semibold font-mono text-text-primary">{stock.volumeVsAvg}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">SMA (50)</span>
              <span className="font-mono font-bold text-text-primary">₹{stock.sma50.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">SMA (200)</span>
              <span className="font-mono font-bold text-text-primary">₹{stock.sma200.toFixed(2)}</span>
            </div>
          </div>
          
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary border-b border-border pb-2 pt-2">Fundamentals</h2>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-4 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Market Cap</span>
              <span className="font-mono font-bold text-text-primary">₹{stock.marketCap.toLocaleString()} Cr</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">P/E Ratio</span>
              <span className="font-mono font-bold text-text-primary">{stock.pe ? stock.pe.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">P/B Ratio</span>
              <span className="font-mono font-bold text-text-primary">{stock.pb.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Div Yield</span>
              <span className="font-mono font-bold text-text-primary">{stock.dividendYield.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">Promoter Holding</span>
              <span className="font-mono font-bold text-text-primary">{stock.promoterHolding.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2 xl:pb-1">
              <span className="text-text-muted">FCF (₹ Cr)</span>
              <span className="font-mono font-bold text-text-primary">₹{stock.freeCashFlow.toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Extended Fundamentals grid */}
      <div className="p-6 rounded-xl border border-border bg-surface-2 space-y-4">
        <h2 className="text-md font-bold uppercase tracking-wider text-text-primary border-b border-border pb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Comprehensive Financial Ratios & Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Return on Equity</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.roe.toFixed(2)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">ROCE</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.roce.toFixed(2)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Debt to Equity</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.debtToEquity.toFixed(2)}</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Current Ratio</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.currentRatio.toFixed(2)}</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Gross Margin</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.grossMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Net Margin</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.netMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">EPS</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">₹{stock.eps.toFixed(2)}</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">EV/EBITDA</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.evEbitda.toFixed(2)}</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Revenue Growth YoY</p>
            <p className="text-md font-extrabold font-mono text-green-400 mt-1">{stock.revenueGrowthYoY.toFixed(1)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Profit Growth YoY</p>
            <p className="text-md font-extrabold font-mono text-green-400 mt-1">{stock.profitGrowthYoY.toFixed(1)}%</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">Avg Vol (20D)</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.avgVolume20D.toLocaleString()}</p>
          </div>
          <div className="bg-surface-3 p-3 rounded-lg border border-border/50">
            <p className="text-[10px] text-text-muted uppercase font-bold">52w High Proximity</p>
            <p className="text-md font-extrabold font-mono text-text-primary mt-1">{stock.week52HighProximity.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Dynamic 3-Year Historical Statements Grid ( fetches from /api/stocks/:symbol/fundamentals ) */}
      <div className="p-6 rounded-xl border border-border bg-surface-2 space-y-4">
        <h2 className="text-md font-bold uppercase tracking-wider text-text-primary border-b border-border pb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          Three-Year Historical Financial Statements (FY24 - FY26)
        </h2>

        {funLoading ? (
          <div className="flex flex-col gap-2 py-4 animate-pulse">
            <div className="h-6 bg-surface-3 rounded w-1/3" />
            <div className="h-16 bg-surface-3 rounded" />
          </div>
        ) : fundamentals?.success && fundamentals.data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Balance Sheet Statements */}
            <div className="border border-border/60 rounded-xl bg-surface-3 p-4">
              <h3 className="text-xs font-bold uppercase text-accent-primary mb-3">Balance Sheets Statement (₹ Cr)</h3>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border text-[10px] text-text-muted uppercase font-bold">
                    <th className="py-2">Line Item</th>
                    {fundamentals.data.balanceSheet.map((bs) => (
                      <th key={bs.year} className="text-right py-2">{bs.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-semibold text-text-secondary">Total Assets</td>
                    {fundamentals.data.balanceSheet.map((bs) => (
                      <td key={bs.year} className="text-right text-text-primary">{bs.totalAssets.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-semibold text-text-secondary">Total Liabilities</td>
                    {fundamentals.data.balanceSheet.map((bs) => (
                      <td key={bs.year} className="text-right text-text-primary">{bs.totalLiabilities.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-bold text-text-primary">Shareholders Equity</td>
                    {fundamentals.data.balanceSheet.map((bs) => (
                      <td key={bs.year} className="text-right text-green-400 font-extrabold">{bs.shareholdersEquity.toLocaleString()}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Income Statement Statements */}
            <div className="border border-border/60 rounded-xl bg-surface-3 p-4">
              <h3 className="text-xs font-bold uppercase text-accent-primary mb-3">Income Statements (₹ Cr)</h3>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border text-[10px] text-text-muted uppercase font-bold">
                    <th className="py-2">Line Item</th>
                    {fundamentals.data.incomeStatement.map((is) => (
                      <th key={is.year} className="text-right py-2">{is.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-semibold text-text-secondary">Total Revenue</td>
                    {fundamentals.data.incomeStatement.map((is) => (
                      <td key={is.year} className="text-right text-text-primary">{is.revenue.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-semibold text-text-secondary">EBITDA</td>
                    {fundamentals.data.incomeStatement.map((is) => (
                      <td key={is.year} className="text-right text-text-primary">{is.ebitda.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 font-bold text-text-primary">Net Income (P&L)</td>
                    {fundamentals.data.incomeStatement.map((is) => (
                      <td key={is.year} className="text-right text-green-400 font-extrabold">{is.netIncome.toLocaleString()}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <p className="text-xs text-red-400">Unable to load dynamic financial statements.</p>
        )}
      </div>

    </div>
  );
}
