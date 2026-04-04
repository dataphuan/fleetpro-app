import { useRef, useState } from 'react';
import { Video, Square, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoRecorderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function VideoRecorder({ onCapture, onClose }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
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
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (error: any) {
      console.error('Camera/Microphone access error:', error);
      if (error.name === 'NotAllowedError') {
        setError('❌ Quyền truy cập bị từ chối.\n\nCách khắc phục:\n1. Mở cài đặt trình duyệt\n2. Cho phép quyền camera & micro\n3. Làm mới trang và thử lại');
      } else if (error.name === 'NotFoundError') {
        setError('❌ Không tìm thấy camera hoặc micro.\n\nKiểm tra:\n• Thiết bị có camera & micro?\n• Có ứng dụng khác dùng camera?');
      } else if (error.name === 'NotReadableError') {
        setError('❌ Không thể truy cập camera/micro.\n\nThiết bị có thể đang được sử dụng bởi ứng dụng khác.');
      } else {
        setError(`❌ Lỗi: ${error.message || 'Không thể mở camera. Vui lòng thử lại.'}`);
      }
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    chunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;

    // Use vp9 if available, fallback to vp8
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 300) {
            // Max 5 minutes
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('MediaRecorder error:', error);
      setError(`❌ Lỗi quay video: ${error.message || 'Không thể bắt đầu ghi video. Vui lòng thử lại.'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  };

  const confirmCapture = () => {
    if (recordedVideoUrl) {
      fetch(recordedVideoUrl)
        .then((res) => res.blob())
        .then((blob) => {
          onCapture(blob);
          stopCamera();
          onClose();
        })
        .catch((error) => {
          console.error('Error processing video:', error);
          setError('❌ Không thể xử lý video. Vui lòng thử lại hoặc quay lại video khác.');
        });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isCameraReady) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full border shadow-lg">
          <h3 className="font-semibold mb-3">Quay video báo cáo</h3>
          <p className="text-sm text-slate-700 mb-4">
            Cấp quyền truy cập camera và micro để quay video báo cáo.
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

  if (recordedVideoUrl) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg">
          <div className="flex justify-between items-center p-4 border-b bg-slate-50">
            <h3 className="font-semibold">Xem trước video</h3>
            <button
              onClick={() => {
                setRecordedVideoUrl('');
                if (error) setError('');
              }}
              className="p-1 hover:bg-slate-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <video src={recordedVideoUrl} controls className="w-full bg-black flex-1" />
          <div className="flex gap-2 p-4 border-t bg-slate-50">
            <Button
              variant="outline"
              onClick={() => setRecordedVideoUrl('')}
              className="flex-1"
            >
              QUAY LẠI
            </Button>
            <Button onClick={confirmCapture} className="flex-1">
              <Play className="mr-2 h-4 w-4" /> GỬI VIDEO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg">
        <div className="flex justify-between items-center p-4 border-b bg-red-50">
          <h3 className="font-semibold">Quay video báo cáo</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black relative overflow-hidden min-h-[300px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {isRecording && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {formatTime(recordingTime)}
            </div>
          )}
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
          {!isRecording ? (
            <Button onClick={startRecording} className="flex-1 bg-red-600 hover:bg-red-700">
              <Video className="mr-2 h-4 w-4" /> BẮT ĐẦU QUAY
            </Button>
          ) : (
            <Button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-700">
              <Square className="mr-2 h-4 w-4" /> DỪNG ({formatTime(recordingTime)})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
