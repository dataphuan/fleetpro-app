import React, { useState } from 'react';
import { Tire } from '../../../electron/tires';
import { useInstallTire, useRemoveTire } from '@/hooks/useTires';
import { useVehicles } from '@/hooks/useVehicles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench } from 'lucide-react';

interface TireActionModalProps {
  tire: Tire | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TireActionModal({ tire, isOpen, onClose }: TireActionModalProps) {
  const { data: vehicles = [] } = useVehicles();
  const installTire = useInstallTire();
  // const removeTire = useRemoveTire(); // (Tính năng tháo lốp cần ID của Install record, ta sẽ mock giả hoặc mở rộng sau)

  const [vehicleId, setVehicleId] = useState('');
  const [axlePos, setAxlePos] = useState('');
  const [odo, setOdo] = useState('');
  const [installDate, setInstallDate] = useState(new Date().toISOString().substring(0, 10));

  if (!tire) return null;

  const handleInstall = () => {
    if (!vehicleId || !axlePos || !odo) return alert("Vui lòng điền đủ thông tin xe, trục và ODO.");
    installTire.mutate({
      tireId: tire.id,
      vehicleId: vehicleId,
      axlePos: axlePos,
      date: installDate,
      odo: Number(odo)
    }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" /> 
            {tire.status === 'in_stock' ? 'Lắp Lốp Vào Xe' : 'Tháo Lốp Khỏi Xe'}
          </DialogTitle>
          <DialogDescription>
            {tire.status === 'in_stock' 
              ? `Lắp lốp Serial ${tire.serial_number} này lên xe trong đội.`
              : `Tháo lốp Serial ${tire.serial_number} đang gắn trên xe đưa về kho.`}
          </DialogDescription>
        </DialogHeader>

        {tire.status === 'in_stock' && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Chọn xe ghép nối</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Chọn biến số xe" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vị trí trục/bánh (Axle Position)</Label>
              <Select value={axlePos} onValueChange={setAxlePos}>
                 <SelectTrigger><SelectValue placeholder="Vị trí gắn" /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="Trục 1 - Trái">Trục 1 - Trái</SelectItem>
                    <SelectItem value="Trục 1 - Phải">Trục 1 - Phải</SelectItem>
                    <SelectItem value="Trục 2 - Trái Trong">Trục 2 - Trái Trong (Kép)</SelectItem>
                    <SelectItem value="Trục 2 - Trái Ngoài">Trục 2 - Trái Ngoài (Kép)</SelectItem>
                    <SelectItem value="Trục 2 - Phải Trong">Trục 2 - Phải Trong (Kép)</SelectItem>
                    <SelectItem value="Trục 2 - Phải Ngoài">Trục 2 - Phải Ngoài (Kép)</SelectItem>
                    <SelectItem value="Lốp Dự Phòng">Sơ-cua (Dự Phòng)</SelectItem>
                 </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Ngày lắp</Label>
                 <Input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <Label>Số ODO trên đồng hồ (km)</Label>
                  <Input type="number" placeholder="Odo lúc lắp..." value={odo} onChange={e => setOdo(e.target.value)} />
               </div>
            </div>
            <Button 
               className="w-full mt-2 bg-blue-600 hover:bg-blue-700" 
               disabled={!vehicleId || !axlePos || !odo || installTire.isPending}
               onClick={handleInstall}
            >
              {installTire.isPending ? 'Đang xử lý...' : 'Xác nhận lắp'}
            </Button>
          </div>
        )}

        {tire.status === 'installed' && (
          <div className="py-8 text-center text-amber-600 bg-amber-50 rounded-lg border border-amber-200 mt-4">
            Tính năng tháo lốp cần Mapping với Lịch Sử Chuyến Đi. 
            <br/><span className="text-sm">Hiện đang khoá trong Sprint này.</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
