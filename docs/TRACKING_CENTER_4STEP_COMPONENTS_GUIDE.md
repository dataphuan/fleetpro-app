# 4-Step TrackingCenter Workflow - Component Architecture

## Quick Start Implementation

### Option 1: Quick Integration (1-2 days)
Add 4-step panel to existing TrackingCenter page with inline forms

**Pros:**
- Fast to implement
- Minimal new files
- No routing changes

**Cons:**
- UI can get crowded
- Limited mobile experience

---

### Option 2: Full Workflow (3-5 days) ⭐ RECOMMENDED
Create separate step components + modal workflow

**Pros:**
- Clean UX/UI
- Mobile-first design
- Reusable components
- Scalable

**Cons:**
- More components to create
- Slightly larger bundle

**Components to Create:**
```
src/components/tracking/
├── VehicleInspectionStep.tsx        (Pre-Trip Form)
├── ActiveTrackingStep.tsx            (GPS + Media Capture)
├── MediaDocumentationStep.tsx        (Media Review/Edit)
├── PostTripReportStep.tsx            (Final Report)
├── TripWorkflowModal.tsx             (Main Container)
└── StepIndicator.tsx                 (Visual Progress)
```

---

## Component Creation Plan

### 1. VehicleInspectionStep.tsx (Pre-Trip)
```typescript
// File: src/components/tracking/VehicleInspectionStep.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';

export function VehicleInspectionStep({
  vehicleId,
  onComplete,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    engineOil: 'good',
    coolant: 'good',
    tires: 'good',
    lights: 'good',
    brakes: 'good',
    fuelLevel: 100,
    odometerReading: '',
    notes: '',
  });

  // ... full implementation in TRACKING_CENTER_4STEP_WORKFLOW_PROPOSAL.md
}
```

### 2. ActiveTrackingStep.tsx (During Trip)
```typescript
// File: src/components/tracking/ActiveTrackingStep.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, Pause, Play, Flag } from 'lucide-react';
import { TripReplayMap } from './TripReplayMap';
import { CameraCapture } from './CameraCapture';
import { VideoRecorder } from './VideoRecorder';
import { AudioRecorder } from './AudioRecorder';

export function ActiveTrackingStep({
  tripId,
  preTrip,
  onEndTrip,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Map className="w-5 h-5 text-orange-600" />
          B2: Theo Dõi Hoạt Động
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Display */}
        <TripReplayMap tripId={tripId} />

        {/* Elapsed Time */}
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Math.floor(elapsed / 3600)
                .toString()
                .padStart(2, '0')}
              :{(Math.floor(elapsed / 60) % 60)
                .toString()
                .padStart(2, '0')}
              :{(elapsed % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-600 mt-1">Thời gian hoạt động</p>
          </div>
        </div>

        {/* Media Capture Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => setShowCamera(true)} variant="outline" className="h-20">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">📸</span>
              <span className="text-xs">Ảnh</span>
            </div>
          </Button>

          <Button onClick={() => setShowVideo(true)} variant="outline" className="h-20">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🎥</span>
              <span className="text-xs">Video</span>
            </div>
          </Button>

          <Button onClick={() => setShowAudio(true)} variant="outline" className="h-20">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🎙️</span>
              <span className="text-xs">Ghi âm</span>
            </div>
          </Button>
        </div>

        {/* End Trip Button */}
        <div className="flex gap-2 pt-4">
          <Button onClick={() => setIsPaused(!isPaused)} variant="outline" className="flex-1">
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          </Button>
          <Button onClick={() => onEndTrip({ elapsed })} className="flex-1">
            <Flag className="w-4 h-4 mr-2" />
            Kết Thúc Chuyến
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. MediaDocumentationStep.tsx
```typescript
// File: src/components/tracking/MediaDocumentationStep.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';

