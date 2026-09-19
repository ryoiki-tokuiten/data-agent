
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class MainErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      const defaultMessage = "We're sorry, a critical error occurred in the application. Please try refreshing the page. If the problem persists, please note the error details below.";
      const errorMessageToDisplay = this.props.fallbackMessage || defaultMessage;

      return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
            fontFamily: 'var(--font-family)',
        }}>
          <div style={{
            padding: '2.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg-color)',
            border: '1.5px solid var(--accent-pink)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: '800px',
            width: '100%',
          }}>
            <h1 style={{ color: 'var(--accent-pink)', marginBottom: '1.5rem', fontSize: '2rem', fontWeight: 700 }}>
              Application Error
            </h1>
            <p style={{ marginBottom: '2rem', lineHeight: '1.7', fontSize: '1.1rem', color: 'var(--text-secondary-color)' }}>
              {errorMessageToDisplay}
            </p>

            <details style={{ textAlign: 'left', marginTop: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
              <summary style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1rem' }}>
                 Error Information
              </summary>
              <pre style={{
                backgroundColor: 'rgba(var(--bg-color-rgb), 0.8)',
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                borderRadius: 'var(--border-radius-md)',
                fontSize: '0.875rem',
                overflowX: 'auto',
                marginTop: '1rem',
                textAlign: 'left',
                color: 'var(--text-secondary-color)',
                maxHeight: '300px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }} className="custom-scrollbar">
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.error.stack && (
                  `\n\n<strong>Stack Trace:</strong>\n${this.state.error.stack}`
                )}
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  `\n\n<strong>Component Stack:</strong>\n${this.state.errorInfo.componentStack}`
                )}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="button primary-action"
              style={{ marginTop: '3rem', padding: '1rem 2rem', fontSize: '1.1rem', width: 'auto' }}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MainErrorBoundary;
