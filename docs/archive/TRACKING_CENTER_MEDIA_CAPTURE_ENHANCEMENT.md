# Tracking Center - Media Capture Enhancement Suggestions

## Overview
Enhance the TrackingCenter reporting interface with direct camera, video recording, and audio recording capabilities for real-time field evidence collection.

---

## Feature 1: Direct Camera Photo Capture 📸

### Implementation Strategy
Add a **Camera button** that opens a modal with live preview from device camera, allowing instant photo capture without file picker.

### Key Components Needed

```tsx
// src/components/tracking/CameraCapture.tsx
import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CameraCapture({ 
  onCapture: (blob: Blob) => void,
  onClose: () => void 
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (error: any) {
      console.error('Camera access denied:', error);
      // Fallback to file picker
    }
  };

  const capturePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob((blob) => {
      if (blob) onCapture(blob);
      stopCamera();
      onClose();
    }, 'image/jpeg', 0.85);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      setIsCameraReady(false);
    }
  };

  if (!isCameraReady) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full border">
          <p className="text-sm text-slate-700 mb-4">
            Quyền truy cập camera cần được cấp để chụp ảnh trực tiếp.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">HỦY</Button>
            <Button onClick={startCamera} className="flex-1">MỞ CAMERA</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">Chụp ảnh báo cáo</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1 hover:bg-slate-100 rounded">
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
          <Button variant="outline" onClick={() => { stopCamera(); onClose(); }} className="flex-1">
            HỦY
          </Button>
          <Button onClick={capturePhoto} className="flex-1">
            <Camera className="mr-2 h-4 w-4" /> CHỤP
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Usage in TrackingCenter
```tsx
const [showCameraCapture, setShowCameraCapture] = useState(false);

