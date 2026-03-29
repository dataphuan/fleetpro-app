import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-6 w-full h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[400px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Skeleton className="h-[120px] w-full rounded-xl" />
                <Skeleton className="h-[120px] w-full rounded-xl" />
                <Skeleton className="h-[120px] w-full rounded-xl" />
            </div>

            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-10 w-[300px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}
