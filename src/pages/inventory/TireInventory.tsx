import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Box, Wrench, Package, History, TrendingUp, AlertTriangle, PenTool, ShoppingCart } from "lucide-react";
import { useInventoryItems, useTires } from '@/hooks/useInventory';

// Subcomponents - we will extract these to separate files if needed, but for now they are here
import { DashboardTab } from './tabs/DashboardTab';
import { OperationsTab } from './tabs/OperationsTab';
import { PurchasingTab } from './tabs/PurchasingTab';
import { LifecycleTab } from './tabs/LifecycleTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';

export default function TireInventory() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-4 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent sm:text-3xl">
            Quản Lý Vật Tư & Lốp Xe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Hệ thống quản lý vòng đời vật tư khép kín: Mua sắm ➔ Nhập kho ➔ Sử dụng ➔ Thanh lý
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="sticky top-0 z-10 rounded-lg border bg-white/70 p-1.5 shadow-sm backdrop-blur-md">
          <TabsList className="flex w-full flex-nowrap gap-1 overflow-x-auto bg-transparent p-0 scrollbar-thin">
            <TabsTrigger value="dashboard" className="shrink-0 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <TrendingUp className="w-4 h-4 mr-2" /> Tổng Quan
            </TabsTrigger>
            <TabsTrigger value="operations" className="shrink-0 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Box className="w-4 h-4 mr-2" /> Nhập / Xuất
            </TabsTrigger>
            <TabsTrigger value="purchasing" className="shrink-0 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <ShoppingCart className="w-4 h-4 mr-2" /> Mua Sắm
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="shrink-0 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <History className="w-4 h-4 mr-2" /> Vòng Đời Lốp
            </TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 px-3 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <PenTool className="w-4 h-4 mr-2" /> Báo Cáo
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="m-0 space-y-4">
          <DashboardTab onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="operations" className="m-0 space-y-4">
          <OperationsTab />
        </TabsContent>

        <TabsContent value="purchasing" className="m-0 space-y-4">
          <PurchasingTab />
        </TabsContent>

        <TabsContent value="lifecycle" className="m-0 space-y-4">
          <LifecycleTab />
        </TabsContent>

        <TabsContent value="analytics" className="m-0 space-y-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
