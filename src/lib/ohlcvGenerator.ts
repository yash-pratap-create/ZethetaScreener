export interface OHLCV {
  time: number;   // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function generateOHLCV(
  startPrice: number,
  days: number = 252,  // 1 trading year
  volatility: number = 0.02,
  avgVolume: number = 1000000
): OHLCV[] {
  const candles: OHLCV[] = [];
  let currentPrice = startPrice;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dailyReturn = normalRandom() * volatility;
    const open = currentPrice;
    const intraday1 = open * (1 + normalRandom() * volatility * 0.5);
    const intraday2 = open * (1 + normalRandom() * volatility * 0.5);
    const close = open * (1 + dailyReturn);
    const high = Math.max(open, close, intraday1, intraday2) * (1 + Math.abs(normalRandom()) * 0.005);
    const low = Math.min(open, close, intraday1, intraday2) * (1 - Math.abs(normalRandom()) * 0.005);

    // Volume is correlated with price movement magnitude
    const volumeMultiplier = 1 + Math.abs(dailyReturn) * 10;
    const volume = Math.round(avgVolume * volumeMultiplier * (0.5 + Math.random()));

    candles.push({
      time: Math.floor(date.getTime() / 1000),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });
    currentPrice = close;
  }
  return candles;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalRandom(): number {
  // Use Math.max to prevent taking Math.log(0) which yields -Infinity
  return Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-9))) * Math.cos(2 * Math.PI * Math.random());
}
