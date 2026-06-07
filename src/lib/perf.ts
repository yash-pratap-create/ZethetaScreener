/**
 * Performance Benchmark Utilities
 *
 * Provides instrumentation for the required benchmarks:
 * - Filter response < 200ms
 * - Sort response < 150ms
 * - WebSocket update latency < 50ms
 */

export interface BenchmarkResult {
  operation: string;
  durationMs: number;
  rowCount?: number;
  passed: boolean;
  threshold: number;
}

const THRESHOLDS = {
  filter: 200,
  sort: 150,
  wsUpdate: 50,
  render: 16.67, // 60fps frame budget
} as const;

// ── measure() wraps synchronous operations ────────────────────────────────────
export function measure<T>(
  operation: keyof typeof THRESHOLDS,
  fn: () => T,
  rowCount?: number,
): { result: T; benchmark: BenchmarkResult } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  const threshold = THRESHOLDS[operation];

  const benchmark: BenchmarkResult = {
    operation,
    durationMs,
    rowCount,
    passed: durationMs <= threshold,
    threshold,
  };

  if (!benchmark.passed && process.env.NODE_ENV === 'development') {
    console.warn(
      `[Perf] ${operation} took ${durationMs.toFixed(2)}ms — exceeds ${threshold}ms threshold`,
      rowCount ? `(${rowCount} rows)` : '',
    );
  }

  return { result, benchmark };
}

// ── measureAsync() wraps async operations (WebSocket, fetch) ─────────────────
export async function measureAsync<T>(
  operation: keyof typeof THRESHOLDS,
  fn: () => Promise<T>,
): Promise<{ result: T; benchmark: BenchmarkResult }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  const threshold = THRESHOLDS[operation];

  const benchmark: BenchmarkResult = {
    operation,
    durationMs,
    passed: durationMs <= threshold,
    threshold,
  };

  return { result, benchmark };
}

// ── Frame-rate measurement using requestAnimationFrame ────────────────────────
export class FPSMonitor {
  private frames: number[] = [];
  private rafId: number | null = null;
  private lastTime = 0;

  start() {
    this.frames = [];
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const delta = now - this.lastTime;
      if (delta > 0) this.frames.push(1000 / delta);
      this.lastTime = now;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): { avgFPS: number; minFPS: number; dropped: number } {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.frames.length === 0) return { avgFPS: 0, minFPS: 0, dropped: 0 };
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    const min = Math.min(...this.frames);
    const dropped = this.frames.filter((f) => f < 55).length;
    return { avgFPS: Math.round(avg), minFPS: Math.round(min), dropped };
  }
}

// ── WebSocket latency tracker ────────────────────────────────────────────────
export class WSLatencyTracker {
  private timestamps = new Map<string, number>();
  private latencies: number[] = [];

  markSent(id: string) {
    this.timestamps.set(id, performance.now());
  }

  markReceived(id: string) {
    const sent = this.timestamps.get(id);
    if (sent) {
      this.latencies.push(performance.now() - sent);
      this.timestamps.delete(id);
    }
  }

  getStats() {
    if (this.latencies.length === 0) return null;
    const avg = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
    const p95 = this.latencies.sort((a, b) => a - b)[Math.floor(this.latencies.length * 0.95)];
    return {
      avgMs: Math.round(avg * 10) / 10,
      p95Ms: Math.round((p95 ?? 0) * 10) / 10,
      samples: this.latencies.length,
      passing: avg < THRESHOLDS.wsUpdate,
    };
  }
}
