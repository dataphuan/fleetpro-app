import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

type StatusType = 
  | 'draft' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'on_leave'
  | 'scheduled';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: { label: 'Nháp', className: 'status-draft' },
  confirmed: { label: 'Đã xác nhận', className: 'status-confirmed' },
  in_progress: { label: 'Đang thực hiện', className: 'status-in-progress' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
  active: { label: 'Hoạt động', className: 'status-completed' },
  inactive: { label: 'Ngừng', className: 'status-cancelled' },
  maintenance: { label: 'Bảo trì', className: 'status-in-progress' },
  on_leave: { label: 'Nghỉ phép', className: 'status-draft' },
  scheduled: { label: 'Đã lên lịch', className: 'status-confirmed' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-draft' };

  return (
    <span className={cn('status-badge', config.className, className)}>
      <Circle className="w-2 h-2 fill-current" />
      {config.label}
    </span>
  );
}
