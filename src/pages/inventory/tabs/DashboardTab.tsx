import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryItems, useTires } from '@/hooks/useInventory';
import { Package, Wrench, AlertTriangle, Coins, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: tires = [], isLoading: tiresLoading } = useTires();

  if (itemsLoading || tiresLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Đang tải dữ liệu Dashboard...</div>;

  const lowStockItems = items.filter(i => i.current_stock < i.min_stock_level);
  const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);

  const installedTires = tires.filter(t => t.current_status === 'INSTALLED').length;
  const inStockTires = tires.filter(t => t.current_status === 'IN_STOCK').length;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white/70 backdrop-blur-sm border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-100/50 text-blue-700 rounded-2xl">
              <Coins className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tổng Giá Trị Tồn Kho</p>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                {totalValue.toLocaleString()} đ
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-rose-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('operations')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-rose-100/50 text-rose-700 rounded-2xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cảnh Báo Sắp Hết</p>
              <h3 className="text-2xl font-bold text-rose-700">{lowStockItems.length} <span className="text-sm font-normal text-rose-500">vật tư</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-emerald-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('lifecycle')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-100/50 text-emerald-700 rounded-2xl">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lốp Đang Chạy (Lắp trên xe)</p>
              <h3 className="text-2xl font-bold text-emerald-700">{installedTires} <span className="text-sm font-normal text-emerald-500">lốp</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-100/50 text-amber-700 rounded-2xl">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lốp Dự Phòng (Trong Kho)</p>
              <h3 className="text-2xl font-bold text-amber-700">{inStockTires} <span className="text-sm font-normal text-amber-500">lốp</span></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Vật tư cần báo giá / Nhập gấp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Kho vật tư đang dồi dào, không có cảnh báo.</div>
            ) : (
              <div className="divide-y">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-medium text-slate-800">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">Mã: {item.item_code} • Kho: {item.location || 'Chưa XĐ'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-600 font-bold">{item.current_stock} {item.unit}</div>
                      <div className="text-xs text-slate-500">Tối thiểu: {item.min_stock_level}</div>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <div className="p-3 text-center bg-slate-50">
                    <Button variant="link" onClick={() => onNavigate('operations')}>Xem tất cả {lowStockItems.length} cảnh báo</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-blue-500" /> Biến động tồn kho gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center text-muted-foreground">
            Tính năng log giao dịch kho đang được phát triển...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
