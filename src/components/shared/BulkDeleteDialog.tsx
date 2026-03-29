import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface BulkDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    entityName: string; // e.g., "xe", "tài xế"
    onConfirm: () => void;
    isDeleting: boolean;
}

export function BulkDeleteDialog({
    open,
    onOpenChange,
    selectedCount,
    entityName,
    onConfirm,
    isDeleting,
}: BulkDeleteDialogProps) {
    const [confirmInput, setConfirmInput] = useState("");
    const isValid = confirmInput.toUpperCase() === "XOA" || confirmInput.toUpperCase() === "DELETE";

    const handleConfirm = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isValid) {
            onConfirm();
            setConfirmInput(""); // Reset after confirm
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Xác nhận xóa {selectedCount} {entityName}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Hành động này sẽ xóa vĩnh viễn <strong>{selectedCount}</strong> bản ghi {entityName} đã chọn khỏi hệ thống.
                            Nếu dữ liệu đang được sử dụng (ví dụ: trong chuyến xe), việc xóa có thể thất bại.
                        </p>
                        <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive text-sm font-medium">
                            Cảnh báo: Hành động này không thể hoàn tác!
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4 space-y-2">
                    <Label className="text-sm text-muted-foreground">
                        Nhập <strong>XOA</strong> hoặc <strong>DELETE</strong> để xác nhận:
                    </Label>
                    <Input
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder="Gõ XOA để xác nhận..."
                        className="uppercase font-mono"
                        autoFocus
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmInput("")}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={!isValid || isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang xóa...
                            </>
                        ) : (
                            "Xóa đã chọn"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
