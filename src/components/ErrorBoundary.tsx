import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border border-rose-900 bg-rose-950/20 rounded-3xl text-rose-200 text-center flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold mb-2">Unexpected Error</h2>
            <p className="text-sm opacity-80 mb-6">Something went wrong while rendering this section.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-rose-600 rounded-xl text-white font-bold"
            >
                Reload Application
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}
