'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Đã xảy ra lỗi</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hệ thống gặp sự cố khi tải trang này. Vui lòng thử lại hoặc quay về trang chủ.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left mt-4 p-3 rounded-lg bg-muted/50 border text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">Chi tiết lỗi (Dev only)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-destructive/80">{error.message}</pre>
              {error.stack && (
                <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground/60 text-[10px] max-h-40 overflow-auto">{error.stack}</pre>
              )}
            </details>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Thử lại
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