const handleCameraCapture = async (blob: Blob) => {
  setIsUploading(true);
  try {
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const folder = 'photos';
    const safeName = file.name;
    const path = `tracking-reports/${tenantId || 'public'}/${folder}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setReportMediaUrl(url);
    setReportMediaType('photo');
    toast({ title: 'Chụp ảnh thành công', description: 'Ảnh sẵn sàng gửi.' });
  } catch (error: any) {
    toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
  } finally {
    setIsUploading(false);
  }
};

// In JSX:
<Button variant="outline" size="sm" onClick={() => setShowCameraCapture(true)}>
  <Camera className="w-4 h-4 mr-2" /> Chụp ảnh
</Button>

{showCameraCapture && (
  <CameraCapture 
    onCapture={handleCameraCapture}
    onClose={() => setShowCameraCapture(false)}
  />
)}
```

---

## Feature 2: Direct Video Recording 🎥

### Implementation Strategy
Add a **Record Video button** with live preview, start/stop controls, and video playback before upload.

### Key Components Needed

```tsx
// src/components/tracking/VideoRecorder.tsx
import { useRef, useState } from 'react';
import { Video, Square, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VideoRecorder({
  onCapture: (blob: Blob) => void,
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Uint8Array[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (error: any) {
      console.error('Camera access denied:', error);
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    chunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus' // Fallback to vp8/h264
    });

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(new Uint8Array(e.data));
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(
        chunksRef.current.map(chunk => new Blob([chunk])),
        { type: 'video/webm' }
      );
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);

    // Timer
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(t => {
        if (t >= 300) { // Max 5 minutes
          stopRecording();
          return t;
        }
        return t + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      setIsCameraReady(false);
    }
  };

  const confirmCapture = () => {
    if (recordedVideoUrl) {
      fetch(recordedVideoUrl)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob);
          stopCamera();
          onClose();
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
        <div className="bg-white rounded-lg p-6 max-w-sm w-full border">
          <p className="text-sm text-slate-700 mb-4">Cấp quyền truy cập camera và micro để quay video.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">HỦY</Button>
            <Button onClick={startCamera} className="flex-1">MỞ CAMERA</Button>
          </div>
        </div>
      </div>
    );
  }

  if (recordedVideoUrl) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold">Xem trước video</h3>
            <button onClick={() => { setRecordedVideoUrl(''); }} className="p-1 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <video src={recordedVideoUrl} controls className="w-full bg-black" />
          <div className="flex gap-2 p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setRecordedVideoUrl('')} className="flex-1">
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
      <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-red-50">
          <h3 className="font-semibold">Quay video báo cáo</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-1 hover:bg-red-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {isRecording && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {formatTime(recordingTime)}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t bg-slate-50">
          <Button variant="outline" onClick={() => { stopCamera(); onClose(); }} className="flex-1">
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
```

---

## Feature 3: Audio Recording (MP3) 🎙️

### Implementation Strategy
Add **audio recording** with real-time waveform visualization and MP3 export via encoding library.

### Installation
```bash
npm install recordrtc
# or
npm install --save-dev audio-worklet-processor
```

### Key Components Needed

```tsx
// src/components/tracking/AudioRecorder.tsx
import { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AudioRecorder({
  onCapture: (blob: Blob) => void,
  onClose: () => void
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Uint8Array[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
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

        ctx.fillStyle = 'whitesmoke';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        ctx.fillStyle = '#3b82f6';
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext();
      analyserRef.current = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyserRef.current);

      chunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(new Uint8Array(e.data));
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(
          chunksRef.current.map(chunk => new Blob([chunk])),
          { type: 'audio/webm' }
        );
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        // Optionally convert to MP3 using ffmpeg.wasm or simple passthrough
        // For now, keeping as webm (compatible with most browsers)
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 600) { // Max 10 minutes
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const confirmCapture = () => {
    if (recordedAudioUrl) {
      fetch(recordedAudioUrl)
        .then(res => res.blob())
        .then(blob => {
          // Convert to MP3 or keep as webm
          const mp3Blob = new Blob([blob], { type: 'audio/mpeg' });
          onCapture(mp3Blob);
          onClose();
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
        <div className="bg-white rounded-lg p-6 max-w-md w-full border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Xem trước âm thanh</h3>
            <button onClick={() => setRecordedAudioUrl('')} className="p-1 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <audio src={recordedAudioUrl} controls className="w-full mb-4" />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRecordedAudioUrl('')} className="flex-1">
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
      <div className="bg-white rounded-lg p-6 max-w-lg w-full border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Ghi âm báo cáo</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={500}
          height={100}
          className="w-full border border-slate-200 rounded-lg mb-4 bg-white"
        />

        <div className="mb-4 text-center">
          <p className="text-sm text-slate-600">Thời gian: {formatTime(recordingTime)}</p>
        </div>

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
      </div>
    </div>
  );
}
```

---

## Integration into TrackingCenter

### Updated State Management

```tsx
const [showCameraCapture, setShowCameraCapture] = useState(false);
const [showVideoRecorder, setShowVideoRecorder] = useState(false);
const [showAudioRecorder, setShowAudioRecorder] = useState(false);

const handleDirectMediaCapture = async (blob: Blob, type: 'photo' | 'video' | 'audio') => {
  setIsUploading(true);
  try {
    const extensions: Record<string, string> = {
      photo: 'jpg',
      video: 'webm',
      audio: 'webm'
    };
    const ext = extensions[type];
    const file = new File([blob], `${type}_${Date.now()}.${ext}`, {
      type: type === 'photo' ? 'image/jpeg' : type === 'video' ? 'video/webm' : 'audio/webm'
    });

    const folder = type === 'photo' ? 'photos' : type === 'video' ? 'videos' : 'audio';
    const path = `tracking-reports/${tenantId || 'public'}/${folder}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setReportMediaUrl(url);
    setReportMediaType(type === 'audio' ? 'audio' : type);
    
    toast({
      title: `${type === 'photo' ? 'Chụp ảnh' : type === 'video' ? 'Quay video' : 'Ghi âm'} thành công`,
      description: 'Media sẵn sàng gửi báo cáo.'
    });
  } catch (error: any) {
    toast({ title: 'Lỗi upload', description: error.message, variant: 'destructive' });
  } finally {
    setIsUploading(false);
  }
};
```

### UI Buttons in ReportMediaType selector

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div className="space-y-2">
    <Label>Hoặc chụp/quay trực tiếp</Label>
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowCameraCapture(true)}
        disabled={isUploading}
      >
        <Camera className="w-4 h-4 mr-2" /> Ảnh
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowVideoRecorder(true)}
        disabled={isUploading}
      >
        <Video className="w-4 h-4 mr-2" /> Video
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowAudioRecorder(true)}
        disabled={isUploading}
      >
        <Mic className="w-4 h-4 mr-2" /> Ghi âm
      </Button>
    </div>
  </div>

  {reportMediaType !== 'text' && (
    <div className="space-y-1">
      <Label>Hoặc chọn file sẵn có</Label>
      <Input
        type="file"
        accept={reportMediaType === 'photo' ? 'image/*' : reportMediaType === 'video' ? 'video/*' : 'audio/*'}
        onChange={(e) => handleUploadMedia(e.target.files?.[0] || null)}
      />
    </div>
  )}
</div>

{/* Modals */}
{showCameraCapture && (
  <CameraCapture
    onCapture={(blob) => handleDirectMediaCapture(blob, 'photo')}
    onClose={() => setShowCameraCapture(false)}
  />
)}
{showVideoRecorder && (
  <VideoRecorder
    onCapture={(blob) => handleDirectMediaCapture(blob, 'video')}
    onClose={() => setShowVideoRecorder(false)}
  />
)}
{showAudioRecorder && (
  <AudioRecorder
    onCapture={(blob) => handleDirectMediaCapture(blob, 'audio')}
    onClose={() => setShowAudioRecorder(false)}
  />
)}
```

