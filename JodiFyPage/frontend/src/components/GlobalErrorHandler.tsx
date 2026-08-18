import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useToastStore } from '../store/toast.store';

function reportError(source: 'window' | 'promise', message: string): void {
  useToastStore
    .getState()
    .show(`Algo salió mal${message ? `: ${message.slice(0, 120)}` : ''}`, 'error', 5200);
  console.error(`[jodify:${source}]`, message);
}

export function GlobalErrorHandler() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      reportError('window', e.message || String(e.error ?? 'Error desconocido'));
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? 'Promesa rechazada');
      reportError('promise', reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}

interface BoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : 'Error inesperado' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[jodify:boundary]', error, info.componentStack);
  }

  private reload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="jf-crash" role="alert" data-testid="error-boundary">
        <div className="jf-crash-card">
          <span className="jf-crash-icon">!</span>
          <h1 className="jf-crash-title">Algo salió mal</h1>
          <p className="jf-crash-message">{this.state.message || 'Ocurrió un error inesperado en la interfaz.'}</p>
          <button type="button" className="jf-btn jf-btn--primary jf-btn--md" onClick={this.reload}>
            Recargar JodiFy
          </button>
        </div>
      </div>
    );
  }
}