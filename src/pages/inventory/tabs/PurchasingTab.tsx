import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ShoppingCart, FileSpreadsheet, Printer, Check, X, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePurchaseOrders, useCreatePO, useUpdatePO, useInventoryItems } from '@/hooks/useInventory';
import { exportToExcel, exportToCSV, printTable } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

export function PurchasingTab() {
  const { data: pos = [], isLoading } = usePurchaseOrders();
  const { data: items = [] } = useInventoryItems();
  const createPO = useCreatePO();
  const updatePO = useUpdatePO();
  const { toast } = useToast();
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    po_code: '',
    vendor_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    total_amount: '',
    notes: '',
  });

  const handleCreatePO = () => {
    if (!formData.po_code || !formData.vendor_name) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập mã PO và tên nhà cung cấp", variant: "destructive" });
      return;
    }
    createPO.mutate({
      po_code: formData.po_code,
      vendor_name: formData.vendor_name,
      order_date: formData.order_date,
      expected_date: formData.expected_date || null,
      total_amount: Number(formData.total_amount) || 0,
      status: 'pending',
      notes: formData.notes,
    }, {
      onSuccess: () => {
        setCreateModalOpen(false);
        setFormData({ po_code: '', vendor_name: '', order_date: new Date().toISOString().slice(0, 10), expected_date: '', total_amount: '', notes: '' });
      }
    });
  };

  const handleStatusChange = (poId: string, newStatus: string) => {
    updatePO.mutate({ id: poId, data: { status: newStatus } });
  };

  const statusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">Chờ duyệt</Badge>;
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">Đã nhập</Badge>;
      case 'cancelled': return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const exportData = pos.map((po: any) => ({
      'Mã PO': po.po_code,
      'Nhà Cung Cấp': po.vendor_name || '',
      'Ngày Đặt': po.order_date,
      'Ngày Dự Kiện': po.expected_date || '',
      'Tổng Giá Trị (VNĐ)': po.total_amount,
      'Trạng Thái': po.status === 'pending' ? 'Chờ duyệt' : po.status === 'completed' ? 'Đã nhập' : 'Đã hủy',
      'Ghi Chú': po.notes || '',
    }));
    exportToExcel(exportData, `DonMuaSam_${new Date().toISOString().slice(0,10)}`, 'Đơn Mua Sắm');
    toast({ title: "Xuất Excel", description: "Đã tải file Excel thành công." });
  };

  const handleExportCSV = () => {
    const exportData = pos.map((po: any) => ({
      'Mã PO': po.po_code,
      'Nhà Cung Cấp': po.vendor_name || '',
      'Ngày Đặt': po.order_date,
      'Tổng Giá Trị': po.total_amount,
      'Trạng Thái': po.status === 'pending' ? 'Chờ duyệt' : po.status === 'completed' ? 'Đã nhập' : 'Đã hủy',
    }));
    exportToCSV(exportData, `DonMuaSam_${new Date().toISOString().slice(0,10)}`);
    toast({ title: "Xuất CSV", description: "Đã tải file CSV thành công." });
  };

  const handlePrint = () => {
    const headers = ['Mã PO', 'Nhà Cung Cấp', 'Ngày Đặt', 'Ngày Dự Kiện', 'Tổng Giá Trị', 'Trạng Thái'];
    const rows = pos.map((po: any) => [
      po.po_code,
      po.vendor_name || '',
      po.order_date,
      po.expected_date || '---',
      po.total_amount?.toLocaleString() + 'đ',
      po.status === 'pending' ? 'Chờ duyệt' : po.status === 'completed' ? 'Đã nhập' : 'Đã hủy',
    ]);
    printTable('BÁO CÁO ĐƠN MUA SẮM VẬT TƯ', headers, rows);
  };

  const totalPending = pos.filter((p: any) => p.status === 'pending').length;
  const totalCompleted = pos.filter((p: any) => p.status === 'completed').length;
  const totalValue = pos.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-2 fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Đơn Yêu Cầu Mua Sắm (PO)</h2>
          <p className="text-sm text-muted-foreground">Theo dõi và quản lý việc đặt mua vật tư từ nhà cung cấp</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-300 text-slate-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất file
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2 text-slate-600" /> In báo cáo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
            <PlusCircle className="w-4 h-4 mr-2" /> Tạo Yêu Cầu Mới
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-amber-50/60 border-amber-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{totalPending}</div>
            <div className="text-xs text-amber-600 font-medium">Đang chờ duyệt</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/60 border-emerald-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{totalCompleted}</div>
            <div className="text-xs text-emerald-600 font-medium">Đã hoàn thành</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/60 border-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{totalValue.toLocaleString()}đ</div>
            <div className="text-xs text-blue-600 font-medium">Tổng giá trị PO</div>
          </CardContent>
        </Card>
      </div>

      {/* PO Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[120px]">Mã PO</TableHead>
              <TableHead>Nhà Cung Cấp</TableHead>
              <TableHead>Ngày Đặt</TableHead>
              <TableHead>Ngày Dự Kiến</TableHead>
              <TableHead className="text-right">Tổng Giá Trị</TableHead>
              <TableHead className="text-center">Trạng Thái</TableHead>
              <TableHead>Ghi Chú</TableHead>
              <TableHead className="text-right">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground animate-pulse">Đang tải đơn mua sắm...</TableCell></TableRow>
            ) : pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-100 rounded-full"><ShoppingCart className="w-10 h-10 text-slate-400" /></div>
                    <p className="font-medium text-slate-700">Chưa có đơn mua sắm nào</p>
                    <p className="text-sm text-muted-foreground max-w-sm">Nhấn "Tạo Yêu Cầu Mới" để tạo đề xuất mua sắm vật tư.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po: any) => (
                <TableRow key={po.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-blue-700">{po.po_code}</TableCell>
                  <TableCell className="font-medium">{po.vendor_name || '---'}</TableCell>
                  <TableCell className="text-muted-foreground">{po.order_date}</TableCell>
                  <TableCell className="text-muted-foreground">{po.expected_date || '---'}</TableCell>
                  <TableCell className="text-right font-bold">{(po.total_amount || 0).toLocaleString()}đ</TableCell>
                  <TableCell className="text-center">{statusBadge(po.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{po.notes || '---'}</TableCell>
                  <TableCell className="text-right">
                    {po.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handleStatusChange(po.id, 'completed')}>
                          <Check className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => handleStatusChange(po.id, 'cancelled')}>
                          <X className="w-3 h-3 mr-1" /> Hủy
                        </Button>
                      </div>
                    )}
                    {po.status !== 'pending' && (
                      <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create PO Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg border-t-4 border-t-blue-500">
          <DialogHeader><DialogTitle className="flex items-center"><ShoppingCart className="w-5 h-5 mr-2 text-blue-600" /> Tạo Đề Xuất Mua Sắm Mới</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã PO (*)</Label>
                <Input placeholder="PO-2026-001" value={formData.po_code} onChange={e => setFormData({...formData, po_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nhà Cung Cấp (*)</Label>
                <Input placeholder="Công ty TNHH ABC" value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày Đặt Hàng</Label>
                <Input type="date" value={formData.order_date} onChange={e => setFormData({...formData, order_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Ngày Dự Kiến Giao</Label>
                <Input type="date" value={formData.expected_date} onChange={e => setFormData({...formData, expected_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tổng Giá Trị Đơn Hàng (VNĐ)</Label>
              <Input type="number" placeholder="0" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Ghi Chú / Chi Tiết Đơn Hàng</Label>
              <Input placeholder="10 lốp Michelin 11R22.5, 5 bộ lọc dầu..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <Button onClick={handleCreatePO} className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={createPO.isPending}>
              {createPO.isPending ? "Đang lưu..." : "Tạo Đề Xuất Mua Sắm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
