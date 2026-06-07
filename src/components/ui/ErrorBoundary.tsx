'use client';

import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level Error Boundary.
 * Wrap each major feature area (DataGrid, Chart, FilterPanel) independently
 * so a crash in one area doesn't bring down the entire screener.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production: replace with Sentry / DataDog / logging service
    console.error(`[ErrorBoundary:${this.props.feature ?? 'unknown'}]`, error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error}
          feature={this.props.feature}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// ── Default fallback UI ────────────────────────────────────────────────────────
function ErrorFallback({
  error,
  feature,
  onReset,
}: {
  error: Error | null;
  feature?: string;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl"
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', minHeight: 200 }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        style={{ color: 'var(--color-red)', opacity: 0.7 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="text-center">
        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {feature ? `${feature} encountered an error` : 'Something went wrong'}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {error?.message ?? 'Unknown error'}
        </p>
      </div>
      <button
        onClick={onReset}
        className="text-xs px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--color-accent-primary)', color: 'white' }}
      >
        Retry
      </button>
    </div>
  );
}
