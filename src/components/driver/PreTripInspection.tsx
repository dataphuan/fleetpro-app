import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PreTripInspectionProps {
  tripId: string;
  vehicleId?: string;
  vehiclePlate?: string;
  onSuccess?: () => void;
}

export function PreTripInspection({
  tripId,
  vehicleId,
  vehiclePlate,
  onSuccess,
}: PreTripInspectionProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    engineOil: 'ok',
    coolant: 'ok',
    tires: 'ok',
    lights: 'ok',
    brakes: 'ok',
    fuel: '',
    odometer: '',
    issues: '',
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Here you would typically send this to your backend/Firestore
      console.log('Pre-trip inspection:', {
        tripId,
        vehicleId,
        vehiclePlate,
        ...formData,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: '✅ Báo cáo nhận xe',
        description: 'Kiểm tra xe trước chuyến đã được lưu',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Submission failed:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể lưu báo cáo. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <div className="flex w-full bg-slate-100/80 p-1 rounded-xl shadow-inner mt-2 gap-1 border border-slate-200/50">
      <button 
        type="button" onClick={() => onChange('ok')} 
        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 focus:outline-none ${value==='ok' ? 'bg-emerald-500 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-slate-200'}`}>
        🟢 Tốt
      </button>
      <button 
        type="button" onClick={() => onChange('warning')} 
        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 focus:outline-none ${value==='warning' ? 'bg-amber-500 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-slate-200'}`}>
        🟡 Lưu ý
      </button>
      <button 
        type="button" onClick={() => onChange('bad')} 
        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 focus:outline-none ${value==='bad' ? 'bg-rose-500 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-slate-200'}`}>
        🔴 Hỏng
      </button>
    </div>
  );

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex gap-2 items-center text-xl text-blue-900">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
          Báo Cáo Nhận Xe
        </CardTitle>
        {vehiclePlate && (
          <p className="text-sm font-medium text-slate-500 mt-2 bg-slate-100 w-fit px-3 py-1 rounded-full">
            Biển số: <span className="text-slate-800">{vehiclePlate}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6 px-0 pb-8">
        {/* Vehicle Status */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
            1. Tình trạng ngoại quan & máy móc
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Dầu động cơ</label>
              <StatusSelector value={formData.engineOil} onChange={(v) => setFormData({ ...formData, engineOil: v })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Nước làm mát</label>
              <StatusSelector value={formData.coolant} onChange={(v) => setFormData({ ...formData, coolant: v })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Lốp xe</label>
              <StatusSelector value={formData.tires} onChange={(v) => setFormData({ ...formData, tires: v })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Đèn chiếu sáng</label>
              <StatusSelector value={formData.lights} onChange={(v) => setFormData({ ...formData, lights: v })} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Hệ thống phanh</label>
              <StatusSelector value={formData.brakes} onChange={(v) => setFormData({ ...formData, brakes: v })} />
            </div>
          </div>
        </div>

        {/* Fuel & Odometer */}
        <div className="space-y-3 pt-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2">
            2. Nhiên liệu & Đồng hồ
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xăng dầu (%)</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={formData.fuel}
                  onChange={(e) =>
                    setFormData({ ...formData, fuel: e.target.value })
                  }
                  placeholder="100"
                  max={100}
                  className="text-lg font-bold border-0 bg-slate-50 h-12 focus-visible:ring-1"
                />
                <span className="text-slate-400 font-medium">%</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Công tơ (km)</label>
              <Input
                type="number"
                value={formData.odometer}
                onChange={(e) =>
                  setFormData({ ...formData, odometer: e.target.value })
                }
                placeholder="0"
                className="text-lg font-bold border-0 bg-slate-50 h-12 mt-1 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        {/* Issues */}
        <div className="pt-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-2 mb-3">
            3. Vấn đề & Ghi chú
          </h3>
          <Textarea
            value={formData.issues}
            onChange={(e) =>
              setFormData({ ...formData, issues: e.target.value })
            }
            placeholder="Mô tả các vết trầy xước, vấn đề phát sinh nếu có..."
            className="w-full bg-slate-50 border-slate-200 rounded-xl resize-none p-4"
            rows={4}
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            size="lg"
            className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-transform active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang gửi báo cáo...
              </>
            ) : (
              <>
                <CheckSquare className="w-5 h-5 mr-2" />
                Hoàn Tất & Nhận Xe
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
