
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 border border-red-100">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertCircle className="w-8 h-8" />
                            <h1 className="text-xl font-bold">Đã xảy ra lỗi</h1>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang.
                        </p>

                        <div className="bg-red-50 p-3 rounded-md mb-6 overflow-auto max-h-48">
                            <code className="text-xs text-red-800 break-all">
                                {this.state.error?.toString()}
                            </code>
                            {this.state.errorInfo && (
                                <details className="mt-2 text-xs text-red-700/70">
                                    <summary>Chi tiết lỗi</summary>
                                    <pre className="mt-1 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full gap-2 bg-red-600 hover:bg-red-700"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Tải lại ứng dụng
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
