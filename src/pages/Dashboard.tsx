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

      {isDemoMode && (
        <Card className="border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden mb-4">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-900 leading-none mb-1">Chế độ Trải nghiệm (Demo Only)</div>
                  <p className="text-xs text-amber-800 leading-tight opacity-90">
                    Không gian dùng chung. 💡 Để dùng <b>Dữ liệu thật</b> hãy thoát ra và "Tạo tài khoản mới".
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-white border-amber-300 hover:bg-amber-100 text-amber-700 text-xs px-3"
                  onClick={async () => {
                    if (!tenantId) return;
                    const res = await dataAdapter.auth.ensureTenantDemoReadiness({
                      tenantId,
                      role: role || 'viewer',
                      email: user?.email || '',
                      full_name: user?.full_name || '',
                      uid: userId || '',
                      force: true, // Trigger clean wipe and logic-driven re-seed
                    });
                    if (res?.success) {
                      toast({ 
                        title: '✅ Hoàn tất Reset Dữ liệu', 
                        description: 'Dữ liệu cũ đã được xóa sạch. Hệ thống đã nạp mới dữ liệu chuẩn logic vận tải tháng 04/2026.' 
                      });
                      setTimeout(() => window.location.reload(), 1500);
                    }
                  }}
                >
                  <svg className="mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                  Reset Demo
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-primary font-semibold hover:bg-primary/5 text-xs px-2"
                  onClick={() => window.location.href = '/auth?tab=register'}
                >
                  Thử thật 14 ngày →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
