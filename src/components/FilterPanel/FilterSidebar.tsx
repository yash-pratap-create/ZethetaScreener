'use client';
import { useState, useCallback } from 'react';
import { useFilterStore } from '@/stores/filterStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { FILTER_PRESETS } from '@/lib/filterEngine';
import { FilterRule, NumericStockKeys, SelectStockKeys, BooleanStockKeys } from '@/types';
import { useRealtimeStore } from '@/stores/realtimeStore';
import {
  Sector,
  MACDSignal,
  IndexMembership,
  MarketCapCategory,
  BollingerPosition,
  VolumeVsAvg,
  PriceVsSMA,
} from '@/types/stock';
import { SECTORS } from '@/constants/SECTORS';
const NUMERIC_FIELDS: {
  id: keyof import('@/types').Stock;
  label: string;
  category: string;
}[] = [
    { id: 'marketCap', label: 'Market Capitalisation (Cr)', category: 'Fundamentals' },
    { id: 'pe', label: 'Price-to-Earnings (P/E)', category: 'Fundamentals' },
    { id: 'pb', label: 'Price-to-Book (P/B)', category: 'Fundamentals' },
    { id: 'dividendYield', label: 'Dividend Yield (%)', category: 'Fundamentals' },
    { id: 'eps', label: 'Earnings Per Share (EPS)', category: 'Fundamentals' },
    { id: 'roe', label: 'Return on Equity (%)', category: 'Fundamentals' },
    { id: 'roce', label: 'Return on Capital Employed (%)', category: 'Fundamentals' },
    { id: 'debtToEquity', label: 'Debt-to-Equity Ratio', category: 'Fundamentals' },
    { id: 'currentRatio', label: 'Current Ratio', category: 'Fundamentals' },
    { id: 'promoterHolding', label: 'Promoter Holding (%)', category: 'Fundamentals' },
    { id: 'revenueGrowthYoY', label: 'Revenue Growth YoY (%)', category: 'Fundamentals' },
    { id: 'profitGrowthYoY', label: 'Profit Growth YoY (%)', category: 'Fundamentals' },
    { id: 'lastPrice', label: 'Last Traded Price', category: 'Market Data' },
    { id: 'week52HighProximity', label: '52-Week High Proximity (%)', category: 'Market Data' },
    { id: 'week52LowProximity', label: '52-Week Low Proximity (%)', category: 'Market Data' },
    { id: 'avgVolume20D', label: 'Average Volume (20D)', category: 'Market Data' },
    { id: 'beta', label: 'Beta', category: 'Market Data' },
    { id: 'changePercent', label: 'Day Change (%)', category: 'Market Data' },
    { id: 'volumeRatio', label: 'Volume Ratio', category: 'Market Data' },
    { id: 'rsi14', label: 'RSI (14)', category: 'Technical' },
    { id: 'atr', label: 'Average True Range', category: 'Technical' },
    { id: 'bollingerPct', label: 'Bollinger %B (0-1)', category: 'Technical' },
    { id: 'adx', label: 'ADX', category: 'Technical' },
    { id: 'stochasticK', label: 'Stochastic %K', category: 'Technical' },
    { id: 'cci', label: 'CCI', category: 'Technical' },
    { id: 'evEbitda', label: 'EV/EBITDA', category: 'Technical' },
    { id: 'grossMargin', label: 'Gross Margin (%)', category: 'Technical' },
    { id: 'netMargin', label: 'Net Margin (%)', category: 'Technical' },
  ];
const MACD_SIGNALS: MACDSignal[] = ['Bullish', 'Bearish', 'Neutral'];
const INDICES: IndexMembership[] = [
  'NIFTY50',
  'NIFTY100',
  'NIFTY500',
  'SENSEX',
  'MIDCAP150',
  'SMALLCAP250',
];
const MCAP_CATEGORIES: MarketCapCategory[] = ['Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap'];
const BB_POSITIONS: BollingerPosition[] = ['Above', 'Within', 'Below'];
const VOL_VS_AVG: VolumeVsAvg[] = ['Below', 'Above', '2x', '3x'];
const PRICE_VS_SMA: PriceVsSMA[] = ['Above', 'Below'];
type SelectField =
  | 'sector'
  | 'macdSignal'
  | 'indexMembership'
  | 'marketCapCategory'
  | 'bollingerPosition'
  | 'volumeVsAvg'
  | 'industry'
  | 'priceVsSMA50Signal'
  | 'priceVsSMA200Signal';
