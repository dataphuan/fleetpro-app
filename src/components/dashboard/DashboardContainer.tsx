/**
 * DASHBOARD SELECTOR
 * Component để chọn giữa 3 dashboard view
 * Lưu preference vào localStorage
 */

import { useEffect, useState } from 'react';
import { DashboardSimple } from './DashboardSimple';
import { DashboardOwnerRealtime } from './DashboardOwnerRealtime';
import { DashboardDriverMode } from './DashboardDriverMode';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type DashboardMode = 'simple' | 'professional';

interface DashboardOption {
  id: DashboardMode;
  label: string;
  description: string;
  icon: string;
  targetUser: string;
}

const DASHBOARD_OPTIONS: DashboardOption[] = [
  {
    id: 'simple',
    label: 'Đơn Giản',
    description: 'Tập trung thao tác nhanh và thông tin cốt lõi',
    icon: '🧭',
    targetUser: 'Điều phối/QL',
  },
  {
    id: 'professional',
    label: 'PRO',
    description: 'Sức khỏe đội xe realtime theo đúng vai trò chủ xe',
    icon: '🚛',
    targetUser: 'Executive',
  },
];

export function DashboardContainer() {
  const { role } = useAuth();
  const [mode, setMode] = useState<DashboardMode>(() => {
    const saved = localStorage.getItem('dashboardMode') as DashboardMode;
    return saved || 'professional';
  });

  const [showSelector, setShowSelector] = useState(false);

  const isDriver = role === 'driver';

  useEffect(() => {
    localStorage.setItem('dashboardMode', mode);
  }, [mode]);

  const renderDashboard = () => {
    if (isDriver) {
      return <DashboardDriverMode />;
    }

    return mode === 'professional' ? <DashboardOwnerRealtime /> : <DashboardSimple />;
  };

  const currentOption = DASHBOARD_OPTIONS.find(opt => opt.id === mode);

  return (
    <div className="space-y-4 pt-1">
      {/* NÚT CHIA CHẾ ĐỘ DASHBOARD (MINI) */}
      {!isDriver && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost" 
            className="text-[10px] h-6 uppercase tracking-wider opacity-50 hover:opacity-100"
            onClick={() => setShowSelector(!showSelector)}
          >
            {showSelector ? '✕ Đóng' : 'Thay đổi giao diện (Đơn giản/PRO)'}
          </Button>
        </div>
      )}

      {/* MODE SELECTOR (Collapsible) */}
      {!isDriver && showSelector && (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="mb-4 text-sm font-semibold text-foreground">Chọn Chế Độ Xem Dashboard:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DASHBOARD_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  setMode(option.id);
                  setShowSelector(false);
                }}
                className={cn(
                  'rounded-lg border-2 p-4 text-left transition-all',
                  mode === option.id
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-border bg-background hover:border-primary/50'
                )}
              >
                <div className="text-2xl">{option.icon}</div>
                <p className="mt-2 font-semibold text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
                <p className="mt-2 text-xs font-medium text-primary">{option.targetUser}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div>{renderDashboard()}</div>
    </div>
  );
}
