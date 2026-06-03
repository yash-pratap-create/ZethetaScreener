import {
  Stock,
  Sector,
  MarketCapCategory,
  IndexMembership,
  MACDSignal,
  BollingerPosition,
  VolumeVsAvg,
  CandlestickBar,
  VolumeBar,
} from '@/types';
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(42);
const randBetween = (min: number, max: number) => min + rand() * (max - min);
const randInt = (min: number, max: number) => Math.floor(randBetween(min, max + 1));
const choice = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function normalRandom(mean = 0, std = 1): number {
  const u1 = rand();
  const u2 = rand();
  return mean + std * Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
}
interface SectorConfig {
  companies: string[];
  industries: string[];
  avgPE: number;
  peStd: number;
  avgBeta: number;
  betaStd: number;
  avgROE: number;
  avgPromoterHolding: number;
  avgMarketCap: number;
}
const SECTOR_CONFIG: Record<Sector, SectorConfig> = {
  IT: {
    companies: ['Infotech', 'Digisys', 'Netlogic', 'Codecraft', 'DataWorks'],
    industries: ['Software', 'IT Services', 'BPO', 'Cloud', 'Cybersecurity'],
    avgPE: 28,
    peStd: 8,
    avgBeta: 0.78,
    betaStd: 0.18,
    avgROE: 22,
    avgPromoterHolding: 55,
    avgMarketCap: 80000,
  },
  Banking: {
    companies: ['Capital Bank', 'Trust Finance', 'Apex Bank', 'Prime Credit', 'Metro Bank'],
    industries: ['Private Banking', 'PSU Banking', 'Microfinance', 'NBFC', 'Payments'],
    avgPE: 16,
    peStd: 5,
    avgBeta: 1.15,
    betaStd: 0.25,
    avgROE: 14,
    avgPromoterHolding: 35,
    avgMarketCap: 60000,
  },
  Pharma: {
    companies: ['LifeCure', 'BioMed', 'Helix Labs', 'CureTech', 'GenePharma'],
    industries: ['Pharmaceuticals', 'Biotech', 'API', 'Generics', 'Diagnostics'],
    avgPE: 32,
    peStd: 12,
    avgBeta: 0.68,
    betaStd: 0.2,
    avgROE: 16,
    avgPromoterHolding: 60,
    avgMarketCap: 25000,
  },
  Auto: {
    companies: ['MotorCraft', 'DriveX', 'VehicleTech', 'AutoParts', 'WheelCo'],
    industries: ['Passenger Vehicles', 'Two-Wheelers', 'CV', 'Auto Ancillary', 'EV'],
    avgPE: 22,
    peStd: 7,
    avgBeta: 1.05,
    betaStd: 0.22,
    avgROE: 15,
    avgPromoterHolding: 52,
    avgMarketCap: 30000,
  },
  FMCG: {
    companies: ['ConsumerBrands', 'NaturalGoods', 'PureLife', 'HomeEssentials', 'DailyNeeds'],
    industries: ['Food Products', 'Personal Care', 'Household', 'Beverages', 'Tobacco'],
    avgPE: 45,
    peStd: 12,
    avgBeta: 0.55,
    betaStd: 0.15,
    avgROE: 30,
    avgPromoterHolding: 65,
    avgMarketCap: 50000,
  },
  Metal: {
    companies: ['SteelCorp', 'IronWorks', 'AlloyTech', 'MetalFab', 'MiningPro'],
    industries: ['Steel', 'Aluminium', 'Copper', 'Mining', 'Smelting'],
    avgPE: 14,
    peStd: 6,
    avgBeta: 1.35,
    betaStd: 0.35,
    avgROE: 12,
    avgPromoterHolding: 42,
    avgMarketCap: 20000,
  },
  Energy: {
    companies: ['PowerGen', 'OilIndia', 'GasTech', 'RenewCo', 'FuelPro'],
    industries: ['Oil & Gas', 'Power Generation', 'Renewables', 'Coal', 'LNG'],
    avgPE: 12,
    peStd: 5,
    avgBeta: 0.9,
    betaStd: 0.25,
    avgROE: 10,
    avgPromoterHolding: 50,
    avgMarketCap: 45000,
  },
  Realty: {
    companies: ['BuildCo', 'RealtyGroup', 'PropDev', 'CityBuilders', 'UrbanSpace'],
    industries: ['Residential', 'Commercial', 'REITs', 'Township', 'Hospitality'],
    avgPE: 25,
    peStd: 15,
    avgBeta: 1.4,
    betaStd: 0.4,
    avgROE: 10,
    avgPromoterHolding: 58,
    avgMarketCap: 8000,
  },
  Telecom: {
    companies: ['ConnectNet', 'SpeedTel', 'DataLink', 'TowerCo', 'WirelessTech'],
    industries: ['Mobile Services', 'Broadband', 'Tower', 'ISP', 'Satellite'],
    avgPE: 30,
    peStd: 20,
    avgBeta: 0.85,
    betaStd: 0.2,
    avgROE: 8,
    avgPromoterHolding: 60,
    avgMarketCap: 15000,
  },
  Infrastructure: {
    companies: ['BuildInfra', 'RoadCon', 'BridgeCo', 'PortAuthority', 'AirportDev'],
    industries: ['Roads', 'Ports', 'Airports', 'Power Infra', 'Urban Infra'],
    avgPE: 20,
    peStd: 8,
    avgBeta: 1.1,
    betaStd: 0.3,
    avgROE: 12,
    avgPromoterHolding: 55,
    avgMarketCap: 10000,
  },
  Media: {
    companies: ['MediaHouse', 'BroadcastCo', 'StreamX', 'PublishPro', 'EntertainTV'],
    industries: ['Broadcasting', 'Print', 'OTT', 'Film', 'Digital Media'],
    avgPE: 22,
    peStd: 10,
    avgBeta: 0.95,
    betaStd: 0.3,
    avgROE: 14,
    avgPromoterHolding: 48,
    avgMarketCap: 5000,
  },
  Others: {
    companies: ['DiverseCo', 'HoldingGroup', 'ConglomerateX', 'VentureCorp', 'AlphaHoldings'],
    industries: ['Conglomerate', 'Trading', 'Investment', 'Services', 'Specialty'],
    avgPE: 18,
    peStd: 10,
    avgBeta: 1.0,
    betaStd: 0.3,
    avgROE: 12,
    avgPromoterHolding: 45,
    avgMarketCap: 3000,
  },
};
const SECTORS = Object.keys(SECTOR_CONFIG) as Sector[];
const EXCHANGES: ('NSE' | 'BSE')[] = ['NSE', 'BSE'];
function categoriseByMarketCap(mcap: number): MarketCapCategory {
  if (mcap >= 50000) return 'Large Cap';
  if (mcap >= 10000) return 'Mid Cap';
  if (mcap >= 1000) return 'Small Cap';
  return 'Micro Cap';
}
function assignIndices(mcap: number): IndexMembership[] {
  if (mcap >= 100000) return ['NIFTY50', 'NIFTY100', 'NIFTY500', 'SENSEX'];
  if (mcap >= 30000) return ['NIFTY100', 'NIFTY500'];
  if (mcap >= 5000) return rand() > 0.5 ? ['NIFTY500', 'MIDCAP150'] : ['NIFTY500'];
  if (mcap >= 500) return ['SMALLCAP250'];
  return [];
}
function generatePrice(mcap: number): number {
  if (mcap >= 100000) return randBetween(800, 8000);
  if (mcap >= 20000) return randBetween(300, 3000);
  if (mcap >= 5000) return randBetween(80, 1000);
  if (mcap >= 500) return randBetween(20, 400);
  return randBetween(5, 100);
}
const symbolSet = new Set<string>();
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateSymbol(sector: Sector, index: number): string {
  const prefix = sector.slice(0, 2).toUpperCase();
  let sym = '';
  let attempts = 0;
  do {
    const len = randInt(2, 4);
    let suffix = '';
    for (let i = 0; i < len; i++) suffix += CHARS[randInt(0, 25)];
    sym = attempts < 5 ? prefix + suffix : suffix + String((index % 99) + 1);
    attempts++;
  } while (symbolSet.has(sym));
  symbolSet.add(sym);
  return sym;
}
const CORP_SUFFIXES = ['Ltd', 'Industries', 'Corp', 'Holdings', 'Group', 'Enterprises'];
function generateCompanyName(sector: Sector, index: number): string {
  const cfg = SECTOR_CONFIG[sector];
  const base = cfg.companies[index % cfg.companies.length];
  const num = Math.floor(index / cfg.companies.length);
  const suffix = choice(CORP_SUFFIXES);
  return num === 0 ? `${base} ${suffix}` : `${base} ${num + 1} ${suffix}`;
}
function calcSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0,
    losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d;
    else losses += Math.abs(d);
  }
  const rs = gains / (losses || 1);
  return clamp(100 - 100 / (1 + rs), 0, 100);
}
function toBollingerPosition(pct: number): BollingerPosition {
  if (pct > 1) return 'Above';
  if (pct < 0) return 'Below';
  return 'Within';
}
function toVolumeVsAvg(ratio: number): VolumeVsAvg {
  if (ratio >= 3) return '3x';
  if (ratio >= 2) return '2x';
  if (ratio > 1) return 'Above';
  return 'Below';
}
function toMACDSignal(raw: number): MACDSignal {
  if (raw > 0.55) return 'Bullish';
  if (raw < 0.45) return 'Bearish';
  return 'Neutral';
}
function gbm(price: number, mu: number, sigma: number, dt: number): number {
  const z = normalRandom();
  return price * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
}
export function generateCandlestickData(
  startPrice: number,
  numBars: number,
  startTime: number,
  intervalSeconds: number,
): {
  candles: CandlestickBar[];
  volumes: VolumeBar[];
} {
  const localRand = mulberry32(Math.floor(startPrice * 1000));
  const candles: CandlestickBar[] = [];
  const volumes: VolumeBar[] = [];
  let price = startPrice;
  for (let i = 0; i < numBars; i++) {
    const time = startTime + i * intervalSeconds;
    const open = price;
    const sigma = 0.01 + localRand() * 0.02;
    const mu = (localRand() - 0.48) * 0.0005;
    const close = Math.max(0.01, gbm(open, mu, sigma, 1 / 252));
    const high = Math.max(open, close) * (1 + localRand() * 0.006);
    const low = Math.min(open, close) * (1 - localRand() * 0.006);
    candles.push({ time, open, high, low, close });
    volumes.push({
      time,
      value: Math.floor(100000 + localRand() * 5000000),
      color: close >= open ? '#22c55e' : '#ef4444',
    });
    price = close;
  }
  return { candles, volumes };
}
export function generateMockStocks(count: number = 5000): Stock[] {
  rand = mulberry32(42);
  symbolSet.clear();
  const stocks: Stock[] = [];
  for (let i = 0; i < count; i++) {
    let sector: Sector = 'Others';
    if (i < 750) {
      sector = 'Banking';
    } else if (i < 1350) {
      sector = 'IT';
    } else if (i < 1850) {
      sector = 'Pharma';
    } else if (i < 2250) {
      sector = 'FMCG';
    } else if (i < 2600) {
      sector = 'Auto';
    } else if (i < 2900) {
      sector = 'Metal';
    } else if (i < 3200) {
      sector = 'Energy';
    } else if (i < 3550) {
      sector = 'Realty';
    } else if (i < 3650) {
      sector = 'Telecom';
    } else if (i < 3750) {
      sector = 'Media';
    } else if (i < 4150) {
      sector = 'Infrastructure';
    } else {
      sector = 'Others';
    }
    const cfg = SECTOR_CONFIG[sector];
    let mcCat: MarketCapCategory = 'Micro Cap';
    let marketCap = 250;
    if (i < 100) {
      mcCat = 'Large Cap';
      marketCap = clamp(randBetween(50000, 2000000), 50000, 2000000);
    } else if (i < 500) {
      mcCat = 'Mid Cap';
      marketCap = clamp(randBetween(10000, 49999), 10000, 49999);
    } else if (i < 2000) {
      mcCat = 'Small Cap';
      marketCap = clamp(randBetween(1000, 9999), 1000, 9999);
    } else {
      mcCat = 'Micro Cap';
      marketCap = clamp(randBetween(50, 999), 50, 999);
    }
    const lastPrice = generatePrice(marketCap);
    const sigma =
      (mcCat === 'Large Cap' ? 0.008 : mcCat === 'Mid Cap' ? 0.014 : 0.022) +
      Math.abs(normalRandom(0, 0.005));
    const prevClose = lastPrice * (1 + normalRandom(0, sigma));
    const dayOpen = prevClose * (1 + normalRandom(0, sigma * 0.4));
    const changeAbsolute = lastPrice - prevClose;
    const changePercent = (changeAbsolute / prevClose) * 100;
    const dayHigh = Math.max(lastPrice, dayOpen) * (1 + rand() * 0.012);
    const dayLow = Math.min(lastPrice, dayOpen) * (1 - rand() * 0.012);
    const absChangePercent = Math.abs(changePercent);
    const volumeMultiplier = 1 + (absChangePercent / 5) * randBetween(0.5, 1.5);
    const baseVolume = Math.floor(
      (mcCat === 'Large Cap' ? 5e6 : mcCat === 'Mid Cap' ? 1e6 : 200000) *
        randBetween(0.3, 3) *
        volumeMultiplier,
    );
    const avgVolume20D = Math.floor(baseVolume * randBetween(0.5, 2));
    const volumeRatio = baseVolume / avgVolume20D;
    const priceHistory: number[] = [lastPrice];
    for (let k = 1; k < 210; k++) {
      priceHistory.unshift(gbm(priceHistory[0], 0, sigma, 1 / 252));
    }
    const price5DaysAgo = priceHistory[priceHistory.length - 6] ?? prevClose;
    const return5Day = ((lastPrice - price5DaysAgo) / price5DaysAgo) * 100;
    let rsi14 = calcRSI(priceHistory);
    if (return5Day > 0 && rsi14 <= 50) {
      rsi14 = clamp(50 + randBetween(1, 15) + (rsi14 - 50) * 0.5, 51, 95);
    } else if (return5Day < 0 && rsi14 >= 50) {
      rsi14 = clamp(50 - randBetween(1, 15) - (50 - rsi14) * 0.5, 5, 49);
    }
    if (Math.abs(rsi14 - 50) < 0.1) {
      rsi14 = rsi14 > 50 ? 51.5 : 48.5;
    }
    const sma50 = calcSMA(priceHistory, 50);
    const sma200 = calcSMA(priceHistory, 200);
    const ema20 = calcSMA(priceHistory, 20) * (1 + normalRandom(0, 0.005));
    const sma20 = calcSMA(priceHistory, 20);
    const sliceLast20 = priceHistory.slice(-20);
    const variance = sliceLast20.reduce((a, p) => a + (p - sma20) ** 2, 0) / 20;
    const std = Math.sqrt(variance);
    const bbPct = std > 0 ? (lastPrice - (sma20 - 2 * std)) / (4 * std) : 0.5;
    let baseBeta = normalRandom(cfg.avgBeta, cfg.betaStd);
    const logMcapNormalized =
      (Math.log(marketCap) - Math.log(50)) / (Math.log(2000000) - Math.log(50));
    baseBeta = baseBeta - 0.3 * (logMcapNormalized - 0.5);
    let beta = 1.0;
    if (mcCat === 'Large Cap') {
      beta = clamp(baseBeta, 0.5, 1.2);
    } else if (mcCat === 'Micro Cap') {
      beta = clamp(baseBeta, 0.3, 2.5);
    } else {
      beta = clamp(baseBeta, 0.4, 1.8);
    }
    const atr = lastPrice * sigma * Math.sqrt(14 / 252);
    const revenueGrowthYoY = clamp(normalRandom(12, 15), -30, 80);
    let pe = null;
    if (rand() > 0.08) {
      if (revenueGrowthYoY > 25) {
        pe = clamp(normalRandom(45, 15), 20, 80);
      } else if (revenueGrowthYoY < 5) {
        if (revenueGrowthYoY < 0 && rand() > 0.5) {
          pe = clamp(normalRandom(-12, 8), -35, -5);
        } else {
          pe = clamp(normalRandom(10, 3), 5, 15);
        }
      } else {
        pe = clamp(normalRandom(cfg.avgPE, cfg.peStd), 10, 50);
      }
    }
    const roe = clamp(normalRandom(cfg.avgROE, 6), -15, 55);
    const roce = roe * randBetween(0.7, 1.2);
    let promoterHolding = 50;
    if (mcCat === 'Large Cap') {
      promoterHolding = clamp(normalRandom(55, 8), 40, 75);
    } else if (mcCat === 'Micro Cap') {
      promoterHolding = clamp(normalRandom(50, 18), 20, 90);
    } else {
      promoterHolding = clamp(normalRandom(cfg.avgPromoterHolding, 12), 30, 80);
    }
    let debtToEquity = 0.5;
    if (sector === 'Banking') {
      debtToEquity = clamp(normalRandom(10, 2.5), 5.0, 15.0);
    } else if (sector === 'IT' || sector === 'FMCG') {
      debtToEquity = clamp(normalRandom(0.2, 0.1), 0.0, 0.5);
    } else if (sector === 'Infrastructure' || sector === 'Realty') {
      debtToEquity = clamp(normalRandom(1.25, 0.35), 0.5, 2.0);
    } else {
      debtToEquity = clamp(normalRandom(0.8, 0.4), 0.1, 3.0);
    }
    const week52High = lastPrice * (1 + rand() * 0.65);
    const week52Low = lastPrice * (1 - rand() * 0.6);
    const stock: Stock = {
      id: `stock-${i}`,
      symbol: generateSymbol(sector, i),
      companyName: generateCompanyName(sector, i),
      sector,
      industry: choice(cfg.industries),
      marketCapCategory: mcCat,
      indexMembership: assignIndices(marketCap),
      exchange: choice(EXCHANGES),
      lastPrice,
      previousClose: prevClose,
      dayOpen,
      dayHigh,
      dayLow,
      changeAbsolute,
      changePercent,
      volume: baseVolume,
      avgVolume20D,
      week52High,
      week52Low,
      week52HighProximity: clamp(((week52High - lastPrice) / week52High) * 100, 0, 100),
      week52LowProximity: clamp(((lastPrice - week52Low) / (week52Low || 1)) * 100, 0, 1000),
      marketCap,
      pe,
      pb: clamp(normalRandom(3, 2), 0.3, 20),
      dividendYield: rand() > 0.35 ? clamp(normalRandom(2, 1.5), 0, 10) : 0,
      eps: lastPrice / (pe || 20),
      roe,
      roce,
      debtToEquity,
      currentRatio: clamp(normalRandom(1.8, 0.8), 0.3, 5),
      promoterHolding,
      revenueGrowthYoY,
      profitGrowthYoY: clamp(normalRandom(15, 25), -60, 120),
      grossMargin: clamp(normalRandom(35, 15), 5, 80),
      operatingMargin: clamp(normalRandom(18, 10), 1, 50),
      netMargin: clamp(normalRandom(10, 8), 0, 35),
      enterpriseValue: marketCap * randBetween(0.8, 1.6),
      evEbitda: clamp(normalRandom(14, 6), 2, 50),
      freeCashFlow: marketCap * normalRandom(0.06, 0.08),
      rsi14,
      sma50,
      sma200,
      ema20,
      beta,
      atr,
      macdSignal: toMACDSignal(rand()),
      bollingerPosition: toBollingerPosition(bbPct),
      bollingerPct: clamp(bbPct, -0.2, 1.2),
      volumeVsAvg: toVolumeVsAvg(volumeRatio),
      volumeRatio,
      adx: randBetween(10, 60),
      stochasticK: randBetween(0, 100),
      cci: normalRandom(0, 80),
      williamsR: randBetween(-100, 0),
      priceVsSMA50: ((lastPrice - sma50) / sma50) * 100,
      priceVsSMA200: ((lastPrice - sma200) / sma200) * 100,
      priceVsSMA50Signal: lastPrice >= sma50 ? 'Above' : 'Below',
      priceVsSMA200Signal: lastPrice >= sma200 ? 'Above' : 'Below',
      isActive: true,
      isWatched: false,
      lastUpdated: Date.now(),
    };
    stocks.push(stock);
  }
  return stocks;
}
let cachedUniverse: Stock[] | null = null;
export function getStockUniverse(): Stock[] {
  if (!cachedUniverse) cachedUniverse = generateMockStocks(5000);
  return cachedUniverse;
}
export function updateCachedStock(symbol: string, updates: Partial<Stock>): void {
  if (!cachedUniverse) return;
  const idx = cachedUniverse.findIndex((s) => s.symbol === symbol);
  if (idx !== -1) cachedUniverse[idx] = { ...cachedUniverse[idx], ...updates };
}
