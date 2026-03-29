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
    <div className="p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Quản Lý Vật Tư & Lốp Xe
          </h1>
          <p className="text-muted-foreground mt-1">
            Hệ thống quản lý vòng đời vật tư khép kín: Mua sắm ➔ Nhập kho ➔ Sử dụng ➔ Thanh lý
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="bg-white/60 p-1.5 rounded-lg border shadow-sm backdrop-blur-md sticky top-0 z-10">
          <TabsList className="grid w-full grid-cols-5 bg-transparent p-0 gap-1 child:rounded-md child:py-2.5 child:font-medium">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <TrendingUp className="w-4 h-4 mr-2" /> Tổng Quan
            </TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Box className="w-4 h-4 mr-2" /> Nhập / Xuất
            </TabsTrigger>
            <TabsTrigger value="purchasing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <ShoppingCart className="w-4 h-4 mr-2" /> Mua Sắm
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <History className="w-4 h-4 mr-2" /> Vòng Đời Lốp
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
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
