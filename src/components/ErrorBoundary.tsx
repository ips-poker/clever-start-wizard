import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
          <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-red-500/20 backdrop-blur-xl max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <CardTitle className="text-white text-xl">Что-то пошло не так</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-400">
                Произошла неожиданная ошибка. Попробуйте обновить страницу или повторить действие.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-left bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <p className="text-red-400 text-sm font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs text-slate-500 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Перезагрузить страницу
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}