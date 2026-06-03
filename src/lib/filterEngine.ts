import { Stock, FilterGroup, FilterRule, FilterConfig, FilterOperator } from '@/types';
type Predicate = (stock: Stock) => boolean;
function compileNumericPredicate(
  field: keyof Stock,
  operator: FilterOperator,
  value: number,
  value2?: number,
): Predicate {
  switch (operator) {
    case 'eq':
      return (s) => (s[field] as number) === value;
    case 'neq':
      return (s) => (s[field] as number) !== value;
    case 'gt':
      return (s) => (s[field] as number) > value;
    case 'gte':
      return (s) => (s[field] as number) >= value;
    case 'lt':
      return (s) => (s[field] as number) < value;
    case 'lte':
      return (s) => (s[field] as number) <= value;
    case 'between': {
      const lo = Math.min(value, value2 ?? value);
      const hi = Math.max(value, value2 ?? value);
      return (s) => {
        const v = s[field] as number;
        return v >= lo && v <= hi;
      };
    }
    default:
      return () => true;
  }
}
function compileSelectPredicate(field: keyof Stock, values: string[]): Predicate {
  if (values.length === 0) return () => true;
  const set = new Set(values);
  return (s) => {
    const v = s[field];
    if (Array.isArray(v)) return (v as string[]).some((item) => set.has(item));
    return set.has(String(v));
  };
}
function compileRule(rule: FilterRule): Predicate {
  switch (rule.type) {
    case 'numeric':
      return compileNumericPredicate(rule.field, rule.operator, rule.value, rule.value2);
    case 'select':
      return compileSelectPredicate(rule.field, rule.values);
    case 'boolean':
      return (s) => Boolean(s[rule.field]) === rule.value;
    default:
      return () => true;
  }
}
export function compileFilterConfig(config: FilterConfig): Predicate | null {
  if (!config.enabled) return null;
  const { field, operator, value } = config;
  if (operator === 'in' || operator === 'notIn') {
    const arr = value as string[];
    const set = new Set(arr);
    if (operator === 'in') return (s) => set.has(String(s[field]));
    if (operator === 'notIn') return (s) => !set.has(String(s[field]));
  }
  if (operator === 'contains') {
    const q = String(value).toLowerCase();
    return (s) => String(s[field]).toLowerCase().includes(q);
  }
  if (operator === 'startsWith') {
    const q = String(value).toLowerCase();
    return (s) => String(s[field]).toLowerCase().startsWith(q);
  }
  return compileNumericPredicate(field, operator, Number(value));
}
function ruleCost(r: FilterRule): number {
  if (r.type === 'boolean') return 0;
  if (r.type === 'select') return r.values.length === 0 ? -1 : 1;
  return 2;
}
function compileGroup(group: FilterGroup): Predicate {
  const predicates = [...group.rules].sort((a, b) => ruleCost(a) - ruleCost(b)).map(compileRule);
  if (predicates.length === 0) return () => true;
  if (group.logic === 'AND') {
    return (s) => {
      for (const p of predicates) if (!p(s)) return false;
      return true;
    };
  }
  return (s) => {
    for (const p of predicates) if (p(s)) return true;
    return false;
  };
}
export interface FilterResult {
  data: Stock[];
  totalCount: number;
  filteredCount: number;
  durationMs: number;
}
export function applyFilters(
  stocks: Stock[],
  group: FilterGroup | null,
  searchQuery?: string,
): FilterResult {
  const start = performance.now();
  let result = stocks;
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q),
    );
  }
  if (group && group.rules.length > 0) {
    const predicate = compileGroup(group);
    result = result.filter(predicate);
  }
  return {
    data: result,
    totalCount: stocks.length,
    filteredCount: result.length,
    durationMs: performance.now() - start,
  };
}
export { FILTER_PRESETS } from '@/constants/FILTER_PRESETS';
