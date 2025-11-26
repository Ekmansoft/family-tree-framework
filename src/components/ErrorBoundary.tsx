import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch and handle rendering errors gracefully
 * Wraps tree view components to prevent entire app crashes
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            // Render custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div style={{
                    padding: '20px',
                    border: '2px solid #ff4444',
                    borderRadius: '8px',
                    backgroundColor: '#fff5f5',
                    color: '#cc0000',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h2>⚠️ Something went wrong</h2>
                    <p>The family tree encountered an error while rendering.</p>
                    <details style={{ marginTop: '10px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                            Error details
                        </summary>
                        <pre style={{
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: '#f0f0f0',
                            color: '#333',
                            borderRadius: '4px',
                            overflow: 'auto',
                            fontSize: '12px'
                        }}>
                            {this.state.error?.toString()}
                            {'\n\n'}
                            {this.state.error?.stack}
                        </pre>
                    </details>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '15px',
                            padding: '8px 16px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
