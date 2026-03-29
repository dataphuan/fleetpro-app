import { useQuery } from '@tanstack/react-query';
import { tripAdapter } from '@/lib/data-adapter';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Lock,
    FileText,
    Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TripAuditLog {
    id: string;
    trip_id: string;
    trip_code: string;
    action: string;
    old_values: any;
    new_values: any;
    blocked: boolean;
    block_reason: string | null;
    user_id: string | null;
    created_at: string;
}

interface TripAuditLogViewerProps {
    tripId: string;
    tripCode: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TripAuditLogViewer({
    tripId,
    tripCode,
    open,
    onOpenChange
}: TripAuditLogViewerProps) {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['trip_audit_log', tripId],
        queryFn: async () => {
            return await tripAdapter.getLogs(tripId);
        },
        enabled: open,
    });

    const getActionIcon = (action: string) => {

        const icons: Record<string, any> = {
            'STATUS_CHANGE': CheckCircle,
            'CLOSE': Lock,
            'CANCEL': XCircle,
            'UPDATE_ATTEMPT_CLOSED': AlertTriangle,
            'UPDATE_ATTEMPT': AlertTriangle,
        };
        return icons[action] || FileText;
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'STATUS_CHANGE': 'Thay đổi trạng thái',
            'CLOSE': 'Đóng chuyến',
            'CANCEL': 'Hủy chuyến',
            'UPDATE_ATTEMPT_CLOSED': 'Cố gắng sửa chuyến đã đóng',
            'UPDATE_ATTEMPT': 'Cố gắng sửa',
        };
        return labels[action] || action;
    };

    const getActionVariant = (log: TripAuditLog) => {
        if (log.blocked) return 'destructive';
        if (log.action === 'CLOSE') return 'default';
        if (log.action === 'CANCEL') return 'secondary';
        return 'outline';
    };

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        if (typeof value === 'boolean') return value ? 'Có' : 'Không';
        return String(value);
    };

    const renderChanges = (log: TripAuditLog) => {
        if (log.action === 'STATUS_CHANGE') {
            return (
                <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{log.old_values?.status || '-'}</Badge>
                    <span>→</span>
                    <Badge variant="default">{log.new_values?.status || '-'}</Badge>
                </div>
            );
        }

        if (log.blocked && log.block_reason) {
            return (
                <div className="text-sm text-destructive">
                    <p className="font-medium">Bị chặn:</p>
                    <p>{log.block_reason}</p>
                </div>
            );
        }

        if (log.old_values || log.new_values) {
            return (
                <div className="text-sm space-y-2">
                    {log.old_values && (
                        <div>
                            <p className="font-medium text-muted-foreground">Giá trị cũ:</p>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {formatValue(log.old_values)}
                            </pre>
                        </div>
                    )}
                    {log.new_values && (
                        <div>
                            <p className="font-medium text-muted-foreground">Giá trị mới:</p>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {formatValue(log.new_values)}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Lịch sử thay đổi - {tripCode}
                    </DialogTitle>
                    <DialogDescription>
                        Tất cả các thay đổi và cố gắng chỉnh sửa chuyến này
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {isLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                            Đang tải...
                        </div>
                    )}

                    {!isLoading && (!logs || logs.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                            Chưa có lịch sử thay đổi
                        </div>
                    )}

                    {!isLoading && logs && logs.length > 0 && (
                        <div className="space-y-4">
                            {logs.map((log) => {
                                const Icon = getActionIcon(log.action);
                                return (
                                    <div
                                        key={log.id}
                                        className={`border rounded-lg p-4 ${log.blocked ? 'border-destructive bg-destructive/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${log.blocked ? 'text-destructive' : ''}`} />
                                                <Badge variant={getActionVariant(log)}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                                {log.blocked && (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <XCircle className="w-3 h-3" />
                                                        Bị chặn
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(log.created_at), {
                                                    addSuffix: true,
                                                    locale: vi,
                                                })}
                                            </div>
                                        </div>

                                        {renderChanges(log)}

                                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                            <p>
                                                Thời gian: {new Date(log.created_at).toLocaleString('vi-VN')}
                                            </p>
                                            {log.user_id && (
                                                <p>User ID: {log.user_id}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
