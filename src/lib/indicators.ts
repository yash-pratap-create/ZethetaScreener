export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
export interface LinePoint {
  time: number;
  value: number;
}
export interface BandPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}
export interface RSIPoint {
  time: number;
  value: number;
}
export interface VolumeProfileBucket {
  priceLevel: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}
export function calculateSMA(bars: OHLCVBar[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    result.push({ time: bars[i].time, value: sum / period });
  }
  return result;
}
export function calculateEMA(bars: OHLCVBar[], period: number): LinePoint[] {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  const result: LinePoint[] = [];
  let ema = 0;
  for (let i = 0; i < period; i++) ema += bars[i].close;
  ema /= period;
  result.push({ time: bars[period - 1].time, value: ema });
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    result.push({ time: bars[i].time, value: ema });
  }
  return result;
}
export function calculateBollingerBands(
  bars: OHLCVBar[],
  period = 20,
  multiplier = 2,
): BandPoint[] {
  const result: BandPoint[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, b) => s + b.close, 0) / period;
    const variance = slice.reduce((s, b) => s + (b.close - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    result.push({
      time: bars[i].time,
      upper: mean + multiplier * std,
      middle: mean,
      lower: mean - multiplier * std,
    });
  }
  return result;
}
export function calculateRSI(bars: OHLCVBar[], period = 14): RSIPoint[] {
  if (bars.length < period + 1) return [];
  const result: RSIPoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;
  let firstRSI = 100;
  if (avgLoss !== 0) {
    const firstRS = avgGain / avgLoss;
    firstRSI = 100 - 100 / (1 + firstRS);
  } else if (avgGain === 0) {
    firstRSI = 50;
  }
  result.push({ time: bars[period].time, value: firstRSI });
  for (let i = period + 1; i < bars.length; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    let rsiValue = 100;
    if (avgLoss !== 0) {
      const rs = avgGain / avgLoss;
      rsiValue = 100 - 100 / (1 + rs);
    } else if (avgGain === 0) {
      rsiValue = 50;
    }
    result.push({ time: bars[i].time, value: rsiValue });
  }
  return result;
}
export function calculateVolumeProfile(bars: OHLCVBar[], buckets = 24): VolumeProfileBucket[] {
  if (bars.length === 0) return [];
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const priceHigh = Math.max(...highs);
  const priceLow = Math.min(...lows);
  const bucketSize = (priceHigh - priceLow) / buckets;
  const profile: VolumeProfileBucket[] = Array.from({ length: buckets }, (_, i) => ({
    priceLevel: priceLow + (i + 0.5) * bucketSize,
    volume: 0,
    buyVolume: 0,
    sellVolume: 0,
  }));
  for (const bar of bars) {
    const barHigh = bar.high;
    const barLow = bar.low;
    const barVol = bar.volume ?? 0;
    const barRange = barHigh - barLow || 1;
    const isBuy = bar.close >= bar.open;
    for (let i = 0; i < buckets; i++) {
      const bucketLow = priceLow + i * bucketSize;
      const bucketHigh = bucketLow + bucketSize;
      const overlap = Math.min(barHigh, bucketHigh) - Math.max(barLow, bucketLow);
      if (overlap <= 0) continue;
      const allocated = barVol * (overlap / barRange);
      profile[i].volume += allocated;
      if (isBuy) profile[i].buyVolume += allocated;
      else profile[i].sellVolume += allocated;
    }
  }
  return profile;
}
export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}
export function calculateMACD(
  bars: OHLCVBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDPoint[] {
  const fastEMA = calculateEMA(bars, fastPeriod);
  const slowEMA = calculateEMA(bars, slowPeriod);
  const slowMap = new Map(slowEMA.map((p) => [p.time, p.value]));
  const macdLine = fastEMA
    .filter((p) => slowMap.has(p.time))
    .map((p) => ({ time: p.time, value: p.value - slowMap.get(p.time)! }));
  if (macdLine.length < signalPeriod) return [];
  const k = 2 / (signalPeriod + 1);
  let signalEMA = macdLine.slice(0, signalPeriod).reduce((s, p) => s + p.value, 0) / signalPeriod;
  const result: MACDPoint[] = [];
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (i > signalPeriod - 1) {
      signalEMA = macdLine[i].value * k + signalEMA * (1 - k);
    }
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: signalEMA,
      histogram: macdLine[i].value - signalEMA,
    });
  }
  return result;
}
export function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
}
export function simulateNextPrice(
  currentPrice: number,
  volatility = 0.02,
  drift = 0.0001,
  dt = 1 / 252,
): number {
  const randomShock = Math.sqrt(dt) * gaussianRandom();
  const priceChange = drift * dt + volatility * randomShock;
  return Math.max(0.01, currentPrice * (1 + priceChange));
}
