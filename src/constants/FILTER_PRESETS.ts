import { FilterPreset } from '@/types/stock';
export const FILTER_PRESETS: readonly FilterPreset[] = [
  {
    id: 'oversold_rsi',
    name: 'RSI Oversold',
    description: 'RSI below 30 — potential reversal candidates',
    filters: {
      id: 'preset-rsi',
      logic: 'AND',
      rules: [{ type: 'numeric', field: 'rsi14', operator: 'lt', value: 30 }],
    },
  },
  {
    id: 'overbought_rsi',
    name: 'RSI Overbought',
    description: 'RSI above 70 — watch for pullback',
    filters: {
      id: 'preset-rsi2',
      logic: 'AND',
      rules: [{ type: 'numeric', field: 'rsi14', operator: 'gt', value: 70 }],
    },
  },
  {
    id: 'value_picks',
    name: 'Value Picks',
    description: 'Low P/E, Low P/B, High ROE',
    filters: {
      id: 'preset-value',
      logic: 'AND',
      rules: [
        { type: 'numeric', field: 'pe', operator: 'between', value: 1, value2: 20 },
        { type: 'numeric', field: 'pb', operator: 'lt', value: 3 },
        { type: 'numeric', field: 'roe', operator: 'gt', value: 15 },
      ],
    },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Price above SMA50 & SMA200, MACD Bullish',
    filters: {
      id: 'preset-momentum',
      logic: 'AND',
      rules: [
        { type: 'numeric', field: 'priceVsSMA50', operator: 'gt', value: 0 },
        { type: 'numeric', field: 'priceVsSMA200', operator: 'gt', value: 0 },
        { type: 'select', field: 'macdSignal', values: ['Bullish'] },
      ],
    },
  },
  {
    id: 'high_dividend',
    name: 'High Dividend',
    description: 'Dividend yield > 4%',
    filters: {
      id: 'preset-div',
      logic: 'AND',
      rules: [
        { type: 'numeric', field: 'dividendYield', operator: 'gt', value: 4 },
        { type: 'numeric', field: 'roe', operator: 'gt', value: 0 },
      ],
    },
  },
  {
    id: 'growth_stocks',
    name: 'Growth Stocks',
    description: 'High revenue & profit growth YoY',
    filters: {
      id: 'preset-growth',
      logic: 'AND',
      rules: [
        { type: 'numeric', field: 'revenueGrowthYoY', operator: 'gt', value: 15 },
        { type: 'numeric', field: 'profitGrowthYoY', operator: 'gt', value: 20 },
        { type: 'numeric', field: 'marketCap', operator: 'gt', value: 1000 },
      ],
    },
  },
  {
    id: 'large_caps',
    name: 'Large Caps',
    description: 'Market cap > ₹20,000 Cr',
    filters: {
      id: 'preset-largecap',
      logic: 'AND',
      rules: [{ type: 'select', field: 'marketCapCategory', values: ['Large Cap'] }],
    },
  },
  {
    id: 'high_promoter',
    name: 'High Promoter Holding',
    description: 'Promoter holding > 60%',
    filters: {
      id: 'preset-promoter',
      logic: 'AND',
      rules: [
        { type: 'numeric', field: 'promoterHolding', operator: 'gt', value: 60 },
        { type: 'numeric', field: 'pe', operator: 'gt', value: 0 },
      ],
    },
  },
] as const;
