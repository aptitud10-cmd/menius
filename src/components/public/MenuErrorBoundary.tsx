'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { captureError } from '@/lib/error-reporting';

interface Props {
  children: ReactNode;
  /** Shown in the error card — helps identify which section failed */
  section?: string;
  /** If true, shows a compact inline error instead of a full card */
  inline?: boolean;
  /** Used to render error messages in the correct language */
  locale?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Error Boundary for public menu sections.
 * Catches rendering errors and shows a friendly recovery UI
 * instead of crashing the whole page.
 *
 * Usage:
 *   <MenuErrorBoundary section="products">
 *     <ProductGrid ... />
 *   </MenuErrorBoundary>
 */
export class MenuErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[MenuErrorBoundary] section="${this.props.section}"`, error, info);
    }
    // React error boundaries don't report to Sentry automatically — do it explicitly.
    captureError(error, {
      route: 'MenuErrorBoundary',
      section: this.props.section,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const en = this.props.locale?.startsWith('en');
    const somethingWentWrong = en ? 'Something went wrong' : 'Algo salió mal';
    const couldNotLoad = en ? 'We couldn\'t load this section.' : 'No pudimos cargar esta sección.';
    const retry = en ? 'Retry' : 'Reintentar';

    if (this.props.inline) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{somethingWentWrong}.</span>
          <button
            onClick={this.handleRetry}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {retry}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{somethingWentWrong}</p>
          <p className="text-sm text-gray-500 mt-1">
            {couldNotLoad}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {retry}
        </button>
      </div>
    );
  }
}