const SELECT_FIELD_CONFIG: Record<
  SelectField,
  {
    label: string;
    options: string[];
  }
> = {
  sector: { label: 'Sector', options: SECTORS },
  industry: { label: 'Industry', options: [] },
  marketCapCategory: { label: 'Market Cap Category', options: MCAP_CATEGORIES },
  indexMembership: { label: 'Index Membership', options: INDICES },
  macdSignal: { label: 'MACD Signal', options: MACD_SIGNALS },
  priceVsSMA50Signal: { label: 'Price vs SMA 50', options: PRICE_VS_SMA },
  priceVsSMA200Signal: { label: 'Price vs SMA 200', options: PRICE_VS_SMA },
  bollingerPosition: { label: 'Bollinger Band Position', options: BB_POSITIONS },
  volumeVsAvg: { label: 'Volume vs 20D Average', options: VOL_VS_AVG },
};
type AddMode =
  | 'numeric'
  | 'sector'
  | 'industry'
  | 'marketCapCategory'
  | 'indexMembership'
  | 'macdSignal'
  | 'priceVsSMA50Signal'
  | 'priceVsSMA200Signal'
  | 'bollingerPosition'
  | 'volumeVsAvg'
  | 'watchlistOnly'
  | 'recentlyUpdated';
export function NumericFilterRow({
  rule,
  index,
  onUpdate,
  onRemove,
}: {
  rule: Extract<
    FilterRule,
    {
      type: 'numeric';
    }
  >;
  index: number;
  onUpdate: (i: number, r: FilterRule) => void;
  onRemove: (i: number) => void;
}) {
  const idPrefix = `filter-${index}`;
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-2"
      role="group"
      aria-label={`Numeric filter rule ${index + 1}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor={`${idPrefix}-field`}
            className="text-[10px] uppercase font-bold text-text-muted"
          >
            Metric
          </label>
          <select
            id={`${idPrefix}-field`}
            value={rule.field as string}
            onChange={(e) =>
              onUpdate(index, { ...rule, field: e.target.value as NumericStockKeys })
            }
            className="text-xs bg-surface-3 border border-border rounded px-2 py-1 text-text-primary w-full"
            style={{
              background: 'var(--color-bg-surface-3)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {NUMERIC_FIELDS.map((f) => (
              <option key={f.id as string} value={f.id as string}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-text-muted hover:text-red-400 transition-colors p-1 self-end"
          aria-label={`Remove numeric filter for ${rule.field}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${idPrefix}-op`}
            className="text-[10px] uppercase font-bold text-text-muted"
          >
            Condition
          </label>
          <select
            id={`${idPrefix}-op`}
            value={rule.operator}
            onChange={(e) =>
              onUpdate(index, {
                ...rule,
                operator: e.target.value as 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between',
              })
            }
            className="text-xs rounded px-2 py-1"
            style={{
              background: 'var(--color-bg-surface-3)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="gt">&gt;</option>
            <option value="gte">&ge;</option>
            <option value="lt">&lt;</option>
            <option value="lte">&le;</option>
            <option value="eq">=</option>
            <option value="between">Between</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor={`${idPrefix}-val`}
            className="text-[10px] uppercase font-bold text-text-muted"
          >
            Value
          </label>
          <input
            id={`${idPrefix}-val`}
            type="number"
            value={rule.value}
            onChange={(e) => onUpdate(index, { ...rule, value: parseFloat(e.target.value) || 0 })}
            className="w-full text-xs rounded px-2 py-1 font-mono"
            style={{
              background: 'var(--color-bg-surface-3)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
            aria-valuenow={rule.value}
            aria-valuemin={0}
            aria-valuemax={10000000}
          />
        </div>

        {rule.operator === 'between' && (
          <>
            <span className="text-text-muted text-xs mb-1.5">-</span>
            <div className="flex flex-col gap-1 flex-1">
              <label
                htmlFor={`${idPrefix}-val2`}
                className="text-[10px] uppercase font-bold text-text-muted"
              >
                Max Value
              </label>
              <input
                id={`${idPrefix}-val2`}
                type="number"
                value={rule.value2 ?? ''}
                onChange={(e) =>
                  onUpdate(index, { ...rule, value2: parseFloat(e.target.value) || 0 })
                }
                className="w-full text-xs rounded px-2 py-1 font-mono"
                style={{
                  background: 'var(--color-bg-surface-3)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                aria-valuenow={rule.value2 ?? 0}
                aria-valuemin={0}
                aria-valuemax={10000000}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export function SelectFilterRow({
  rule,
  index,
  onUpdate,
  onRemove,
}: {
  rule: Extract<
    FilterRule,
    {
      type: 'select';
    }
  >;
  index: number;
  onUpdate: (i: number, r: FilterRule) => void;
  onRemove: (i: number) => void;
}) {
  const fieldKey = rule.field as SelectField;
  const config = SELECT_FIELD_CONFIG[fieldKey];
  const label = config?.label ?? String(rule.field);
  const options = config?.options ?? [];
  const selectedCountMsg = `${rule.values.length} selected`;
  const idPrefix = `filter-${index}`;
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-2"
      role="group"
      aria-label={`Select filter rule for ${label}`}
    >
      <div className="flex items-center justify-between">
        <label id={`${idPrefix}-select-label`} className="text-xs font-medium text-text-secondary">
          {label}{' '}
          <span className="text-text-muted font-normal text-[10px]">({selectedCountMsg})</span>
        </label>
        <button
          onClick={() => onRemove(index)}
          className="text-text-muted hover:text-red-400 transition-colors p-1"
          aria-label={`Remove select filter for ${label}`}
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-labelledby={`${idPrefix}-select-label`}>
        {options.map((opt) => {
          const isSelected = rule.values.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => {
                const vals = rule.values.includes(opt)
                  ? rule.values.filter((v: string) => v !== opt)
                  : [...rule.values, opt];
                onUpdate(index, { ...rule, values: vals });
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${isSelected
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                  : 'border-border text-text-muted hover:border-border-light'
                }`}
              style={{
                borderColor: isSelected ? 'var(--color-accent-primary)' : 'var(--color-border)',
                color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              }}
              aria-pressed={isSelected}
              aria-label={`${opt}. ${isSelected ? 'Selected' : 'Not Selected'}. ${selectedCountMsg} total.`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function BooleanFilterRow({
  rule,
  index,
  onUpdate,
  onRemove,
}: {
  rule: Extract<
    FilterRule,
    {
      type: 'boolean';
    }
  >;
  index: number;
  onUpdate: (i: number, r: FilterRule) => void;
  onRemove: (i: number) => void;
}) {
  const LABELS: Record<string, string> = {
    isActive: 'Recently Updated (WebSocket)',
    isWatched: 'Watchlist Only',
  };
  const label = LABELS[rule.field as string] ?? String(rule.field);
  const idPrefix = `filter-${index}`;
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2"
      role="group"
      aria-label={`Boolean filter rule for ${label}`}
    >
      <label id={`${idPrefix}-label`} className="text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          id={`${idPrefix}-btn`}
          onClick={() => onUpdate(index, { ...rule, value: !rule.value })}
          className="text-xs px-3 py-1 rounded-full border transition-all font-semibold"
          style={{
            borderColor: rule.value ? 'var(--color-accent-primary)' : 'var(--color-border)',
            color: rule.value ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            background: rule.value ? 'rgba(79,142,247,0.12)' : 'transparent',
          }}
          aria-labelledby={`${idPrefix}-label`}
          aria-pressed={rule.value}
        >
          {rule.value ? 'YES' : 'NO'}
        </button>
        <button
          onClick={() => onRemove(index)}
          className="text-text-muted hover:text-red-400 transition-colors p-1"
          aria-label={`Remove boolean filter for ${label}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
export function FilterRuleRow({
  rule,
  index,
  onUpdate,
  onRemove,
}: {
  rule: FilterRule;
  index: number;
  onUpdate: (i: number, r: FilterRule) => void;
  onRemove: (i: number) => void;
}) {
  if (rule.type === 'numeric')
    return <NumericFilterRow rule={rule} index={index} onUpdate={onUpdate} onRemove={onRemove} />;
  if (rule.type === 'select')
    return <SelectFilterRow rule={rule} index={index} onUpdate={onUpdate} onRemove={onRemove} />;
  if (rule.type === 'boolean')
    return <BooleanFilterRow rule={rule} index={index} onUpdate={onUpdate} onRemove={onRemove} />;
  return null;
}
export function FilterSidebar() {
  const {
    activeGroup,
    activePresetId,
    savedFilters,
    addRule,
    removeRule,
    updateRule,
    clearAllRules,
    setLogic,
    applyPreset,
    applySavedFilter,
    saveCurrentFilter,
    deleteSavedFilter,
  } = useFilterStore();
  const [addMode, setAddMode] = useState<AddMode>('numeric');
  const [saveName, setSaveName] = useState('');
  const handleAddRule = useCallback(() => {
    switch (addMode) {
      case 'numeric':
        addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 30 });
        break;
      case 'sector':
        addRule({ type: 'select', field: 'sector', values: [] });
        break;
      case 'industry':
        addRule({ type: 'select', field: 'industry', values: [] });
        break;
      case 'marketCapCategory':
        addRule({ type: 'select', field: 'marketCapCategory', values: [] });
        break;
      case 'indexMembership':
        addRule({ type: 'select', field: 'indexMembership', values: [] });
        break;
      case 'macdSignal':
        addRule({ type: 'select', field: 'macdSignal', values: ['Bullish'] });
        break;
      case 'priceVsSMA50Signal':
        addRule({ type: 'select', field: 'priceVsSMA50Signal', values: ['Above'] });
        break;
      case 'priceVsSMA200Signal':
        addRule({ type: 'select', field: 'priceVsSMA200Signal', values: ['Above'] });
        break;
      case 'bollingerPosition':
        addRule({ type: 'select', field: 'bollingerPosition', values: [] });
        break;
      case 'volumeVsAvg':
        addRule({ type: 'select', field: 'volumeVsAvg', values: [] });
        break;
      case 'watchlistOnly':
        addRule({ type: 'boolean', field: 'isWatched', value: true });
        break;
      case 'recentlyUpdated':
        addRule({ type: 'boolean', field: 'isActive', value: true });
        break;
    }
  }, [addMode, addRule]);
  return (
    <aside
      className="sidebar-panel flex flex-col"
      style={{ width: '260px', minWidth: '240px' }}
      aria-label="Filter panel"
    >
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: 36,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-surface-2)',
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }}
          >
            <path d="M4 4h16v2.586l-6 6V20l-4-2v-5.414L4 6.586V4z" />
          </svg>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--color-text-secondary)',
            }}
          >
            FILTERS
          </span>
          {activeGroup.rules.length > 0 && (
            <span
              style={{
                background: 'var(--color-accent-primary)',
                color: 'white',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 2,
              }}
            >
              {activeGroup.rules.length}
            </span>
          )}
        </div>
        {activeGroup.rules.length > 0 && (
          <button
            onClick={() => {
              clearAllRules();
              useRealtimeStore.getState().setAnnouncement('All filters cleared.');
            }}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--color-text-dim)',
              textTransform: 'uppercase',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-negative)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-dim)')}
          >
            CLEAR
          </button>
        )}
      </div>

      <div style={{ borderBottom: '1px solid var(--color-border)', padding: '8px 10px' }}>
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            marginBottom: 6,
          }}
        >
          QUICK PRESETS
        </p>
        <div className="flex flex-col gap-0.5">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="text-left px-2 py-1.5 transition-all"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                fontWeight: activePresetId === preset.id ? 700 : 400,
                color:
                  activePresetId === preset.id
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-muted)',
                background: activePresetId === preset.id ? 'rgba(30,136,229,0.10)' : 'transparent',
                borderLeft:
                  activePresetId === preset.id
                    ? '2px solid var(--color-accent-primary)'
                    : '2px solid transparent',
                borderRadius: 'var(--radius-xs)',
                letterSpacing: '0.04em',
              }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {savedFilters.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginBottom: 4,
              }}
            >
              MY SCREENS
            </p>
            <div className="flex flex-col gap-0.5">
              {savedFilters.map((preset) => (
                <div key={preset.id} className="flex gap-1">
                  <button
                    onClick={() => applySavedFilter(preset.id)}
                    className="flex-1 text-left px-2 py-1 transition-all"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      fontWeight: activePresetId === preset.id ? 700 : 400,
                      color:
                        activePresetId === preset.id
                          ? 'var(--color-accent-primary)'
                          : 'var(--color-text-muted)',
                      background:
                        activePresetId === preset.id ? 'rgba(30,136,229,0.10)' : 'transparent',
                      borderLeft:
                        activePresetId === preset.id
                          ? '2px solid var(--color-accent-primary)'
                          : '2px solid transparent',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => deleteSavedFilter(preset.id)}
                    className="text-text-muted hover:text-red-400 p-1.5 transition-colors rounded-lg hover:bg-hover"
                    aria-label="Delete saved filter"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 px-3 py-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Custom Filters
          </p>
          {activeGroup.rules.length > 1 && (
            <div className="flex border border-border rounded-md overflow-hidden text-xs">
              <button
                onClick={() => setLogic('AND')}
                className={`px-2 py-0.5 transition-colors ${activeGroup.logic === 'AND' ? 'text-white' : 'text-text-muted'}`}
                style={
                  activeGroup.logic === 'AND' ? { background: 'var(--color-accent-primary)' } : {}
                }
              >
                AND
              </button>
              <button
                onClick={() => setLogic('OR')}
                className={`px-2 py-0.5 transition-colors ${activeGroup.logic === 'OR' ? 'text-white' : 'text-text-muted'}`}
                style={
                  activeGroup.logic === 'OR' ? { background: 'var(--color-accent-primary)' } : {}
                }
              >
                OR
              </button>
            </div>
          )}
        </div>

        <div role="log" aria-live="polite" className="flex flex-col gap-2">
          {activeGroup.rules.map((rule, i) => (
            <FilterRuleRow
              key={i}
              rule={rule}
              index={i}
              onUpdate={updateRule}
              onRemove={removeRule}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1.5 mt-2 p-3 rounded-lg border border-dashed border-border bg-surface-1">
          <label
            htmlFor="add-filter-select"
            className="text-[10px] uppercase font-bold text-text-muted"
          >
            Add Filter Criteria
          </label>
          <div className="flex gap-1.5">
            <select
              id="add-filter-select"
              value={addMode}
              onChange={(e) => setAddMode(e.target.value as AddMode)}
              className="text-xs rounded-lg px-2 py-1.5 flex-1 bg-surface-2 text-text-primary border border-border"
              style={{
                background: 'var(--color-bg-surface-2)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <optgroup label="Numeric - Range Filters">
                <option value="numeric">Numeric metric (30+ fields)</option>
              </optgroup>
              <optgroup label="Classification - Multi-Select">
                <option value="sector">Sector</option>
                <option value="industry">Industry</option>
                <option value="marketCapCategory">Market Cap Category</option>
                <option value="indexMembership">Index Membership</option>
              </optgroup>
              <optgroup label="Technical - Select">
                <option value="macdSignal">MACD Signal</option>
                <option value="priceVsSMA50Signal">Price vs SMA 50</option>
                <option value="priceVsSMA200Signal">Price vs SMA 200</option>
                <option value="bollingerPosition">Bollinger Band Position</option>
                <option value="volumeVsAvg">Volume vs 20D Average</option>
              </optgroup>
              <optgroup label="Custom - Boolean">
                <option value="watchlistOnly">Watchlist Only</option>
                <option value="recentlyUpdated">Recently Updated (WS)</option>
              </optgroup>
            </select>
            <button
              onClick={handleAddRule}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 bg-accent-primary"
              style={{ background: 'var(--color-accent-primary)' }}
              aria-label="Add selected filter rule"
            >
              + Add
            </button>
          </div>
        </div>

        {activeGroup.rules.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-text-muted">
              {activeGroup.rules.length} filter{activeGroup.rules.length !== 1 ? 's' : ''} active
              {' . '}
              <span className="font-mono">{activeGroup.logic}</span> logic
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <label htmlFor="save-filter-name" className="sr-only">
                Name for saved filter
              </label>
              <input
                id="save-filter-name"
                name="save-filter-name"
                type="text"
                autoComplete="off"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name this filter..."
                className="text-xs rounded px-2 py-1 flex-1 bg-surface-2 text-text-primary border border-border"
                style={{
                  background: 'var(--color-bg-surface-2)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border)',
                }}
              />
              <button
                onClick={() => {
                  if (saveName.trim()) {
                    saveCurrentFilter(saveName.trim());
                    setSaveName('');
                  }
                }}
                disabled={!saveName.trim()}
                className="px-2 py-1 rounded text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-accent-primary)' }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
