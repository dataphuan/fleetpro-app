import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp } from "lucide-react";

export function AnalyticsTab() {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-2 fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Báo Cáo Phân Tích</h2>
          <p className="text-sm text-muted-foreground">Phân tích hiệu suất sử dụng lốp và biến động giá trị tồn kho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/80 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Xu Hướng Nhập / Xuất (30 ngày)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Báo cáo biểu đồ đang được phát triển...
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/80 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="w-5 h-5 text-indigo-500" /> Tỉ Lệ Tồn Kho Theo Danh Mục
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Báo cáo phân bổ đang được phát triển...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
