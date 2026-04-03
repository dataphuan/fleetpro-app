import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Quyền truy cập camera bị từ chối. Vui lòng kiểm tra cài đặt.');
      } else if (error.name === 'NotFoundError') {
        setError('Không tìm thấy thiết bị camera.');
      } else {
        setError(error.message || 'Không thể mở camera.');
      }
    }
  };

  const capturePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          stopCamera();
          onClose();
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  };

  if (!isCameraReady) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full border shadow-lg">
          <h3 className="font-semibold mb-3">Chụp ảnh báo cáo</h3>
          <p className="text-sm text-slate-700 mb-4">
            Cấp quyền truy cập camera để chụp ảnh trực tiếp từ thiết bị của bạn.
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              HỦY
            </Button>
            <Button onClick={startCamera} className="flex-1">
              MỞ CAMERA
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg">
        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
          <h3 className="font-semibold">Chụp ảnh báo cáo</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 hover:bg-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2 p-4 border-t bg-slate-50">
          <Button
            variant="outline"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex-1"
          >
            HỦY
          </Button>
          <Button onClick={capturePhoto} className="flex-1">
            <Camera className="mr-2 h-4 w-4" /> CHỤP ÀNH
          </Button>
        </div>
      </div>
    </div>
  );
}
