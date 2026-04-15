import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SectionErrorBoundaryProps {
    children: React.ReactNode;
    /** Display name of the section (shown in error UI) */
    sectionName?: string;
}

interface SectionErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Lightweight ErrorBoundary for individual page sections (charts, tables, forms).
 * Unlike the global ErrorBoundary, this only shows a small inline error card
 * instead of replacing the entire page. Prevents one crashed widget from
 * taking down the whole dashboard.
 */
export class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    constructor(props: SectionErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[SectionError:${this.props.sectionName || 'unknown'}]`, error.message);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border border-red-200 bg-red-50/50 text-center min-h-[120px]">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <div>
                        <p className="text-sm font-medium text-red-700">
                            {this.props.sectionName ? `"${this.props.sectionName}" gặp lỗi` : 'Phần này gặp lỗi'}
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                            {this.state.error?.message?.substring(0, 100) || 'Lỗi không xác định'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