export function MediaDocumentationStep({
  tripId,
  media = [],
  onComplete,
}) {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');

  // Filter media by type
  const photos = media.filter((m) => m.type === 'photo');
  const videos = media.filter((m) => m.type === 'video');
  const audio = media.filter((m) => m.type === 'audio');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <FileText className="w-5 h-5 text-green-600" />
          B3: Tài Liệu & Chứng Chỉ
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {photos.length + videos.length + audio.length} tệp tin đã ghi lại
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Media Grid */}
        <div className="grid grid-cols-2 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="border rounded p-2 cursor-pointer hover:bg-blue-50"
              onClick={() => setSelectedMediaId(item.id)}
            >
              <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                {item.type === 'photo' && <span className="text-3xl">📸</span>}
                {item.type === 'video' && <span className="text-3xl">🎥</span>}
                {item.type === 'audio' && <span className="text-3xl">🎙️</span>}
              </div>
              <p className="text-xs mt-1 truncate">{item.name || item.id}</p>
            </div>
          ))}
        </div>

        {/* Caption Editor */}
        {selectedMediaId && (
          <div className="border rounded p-3 bg-blue-50">
            <p className="text-sm font-medium mb-2">Thêm mô tả</p>
            <Input
              placeholder="Mô tả chi tiết về tệp tin này..."
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  // Save caption to media
                  setSelectedMediaId(null);
                  setMediaCaption('');
                }}
                className="flex-1 h-8 text-sm"
              >
                Lưu Mô Tả
              </Button>
            </div>
          </div>
        )}

        {/* Media Summary */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t">
          <div className="text-center p-2">
            <div className="text-2xl">📸</div>
            <p className="text-xs text-muted-foreground">{photos.length} ảnh</p>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl">🎥</div>
            <p className="text-xs text-muted-foreground">{videos.length} video</p>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl">🎙️</div>
            <p className="text-xs text-muted-foreground">{audio.length} ghi âm</p>
          </div>
        </div>

        {/* Continue Button */}
        <Button onClick={onComplete} className="w-full">
          ✓ Xác Nhận Tài Liệu
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 4. PostTripReportStep.tsx
```typescript
// File: src/components/tracking/PostTripReportStep.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Flag } from 'lucide-react';

export function PostTripReportStep({
  tripId,
  preTrip,
  activeTracking,
  onComplete,
}) {
  const [postTripData, setPostTripData] = useState({
    engineOil: 'good',
    coolant: 'good',
    tires: 'good',
    lights: 'good',
    brakes: 'good',
    fuelLevel: 50,
    odometerReading: '',
    damage: false,
    damageNotes: '',
    notes: '',
  });

  const fuelConsumed = preTrip?.fuelLevel - postTripData.fuelLevel;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Flag className="w-5 h-5 text-red-600" />
          B4: Báo Cáo Kết Thúc
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trip Summary */}
        <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2 text-sm">
          <h4 className="font-bold text-green-800">📊 Tóm Tắt Chuyến</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-600">Thời Gian</p>
              <p className="font-bold">{activeTracking?.duration || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Quãng Đường</p>
              <p className="font-bold">{activeTracking?.distance || 0} km</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Xăng Tiêu Thụ</p>
              <p className="font-bold">{fuelConsumed}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Tài Liệu</p>
              <p className="font-bold">{activeTracking?.mediaCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Final Vehicle Check */}
        <div className="border rounded p-3">
          <p className="font-bold text-sm mb-3">Kiểm tra xe lần cuối</p>
          <div className="grid grid-cols-2 gap-2">
            {['engineOil', 'coolant', 'tires', 'lights', 'brakes'].map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={postTripData[item as keyof typeof postTripData] === 'good'}
                  onChange={() => {
                    setPostTripData({
                      ...postTripData,
                      [item]: postTripData[item as keyof typeof postTripData] === 'good' ? 'bad' : 'good',
                    });
                  }}
                />
                <span>
                  {item === 'engineOil' && 'Dầu'}
                  {item === 'coolant' && 'Nước'}
                  {item === 'tires' && 'Lốp'}
                  {item === 'lights' && 'Đèn'}
                  {item === 'brakes' && 'Phanh'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Damage Report */}
        <div className="border rounded p-3">
          <label className="flex items-center gap-2 mb-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={postTripData.damage}
              onChange={() =>
                setPostTripData({ ...postTripData, damage: !postTripData.damage })
              }
            />
            Có Thiệt Hại / Hư Hỏng
          </label>
          {postTripData.damage && (
            <Textarea
              value={postTripData.damageNotes}
              onChange={(e) =>
                setPostTripData({ ...postTripData, damageNotes: e.target.value })
              }
              placeholder="Mô tả chi tiết thiệt hại..."
              className="mt-2 min-h-20"
            />
          )}
        </div>

        {/* Final Odometer */}
        <div>
          <label className="text-sm font-medium">Công Tơ Kết Thúc (km)</label>
          <Input
            type="number"
            value={postTripData.odometerReading}
            onChange={(e) =>
              setPostTripData({ ...postTripData, odometerReading: e.target.value })
            }
            placeholder="120585"
            className="mt-1"
          />
        </div>

        {/* Final Notes */}
        <div>
          <label className="text-sm font-medium">Ghi Chú Cuối Cùng</label>
          <Textarea
            value={postTripData.notes}
            onChange={(e) =>
              setPostTripData({ ...postTripData, notes: e.target.value })
            }
            placeholder="Bất kỳ ghi chú bổ sung nào..."
            className="mt-1 min-h-20"
          />
        </div>

        {/* Submit Button */}
        <Button onClick={() => onComplete(postTripData)} className="w-full h-12 text-base">
          ✅ HOÀN THÀNH CHUYẾN
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Integration into TrackingCenter

### Add this modal container to TrackingCenter.tsx:

```typescript
// In TrackingCenter.tsx

import { useState } from 'react';
import { VehicleInspectionStep } from '@/components/tracking/VehicleInspectionStep';
import { ActiveTrackingStep } from '@/components/tracking/ActiveTrackingStep';
import { MediaDocumentationStep } from '@/components/tracking/MediaDocumentationStep';
import { PostTripReportStep } from '@/components/tracking/PostTripReportStep';

export default function TrackingCenter() {
  // ... existing code ...

  const [workflowState, setWorkflowState] = useState({
    step: 0, // 0=closed, 1,2,3,4=steps
    preTrip: null,
    activeTracking: null,
    media: [],
  });

  const startWorkflow = () => setWorkflowState({ ...workflowState, step: 1 });

  return (
    <div className="p-4 space-y-6">
      {/* Existing content */}

      {/* 4-Step Workflow Button */}
      {workflowState.step === 0 && (
        <Button onClick={startWorkflow} className="w-full h-12">
          📋 Bắt Đầu Quy Trình 4 Bước (Pre-Trip → Tracking → Media → Post-Trip)
        </Button>
      )}

      {/* 4-Step Workflow Modal */}
      {workflowState.step > 0 && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end">
          <Card className="w-full rounded-t-lg max-h-[90vh] overflow-auto">
            {/* Step Indicator */}
            <div className="flex gap-1 p-4 bg-gradient-to-r from-blue-500 to-blue-600 sticky top-0 z-10">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className={`flex-1 py-2 rounded text-center text-sm font-bold text-white transition-all ${
                    workflowState.step === num
                      ? 'bg-white text-blue-600 shadow-lg'
                      : workflowState.step > num
                      ? 'opacity-70'
                      : 'opacity-40'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="p-4">
              {workflowState.step === 1 && (
                <VehicleInspectionStep
                  vehicleId={selectedTripId}
                  onComplete={(data) =>
                    setWorkflowState({ ...workflowState, step: 2, preTrip: data })
                  }
                  onCancel={() => setWorkflowState({ ...workflowState, step: 0 })}
                />
              )}

              {workflowState.step === 2 && (
                <ActiveTrackingStep
                  tripId={selectedTripId}
                  preTrip={workflowState.preTrip}
                  onEndTrip={(data) =>
                    setWorkflowState({ ...workflowState, step: 3, activeTracking: data })
                  }
                />
              )}

              {workflowState.step === 3 && (
                <MediaDocumentationStep
                  tripId={selectedTripId}
                  media={workflowState.media}
                  onComplete={() =>
                    setWorkflowState({ ...workflowState, step: 4 })
                  }
                />
              )}

              {workflowState.step === 4 && (
                <PostTripReportStep
                  tripId={selectedTripId}
                  preTrip={workflowState.preTrip}
                  activeTracking={workflowState.activeTracking}
                  onComplete={(data) => {
                    // Save complete trip data
                    console.log('Trip completed:', {
                      ...workflowState,
                      postTrip: data,
                    });
                    setWorkflowState({ ...workflowState, step: 0 });
                    toast({ title: '✅ Chuyến hoàn thành' });
                  }}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Step 1: Pre-trip inspection form saves correctly
- [ ] Step 2: GPS tracking displays on map
- [ ] Step 2: Media capture buttons work (camera/video/audio)
- [ ] Step 3: Captured media displays in grid
- [ ] Step 3: Captions can be added to media
- [ ] Step 4: Final vehicle check works
- [ ] Step 4: Damage report section appears/disappears
- [ ] Step 4: Complete report saves to Firestore
- [ ] Can close workflow at any point
- [ ] Can resume workflow from last step
- [ ] Mobile responsive on all screen sizes
- [ ] Performance: no lag during step transitions

---

## File Structure After Implementation

```
src/components/tracking/
├── ActiveTrackingStep.tsx              (NEW)
├── CameraCapture.tsx                  (EXISTS - no change)
├── VideoRecorder.tsx                  (EXISTS - no change)
├── AudioRecorder.tsx                  (EXISTS - no change)
├── MediaDocumentationStep.tsx          (NEW)
├── PostTripReportStep.tsx              (NEW)
├── TrackingCenter.tsx                 (EXISTS - enhanced)
├── TrackingPlaceholderFleetMap.tsx    (EXISTS - no change)
└── VehicleInspectionStep.tsx           (NEW)
```

---

**Status:** Ready for Implementation
**Estimated Time:** 3-5 days
**Complexity:** Medium
**Impact:** High - Complete trip workflow transformation

