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

export function ReportsLayout() {
  const [activeTab, setActiveTab] = useState("vehicle");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Báo Cáo Tổng Hợp</h2>
          <p className="text-muted-foreground">
            Phân tích hiệu suất, doanh thu, và chi phí vận tải.
          </p>
        </div>
        <MonthlyReportExport />
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
