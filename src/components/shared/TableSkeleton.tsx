import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showAction?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 6, showAction = true }: TableSkeletonProps) {
    return (
        <div className="space-y-4 w-full">
            {/* Header / Actions Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                {showAction && <Skeleton className="h-10 w-[120px]" />}
            </div>

            {/* Table Skeleton */}
            <div className="border rounded-md overflow-hidden">
                {/* Table Header */}
                <div className="h-12 bg-muted/50 border-b flex items-center px-4 gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                    ))}
                </div>

                {/* Table Body */}
                <div className="bg-background">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="h-16 border-b last:border-0 flex items-center px-4 gap-4">
                            {Array.from({ length: columns }).map((_, j) => (
                                <Skeleton key={j} className="h-4 w-full" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-end gap-2 mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
            </div>
        </div>
    );
}
