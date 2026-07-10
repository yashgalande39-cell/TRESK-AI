/**
 * TRESK AI — Global Error Boundary
 * =====================================================================
 * Wraps the app to catch any unhandled React render errors and show
 * a styled fallback UI instead of a blank screen.
 *
 * Usage in main.jsx:
 *   import ErrorBoundary from './components/ErrorBoundary';
 *   <ErrorBoundary><App /></ErrorBoundary>
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);

    // Report to Sentry if available
    if (window.__SENTRY_SDK__) {
      const eventId = window.__SENTRY_SDK__.captureException(error);
      this.setState({ eventId });
    }
  }

  handleReload = () => {
    window.location.href = '/dashboard';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080C14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '20px',
            padding: '48px 40px',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>

          <h1 style={{ color: '#F9FAFB', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.6, margin: '0 0 32px' }}>
            An unexpected error occurred. Our team has been notified. You can try refreshing or navigating back to the dashboard.
          </p>

          {/* Error details */}
          {this.state.error && (
            <div
              style={{
                background: '#0B0F1A',
                border: '1px solid #1F2937',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '24px',
                overflow: 'auto',
                maxHeight: '200px',
              }}
            >
              <p style={{ color: '#EF4444', fontSize: '12px', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.stack || this.state.error.toString()}
              </p>
            </div>
          )}

          {this.state.eventId && (
            <p style={{ color: '#4B5563', fontSize: '12px', marginBottom: '24px' }}>
              Error ID: <code style={{ color: '#6B7280' }}>{this.state.eventId}</code>
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #374151',
                borderRadius: '10px',
                color: '#D1D5DB',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
