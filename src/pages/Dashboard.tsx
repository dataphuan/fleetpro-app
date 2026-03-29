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

export default function Dashboard() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      <PageHeader
        title="Bảng Điều Khiển PRO"
        description={`Tổng quan hoạt động vận tải - Tháng ${now.getMonth() + 1}/${now.getFullYear()}`}
      />

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
