import { PageHeader } from "@/components/shared/PageHeader";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardRevenueTab } from "./dashboard/revenue/DashboardRevenueTab";
import { DashboardExpensesTab } from "./dashboard/expenses/DashboardExpensesTab";
import { DashboardTripsTab } from "./dashboard/trips/DashboardTripsTab";
import { DashboardFleetPerformanceTab } from "./dashboard/fleet/DashboardFleetPerformanceTab";
import { DashboardAlertsTab } from "./dashboard/alerts/DashboardAlertsTab";
import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { QuickTripModal } from "@/components/trips/QuickTripModal";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { dataAdapter } from "@/lib/data-adapter";
import { RefreshCw, Zap, AlertTriangle } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";
import { Link } from "react-router-dom";


export default function Dashboard() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { toast } = useToast();

  const { user, userId, role, tenantId } = useAuth();
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

  const { data: companySettings } = useCompanySettings();
  const currentPlan = companySettings?.subscription?.plan || 'trial';
  const isPaidPlan = currentPlan === 'business' || currentPlan === 'professional';

  // PIPELINE FIX P6: Pending expense notification for accountant/admin
  const { data: allExpenses } = useExpenses();
  const isFinancialRole = role === 'accountant' || role === 'admin' || role === 'manager';
  const pendingExpenseCount = useMemo(() => {
    if (!allExpenses || !isFinancialRole) return 0;
    return allExpenses.filter((e: any) => e.status === 'draft' && !e.is_deleted).length;
  }, [allExpenses, isFinancialRole]);

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {showOnboarding && !isPaidPlan && (
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

      {/* PIPELINE FIX P6: Pending expense alert for accountant */}
      {isFinancialRole && pendingExpenseCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 rounded-full p-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">Có {pendingExpenseCount} phiếu chi đang chờ duyệt</p>
              <p className="text-xs text-amber-700">Tài xế đã gửi chứng từ. Vui lòng xác nhận hoặc từ chối.</p>
            </div>
          </div>
          <Link to="/expenses">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold">
              Duyệt ngay →
            </Button>
          </Link>
        </div>
      )}

      {isDemoMode && !isPaidPlan && (
        <Card className="border-amber-200 bg-amber-50/30 shadow-sm overflow-hidden mb-4">
          <CardContent className="p-3">
             {/* ... Banner content remains ... */}
          </CardContent>
        </Card>
      )}

      {isPaidPlan && isDemoMode && role === 'admin' && (
         <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-2 text-blue-800 text-sm">
             <Zap className="w-4 h-4 fill-blue-400" />
             <span>Bạn đang sử dụng bộ dữ liệu chuẩn (Logic Thực Chiến). Dữ liệu này được thiết kế để kiểm soát chi phí và doanh thu tối ưu.</span>
           </div>
           <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={async () => {
                if (!tenantId) return;
                const res = await dataAdapter.auth.ensureTenantDemoReadiness({
                  tenantId,
                  role: role || 'viewer',
                  email: user?.email || '',
                  full_name: user?.full_name || '',
                  uid: userId || '',
                  force: true, 
                });
                if (res?.success) {
                  toast({ title: '✅ Reset Dữ liệu chuẩn', description: 'Đã nạp lại bộ dữ liệu Logic Thực Chiến.' });
                  setTimeout(() => window.location.reload(), 1000);
                }
              }}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reset Demo
            </Button>
         </div>
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
