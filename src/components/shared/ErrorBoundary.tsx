import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary - Catches runtime errors and shows a friendly UI
 * instead of a white screen crash.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    handleGoBack = () => {
        this.setState({ hasError: false, error: null });
        window.location.hash = '#/';
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-slate-50 p-8">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
                        <div className="text-5xl mb-2">⚠️</div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Đã xảy ra lỗi
                        </h2>
                        <p className="text-slate-600 text-sm">
                            Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang hoặc quay về trang chủ.
                        </p>
                        {this.state.error && (
                            <details className="text-left bg-slate-50 rounded p-3 text-xs text-slate-500">
                                <summary className="cursor-pointer font-medium text-slate-600">
                                    Chi tiết lỗi (dành cho kỹ thuật)
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                onClick={this.handleGoBack}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors text-sm font-medium"
                            >
                                Về trang chủ
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                Tải lại trang
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
