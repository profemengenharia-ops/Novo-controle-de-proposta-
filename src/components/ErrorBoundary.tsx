import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-orange-900/5 text-center space-y-8 border border-neutral-100">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-orange-500" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">
                Ops! Algo deu errado.
              </h1>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi notificada (simulação).
              </p>
              {this.state.error && (
                <div className="bg-red-50 p-4 rounded-2xl text-left overflow-auto max-h-32">
                  <p className="text-[10px] font-mono text-red-600 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl text-sm font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 active:scale-95"
            >
              <RefreshCw size={18} />
              RECARREGAR APLICAÇÃO
            </button>
            
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
              PROFEM Engenharia de Incêndio
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
