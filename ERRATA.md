# ERRATA.md — Deliberate Technical Errors & Corrections

This document identifies, explains, and corrects the three deliberate technical errors embedded in the project design and specifications.

---

## 1. Indicator Calculation: RSI Boundary Condition (Relative Strength Index)

### The Error
In the standard Relative Strength Index (RSI) calculation implementation (specifically inside `src/lib/indicators.ts` and mentioned in the specs), when `avgLoss` is `0` (meaning there were zero downward price changes during the period), the Relative Strength ($RS = \text{avgGain} / \text{avgLoss}$) is mathematically infinite. The RSI value in this boundary condition should be exactly **`100`**.

However, the code implements:
```typescript
const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
result.push({ time: bars[period].time, value: 100 - 100 / (1 + firstRS) });
```
By setting `firstRS = 100` and proceeding with the division, the formula computes:
$$\text{RSI} = 100 - \frac{100}{1 + 100} = 100 - 0.9901 = 99.01$$
This yields an incorrect value of `99.01` instead of `100` for an asset with pure upward momentum.

### The Correction
Directly assign the boundary value `100` when `avgLoss === 0` (and `0` when `avgGain === 0`) without running it through the division formula:

```typescript
// Corrected boundary logic
let rsiValue = 100;
if (avgLoss !== 0) {
  const rs = avgGain / avgLoss;
  rsiValue = 100 - 100 / (1 + rs);
} else if (avgGain === 0) {
  rsiValue = 50; // No price movement at all
}
```

---

## 2. WebSocket Reconnection Logic: Exponential Backoff & Overwritten Timer Reference

### The Error
There are two distinct errors in the WebSocket reconnection logic in the hook `src/hooks/useRealtimeUpdates.ts`:
1. **Exponential Backoff Skip:** The `reconnectAttemptsRef.current` is incremented *before* calculating the backoff:
   ```typescript
   reconnectAttemptsRef.current += 1;
   const backoff = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
   ```
   Since `reconnectAttemptsRef` starts at 0, the first reconnection backoff calculated is $1000 \times 2^1 = 2000$ ms. This completely skips the initial $1000$ ms (1-second) retry delay.
2. **Timer Overwrite & Memory Leak:** The `reconnectTimerRef.current` is shared between the backoff delay in `reconnect()` and the connection delay in `connect()`:
   ```typescript
   // In reconnect()
   reconnectTimerRef.current = setTimeout(() => { connect(); }, backoff);
   
   // In connect()
   reconnectTimerRef.current = setTimeout(() => { ... }, connectionDelay);
   ```
   When the backoff timer fires and calls `connect()`, `reconnectTimerRef.current` is immediately overwritten with the connection delay timeout. The reference to the backoff timer (or subsequent disconnect commands) is lost. If `disconnect()` is called while the connection is still pending, the timeout is never cleared, creating a background timer leak.

### The Correction
1. Calculate the backoff based on the unincremented attempt count, or use $2^{\text{attempts} - 1}$:
   ```typescript
   const backoff = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), 30000);
   ```
2. Split `reconnectTimerRef` into separate refs or explicitly clear active timers before reassignment:
   ```typescript
   const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const connectDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```

---

## 3. TypeScript Type Definitions: Loose Filter Rule Field Assignment

### The Error
In the `FilterRule` type definition (located in `src/types/stock.ts`), the `field` property is defined as `keyof Stock` for all three rule types (`numeric`, `select`, `boolean`):
```typescript
export type FilterRule =
  | { type: 'numeric'; field: keyof Stock; operator: FilterOperator; value: number }
  | { type: 'select'; field: keyof Stock; values: string[] }
  | { type: 'boolean'; field: keyof Stock; value: boolean };
```
Because `keyof Stock` includes *every* property of the `Stock` interface, this definition is loosely typed. It allows compile-time assignment of illegal filter combinations, such as applying a `'numeric'` comparison operator to a string field (e.g. `field: 'companyName'`) or a `'boolean'` filter to a numeric field (e.g. `field: 'lastPrice'`).

### The Correction
Refactor `FilterRule` to map fields strictly to their valid primitive type subsets using TypeScript mapped conditional types:

```typescript
// 1. Extract type-safe key categories
export type NumericStockKeys = {
  [K in keyof Stock]: Stock[K] extends number | null ? K : never;
}[keyof Stock];

export type SelectStockKeys = {
  [K in keyof Stock]: Stock[K] extends string | string[] ? K : never;
}[keyof Stock];

export type BooleanStockKeys = {
  [K in keyof Stock]: Stock[K] extends boolean ? K : never;
}[keyof Stock];

// 2. Apply strictly-typed key categories to the FilterRule union
export type FilterRule =
  | { type: 'numeric'; field: NumericStockKeys; operator: FilterOperator; value: number; value2?: number }
  | { type: 'select'; field: SelectStockKeys; values: string[] }
  | { type: 'boolean'; field: BooleanStockKeys; value: boolean };
```
This guarantees compile-time safety and prevents invalid filter structures from being compiled.
