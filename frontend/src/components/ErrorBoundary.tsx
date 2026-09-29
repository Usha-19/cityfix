import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface to console for debugging
    console.error("Page crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="mt-4 text-lg font-semibold text-navy-800">
            Something went wrong on this page
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
