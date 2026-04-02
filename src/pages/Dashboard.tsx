import { PageHeader } from "@/components/shared/PageHeader";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardRevenueTab } from "./dashboard/revenue/DashboardRevenueTab";
import { DashboardExpensesTab } from "./dashboard/expenses/DashboardExpensesTab";
import { DashboardTripsTab } from "./dashboard/trips/DashboardTripsTab";
import { DashboardFleetPerformanceTab } from "./dashboard/fleet/DashboardFleetPerformanceTab";
import { DashboardAlertsTab } from "./dashboard/alerts/DashboardAlertsTab";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { QuickTripModal } from "@/components/trips/QuickTripModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { dataAdapter } from "@/lib/data-adapter";

export default function Dashboard() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { toast } = useToast();
  const { user, userId, role, tenantId, refreshAuth } = useAuth();
  const isDemoMode = Boolean(tenantId && tenantId.startsWith('internal-tenant-'));
  const { showOnboarding, markCompleted } = useOnboarding({ 
    tenantId: tenantId || 'default',
    forceShow: false
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleOnboardingComplete = () => {
    markCompleted();
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {showOnboarding && (
        <OnboardingFlow 
          tenantId={tenantId || 'demo-company'} 
          onComplete={handleOnboardingComplete}
        />
      )}
      <PageHeader
        title="Bảng Điều Khiển PRO"
        description={`Tổng quan vận tải - Tháng ${now.getMonth() + 1}/${now.getFullYear()}`}
        actions={<QuickTripModal triggerLabel="+ Tạo Chuyến" />}
      />

      <Card className={isDemoMode ? "border-amber-300 bg-amber-50/70" : "border-emerald-300 bg-emerald-50/70"}>
        <CardContent className="py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">
              {isDemoMode ? 'Bạn đang ở chế độ Demo' : 'Bạn đang ở chế độ Dữ liệu thật'}
            </div>
            <div className="text-xs text-muted-foreground">
              {isDemoMode
                ? 'Dữ liệu mẫu đầy đủ để trải nghiệm toàn bộ tính năng trên PC và mobile.'
                : 'Workspace hiện tại dành cho dữ liệu vận hành thật của công ty bạn.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!tenantId) return;
                const res = await dataAdapter.auth.ensureTenantDemoReadiness({
                  tenantId,
                  role: role || 'viewer',
                  email: user?.email || '',
                  full_name: user?.full_name || '',
                  uid: userId || '',
                });

                if (res?.success) {
                  toast({ title: '✅ Demo full tính năng đã sẵn sàng', description: res?.message || 'Đã kiểm tra và nạp dữ liệu demo nếu thiếu.' });
                } else {
                  toast({ title: 'Không thể nạp demo', description: res?.error || res?.message || 'Vui lòng thử lại.', variant: 'destructive' });
                }
              }}
            >
              Nạp/đảm bảo dữ liệu Demo đầy đủ
            </Button>

            <Button
              variant={isDemoMode ? "default" : "secondary"}
              onClick={async () => {
                if (!tenantId) return;
                const ok = window.confirm('Chuyển sang chế độ dữ liệu thật? Nếu đang ở tenant demo dùng chung, hệ thống sẽ tách workspace riêng để không ảnh hưởng khách mới.');
                if (!ok) return;

                const res = await dataAdapter.auth.startRealDataMode({
                  tenantId,
                  role: role || 'viewer',
                  keepUserId: userId || undefined,
                  email: user?.email || '',
                  full_name: user?.full_name || '',
                });

                if (res?.success) {
                  await refreshAuth();
                  toast({
                    title: res?.migrated ? '✅ Đã tách workspace dữ liệu thật' : '✅ Đã chuyển sang dữ liệu thật',
                    description: res?.migrated
                      ? 'Vui lòng tải lại trang để thấy tenant mới.'
                      : 'Bạn có thể nhập dữ liệu thật ngay bây giờ.',
                  });
                } else {
                  toast({ title: 'Không thể chuyển chế độ', description: res?.error || 'Vui lòng thử lại.', variant: 'destructive' });
                }
              }}
            >
              Chuyển sang Dữ liệu thật
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-2 px-2">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tổng quan</TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Doanh Thu</TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chi Phí</TabsTrigger>
            <TabsTrigger value="trips" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chuyến Đi</TabsTrigger>
            <TabsTrigger value="fleet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hiệu Suất</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cảnh Báo</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-2 min-h-[500px]">
          <TabsContent value="overview">
            <DashboardContainer />
          </TabsContent>

          <TabsContent value="revenue">
            <div className="bg-card border rounded-lg p-4 shadow-sm">

              <DashboardRevenueTab />
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <div className="bg-card border rounded-lg p-4 shadow-sm">

              <DashboardExpensesTab />
            </div>
          </TabsContent>

          <TabsContent value="trips">
            <div className="bg-card border rounded-lg p-4 shadow-sm">

              <DashboardTripsTab />
            </div>
          </TabsContent>

          <TabsContent value="fleet">
            <div className="bg-card border rounded-lg p-4 shadow-sm">

              <DashboardFleetPerformanceTab />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="bg-card border rounded-lg p-4 shadow-sm">

              <DashboardAlertsTab />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
