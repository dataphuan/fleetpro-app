import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkDeleteToolbarProps {
    selectedCount: number;
    totalCount: number;
    onClearSelection: () => void;
    onSelectAll: () => void;
    onDelete: () => void;
    entityName?: string;
    variant?: 'default' | 'inline';
    className?: string;
}

export function BulkDeleteToolbar({
    selectedCount,
    totalCount,
    onClearSelection,
    onSelectAll,
    onDelete,
    entityName = "bản ghi",
    variant = 'default',
    className
}: BulkDeleteToolbarProps) {
    if (selectedCount === 0) return null;

    if (variant === 'inline') {
        return (
            <div className={cn("flex items-center gap-2 animate-in fade-in slide-in-from-left-2", className)}>
                <div className="h-4 w-px bg-border mx-1" />

                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Đã chọn:</span>
                <Badge variant="secondary" className="h-5 px-1 text-[10px] font-mono">
                    {selectedCount}
                </Badge>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSelectAll}
                    className="h-6 px-2 text-xs gap-1.5"
                    disabled={selectedCount === totalCount}
                    title="Chọn tất cả theo điều kiện lọc hiện tại"
                >
                    {selectedCount === totalCount ? (
                        <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                        <Square className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{selectedCount === totalCount ? "Tất cả" : "Chọn hết"}</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Bỏ chọn"
                >
                    <X className="w-3.5 h-3.5" />
                </Button>

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    className="h-6 px-2 text-xs gap-1.5 shadow-sm ml-1"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa</span>
                </Button>
            </div>
        );
    }

    // Default block variant
    return (
        <div className={cn("flex items-center gap-2 p-2 rounded-lg border bg-muted/50 animate-in fade-in slide-in-from-top-2", className)}>
            <div className="flex items-center gap-2 mr-2">
                <span className="text-sm font-medium text-muted-foreground">Đã chọn:</span>
                <Badge variant="secondary" className="text-sm font-mono">
                    {selectedCount} / {totalCount}
                </Badge>
            </div>

            <div className="h-4 w-[1px] bg-border mx-2" />

            <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-8 gap-2"
                disabled={selectedCount === totalCount}
            >
                {selectedCount === totalCount ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                    <Square className="w-4 h-4" />
                )}
                {selectedCount === totalCount ? "Đã chọn tất cả" : "Chọn tất cả (theo lọc)"}
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            >
                <X className="w-4 h-4" />
                Bỏ chọn
            </Button>

            <div className="flex-1" />

            <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="h-8 gap-2 shadow-sm"
            >
                <Trash2 className="w-4 h-4" />
                Xóa {selectedCount} {entityName}
            </Button>
        </div>
    );
}
