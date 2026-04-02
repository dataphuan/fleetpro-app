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

  const itemStatus = (status: string) => (
    <select
      value={status}
      onChange={(e) => {}}
      className="px-2 py-1 border rounded text-sm"
    >
      <option value="ok">✓ Tốt</option>
      <option value="warning">⚠ Cảnh báo</option>
      <option value="bad">✗ Hỏng</option>
    </select>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <CheckSquare className="w-5 h-5" />
          Báo Cáo Nhận Xe
        </CardTitle>
        {vehiclePlate && (
          <p className="text-sm text-muted-foreground mt-2">Xe: {vehiclePlate}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Kiểm tra tình trạng xe</h3>

          <div>
            <label className="text-sm">Dầu động cơ</label>
            <select
              value={formData.engineOil}
              onChange={(e) =>
                setFormData({ ...formData, engineOil: e.target.value })
              }
              className="w-full px-2 py-1.5 border rounded mt-1"
            >
              <option value="ok">✓ Tốt</option>
              <option value="warning">⚠ Cảnh báo</option>
              <option value="bad">✗ Hỏng</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Nước làm mát</label>
            <select
              value={formData.coolant}
              onChange={(e) =>
                setFormData({ ...formData, coolant: e.target.value })
              }
              className="w-full px-2 py-1.5 border rounded mt-1"
            >
              <option value="ok">✓ Tốt</option>
              <option value="warning">⚠ Cảnh báo</option>
              <option value="bad">✗ Hỏng</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Lốp xe</label>
            <select
              value={formData.tires}
              onChange={(e) =>
                setFormData({ ...formData, tires: e.target.value })
              }
              className="w-full px-2 py-1.5 border rounded mt-1"
            >
              <option value="ok">✓ Tốt</option>
              <option value="warning">⚠ Cảnh báo</option>
              <option value="bad">✗ Hỏng</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Đèn chiếu sáng</label>
            <select
              value={formData.lights}
              onChange={(e) =>
                setFormData({ ...formData, lights: e.target.value })
              }
              className="w-full px-2 py-1.5 border rounded mt-1"
            >
              <option value="ok">✓ Tốt</option>
              <option value="warning">⚠ Cảnh báo</option>
              <option value="bad">✗ Hỏng</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Phanh</label>
            <select
              value={formData.brakes}
              onChange={(e) =>
                setFormData({ ...formData, brakes: e.target.value })
              }
              className="w-full px-2 py-1.5 border rounded mt-1"
            >
              <option value="ok">✓ Tốt</option>
              <option value="warning">⚠ Cảnh báo</option>
              <option value="bad">✗ Hỏng</option>
            </select>
          </div>
        </div>

        {/* Fuel & Odometer */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm">Xăng dầu (%)</label>
            <Input
              type="number"
              value={formData.fuel}
              onChange={(e) =>
                setFormData({ ...formData, fuel: e.target.value })
              }
              placeholder="100"
              max={100}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm">Công tơ (km)</label>
            <Input
              type="number"
              value={formData.odometer}
              onChange={(e) =>
                setFormData({ ...formData, odometer: e.target.value })
              }
              placeholder="0"
              className="mt-1"
            />
          </div>
        </div>

        {/* Issues */}
        <div>
          <label className="text-sm">Vấn đề / Ghi chú</label>
          <Textarea
            value={formData.issues}
            onChange={(e) =>
              setFormData({ ...formData, issues: e.target.value })
            }
            placeholder="Mô tả bất kỳ vấn đề nào..."
            className="mt-1"
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 mr-2" />
              Xác nhận nhận xe
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
