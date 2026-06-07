// ─────────────────────────────────────────────────────────────────────────────
// Stock types — aligned with specification
// ─────────────────────────────────────────────────────────────────────────────

/** Indian-market sector taxonomy */
export type Sector =
  | 'IT'
  | 'Banking'
  | 'Pharma'
  | 'Auto'
  | 'FMCG'
  | 'Metal'
  | 'Energy'
  | 'Realty'
  | 'Telecom'
  | 'Infrastructure'
  | 'Media'
  | 'Others';

export type MarketCapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Micro Cap';

export type MACDSignal = 'Bullish' | 'Bearish' | 'Neutral';
export type BollingerPosition = 'Above' | 'Within' | 'Below';
export type VolumeVsAvg = 'Below' | 'Above' | '2x' | '3x';
export type PriceVsSMA = 'Above' | 'Below';

export type IndexMembership =
  | 'NIFTY50'
  | 'NIFTY100'
  | 'NIFTY500'
  | 'SENSEX'
  | 'MIDCAP150'
  | 'SMALLCAP250';

export interface Stock {
  // Identity
  id: string;
  symbol: string;
  companyName: string;
  sector: Sector;
  industry: string;
  marketCapCategory: MarketCapCategory;
  indexMembership: IndexMembership[];
  exchange: 'NSE' | 'BSE';

  // Price data
  lastPrice: number;
  previousClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  changePercent: number;
  changeAbsolute: number;
  volume: number;
  avgVolume20D: number;
  week52High: number;
  week52Low: number;
  week52HighProximity: number;  // % distance from 52-week high
  week52LowProximity: number;   // % distance from 52-week low

  // Fundamentals
  marketCap: number;           // ₹ Crores
  pe: number | null;
  pb: number;
  dividendYield: number;
  eps: number;
  roe: number;
  roce: number;
  debtToEquity: number;
  currentRatio: number;
  promoterHolding: number;     // %
  revenueGrowthYoY: number;    // %
  profitGrowthYoY: number;     // %
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  enterpriseValue: number;
  evEbitda: number;
  freeCashFlow: number;

  // Technical — enum-typed where spec requires
  rsi14: number;
  sma50: number;
  sma200: number;
  ema20: number;
  beta: number;
  atr: number;
  macdSignal: MACDSignal;
  bollingerPosition: BollingerPosition;
  bollingerPct: number;        // 0–1 numeric (kept for chart rendering)
  volumeVsAvg: VolumeVsAvg;
  volumeRatio: number;         // numeric ratio (kept for numeric filters)
  adx: number;
  stochasticK: number;
  cci: number;
  williamsR: number;
  priceVsSMA50: number;        // % above/below
  priceVsSMA200: number;
  priceVsSMA50Signal: PriceVsSMA;   // Above / Below
  priceVsSMA200Signal: PriceVsSMA;  // Above / Below

  // Meta
  isActive: boolean;
  lastUpdated: number;
  isWatched: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith';

export type FilterValue = number | string | boolean | number[] | string[];

export interface FilterConfig {
  id: string;
  field: keyof Stock;
  operator: FilterOperator;
  value: FilterValue;
  enabled: boolean;
}

export type FilterLogic = 'AND' | 'OR';

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  rules: FilterRule[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterGroup;
}

export type NumericStockKeys = {
  [K in keyof Stock]: Stock[K] extends number | null ? K : never;
}[keyof Stock];

export type SelectStockKeys = {
  [K in keyof Stock]: Stock[K] extends string | string[] ? K : never;
}[keyof Stock];

export type BooleanStockKeys = {
  [K in keyof Stock]: Stock[K] extends boolean ? K : never;
}[keyof Stock];

export type FilterRule =
  | { type: 'numeric'; field: NumericStockKeys; operator: FilterOperator; value: number; value2?: number }
  | { type: 'select'; field: SelectStockKeys; values: string[] }
  | { type: 'boolean'; field: BooleanStockKeys; value: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// Chart types
// ─────────────────────────────────────────────────────────────────────────────

export interface CandlestickBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeBar {
  time: number;
  value: number;
  color: string;
}

export type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket types
// ─────────────────────────────────────────────────────────────────────────────

export interface WSPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  timestamp: number;
}

export interface WSBatchUpdate {
  type: 'BATCH_UPDATE';
  updates: WSPriceUpdate[];
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Watchlist
// ─────────────────────────────────────────────────────────────────────────────

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: keyof Stock;
  direction: SortDirection;
}
