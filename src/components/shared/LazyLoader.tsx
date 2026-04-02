import { Suspense, ComponentType, lazy, ReactElement } from 'react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Error fallback component for lazy-loaded routes
 */
export const LazySuspenseError = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Card className="w-full max-w-md mx-4">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Không thể tải trang</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Trang không thể tải được. Vui lòng thử lại.
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại trang
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Wraps lazy-loaded components with proper error boundary and suspense
 */
export function lazyWithFallback<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>
): ComponentType<P> {
  const LazyComponent = lazy(importFunc);

  return (props: P) => (
    <Suspense fallback={<PageSkeleton />}>
      <LazyComponent {...props} />
    </Suspense>
  ) as ComponentType<P>;
}
