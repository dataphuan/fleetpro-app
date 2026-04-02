import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

interface LocationCheckInProps {
  tripId: string;
  tripName?: string;
  onSuccess?: (data: { photoUrl: string; location: string; notes: string }) => void;
}

export function LocationCheckIn({ tripId, tripName, onSuccess }: LocationCheckInProps) {
  const { toast } = useToast();
  const { user, tenantId } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number } | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }

      // Get GPS location
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocation(
          `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
        );
      });
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: '❌ Lỗi camera',
        description: 'Không thể truy cập camera. Vui lòng kiểm tra quyền.',
        variant: 'destructive',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setPhotoUrl(imageData);
        setIsCameraActive(false);

        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream)
            .getTracks()
            .forEach((track) => track.stop());
        }
      }
    }
  };

  const uploadPhoto = async () => {
    if (!photoUrl) return;

    setIsUploading(true);
    try {
      const blob = await fetch(photoUrl).then((r) => r.blob());
      const timestamp = Date.now();
      const storagePath = `drivers/${tenantId}/${user?.id}/checkins/${tripId}/${timestamp}.jpg`;
      const photoRef = ref(storage, storagePath);

      await uploadBytes(photoRef, blob);
      const url = await getDownloadURL(photoRef);

      toast({
        title: '✅ Check-in thành công',
        description: 'Ảnh và vị trí đã được lưu',
      });

      onSuccess?.({
        photoUrl: url,
        location,
        notes,
      });

      // Reset
      setPhotoUrl(null);
      setLocation('');
      setNotes('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: '❌ Lỗi upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <MapPin className="w-5 h-5" />
          Check-in Vị Trí
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera */}
        {isCameraActive ? (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-video bg-black rounded"
            />
            <canvas ref={canvasRef} className="hidden" width={640} height={480} />
            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1"
                variant="default"
              >
                <Camera className="w-4 h-4 mr-2" />
                Chụp ảnh
              </Button>
              <Button
                onClick={() => {
                  setIsCameraActive(false);
                  if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream)
                      .getTracks()
                      .forEach((track) => track.stop());
                  }
                }}
                variant="outline"
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : photoUrl ? (
          <div className="space-y-2">
            <img
              src={photoUrl}
              alt="Check-in"
              className="w-full aspect-video bg-gray-100 rounded object-cover"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setPhotoUrl(null)}
                variant="outline"
                className="flex-1"
              >
                Chụp lại
              </Button>
              <Button
                onClick={startCamera}
                variant="outline"
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startCamera} className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Mở Camera
          </Button>
        )}

        {/* Location & GPS */}
        {gpsData && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="font-medium text-blue-900">📍 Vị trí GPS</p>
            <p className="text-blue-700">
              {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium">Ghi chú</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mô tả tình trạng, vấn đề hoặc quan sát..."
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={uploadPhoto}
          disabled={!photoUrl || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang upload...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Xác nhận check-in
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
