# TrackingCenter Integration Guide

## Step 1: Import New Components

Add these imports to `src/pages/TrackingCenter.tsx` at the top of the file:

```tsx
import { CameraCapture } from '@/components/tracking/CameraCapture';
import { VideoRecorder } from '@/components/tracking/VideoRecorder';
import { AudioRecorder } from '@/components/tracking/AudioRecorder';
import { Mic } from 'lucide-react'; // Add to existing Mic import
```

---

## Step 2: Add State Variables

Add these state management lines (around line 75, after existing useState hooks):

```tsx
const [showCameraCapture, setShowCameraCapture] = useState(false);
const [showVideoRecorder, setShowVideoRecorder] = useState(false);
const [showAudioRecorder, setShowAudioRecorder] = useState(false);
```

---

## Step 3: Create New Handler Function

Add this function after the existing `handleUploadMedia` function (around line 200):

```tsx
const handleDirectMediaCapture = async (blob: Blob, mediaType: 'photo' | 'video' | 'audio') => {
  setIsUploading(true);
  try {
    // Determine file extension based on media type
    const extensions: Record<string, { ext: string; mimeType: string }> = {
      photo: { ext: 'jpg', mimeType: 'image/jpeg' },
      video: { ext: 'webm', mimeType: 'video/webm' },
      audio: { ext: 'webm', mimeType: 'audio/webm' },
    };

    const { ext, mimeType } = extensions[mediaType];
    const fileName = `${mediaType}_${Date.now()}.${ext}`;
    const file = new File([blob], fileName, { type: mimeType });

    // Upload to Firebase
    const folder = mediaType === 'photo' ? 'photos' : mediaType === 'video' ? 'videos' : 'audio';
    const path = `tracking-reports/${tenantId || 'public'}/${folder}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    setReportMediaUrl(url);
    setReportMediaType(mediaType);

    const typeLabel = mediaType === 'photo' ? 'ảnh' : mediaType === 'video' ? 'video' : 'âm thanh';
    toast({
      title: `Capture ${typeLabel} thành công`,
      description: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} sẵn sàng gửi báo cáo.`,
    });
  } catch (error: any) {
    toast({
      title: 'Lỗi upload',
      description: error?.message || 'Không thể upload media lên Firebase Storage.',
      variant: 'destructive',
    });
  } finally {
    setIsUploading(false);
  }
};
```

---

## Step 4: Update Media Type Selector Section

Find the section that says:

```tsx
{reportMediaType !== 'text' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label>Upload file media</Label>
      <Input
        type="file"
        accept={reportMediaType === 'photo' ? 'image/*' : 'video/*'}
        onChange={(e) => handleUploadMedia(e.target.files?.[0] || null)}
      />
    </div>
    <div className="space-y-1">
      <Label>Hoặc nhập URL media</Label>
      <Input
        value={reportMediaUrl}
        onChange={(e) => setReportMediaUrl(e.target.value)}
        placeholder="https://..."
      />
    </div>
  </div>
) : null}
```

Replace it with:

```tsx
{reportMediaType !== 'text' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label>Chọn file media hoặc nhập URL</Label>
      <div className="flex gap-2">
        <Input
          type="file"
          accept={
            reportMediaType === 'photo'
              ? 'image/*'
              : reportMediaType === 'video'
                ? 'video/*'
                : 'audio/*'
          }
          onChange={(e) => handleUploadMedia(e.target.files?.[0] || null)}
          className="flex-1"
        />
      </div>
    </div>
    <div className="space-y-1">
      <Label>Hoặc nhập URL media</Label>
      <Input
        value={reportMediaUrl}
        onChange={(e) => setReportMediaUrl(e.target.value)}
        placeholder="https://..."
      />
    </div>
  </div>
) : null}
```

---

## Step 5: Add Media Capture Buttons Section

Find the section with `<Button onClick={handleSendTelegramReport}` and add this block BEFORE those buttons (around line 385):

```tsx
<div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b">
  <Label className="text-xs font-semibold">Chụp/Quay/Ghi trực tiếp:</Label>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => {
      setReportMediaType('photo');
      setShowCameraCapture(true);
    }}
    disabled={isUploading || isSending}
    className="gap-2"
  >
    <Camera className="w-4 h-4" /> Ảnh
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => {
      setReportMediaType('video');
      setShowVideoRecorder(true);
    }}
    disabled={isUploading || isSending}
    className="gap-2"
  >
    <Video className="w-4 h-4" /> Video
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => {
      setReportMediaType('audio');
      setShowAudioRecorder(true);
    }}
    disabled={isUploading || isSending}
    className="gap-2"
  >
    <Mic className="w-4 h-4" /> Ghi âm
  </Button>
</div>
```

---

## Step 6: Add Modal Components at End

Add these lines at the END of the JSX (before the final closing `</div>`):

```tsx
      {/* Media Capture Modals */}
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
    </div>
  );
}
```

---

## Step 7: Verify Imports

Make sure these imports exist at the top of `TrackingCenter.tsx`:

```tsx
import { Camera, Video, Mic } from 'lucide-react';
```

If these icons aren't already imported, they should be added to the existing import line.

---

## Testing Checklist

- [ ] Build project: `npm run build`
- [ ] Navigate to http://localhost:5173/tracking-center
- [ ] Test "Ảnh" button → Check camera permission prompt
- [ ] Test "Video" button → Check camera + microphone permission prompt
- [ ] Test "Ghi âm" button → Check microphone permission prompt
- [ ] Capture media and verify it uploads to Firebase
- [ ] Verify media URL appears in the form
- [ ] Send to Telegram with captured media
- [ ] Test fallback file upload (traditional file picker)
- [ ] Test on mobile devices (iOS/Android)

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| Camera ✅ | ✅ | ✅ | ⚠️ (14.1+) | ✅ |
| Video Recording | ✅ | ✅ | ⚠️ (14.1+) | ✅ |
| Audio Recording | ✅ | ✅ | ⚠️ (14.1+) | ✅ |
| Waveform Viz | ✅ | ✅ | ✅ | ✅ |

**Note**: All browsers require HTTPS (except localhost for development)

---

## Error Handling

The components include error messages for:
- Camera/Microphone permission denied
- Device not found
- Browser not supporting getUserMedia
- Recording failures

These will display user-friendly messages in Vietnamese.

---

## Performance Notes

- Max video duration: 5 minutes (auto-stops)
- Max audio duration: 10 minutes (auto-stops)
- Video format: WebM (vp9/vp8 + opus)
- Audio format: WebM (opus) - compatible with most browsers
- Auto cleanup of streams when modal closes
- Canvas animation optimization for waveform visualization

---

## Optional: MP3 Conversion

If you need MP3 format instead of WebM:

```bash
npm install lamejs
```

Then in `AudioRecorder.tsx`, modify the `confirmCapture` function to convert:

```tsx
import lamejs from 'lamejs';

const convertToMP3 = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert to MP3 using lamejs
  const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
  const samples = audioBuffer.getChannelData(0);
  const mp3Data: number[] = [];
  
  for (let i = 0; i < samples.length; i += 4096) {
    const chunk = samples.slice(i, i + 4096);
    const mp3buf = mp3Encoder.encodeBuffer(chunk);
    mp3Data.push(...mp3buf);
  }
  
  const mp3buf = mp3Encoder.flush();
  mp3Data.push(...mp3buf);
  
  return new Blob([new Uint8Array(mp3Data)], { type: 'audio/mpeg' });
};
```

However, WebM with Opus is recommended as it's more efficient and widely supported.

