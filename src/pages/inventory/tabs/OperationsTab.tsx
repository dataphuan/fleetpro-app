import React, { useState } from 'react';
import { useInventoryItems, useCreateInventoryItem, useCreateTransaction, useCreateTire } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowDownToLine, ArrowUpToLine, Search, FileSpreadsheet, Printer } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToCSV, printTable } from '@/lib/export-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function OperationsTab() {
  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateInventoryItem();
  const createTransaction = useCreateTransaction();
  const createTire = useCreateTire();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  
  // Forms state
  const [itemFormData, setItemFormData] = useState({
    item_code: '', name: '', category: 'Vật Tư', unit: 'Cái', min_stock_level: '5',
    current_stock: '0', average_cost: '0', location: ''
  });

  const [transactionData, setTransactionData] = useState({
    item_id: '', quantity: '', unit_price: '', notes: '', reference_id: '', 
    // Cho Lốp xe (nếu category là Lốp)
    generate_tires: false,
    tire_brand: '', tire_size: '11R22.5'
  });

  const handleCreateItem = () => {
    createItem.mutate({
      item_code: itemFormData.item_code,
      name: itemFormData.name,
      category: itemFormData.category,
      unit: itemFormData.unit,
      min_stock_level: Number(itemFormData.min_stock_level),
      current_stock: Number(itemFormData.current_stock),
      average_cost: Number(itemFormData.average_cost),
      total_value: Number(itemFormData.current_stock) * Number(itemFormData.average_cost),
      location: itemFormData.location
    }, {
      onSuccess: () => setAddItemModalOpen(false)
    });
  };

  const handleTransaction = (type: 'IN_NEW' | 'OUT_REPAIR') => {
    if (!transactionData.item_id || !transactionData.quantity) {
      toast({ title: "Lỗi", description: "Vui lòng chọn vật tư và nhập số lượng", variant: "destructive" });
      return;
    }

    const qty = Number(transactionData.quantity);
    if (qty <= 0) {
      toast({ title: "Lỗi", description: "Số lượng phải lớn hơn 0", variant: "destructive" });
      return;
    }

    // Kiểm tra tồn kho khi xuất
    if (type === 'OUT_REPAIR') {
      const currentItem = items.find(i => i.id === transactionData.item_id);
      if (currentItem && qty > currentItem.current_stock) {
        toast({ title: "Không đủ tồn kho", description: `Tồn kho hiện tại: ${currentItem.current_stock} ${currentItem.unit}. Không thể xuất ${qty}.`, variant: "destructive" });
        return;
      }
    }

    const price = Number(transactionData.unit_price) || 0;

    createTransaction.mutate({
      type,
      item_id: transactionData.item_id,
      quantity: qty,
      unit_price: price,
      total_price: qty * price,
      notes: transactionData.notes,
      reference_id: transactionData.reference_id,
      transaction_code: `TXN-${Date.now().toString().slice(-6)}`,
      transaction_date: new Date().toISOString()
    }, {
      onSuccess: async () => {
        // Nếu là Nhập Kho và chọn 'tạo mã lốp' - tạo tuần tự để tránh race condition
        if (type === 'IN_NEW' && transactionData.generate_tires) {
          for (let i = 0; i < qty; i++) {
            try {
              await createTire.mutateAsync({
                item_id: transactionData.item_id,
                serial_number: `SN-${Date.now().toString().slice(-6)}-${i+1}`,
                brand: transactionData.tire_brand,
                size: transactionData.tire_size,
                current_status: 'IN_STOCK',
                total_km_run: 0
              });
            } catch (e) {
              console.error(`Failed to create tire ${i+1}:`, e);
            }
          }
        }
        setImportModalOpen(false);
        setExportModalOpen(false);
        setTransactionData({ item_id: '', quantity: '', unit_price: '', notes: '', reference_id: '', generate_tires: false, tire_brand: '', tire_size: '11R22.5' });
      }
    });
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === transactionData.item_id);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-2 fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80 shadow-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Tìm mã hoặc tên vật tư..." 
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Nhập Kho
          </Button>
          <Button onClick={() => setExportModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
            <ArrowUpToLine className="w-4 h-4 mr-2" /> Xuất Kho
          </Button>
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-300 text-slate-600">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất file
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const exportData = items.map(i => ({ 'Mã VT': i.item_code, 'Tên Vật Tư': i.name, 'Danh Mục': i.category, 'Tồn Kho': i.current_stock, 'Đơn Vị': i.unit, 'Đơn Giá TB': i.average_cost, 'Vị Trí': i.location || '' }));
                exportToExcel(exportData, `TonKho_${new Date().toISOString().slice(0,10)}`, 'Tồn Kho');
                toast({ title: 'Xuất Excel', description: 'Đã tải file thành công.' });
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const exportData = items.map(i => ({ 'Mã VT': i.item_code, 'Tên': i.name, 'Tồn': i.current_stock, 'ĐVT': i.unit }));
                exportToCSV(exportData, `TonKho_${new Date().toISOString().slice(0,10)}`);
                toast({ title: 'Xuất CSV', description: 'Đã tải file thành công.' });
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                printTable('BÁO CÁO TỒN KHO VẬT TƯ', ['Mã VT', 'Tên Vật Tư', 'Danh Mục', 'Tồn Kho', 'ĐVT', 'Đơn Giá TB', 'Vị Trí'],
                  items.map(i => [i.item_code, i.name, i.category, String(i.current_stock), i.unit, i.average_cost.toLocaleString() + 'đ', i.location || '---']));
              }}>
                <Printer className="w-4 h-4 mr-2 text-slate-600" /> In báo cáo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setAddItemModalOpen(true)} variant="outline" className="text-slate-700 shadow-sm border-slate-300">
            <PlusCircle className="w-4 h-4 mr-2 text-slate-500" /> Tạo Mã Vật Tư
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[120px]">Mã VT</TableHead>
              <TableHead>Tên Vật Tư</TableHead>
              <TableHead>Danh Mục</TableHead>
              <TableHead className="text-right">Tồn Kho</TableHead>
              <TableHead>Đơn Vị</TableHead>
              <TableHead className="text-right">Đơn Giá TB</TableHead>
              <TableHead>Vị Trí Kho</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground animate-pulse">Đang tải danh mục vật tư...</TableCell></TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không tìm thấy vật tư nào.</TableCell></TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-700">{item.item_code}</TableCell>
                  <TableCell className="font-medium">
                    {item.name}
                    {item.current_stock < item.min_stock_level && (
                      <Badge variant="outline" className="ml-2 bg-rose-50 text-rose-700 border-rose-200 text-[10px] leading-none py-0.5">Sắp hết</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-slate-700">{item.current_stock}</TableCell>
                  <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                  <TableCell className="text-right font-medium">{item.average_cost.toLocaleString()}đ</TableCell>
                  <TableCell className="text-muted-foreground">{item.location || '---'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* --- MODAL: TẠO MÃ VẬT TƯ --- */}
      <Dialog open={isAddItemModalOpen} onOpenChange={setAddItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo Mã Danh Mục Vật Tư Mới</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Mã Vật Tư (*)</Label><Input placeholder="VT-001" value={itemFormData.item_code} onChange={e => setItemFormData({...itemFormData, item_code: e.target.value})} /></div>
              <div className="space-y-2"><Label>Danh Mục</Label><Input value={itemFormData.category} onChange={e => setItemFormData({...itemFormData, category: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Tên Vật Tư (*)</Label><Input placeholder="Lốp Nhập Khẩu..." value={itemFormData.name} onChange={e => setItemFormData({...itemFormData, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Đơn vị tính</Label><Input value={itemFormData.unit} onChange={e => setItemFormData({...itemFormData, unit: e.target.value})} /></div>
              <div className="space-y-2"><Label>Tồn Tối Thiểu</Label><Input type="number" value={itemFormData.min_stock_level} onChange={e => setItemFormData({...itemFormData, min_stock_level: e.target.value})} /></div>
            </div>
             <div className="space-y-2"><Label>Vị Trí Định Danh Trong Kho</Label><Input placeholder="Kệ A2-Tầng 3" value={itemFormData.location} onChange={e => setItemFormData({...itemFormData, location: e.target.value})} /></div>
            <Button onClick={handleCreateItem} className="w-full mt-4" disabled={createItem.isPending}>{createItem.isPending ? "Đang lưu..." : "Xác nhận tạo mã"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: NHẬP KHO --- */}
      <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md border-t-4 border-t-emerald-500">
          <DialogHeader><DialogTitle className="flex items-center"><ArrowDownToLine className="w-5 h-5 mr-2 text-emerald-600"/> Phiếu Nhập Kho</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chọn Vật Tư (*)</Label>
              <Select value={transactionData.item_id} onValueChange={(val) => setTransactionData({...transactionData, item_id: val})}>
                <SelectTrigger><SelectValue placeholder="Chọn từ danh sách mã vật tư..."/></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Số Lượng Thực Nhập (*)</Label><Input type="number" placeholder="Ví dụ: 10" value={transactionData.quantity} onChange={e => setTransactionData({...transactionData, quantity: e.target.value})} /></div>
              <div className="space-y-2"><Label>Đơn Giá Nhập (VNĐ)</Label><Input type="number" placeholder="0" value={transactionData.unit_price} onChange={e => setTransactionData({...transactionData, unit_price: e.target.value})} /></div>
            </div>
            
            {/* Logic thông minh: nếu là Lốp, tự sinh seri */}
            {selectedItem?.category?.toLowerCase().includes('lốp') && Number(transactionData.quantity) > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-md space-y-3">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="gen_tire" className="rounded" checked={transactionData.generate_tires} onChange={(e) => setTransactionData({...transactionData, generate_tires: e.target.checked})} />
                  <label htmlFor="gen_tire" className="text-sm font-medium text-blue-800">Tự động sinh mã Serial Quản Lý cho {transactionData.quantity} lốp này</label>
                </div>
                {transactionData.generate_tires && (
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><Label className="text-xs text-blue-700">Hãng</Label><Input className="h-8 text-sm" value={transactionData.tire_brand} onChange={e => setTransactionData({...transactionData, tire_brand: e.target.value})} /></div>
                     <div className="space-y-1"><Label className="text-xs text-blue-700">Kích Cỡ</Label><Input className="h-8 text-sm" value={transactionData.tire_size} onChange={e => setTransactionData({...transactionData, tire_size: e.target.value})} /></div>
                   </div>
                )}
              </div>
            )}

            <div className="space-y-2"><Label>Số Hóa Đơn / Phiếu Xuất Kho Của NCC</Label><Input placeholder="HD-2024-..." value={transactionData.reference_id} onChange={e => setTransactionData({...transactionData, reference_id: e.target.value})} /></div>
            <div className="space-y-2"><Label>Ghi Chú Nhập Kho</Label><Input value={transactionData.notes} onChange={e => setTransactionData({...transactionData, notes: e.target.value})} /></div>
            <Button onClick={() => handleTransaction('IN_NEW')} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? "Đang xử lý..." : "Xác Nhận Nhập Kho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: XUẤT KHO --- */}
      <Dialog open={isExportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md border-t-4 border-t-rose-500">
          <DialogHeader><DialogTitle className="flex items-center"><ArrowUpToLine className="w-5 h-5 mr-2 text-rose-600"/> Phiếu Xuất Kho Khác (Sửa Chữa)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground mb-2 italic">* Lưu ý: Để xuất lốp gắn lên xe, vui lòng qua tab "Vòng Đời Lốp" để gắn theo Serial.</p>
            <div className="space-y-2">
              <Label>Chọn Vật Tư (*)</Label>
              <Select value={transactionData.item_id} onValueChange={(val) => setTransactionData({...transactionData, item_id: val})}>
                <SelectTrigger><SelectValue placeholder="Chọn từ danh sách..."/></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.name} (Tồn: {i.current_stock})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Số Lượng Cần Xuất (*)</Label><Input type="number" placeholder="Ví dụ: 2" value={transactionData.quantity} onChange={e => setTransactionData({...transactionData, quantity: e.target.value})} /></div>
            <div className="space-y-2"><Label>Lý do xuất / Mã tham chiếu</Label><Input placeholder="Xuất sửa chữa ngoại tuyến..." value={transactionData.notes} onChange={e => setTransactionData({...transactionData, notes: e.target.value})} /></div>
            <Button onClick={() => handleTransaction('OUT_REPAIR')} className="w-full mt-4 bg-rose-600 hover:bg-rose-700" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? "Đang xử lý..." : "Xác Nhận Xuất Kho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
