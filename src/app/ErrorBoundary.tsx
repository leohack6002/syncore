import { Component, type ErrorInfo, type ReactNode } from "react";
import { SyncoraLogo } from "@/components/brand/SyncoraLogo";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches unrecoverable React rendering errors and shows a useful recovery screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Syncora render failure", error, errorInfo);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid h-screen w-screen place-items-center bg-[#07090f] p-8 text-center text-white">
        <div className="max-w-md">
          <SyncoraLogo />
          <h1 className="mt-6 text-xl font-semibold">Syncora could not render this view.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Restart the app and try again. If this keeps happening, please open an issue with the error details.
          </p>
          {import.meta.env.DEV ? (
            <pre className="mt-4 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-left text-xs text-red-200">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      </main>
    );
  }
}
