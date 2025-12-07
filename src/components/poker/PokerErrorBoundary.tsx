import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PokerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PokerErrorBoundary] Error caught:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to analytics if available
    try {
      // Could send to Supabase or external service
      console.log('[PokerErrorBoundary] Stack trace:', errorInfo.componentStack);
    } catch (e) {
      // Ignore logging errors
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onGoHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-red-500/30 p-6 shadow-2xl">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white text-center mb-2">
              Произошла ошибка
            </h2>

            {/* Error Message */}
            <p className="text-white/60 text-sm text-center mb-4">
              Что-то пошло не так при загрузке покерного стола. 
              Попробуйте перезагрузить страницу.
            </p>

            {/* Error Details (collapsed) */}
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                  Технические детали
                </summary>
                <div className="mt-2 p-2 bg-black/30 rounded-lg">
                  <code className="text-[10px] text-red-300 break-all">
                    {this.state.error.message}
                  </code>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
              
              {this.props.onGoHome && (
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  В лобби
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PokerErrorBoundary;
