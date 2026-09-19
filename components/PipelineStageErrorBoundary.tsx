
import { Component, ErrorInfo, ReactNode } from 'react';

interface PipelineStageErrorBoundaryProps {
  children: ReactNode;
  stageName: string; // e.g., "Visualizations Tab", "Anomaly Report Generation"
  onRetry?: () => void; // Optional retry mechanism
}

interface PipelineStageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PipelineStageErrorBoundary extends Component<PipelineStageErrorBoundaryProps, PipelineStageErrorBoundaryState> {
  public state: PipelineStageErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): PipelineStageErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in pipeline stage "${this.props.stageName}":`, error, errorInfo);
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
        this.setState({ hasError: false, error: null });
        this.props.onRetry();
    } else {
        this.setState({ hasError: false, error: null });
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--text-tertiary-color)',
            fontSize: '0.9rem',
            border: '1px dashed rgba(var(--accent-pink-rgb), 0.3)',
            borderRadius: 'var(--border-radius-sm)',
            margin: '1rem',
            background: 'rgba(var(--accent-pink-rgb), 0.05)'
        }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '0.5rem', opacity: 0.7, color: 'var(--accent-pink)'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Content in '{this.props.stageName}' could not be displayed.
            {this.props.onRetry && (
                <button 
                    onClick={this.handleRetry} 
                    style={{ 
                        marginLeft: '1rem', 
                        fontSize: '0.8rem', 
                        padding: '0.3rem 0.8rem', 
                        background: 'rgba(var(--accent-pink-rgb),0.1)', 
                        border:'1px solid rgba(var(--accent-pink-rgb),0.3)', 
                        color:'var(--accent-pink)', 
                        cursor:'pointer',
                        borderRadius: 'var(--border-radius-sm)'
                    }}
                >
                    Retry
                </button>
            )}
            {/* User explicitly asked to keep error details in logs, not UI for these stage errors. Full details are in console via componentDidCatch. */}
        </div>
      );
    }
    return this.props.children;
  }
}

export default PipelineStageErrorBoundary;
