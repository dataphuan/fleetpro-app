import { useRef, useState, useEffect } from 'react';
import { Mic, Square, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function AudioRecorder({ onCapture, onClose }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRecording) {
      const canvas = canvasRef.current;
      if (!canvas || !analyserRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw waveform bars
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        ctx.fillStyle = '#3b82f6';
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < dataArray.length; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }

        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio context for visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const microphone = audioContextRef.current.createMediaStreamSource(stream);
      microphone.connect(analyserRef.current);

      chunksRef.current = [];

      // Use opus codec if available, fallback to default
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 600) {
            // Max 10 minutes
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Microphone access error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Quyền truy cập micro bị từ chối. Vui lòng kiểm tra cài đặt.');
      } else if (error.name === 'NotFoundError') {
        setError('Không tìm thấy thiết bị micro.');
      } else {
        setError(error.message || 'Không thể truy cập micro.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // Stop audio context and stream
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const confirmCapture = () => {
    if (recordedAudioUrl) {
      fetch(recordedAudioUrl)
        .then((res) => res.blob())
        .then((blob) => {
          // Keep original format (webm with opus)
          onCapture(blob);
          onClose();
        })
        .catch((error) => {
          console.error('Error processing audio:', error);
          setError('Không thể xử lý âm thanh. Vui lòng thử lại.');
        });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedAudioUrl) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full border shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Xem trước âm thanh</h3>
            <button
              onClick={() => setRecordedAudioUrl('')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 bg-slate-100 rounded-lg p-2">
            <audio src={recordedAudioUrl} controls className="w-full" />
          </div>

          <div className="text-sm text-slate-600 mb-4 text-center">
            Thời gian: {formatTime(recordingTime)}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRecordedAudioUrl('')}
              className="flex-1"
            >
              QUAY LẠI
            </Button>
            <Button onClick={confirmCapture} className="flex-1">
              <Download className="mr-2 h-4 w-4" /> GỬI ÂM THANH
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full border shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Ghi âm báo cáo</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Waveform visualization */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={500}
            height={100}
            className="w-full bg-white rounded"
          />
        </div>

        {/* Time display */}
        <div className="mb-4 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {formatTime(recordingTime)}
          </p>
          <p className="text-xs text-slate-500">Tối đa 10 phút</p>
        </div>

        {/* Error message */}
        {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}

        {/* Recording status */}
        {isRecording && (
          <div className="mb-4 flex items-center justify-center gap-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Đang ghi âm...</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            HỦY
          </Button>
          {!isRecording ? (
            <Button onClick={startRecording} className="flex-1 bg-red-600 hover:bg-red-700">
              <Mic className="mr-2 h-4 w-4" /> BẮT ĐẦU GHI
            </Button>
          ) : (
            <Button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-700">
              <Square className="mr-2 h-4 w-4" /> DỪNG ({formatTime(recordingTime)})
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Được lưu dưới dạng tập tin âm thanh định dạng WebM (tương thích với mọi trình duyệt)
        </p>
      </div>
    </div>
  );
}
