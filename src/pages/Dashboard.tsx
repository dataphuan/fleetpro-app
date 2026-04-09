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
        <Card className="border-amber-300 bg-amber-50/70 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="py-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <div className="space-y-1">
                <div className="text-base font-bold text-amber-900">Chế độ Trải nghiệm (Demo Data Only)</div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Đây là không gian dùng chung với dữ liệu mẫu đầy đủ để anh/chị tham quan toàn bộ tính năng trên PC & Mobile.
                </p>
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-lg border border-amber-200/50 space-y-3">
              <p className="text-sm font-medium text-slate-700 italic">
                💡 Để sử dụng <b>Dữ liệu thật</b> cho đội xe của công ty bạn (miễn phí 14 ngày, đầy đủ tính năng), 
                vui lòng thoát ra và chọn <b>"Tạo tài khoản mới"</b>.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="bg-white border-amber-300 hover:bg-amber-100 text-amber-700"
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
                      toast({ title: '✅ Dữ liệu mẫu đã sẵn sàng', description: 'Đã kiểm tra và nạp dữ liệu demo đầy đủ.' });
                    }
                  }}
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                  Tải lại dữ liệu mẫu (Reset Demo)
                </Button>

                <Button
                  variant="ghost"
                  className="text-primary font-semibold hover:bg-primary/5"
                  onClick={() => window.location.href = '/auth?tab=register'}
                >
                  Đăng ký công ty mới (Thử thật 14 ngày) →
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
