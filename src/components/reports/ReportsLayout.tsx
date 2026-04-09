import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportByVehicleTable } from "./ReportByVehicleTable";
import { ReportByDriverTable } from "./ReportByDriverTable";
import { ReportByRouteTable } from "./ReportByRouteTable";
import { ReportByCustomerTable } from "./ReportByCustomerTable";
import { ReportByRevenueTable } from "./ReportByRevenueTable";
import { ReportByExpenseTable } from "./ReportByExpenseTable";
import { ReportByProfitTable } from "./ReportByProfitTable";
import { ReportVehiclePnL } from "./ReportVehiclePnL";
import { MonthlyReportExport } from "./MonthlyReportExport";
import { ReportVehicleBenchmark } from "./ReportVehicleBenchmark";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, ArrowUpCircle } from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { useExpenses } from "@/hooks/useExpenses";
import { useMemo } from "react";

export function ReportsLayout() {
  const [activeTab, setActiveTab] = useState("vehicle");
  const { data: trips = [] } = useTrips();
  const { data: expenses = [] } = useExpenses();

  const totals = useMemo(() => {
      const revenue = trips.reduce((sum, t) => sum + Number(t.total_revenue || t.freight_revenue || 0), 0);
      const expense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { revenue, expense };
  }, [trips, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Báo Cáo Tổng Hợp</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Phân tích hiệu suất, doanh thu, và chi phí vận tải.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <MonthlyReportExport />
        </div>
      </div>

      {/* FINANCIAL SUMMARY CARDS FOR ACCOUNTANT */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                          <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                          <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Tổng Doanh Thu</p>
                          <h3 className="text-2xl font-bold text-emerald-950">{(totals.revenue).toLocaleString('vi-VN')} đ</h3>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-red-100 bg-red-50/30">
              <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg text-red-600">
                          <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                          <p className="text-xs font-medium text-red-800 uppercase tracking-wider">Tổng Chi Phí</p>
                          <h3 className="text-2xl font-bold text-red-950">{(totals.expense).toLocaleString('vi-VN')} đ</h3>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/30">
              <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <ArrowUpCircle className="h-5 w-5" />
                      </div>
                      <div>
                          <p className="text-xs font-medium text-blue-800 uppercase tracking-wider">Lợi Nhuận Thuần</p>
                          <h3 className="text-2xl font-bold text-blue-950">{(totals.revenue - totals.expense).toLocaleString('vi-VN')} đ</h3>
                          <p className="text-[10px] text-blue-700 font-bold mt-1">Biên lợi nhuận: {totals.revenue > 0 ? Math.round(((totals.revenue - totals.expense) / totals.revenue) * 100) : 0}%</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full justify-start">
            <TabsTrigger value="vehicle" className="min-w-[100px]">Theo Xe</TabsTrigger>
            <TabsTrigger value="driver" className="min-w-[100px]">Theo Tài xế</TabsTrigger>
            <TabsTrigger value="route" className="min-w-[120px]">Theo Tuyến</TabsTrigger>
            <TabsTrigger value="customer" className="min-w-[140px]">Theo Khách hàng</TabsTrigger>
            <TabsTrigger value="revenue" className="min-w-[100px]">Doanh Thu</TabsTrigger>
            <TabsTrigger value="expense" className="min-w-[100px]">Chi Phí</TabsTrigger>
            <TabsTrigger value="profit" className="min-w-[100px]">Lợi Nhuận</TabsTrigger>
            <TabsTrigger value="vehicle-pnl" className="min-w-[140px]">Lãi/Lỗ Theo Xe</TabsTrigger>
            <TabsTrigger value="benchmark" className="min-w-[130px]">So Sánh Xe</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vehicle" className="space-y-4">
          <ReportByVehicleTable />
        </TabsContent>

        <TabsContent value="driver" className="space-y-4">
          <ReportByDriverTable />
        </TabsContent>

        <TabsContent value="route" className="space-y-4">
          <ReportByRouteTable />
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <ReportByCustomerTable />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <ReportByRevenueTable />
        </TabsContent>

        <TabsContent value="expense" className="space-y-4">
          <ReportByExpenseTable />
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          <ReportByProfitTable />
        </TabsContent>

        <TabsContent value="vehicle-pnl" className="space-y-4">
          <ReportVehiclePnL />
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-4">
          <ReportVehicleBenchmark />
        </TabsContent>
      </Tabs>
    </div>
  );
}
