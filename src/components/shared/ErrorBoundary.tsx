import React, { type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  declare readonly props: React.PropsWithChildren<ErrorBoundaryProps>;
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-center">
          <p className="text-[var(--danger)] font-medium mb-2">Something went wrong</p>
          <p className="text-sm text-[var(--text-muted)]">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
