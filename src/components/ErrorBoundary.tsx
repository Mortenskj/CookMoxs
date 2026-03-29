import React from 'react';

type ErrorBoundaryProps = {
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.error('App error boundary caught an error:', error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4EFE5] text-forest-dark px-6 py-10 flex items-center justify-center">
          <div className="max-w-md w-full rounded-[2rem] border border-black/10 bg-white/80 shadow-xl p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest-mid opacity-70 mb-3">CookMoxs</p>
            <h1 className="text-3xl font-serif italic mb-4">Noget gik galt</h1>
            <p className="text-sm leading-relaxed text-forest-mid mb-6">
              Appen ramte en fejl og blev stoppet, så du ikke ender i en hvid skærm. Prøv at indlæse siden igen.
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-3 rounded-2xl bg-forest-dark text-white text-xs font-bold uppercase tracking-[0.2em]"
            >
              Indlæs igen
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

