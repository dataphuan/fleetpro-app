/**
 * DASHBOARD SELECTOR
 * Component để chọn giữa 3 dashboard view
 * Lưu preference vào localStorage
 */

import { useEffect, useState } from 'react';
import { DashboardSimple } from './DashboardSimple';
import { DashboardBalanced } from './DashboardBalanced';
import { DashboardProfessional } from './DashboardProfessional';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type DashboardMode = 'simple' | 'balanced' | 'professional';

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
    description: 'Cho tài xế & nhân viên bình thường',
    icon: '🚗',
    targetUser: 'Tài Xế/Staff',
  },
  {
    id: 'balanced',
    label: 'Cân Bằng',
    description: 'Cho quản lý bình thường',
    icon: '📊',
    targetUser: 'Quản Lý',
  },
  {
    id: 'professional',
    label: 'Chuyên Sâu',
    description: 'Cho management & phân tích',
    icon: '📈',
    targetUser: 'Executive',
  },
];

export function DashboardContainer() {
  const { role } = useAuth();
  const [mode, setMode] = useState<DashboardMode>(() => {
    const saved = localStorage.getItem('dashboardMode') as DashboardMode;
    // Fallback to simple for dispatchers/drivers if they somehow had professional saved
    if (saved === 'professional' && (role === 'dispatcher' || role === 'driver')) return 'balanced';
    return saved || 'simple';
  });

  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboardMode', mode);
  }, [mode]);

  const renderDashboard = () => {
    switch (mode) {
      case 'balanced':
        return <DashboardBalanced />;
      case 'professional':
        return <DashboardProfessional />;
      case 'simple':
      default:
        return <DashboardSimple />;
    }
  };

  const currentOption = DASHBOARD_OPTIONS.find(opt => opt.id === mode);

  return (
    <div className="space-y-4">
      {/* HEADER với Mode Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentOption?.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{currentOption?.label} Dashboard</h1>
            <p className="text-sm text-muted-foreground">{currentOption?.targetUser}</p>
          </div>
        </div>
        <Button
          variant={showSelector ? 'default' : 'outline'}
          onClick={() => setShowSelector(!showSelector)}
        >
          {showSelector ? '✕ Đóng' : '⚙️ Chế Độ'}
        </Button>
      </div>

      {/* MODE SELECTOR (Collapsible) */}
      {showSelector && (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="mb-4 text-sm font-semibold text-foreground">Chọn Chế Độ Xem Dashboard:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DASHBOARD_OPTIONS.filter(opt => {
              if (opt.id === 'professional') return ['admin', 'manager', 'accountant'].includes(role);
              if (opt.id === 'balanced') return role !== 'driver';
              return true;
            }).map(option => (
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
