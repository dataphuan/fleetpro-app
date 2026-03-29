import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTires, useUpdateTire } from '@/hooks/useInventory';
import { useVehicles } from '@/hooks/useVehicles';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Wrench, PackageCheck, AlertCircle, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AXLE_POSITIONS = [
  { value: 'FRONT-LEFT', label: 'Trước - Trái' },
  { value: 'FRONT-RIGHT', label: 'Trước - Phải' },
  { value: 'REAR-LEFT-OUTER', label: 'Sau - Trái Ngoài' },
  { value: 'REAR-LEFT-INNER', label: 'Sau - Trái Trong' },
  { value: 'REAR-RIGHT-OUTER', label: 'Sau - Phải Ngoài' },
  { value: 'REAR-RIGHT-INNER', label: 'Sau - Phải Trong' },
  { value: 'SPARE', label: 'Lốp Sơ Cua' },
];

export function LifecycleTab() {
  const { data: tires = [], isLoading } = useTires();
  const { data: vehicles = [] } = useVehicles();
  const updateTire = useUpdateTire();
  const { toast } = useToast();

  const [selectedTireId, setSelectedTireId] = useState<string | null>(null);

  // Install modal state
  const [isInstallModalOpen, setInstallModalOpen] = useState(false);
  const [installTireId, setInstallTireId] = useState<string | null>(null);
  const [installData, setInstallData] = useState({
    vehicle_id: '',
    position: '',
    odometer: ''
  });

  const handleOpenInstallModal = (tireId: string) => {
    setInstallTireId(tireId);
    setInstallData({ vehicle_id: '', position: '', odometer: '' });
    setInstallModalOpen(true);
  };

  const handleConfirmInstall = () => {
    if (!installTireId || !installData.vehicle_id || !installData.position) {
      toast({ title: "Lỗi", description: "Vui lòng chọn xe và vị trí lắp đặt.", variant: "destructive" });
      return;
    }

    updateTire.mutate({
      id: installTireId,
      data: {
        current_status: 'INSTALLED',
        current_vehicle_id: installData.vehicle_id,
        installed_position: installData.position,
      }
    }, {
      onSuccess: () => {
        setInstallModalOpen(false);
        setInstallTireId(null);
        toast({ title: "Thành công", description: "Đã lắp lốp lên xe." });
      }
    });
  };

  const selectedTireData = tires.find(t => t.id === selectedTireId);
  const installTireData = tires.find(t => t.id === installTireId);

  // Tìm xe theo vehicle_id
  const getVehiclePlate = (vehicleId: string) => {
    const v = vehicles.find((veh: any) => veh.id === vehicleId);
    return v?.license_plate || vehicleId;
  };

  const activeVehicles = vehicles.filter((v: any) => v.status === 'active');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-right-2 fade-in duration-300">
      
      {/* Lốp List */}
      <Card className="md:col-span-2 shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Danh Sách Lốp Xe</CardTitle>
          <div className="text-xs text-muted-foreground">Chọn 1 lốp để xem vòng đời</div>
        </CardHeader>
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Hãng</TableHead>
                <TableHead>Kích Cỡ</TableHead>
                <TableHead className="text-center">Trạng Thái</TableHead>
                <TableHead className="text-right">Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : tires.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có lốp nào. Hãy nhập kho lốp từ tab "Nhập / Xuất" để bắt đầu.</TableCell></TableRow>
              ) : (
                tires.map((t) => (
                  <TableRow 
                    key={t.id} 
                    className={`cursor-pointer transition-colors ${selectedTireId === t.id ? 'bg-blue-50/80' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedTireId(t.id)}
                  >
                    <TableCell className="font-medium text-slate-800 font-mono">{t.serial_number}</TableCell>
                    <TableCell className="text-muted-foreground">{t.brand || '---'}</TableCell>
                    <TableCell>{t.size}</TableCell>
                    <TableCell className="text-center">
                      {t.current_status === 'IN_STOCK' && <Badge variant="outline" className="bg-blue-50 text-blue-700">Tồn kho</Badge>}
                      {t.current_status === 'INSTALLED' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Gắn trên xe</Badge>}
                      {t.current_status === 'RETREADING' && <Badge variant="outline" className="bg-amber-50 text-amber-700">Đắp lại</Badge>}
                      {t.current_status === 'DISPOSED' && <Badge variant="outline" className="bg-slate-100 text-slate-500">Đã thanh lý</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.current_status === 'IN_STOCK' ? (
                        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); handleOpenInstallModal(t.id); }}>
                          <Wrench className="w-3 h-3 mr-1" /> Lắp Xe
                        </Button>
                      ) : t.current_status === 'INSTALLED' ? (
                        <span className="text-xs text-muted-foreground">{getVehiclePlate(t.current_vehicle_id)}</span>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>---</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Lifecycle Timeline Details */}
      <Card className="shadow-sm border-slate-200 bg-slate-50 relative overflow-hidden">
        {selectedTireId ? (
          <>
            <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <CardHeader>
              <CardTitle className="text-lg">Chi Tiết Vòng Đời</CardTitle>
              <div className="text-sm text-muted-foreground mt-1 text-blue-800 font-medium font-mono">{selectedTireData?.serial_number}</div>
              {selectedTireData?.brand && <div className="text-xs text-muted-foreground">Hãng: {selectedTireData.brand} | Kích cỡ: {selectedTireData.size}</div>}
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                
                {selectedTireData?.current_status === 'INSTALLED' && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-emerald-100 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                       <Wrench className="w-5 h-5" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded bg-white/80 shadow border border-emerald-100">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-800">Lắp Lên Xe</div>
                        <time className="font-mono text-xs text-amber-500">Mới nhất</time>
                      </div>
                      <div className="text-slate-500 text-sm flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> 
                        {getVehiclePlate(selectedTireData.current_vehicle_id)}
                        {selectedTireData.installed_position && (
                          <span className="ml-1 text-xs text-slate-400">({selectedTireData.installed_position})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                     <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded bg-white/80 shadow border border-blue-100">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-800">Nhập Kho</div>
                      <time className="font-mono text-xs text-slate-500">{new Date(selectedTireData!.created_at).toLocaleDateString('vi-VN')}</time>
                    </div>
                    <div className="text-slate-500 text-sm">Nhập kho mới. Hãng: {selectedTireData?.brand || 'N/A'}</div>
                  </div>
                </div>

              </div>
            </CardContent>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-white rounded-full mb-4 shadow-sm border border-slate-100">
              <History className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-700">Chưa chọn lốp xe</p>
            <p className="text-sm text-slate-500 mt-2">Nhấp vào một dòng lốp xe bên khung trái để xem lịch sử vòng đời chi tiết từ lúc nhập kho đến nay.</p>
          </div>
        )}
      </Card>

      {/* --- MODAL: LẮP LỐP LÊN XE --- */}
      <Dialog open={isInstallModalOpen} onOpenChange={setInstallModalOpen}>
        <DialogContent className="max-w-md border-t-4 border-t-emerald-500">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-emerald-600"/> Lắp Lốp Lên Xe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {installTireData && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                <div className="text-sm font-medium text-blue-800">Lốp: <span className="font-mono">{installTireData.serial_number}</span></div>
                <div className="text-xs text-blue-600 mt-0.5">{installTireData.brand} - {installTireData.size}</div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Chọn Xe (*)</Label>
              <Select value={installData.vehicle_id} onValueChange={(val) => setInstallData({...installData, vehicle_id: val})}>
                <SelectTrigger><SelectValue placeholder="Chọn xe từ danh sách..."/></SelectTrigger>
                <SelectContent>
                  {activeVehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.license_plate} {v.brand ? `(${v.brand} ${v.model || ''})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vị Trí Lắp (*)</Label>
              <Select value={installData.position} onValueChange={(val) => setInstallData({...installData, position: val})}>
                <SelectTrigger><SelectValue placeholder="Chọn vị trí trục..."/></SelectTrigger>
                <SelectContent>
                  {AXLE_POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Số ODO hiện tại (km)</Label>
              <Input type="number" placeholder="Ví dụ: 125000" value={installData.odometer} onChange={e => setInstallData({...installData, odometer: e.target.value})} />
            </div>

            <Button onClick={handleConfirmInstall} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" disabled={updateTire.isPending}>
              {updateTire.isPending ? "Đang xử lý..." : "Xác Nhận Lắp Lốp"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
