import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    errorHandler.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-500 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Oops! Une erreur s'est produite
              </h1>
              
              <p className="text-gray-400 mb-6">
                Nous sommes désolés, quelque chose s'est mal passé. 
                L'erreur a été enregistrée et nous allons la corriger rapidement.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
                    Détails techniques (dev uniquement)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Réessayer
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook pour utiliser l'ErrorBoundary de manière déclarative
export function useErrorBoundary(): {
  resetErrorBoundary: () => void;
  showBoundaryError: (error: Error) => void;
} {
  const [, setError] = React.useState<Error | null>(null);

  const resetErrorBoundary = React.useCallback(() => {
    setError(null);
  }, []);

  const showBoundaryError = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return { resetErrorBoundary, showBoundaryError };
}