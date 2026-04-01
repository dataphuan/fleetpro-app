import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Truck,
    Play,
    CheckCircle,
    Lock,
    XCircle,
    AlertTriangle,
    Clock,
    MapPin
} from 'lucide-react';

interface Trip {
    id: string;
    trip_code: string;
    status: 'draft' | 'dispatched' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
    actual_departure_time?: string;
    actual_arrival_time?: string;
    actual_distance_km?: number;
    total_revenue?: number;
    pod_status?: 'PENDING' | 'RECEIVED' | 'LOST';
    closed_at?: string;
    cancelled_at?: string;
}

interface TripWorkflowActionsProps {
    trip: Trip;
    onStatusChange: (newStatus: string) => Promise<void>;
    draftExpenseCount?: number;
}

export function TripWorkflowActions({
    trip,
    onStatusChange,
    draftExpenseCount = 0
}: TripWorkflowActionsProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'dispatch' | 'start' | 'complete' | 'close' | 'cancel' | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const { toast } = useToast();

    const getStatusBadge = (status: string) => {
         
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            draft: { variant: 'secondary', icon: Clock, label: 'Nháp' },
            dispatched: { variant: 'default', icon: Truck, label: 'Đã điều xe' },
            in_progress: { variant: 'default', icon: Play, label: 'Đang chạy' },
            completed: { variant: 'default', icon: CheckCircle, label: 'Hoàn thành' },
            closed: { variant: 'default', icon: Lock, label: 'Đã đóng' },
            cancelled: { variant: 'destructive', icon: XCircle, label: 'Đã hủy' },
        };

        const config = variants[status] || variants.draft;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    const validateAction = (action: string): string[] => {
        const errors: string[] = [];

        switch (action) {
            case 'complete':
                if (!trip.actual_departure_time) {
                    errors.push('Chưa có thời gian xuất phát thực tế');
                }
                if (!trip.actual_arrival_time) {
                    errors.push('Chưa có thời gian đến thực tế');
                }
                if (!trip.actual_distance_km || trip.actual_distance_km <= 0) {
                    errors.push('Chưa có số km thực tế (phải > 0)');
                }
                break;

            case 'close':
                if (!trip.total_revenue || trip.total_revenue <= 0) {
                    errors.push('Chưa có doanh thu xác nhận (phải > 0)');
                }
                if (!trip.actual_departure_time) {
                    errors.push('Chưa có thời gian xuất phát thực tế');
                }
                if (!trip.actual_arrival_time) {
                    errors.push('Chưa có thời gian đến thực tế');
                }
                if (!trip.actual_distance_km || trip.actual_distance_km <= 0) {
                    errors.push('Chưa có số km thực tế (phải > 0)');
                }
                if (draftExpenseCount > 0) {
                    errors.push(`Còn ${draftExpenseCount} phiếu chi chưa xác nhận. Phải xác nhận tất cả trước khi đóng.`);
                }
                if (trip.pod_status !== 'RECEIVED') {
                    errors.push('Chưa xác nhận biên nhận giao hàng (POD). Phải xác nhận trước khi đóng.');
                }
                break;

            case 'start':
                if (trip.status !== 'dispatched') {
                    errors.push('Chỉ chuyến ở trạng thái "Đã điều xe" mới có thể bắt đầu');
                }
                break;
        }

        return errors;
    };

    const handleAction = (action: 'dispatch' | 'start' | 'complete' | 'close' | 'cancel') => {
        const errors = validateAction(action);
        setValidationErrors(errors);
        setActionType(action);
        setDialogOpen(true);
    };

    const confirmAction = async () => {
        if (validationErrors.length > 0) {
            toast({
                title: 'Không thể thực hiện',
                description: 'Vui lòng khắc phục các lỗi trước khi tiếp tục',
                variant: 'destructive',
            });
            return;
        }

        try {
            const statusMap: Record<string, string> = {
                dispatch: 'dispatched',
                start: 'in_progress',
                complete: 'completed',
                close: 'closed',
                cancel: 'cancelled',
            };

            await onStatusChange(statusMap[actionType!]);

            toast({
                title: 'Thành công',
                description: `Chuyến ${trip.trip_code} đã được cập nhật`,
            });

            setDialogOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái";
            toast({
                title: 'Lỗi',
                description: message,
                variant: 'destructive',
            });
        }
    };

    const getActionConfig = () => {
         
        const configs: Record<string, { title: string; description: string; buttonText: string; variant: any }> = {
            dispatch: {
                title: 'Điều xe',
                description: `Xác nhận điều xe cho chuyến ${trip.trip_code}?`,
                buttonText: 'Điều xe',
                variant: 'default',
            },
            start: {
                title: 'Bắt đầu chuyến',
                description: `Xe đã xuất phát cho chuyến ${trip.trip_code}?`,
                buttonText: 'Bắt đầu',
                variant: 'default',
            },
            complete: {
                title: 'Hoàn thành chuyến',
                description: `Xác nhận chuyến ${trip.trip_code} đã hoàn thành?`,
                buttonText: 'Hoàn thành',
                variant: 'default',
            },
            close: {
                title: 'Đóng chuyến',
                description: `Đóng chuyến ${trip.trip_code}? Sau khi đóng sẽ KHÔNG thể sửa các thông tin tài chính.`,
                buttonText: 'Đóng chuyến',
                variant: 'destructive',
            },
            cancel: {
                title: 'Hủy chuyến',
                description: `Xác nhận hủy chuyến ${trip.trip_code}? Dữ liệu sẽ được giữ lại.`,
                buttonText: 'Hủy chuyến',
                variant: 'destructive',
            },
        };

        return configs[actionType!] || configs.dispatch;
    };

    // Determine available actions based on current status
    const getAvailableActions = () => {
        switch (trip.status) {
            case 'draft':
                return (
                    <>
                        <Button onClick={() => handleAction('dispatch')} className="gap-2">
                            <Truck className="w-4 h-4" />
                            Điều xe
                        </Button>
                        <Button onClick={() => handleAction('cancel')} variant="outline" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Hủy
                        </Button>
                    </>
                );

            case 'dispatched':
                return (
                    <>
                        <Button onClick={() => handleAction('start')} className="gap-2">
                            <Play className="w-4 h-4" />
                            Bắt đầu
                        </Button>
                        <Button onClick={() => handleAction('cancel')} variant="outline" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Hủy
                        </Button>
                    </>
                );

            case 'in_progress':
                return (
                    <>
                        <Button onClick={() => handleAction('complete')} className="gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Hoàn thành
                        </Button>
                        <Button onClick={() => handleAction('cancel')} variant="outline" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Hủy
                        </Button>
                    </>
                );

            case 'completed':
                return (
                    <>
                        <Button onClick={() => handleAction('close')} variant="destructive" className="gap-2">
                            <Lock className="w-4 h-4" />
                            Đóng chuyến
                        </Button>
                        <Button onClick={() => handleAction('cancel')} variant="outline" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Hủy
                        </Button>
                    </>
                );

            case 'closed':
                return (
                    <Alert>
                        <Lock className="w-4 h-4" />
                        <AlertTitle>Chuyến đã đóng</AlertTitle>
                        <AlertDescription>
                            Đã đóng vào {new Date(trip.closed_at!).toLocaleString('vi-VN')}.
                            Không thể chỉnh sửa thông tin tài chính.
                        </AlertDescription>
                    </Alert>
                );

            case 'cancelled':
                return (
                    <Alert variant="destructive">
                        <XCircle className="w-4 h-4" />
                        <AlertTitle>Chuyến đã hủy</AlertTitle>
                        <AlertDescription>
                            Đã hủy vào {new Date(trip.cancelled_at!).toLocaleString('vi-VN')}
                        </AlertDescription>
                    </Alert>
                );

            default:
                return null;
        }
    };

    const config = actionType ? getActionConfig() : null;

    return (
        <>
            <div className="flex items-center gap-2">
                {getStatusBadge(trip.status)}
                {trip.status !== 'closed' && trip.status !== 'cancelled' && (
                    <div className="flex gap-2">
                        {getAvailableActions()}
                    </div>
                )}
                {(trip.status === 'closed' || trip.status === 'cancelled') && getAvailableActions()}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{config?.title}</DialogTitle>
                        <DialogDescription>{config?.description}</DialogDescription>
                    </DialogHeader>

                    {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertTitle>Không thể thực hiện</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                    {validationErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {validationErrors.length === 0 && actionType === 'close' && (
                        <Alert>
                            <AlertTriangle className="w-4 h-4" />
                            <AlertTitle>Cảnh báo</AlertTitle>
                            <AlertDescription>
                                Sau khi đóng chuyến, bạn sẽ KHÔNG thể sửa:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Xe, tài xế, tuyến đường, khách hàng</li>
                                    <li>Số km thực tế, thời gian thực tế</li>
                                    <li>Doanh thu, phụ phí</li>
                                </ul>
                                <p className="mt-2 font-semibold">
                                    Nếu cần sửa sau này, phải qua quy trình điều chỉnh (có audit log).
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant={config?.variant}
                            onClick={confirmAction}
                            disabled={validationErrors.length > 0}
                        >
                            {config?.buttonText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
