import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. This has been logged and we'll work on fixing it.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <div className="bg-muted p-4 rounded-lg text-left max-w-2xl w-full mb-6 overflow-auto">
              <p className="font-mono text-sm text-destructive mb-2">
                {this.state.error.message}
              </p>
              <pre className="text-xs text-muted-foreground overflow-auto">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
          <div className="flex gap-4">
            <Button onClick={this.handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
            <Button onClick={this.handleGoHome}>Go to Dashboard</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
