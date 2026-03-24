"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });

        // In production, send to error tracking service
        // e.g., Sentry.captureException(error, { extra: errorInfo });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    private handleGoHome = () => {
        window.location.href = "/dashboard";
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="w-full max-w-lg">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 rounded-full bg-destructive/10">
                                    <AlertTriangle className="h-8 w-8 text-destructive" />
                                </div>
                            </div>
                            <CardTitle className="text-xl">Đã có lỗi xảy ra</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-center text-muted-foreground">
                                Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.
                            </p>

                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <div className="p-3 bg-muted rounded-lg overflow-auto max-h-40">
                                    <p className="text-xs font-mono text-destructive">
                                        {this.state.error.message}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="text-xs font-mono mt-2 text-muted-foreground">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 justify-center">
                                <Button variant="outline" onClick={this.handleReset}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Thử lại
                                </Button>
                                <Button onClick={this.handleGoHome}>
                                    <Home className="h-4 w-4 mr-2" />
                                    Về trang chủ
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