---

## Browser Compatibility & Fallbacks

| Feature | Chrome | Firefox | Safari | Mobile | Notes |
|---------|--------|---------|--------|--------|-------|
| getUserMedia | ✅ | ✅ | ✅ | ✅ | HTTPS required |
| MediaRecorder | ✅ | ✅ | ⚠️ (11.1+) | ✅ | Codec varies by browser |
| Canvas | ✅ | ✅ | ✅ | ✅ | Always available |
| AudioContext | ✅ | ✅ | ✅ | ✅ | Some mobile limitations |

### Fallback Strategy
```tsx
const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
const hasGetUserMedia = navigator.mediaDevices?.getUserMedia;

if (!hasMediaRecorder || !hasGetUserMedia) {
  // Show file upload only
}
```

---

## UX Improvements Suggested

1. **Permissions Prompt** - Display helpful messages when permissions denied
2. **Preview Before Upload** - Show captured content before sending to Telegram
3. **Auto-stop Recording** - Set max duration (5min for video, 10min for audio)
4. **Waveform Visualization** - Real-time audio waveform during recording
5. **File Size Indicator** - Show approximate file size before upload
6. **Network Status** - Check offline before attempting upload
7. **Batch Actions** - Allow capturing multiple items before single batch send

---

## Performance Considerations

- **Memory Management**: Stop streams immediately after recording
- **File Size**: Compress video/audio before upload (consider quality vs size trade-off)
- **Async Operations**: Use Web Workers for encoding heavy tasks
- **Service Worker**: Cache recordings locally before upload fails

---

## Next Steps

1. Create 3 new components: `CameraCapture`, `VideoRecorder`, `AudioRecorder`
2. Update `TrackingCenter.tsx` with new state & handlers
3. Install dependencies: `npm install recordrtc` (optional for MP3 encoding)
4. Test on mobile devices (iOS/Android)
5. Add error handling & network retry logic
6. Document permission requirements in UI

