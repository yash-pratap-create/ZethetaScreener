'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
} from 'lightweight-charts';
import { generateCandlestickData } from '@/lib/mockDataGenerator';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateVolumeProfile,
  OHLCVBar,
} from '@/lib/indicators';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useUIStore } from '@/stores/uiStore';
import type { ChartTimeframe } from '@/types';

// ── Timeframe config ──────────────────────────────────────────────────────────
const TIMEFRAME_CONFIG: Record<ChartTimeframe, { bars: number; interval: number; label: string }> = {
  '1D': { bars: 78,  interval: 5 * 60,      label: '5m'  },
  '1W': { bars: 168, interval: 60 * 60,     label: '1h'  },
  '1M': { bars: 120, interval: 4 * 60 * 60, label: '4h'  },
  '3M': { bars: 90,  interval: 86400,       label: '1D'  },
  '6M': { bars: 130, interval: 86400,       label: '1D'  },
  '1Y': { bars: 250, interval: 86400,       label: '1D'  },
};

type IndicatorKey = 'sma20' | 'sma50' | 'sma200' | 'ema12' | 'ema26' | 'bb' | 'rsi' | 'volume' | 'vp';

interface ChartModalProps {
  symbol: string;
  onClose: () => void;
}

export function ChartModal({ symbol, onClose }: ChartModalProps) {
  // ── Refs ────────────────────────────────────────────────────────────────────
  const mainRef    = useRef<HTMLDivElement>(null);
  const rsiRef     = useRef<HTMLDivElement>(null);
  const vpCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainChart  = useRef<IChartApi | null>(null);
  const rsiChart   = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<Record<string, ISeriesApi<any>>>({});
  const drawVolumeProfileRef = useRef<((bars: OHLCVBar[]) => void) | null>(null);
  const barsDataRef = useRef<OHLCVBar[]>([]);

  // ── State ───────────────────────────────────────────────────────────────────
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('3M');
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(
    new Set(['sma20', 'sma50', 'bb', 'rsi', 'volume', 'vp']),
  );
  const [priceInfo, setPriceInfo] = useState<{ o: number; h: number; l: number; c: number } | null>(null);
  const [barsData, setBarsData] = useState<OHLCVBar[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const { theme, highContrastMode, toggleHighContrast } = useUIStore();
  const isDark = theme === 'dark';

  // High contrast mode up/down colors (cyan and magenta) avoiding red-green
  const upColor = highContrastMode ? '#00ffff' : '#22c55e';
  const downColor = highContrastMode ? '#ff00ff' : '#ef4444';

  // ── Chart colours ────────────────────────────────────────────────────────────
  const C = {
    bg:       isDark ? '#111520' : '#ffffff',
    bgPane:   isDark ? '#0d1117' : '#f8f9fc',
    text:     isDark ? '#9ba3b8' : '#4a5278',
    grid:     isDark ? '#1e2438' : '#eaecf4',
    border:   isDark ? '#2a3150' : '#d0d5e8',
    up:       upColor,
    down:     downColor,
    sma20:    '#f59e0b',
    sma50:    '#4f8ef7',
    sma200:   '#c084fc',
    ema12:    '#34d399',
    ema26:    '#fb923c',
    bbFill:   isDark ? 'rgba(124,110,247,0.08)' : 'rgba(124,110,247,0.06)',
    bbLine:   'rgba(124,110,247,0.55)',
    rsiLine:  '#4f8ef7',
    rsiOB:    highContrastMode ? '#ff00ff' : '#ef4444',
    rsiOS:    highContrastMode ? '#00ffff' : '#22c55e',
  };

  // ── Toggle indicator ─────────────────────────────────────────────────────────
  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Update overlay series ────────────────────────────────────────────────────
  const updateOverlays = useCallback((bars: OHLCVBar[]) => {
    const toTime = (t: number) => t as import('lightweight-charts').Time;

    // SMA 20
    if (seriesRefs.current.sma20) {
      const data = calculateSMA(bars, 20).map((p) => ({ time: toTime(p.time), value: p.value }));
      seriesRefs.current.sma20.setData(data);
    }
    // SMA 50
    if (seriesRefs.current.sma50) {
      const data = calculateSMA(bars, 50).map((p) => ({ time: toTime(p.time), value: p.value }));
      seriesRefs.current.sma50.setData(data);
    }
    // SMA 200
    if (seriesRefs.current.sma200) {
      const data = calculateSMA(bars, 200).map((p) => ({ time: toTime(p.time), value: p.value }));
      seriesRefs.current.sma200.setData(data);
    }
    // EMA 12
    if (seriesRefs.current.ema12) {
      const data = calculateEMA(bars, 12).map((p) => ({ time: toTime(p.time), value: p.value }));
      seriesRefs.current.ema12.setData(data);
    }
    // EMA 26
    if (seriesRefs.current.ema26) {
      const data = calculateEMA(bars, 26).map((p) => ({ time: toTime(p.time), value: p.value }));
      seriesRefs.current.ema26.setData(data);
    }
    // Bollinger Bands
    if (seriesRefs.current.bbUpper && seriesRefs.current.bbLower && seriesRefs.current.bbMiddle) {
      const bb = calculateBollingerBands(bars);
      seriesRefs.current.bbUpper.setData(bb.map((p) => ({ time: toTime(p.time), value: p.upper })));
      seriesRefs.current.bbMiddle.setData(bb.map((p) => ({ time: toTime(p.time), value: p.middle })));
      seriesRefs.current.bbLower.setData(bb.map((p) => ({ time: toTime(p.time), value: p.lower })));
    }
    // RSI (separate chart)
    if (seriesRefs.current.rsi && rsiChart.current) {
      const rsi = calculateRSI(bars);
      seriesRefs.current.rsi.setData(rsi.map((p) => ({ time: toTime(p.time), value: p.value })));
    }
    // Volume
    if (seriesRefs.current.volume) {
      seriesRefs.current.volume.setData(
        bars.map((b) => ({
          time: toTime(b.time),
          value: b.volume ?? 0,
          color: b.close >= b.open ? `${upColor}44` : `${downColor}44`,
        })),
      );
    }
  }, [upColor, downColor]);

  // ── Draw Volume Profile overlay & Vertical Focus Cursor on canvas ─────────────
  const drawVolumeProfile = useCallback((bars: OHLCVBar[]) => {
    const canvas = vpCanvasRef.current;
    const chart = mainChart.current;
    const candleSeries = seriesRefs.current.candle;
    if (!canvas || !chart || !candleSeries || bars.length === 0) return;

    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 1. Draw Volume Profile overlay if active
    if (activeIndicators.has('vp')) {
      const profile = calculateVolumeProfile(bars, 24);
      if (profile.length > 0) {
        const maxVol = Math.max(...profile.map((b) => b.volume));
        if (maxVol > 0) {
          const highs = bars.map((b) => b.high);
          const lows = bars.map((b) => b.low);
          const priceHigh = Math.max(...highs);
          const priceLow = Math.min(...lows);
          const bucketSize = (priceHigh - priceLow) / 24;
          const maxBarWidth = rect.width * 0.30;

          for (const bucket of profile) {
            const bucketTop = bucket.priceLevel + bucketSize / 2;
            const bucketBottom = bucket.priceLevel - bucketSize / 2;
            const y1 = candleSeries.priceToCoordinate(bucketTop);
            const y2 = candleSeries.priceToCoordinate(bucketBottom);
            if (y1 === null || y2 === null) continue;

            const yTop = Math.min(y1, y2);
            const barHeight = Math.max(Math.abs(y2 - y1) - 1, 1);
            const barWidth = (bucket.volume / maxVol) * maxBarWidth;

            // Draw from right edge
            const xStart = rect.width - barWidth;

            // Buy portion (green)
            const buyRatio = bucket.volume > 0 ? bucket.buyVolume / bucket.volume : 0;
            const buyWidth = barWidth * buyRatio;
            const sellWidth = barWidth - buyWidth;

            if (sellWidth > 0) {
              ctx.fillStyle = highContrastMode ? 'rgba(255, 0, 255, 0.25)' : 'rgba(239, 68, 68, 0.25)';
              ctx.fillRect(xStart, yTop, sellWidth, barHeight);
            }
            if (buyWidth > 0) {
              ctx.fillStyle = highContrastMode ? 'rgba(0, 255, 255, 0.25)' : 'rgba(34, 197, 94, 0.25)';
              ctx.fillRect(xStart + sellWidth, yTop, buyWidth, barHeight);
            }
          }
        }
      }
    }

    // 2. Draw vertical focus cursor line
    if (focusedIndex !== null) {
      const x = chart.timeScale().logicalToCoordinate(focusedIndex as any);
      if (x !== null && x >= 0 && x <= rect.width) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = highContrastMode ? '#00ffff' : 'rgba(30, 136, 229, 0.5)';
        ctx.lineWidth = 1;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Draw a small dot on the close price of the focused candle
        const activeCandle = bars[focusedIndex];
        if (activeCandle) {
          const y = candleSeries.priceToCoordinate(activeCandle.close);
          if (y !== null) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = highContrastMode ? '#00ffff' : 'var(--color-accent-primary)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
  }, [activeIndicators, focusedIndex, highContrastMode]);

  // Sync refs for the canvas callbacks to avoid re-initializing charts
  useEffect(() => {
    drawVolumeProfileRef.current = drawVolumeProfile;
  }, [drawVolumeProfile]);

  useEffect(() => {
    barsDataRef.current = barsData;
  }, [barsData]);

  // ── Load data ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!mainChart.current || !seriesRefs.current.candle) return;

    const cfg = TIMEFRAME_CONFIG[timeframe];
    const { getStockUniverse } = await import('@/lib/mockDataGenerator');
    const stock = getStockUniverse().find((s: import('@/types').Stock) => s.symbol === symbol);
    if (!stock) return;

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

    const toTime = (t: number) => t as import('lightweight-charts').Time;
    seriesRefs.current.candle.setData(
      bars.map((b) => ({ time: toTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close })),
    );

    updateOverlays(bars);
    mainChart.current.timeScale().fitContent();
    rsiChart.current?.timeScale().fitContent();
  }, [symbol, timeframe, updateOverlays]);

  // ── Init charts ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mainRef.current || !rsiRef.current) return;

    const commonOptions = {
      layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#4f8ef7', labelBackgroundColor: '#4f8ef7' }, horzLine: { color: '#4f8ef7', labelBackgroundColor: '#4f8ef7' } },
      rightPriceScale: { borderColor: C.border, textColor: C.text },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
    };

    // ── Main chart ──────────────────────────────────────────────────────────────
    const chart = createChart(mainRef.current, {
      ...commonOptions,
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });
    mainChart.current = chart;

    // Candlestick
    seriesRefs.current.candle = chart.addSeries(CandlestickSeries, {
      upColor: C.up, downColor: C.down,
      wickUpColor: C.up, wickDownColor: C.down,
      borderVisible: false, priceScaleId: 'right',
    });

    // Volume (small pane via scale margins)
    seriesRefs.current.volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    // SMA 20 / 50 / 200
    seriesRefs.current.sma20 = chart.addSeries(LineSeries, { color: C.sma20, lineWidth: 1, title: 'SMA20', priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.sma50 = chart.addSeries(LineSeries, { color: C.sma50, lineWidth: 1, title: 'SMA50', priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.sma200 = chart.addSeries(LineSeries, { color: C.sma200, lineWidth: 1, title: 'SMA200', priceLineVisible: false, lastValueVisible: false });

    // EMA 12 / 26
    seriesRefs.current.ema12 = chart.addSeries(LineSeries, { color: C.ema12, lineWidth: 1, lineStyle: 1, title: 'EMA12', priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.ema26 = chart.addSeries(LineSeries, { color: C.ema26, lineWidth: 1, lineStyle: 1, title: 'EMA26', priceLineVisible: false, lastValueVisible: false });

    // Bollinger Bands (area between upper/lower)
    seriesRefs.current.bbUpper  = chart.addSeries(LineSeries, { color: C.bbLine, lineWidth: 1, lineStyle: 2, title: 'BB+', priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.bbMiddle = chart.addSeries(LineSeries, { color: C.bbLine, lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.bbLower  = chart.addSeries(LineSeries, { color: C.bbLine, lineWidth: 1, lineStyle: 2, title: 'BB-', priceLineVisible: false, lastValueVisible: false });

    // Crosshair info
    chart.subscribeCrosshairMove((param) => {
      const cs = seriesRefs.current.candle;
      if (cs && param.seriesData.has(cs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bar = param.seriesData.get(cs) as any;
        if (bar?.open) setPriceInfo({ o: bar.open, h: bar.high, l: bar.low, c: bar.close });
      }
    });

    // ── RSI sub-chart ─────────────────────────────────────────────────────────
    const rsiC = createChart(rsiRef.current, {
      ...commonOptions,
      rightPriceScale: { ...commonOptions.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
    });
    rsiChart.current = rsiC;

    seriesRefs.current.rsi = rsiC.addSeries(LineSeries, {
      color: C.rsiLine, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: 'RSI(14)',
    });

    // Overbought (70) / Oversold (30) reference lines
    seriesRefs.current.rsiOB = rsiC.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    seriesRefs.current.rsiOS = rsiC.addSeries(LineSeries, { color: '#22c55e', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

    // Sync time scales + redraw volume profile on scroll/zoom
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) rsiC.timeScale().setVisibleLogicalRange(range);
      drawVolumeProfileRef.current?.(barsDataRef.current);
    });
    rsiC.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) chart.timeScale().setVisibleLogicalRange(range);
      drawVolumeProfileRef.current?.(barsDataRef.current);
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (mainRef.current) chart.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
      if (rsiRef.current) rsiC.applyOptions({ width: rsiRef.current.clientWidth, height: rsiRef.current.clientHeight });
    });
    if (mainRef.current) ro.observe(mainRef.current);
    if (rsiRef.current)  ro.observe(rsiRef.current);

    return () => {
      ro.disconnect();
      chart.remove(); mainChart.current = null;
      rsiC.remove(); rsiChart.current = null;
      seriesRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Load data when timeframe/symbol changes
  useEffect(() => { loadData(); }, [loadData]);

  // Apply indicator visibility
  useEffect(() => {
    const toggle = (key: string, visible: boolean) => {
      const s = seriesRefs.current[key];
      if (s) s.applyOptions({ visible });
    };
    toggle('sma20',    activeIndicators.has('sma20'));
    toggle('sma50',    activeIndicators.has('sma50'));
    toggle('sma200',   activeIndicators.has('sma200'));
    toggle('ema12',    activeIndicators.has('ema12'));
    toggle('ema26',    activeIndicators.has('ema26'));
    toggle('bbUpper',  activeIndicators.has('bb'));
    toggle('bbMiddle', activeIndicators.has('bb'));
    toggle('bbLower',  activeIndicators.has('bb'));
    toggle('volume',   activeIndicators.has('volume'));
    // Redraw VP overlay when toggled
    drawVolumeProfile(barsData);
  }, [activeIndicators, barsData, drawVolumeProfile]);

  // Add reference lines after data is loaded
  useEffect(() => {
    if (!barsData.length || !seriesRefs.current.rsiOB) return;
    const toTime = (t: number) => t as import('lightweight-charts').Time;
    const times = barsData.map((b) => b.time);
    seriesRefs.current.rsiOB.setData(times.map((t) => ({ time: toTime(t), value: 70 })));
    seriesRefs.current.rsiOS.setData(times.map((t) => ({ time: toTime(t), value: 30 })));
  }, [barsData]);

  // Redraw VP when barsData or indicators change
  useEffect(() => {
    drawVolumeProfile(barsData);
  }, [barsData, drawVolumeProfile, activeIndicators]);

  // ── Live price update ─────────────────────────────────────────────────────────
  const priceUpdate = useRealtimeStore((s) => s.priceUpdates[symbol]);
  useEffect(() => {
    if (!priceUpdate || !seriesRefs.current.candle) return;
    const now = Math.floor(Date.now() / 1000) as import('lightweight-charts').Time;
    seriesRefs.current.candle.update({ time: now, open: priceUpdate.lastPrice ?? 0, high: priceUpdate.lastPrice ?? 0, low: priceUpdate.lastPrice ?? 0, close: priceUpdate.lastPrice ?? 0 });
  }, [priceUpdate]);

  // ── Indicator buttons ─────────────────────────────────────────────────────────
  const INDICATORS: { key: IndicatorKey; label: string; color: string }[] = [
    { key: 'sma20',  label: 'SMA20',  color: C.sma20  },
    { key: 'sma50',  label: 'SMA50',  color: C.sma50  },
    { key: 'sma200', label: 'SMA200', color: C.sma200 },
    { key: 'ema12',  label: 'EMA12',  color: C.ema12  },
    { key: 'ema26',  label: 'EMA26',  color: C.ema26  },
    { key: 'bb',     label: 'BB',     color: C.bbLine  },
    { key: 'rsi',    label: 'RSI',    color: C.rsiLine },
    { key: 'volume', label: 'Vol',    color: '#6b7280' },
    { key: 'vp',     label: 'VP',     color: '#a78bfa' },
  ];

  // ── Keyboard arrow keys navigation & table toggle states (Section A10.2) ──────
  useEffect(() => {
    if (barsData.length > 0 && focusedIndex === null) {
      setFocusedIndex(barsData.length - 1);
    }
  }, [barsData, focusedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow closing modal via ESC or 'C'/'c' key regardless of active view
      if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onClose();
        return;
      }

      if (!barsData.length || focusedIndex === null) return;

      if (showTable) {
        // Data table view: use ArrowUp and ArrowDown
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(0, (prev ?? 0) - 1);
            // Scroll container to make focused row visible Snappily
            const tableContainer = document.querySelector('.chart-modal .overflow-auto') as HTMLElement;
            if (tableContainer) {
              const rowElement = tableContainer.querySelectorAll('tbody tr')[next] as HTMLElement;
              if (rowElement) {
                rowElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
              }
            }
            return next;
          });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.min(barsData.length - 1, (prev ?? 0) + 1);
            // Scroll container to make focused row visible Snappily
            const tableContainer = document.querySelector('.chart-modal .overflow-auto') as HTMLElement;
            if (tableContainer) {
              const rowElement = tableContainer.querySelectorAll('tbody tr')[next] as HTMLElement;
              if (rowElement) {
                rowElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
              }
            }
            return next;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const candle = barsData[focusedIndex];
          if (candle) {
            const dateStr = new Date(candle.time * 1000).toLocaleDateString();
            const msg = `${symbol} row for ${dateStr}: Open ${candle.open.toFixed(2)}, High ${candle.high.toFixed(2)}, Low ${candle.low.toFixed(2)}, Close ${candle.close.toFixed(2)}, Volume ${(candle.volume ?? 0).toLocaleString()}.`;
            const { useRealtimeStore } = require('@/stores/realtimeStore');
            useRealtimeStore.getState().setAnnouncement(msg);
          }
        }
      } else {
        // Visual chart view: use ArrowLeft and ArrowRight
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(0, (prev ?? barsData.length - 1) - 1);
            const chart = mainChart.current;
            if (chart) {
              const timeScale = chart.timeScale();
              const range = timeScale.getVisibleLogicalRange();
              if (range && next < range.from) {
                const width = range.to - range.from;
                timeScale.setVisibleLogicalRange({
                  from: next,
                  to: next + width,
                });
              }
            }
            return next;
          });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.min(barsData.length - 1, (prev ?? 0) + 1);
            const chart = mainChart.current;
            if (chart) {
              const timeScale = chart.timeScale();
              const range = timeScale.getVisibleLogicalRange();
              if (range && next > range.to) {
                const width = range.to - range.from;
                timeScale.setVisibleLogicalRange({
                  from: next - width,
                  to: next,
                });
              }
            }
            return next;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const candle = barsData[focusedIndex];
          if (candle) {
            const dateStr = new Date(candle.time * 1000).toLocaleDateString();
            const msg = `${symbol} focused candle for ${dateStr}: Open ${candle.open.toFixed(2)}, High ${candle.high.toFixed(2)}, Low ${candle.low.toFixed(2)}, Close ${candle.close.toFixed(2)}, Volume ${(candle.volume ?? 0).toLocaleString()}.`;
            const { useRealtimeStore } = require('@/stores/realtimeStore');
            useRealtimeStore.getState().setAnnouncement(msg);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barsData, focusedIndex, showTable, symbol]);

  // Backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const activeCandle = focusedIndex !== null && barsData[focusedIndex] ? barsData[focusedIndex] : null;
  const displayInfo = activeCandle ? { o: activeCandle.open, h: activeCandle.high, l: activeCandle.low, c: activeCandle.close } : priceInfo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdrop}
      role="dialog" aria-modal="true" aria-label={`Chart for ${symbol}`}
    >
      <div
        className="chart-modal glass rounded-xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 1200, height: '86vh', minHeight: 500 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span className="font-bold font-mono text-lg" style={{ color: 'var(--color-text-primary)' }}>
              {symbol}
            </span>
            {displayInfo && (
              <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                <span>O <span style={{ color: 'var(--color-text-secondary)' }}>{displayInfo.o.toFixed(2)}</span></span>
                <span>H <span style={{ color: highContrastMode ? '#00ffff' : '#22c55e' }}>{displayInfo.h.toFixed(2)}</span></span>
                <span>L <span style={{ color: highContrastMode ? '#ff00ff' : '#ef4444' }}>{displayInfo.l.toFixed(2)}</span></span>
                <span>C <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{displayInfo.c.toFixed(2)}</span></span>
              </div>
            )}
            {activeCandle && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--color-bg-surface-2)', color: 'var(--color-text-muted)' }}>
                Nav: {new Date(activeCandle.time * 1000).toLocaleDateString()} (Use ←/→ keys. Enter to announce)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* High Contrast Mode Toggle */}
            <button
              onClick={() => toggleHighContrast()}
              className="text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all hover:bg-hover"
              style={{
                borderColor: 'var(--color-border)',
                background: highContrastMode ? 'var(--color-accent-primary)' : 'transparent',
                color: highContrastMode ? 'white' : 'var(--color-text-primary)'
              }}
              aria-pressed={highContrastMode}
            >
              Contrast: {highContrastMode ? "High" : "Standard"}
            </button>

            {/* Data Table Toggle */}
            <button
              onClick={() => setShowTable(!showTable)}
              className="text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all hover:bg-hover"
              style={{
                borderColor: 'var(--color-border)',
                background: showTable ? 'var(--color-accent-primary)' : 'transparent',
                color: showTable ? 'white' : 'var(--color-text-primary)'
              }}
              aria-pressed={showTable}
            >
              {showTable ? "Show Visual Chart" : "Show Data Table"}
            </button>

            {/* Export to PDF */}
            <button
              onClick={() => {
                import('@/lib/exportUtils').then((m) => m.exportChartToPDF());
              }}
              className="no-print text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all hover:bg-hover"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              aria-label="Export to PDF"
            >
              Export PDF
            </button>

            {/* Indicator toggles (only if not showing table) */}
            {!showTable && (
              <div className="flex items-center gap-1 flex-wrap">
                {INDICATORS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    className="text-xs px-2 py-1 rounded font-semibold transition-all"
                    style={{
                      background: activeIndicators.has(key) ? `${color}22` : 'transparent',
                      color: activeIndicators.has(key) ? color : 'var(--color-text-muted)',
                      border: `1px solid ${activeIndicators.has(key) ? color : 'var(--color-border)'}`,
                    }}
                    aria-pressed={activeIndicators.has(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Timeframe */}
            <div className="flex border rounded-lg overflow-hidden text-xs font-mono" style={{ borderColor: 'var(--color-border)' }}>
              {(Object.keys(TIMEFRAME_CONFIG) as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="px-2.5 py-1.5 transition-colors"
                  style={timeframe === tf
                    ? { background: 'var(--color-accent-primary)', color: 'white' }
                    : { color: 'var(--color-text-muted)' }}
                  aria-pressed={timeframe === tf}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="no-print p-1.5 rounded-lg hover:bg-hover transition-colors"
              style={{ color: 'var(--color-text-muted)' }} aria-label="Close chart">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area: Visual Charts or Accessible Data Table */}
        {showTable ? (
          <div className="flex-1 overflow-auto p-5" style={{ background: 'var(--color-bg-pane)' }}>
            <table className="w-full text-left border-collapse text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="py-2">Time</th>
                  <th className="py-2">Open</th>
                  <th className="py-2">High</th>
                  <th className="py-2">Low</th>
                  <th className="py-2">Close</th>
                  <th className="py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {barsData.map((bar, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-hover/10 transition-colors"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: focusedIndex === idx ? 'rgba(30, 136, 229, 0.12)' : 'transparent',
                      outline: focusedIndex === idx ? '1px solid var(--color-accent-primary)' : 'none',
                    }}
                  >
                    <td className="py-2">{new Date(bar.time * 1000).toLocaleDateString()} {new Date(bar.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2">{bar.open.toFixed(2)}</td>
                    <td className="py-2 text-green-400" style={{ color: highContrastMode ? '#00ffff' : '#22c55e' }}>{bar.high.toFixed(2)}</td>
                    <td className="py-2 text-red-400" style={{ color: highContrastMode ? '#ff00ff' : '#ef4444' }}>{bar.low.toFixed(2)}</td>
                    <td className="py-2" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{bar.close.toFixed(2)}</td>
                    <td className="py-2">{(bar.volume ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Main candlestick chart — 75% height + Volume Profile overlay */}
            <div className="flex-[3] chart-container relative">
              <div ref={mainRef} className="absolute inset-0" />
              <canvas
                ref={vpCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 2 }}
              />
            </div>
            {/* RSI sub-chart — 25% height, only shown when RSI active */}
            {activeIndicators.has('rsi') && (
              <div
                ref={rsiRef}
                className="flex-1 chart-container border-t"
                style={{ borderColor: 'var(--color-border)', minHeight: 100, maxHeight: 160 }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
