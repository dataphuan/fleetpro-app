# 📋 TrackingCenter 4-Step Vehicle Inspection Workflow

## Current State Analysis

### Existing 4-Step Process (Driver Menu)
The `/driver/menu` has a well-structured 4-step workflow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NHẬN XE (Pre-Trip Inspection) - "Báo Cáo Nhận Xe"       │
│    ✓ Engine oil (Dầu động cơ)                              │
│    ✓ Coolant (Nước làm mát)                                │
│    ✓ Tires (Lốp xe)                                        │
│    ✓ Lights (Đèn chiếu sáng)                               │
│    ✓ Brakes (Phanh)                                        │
│    ✓ Fuel % (Xăng dầu)                                     │
│    ✓ Odometer km (Công tơ)                                 │
│    ✓ Issues/Notes (Vấn đề/Ghi chú)                        │
├─────────────────────────────────────────────────────────────┤
│ 2. CHECK-IN (Location Check-in) - "Check-in Vị Trí"       │
│    ✓ GPS location capture                                  │
│    ✓ Timestamp confirmation                                │
│    ✓ Location history tracking                             │
├─────────────────────────────────────────────────────────────┤
│ 3. DOCUMENTS (Document Upload) - "Gửi Tài Liệu"           │
│    ✓ Bill of lading upload                                 │
│    ✓ Proof of delivery                                     │
│    ✓ Supporting documents                                  │
├─────────────────────────────────────────────────────────────┤
│ 4. KẾT THÚC (Post-Trip Report) - "Báo Cáo Kết Thúc"       │
│    ✓ Final vehicle condition                               │
│    ✓ Damage assessment                                     │
│    ✓ Trip summary & notes                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Proposed TrackingCenter Integration

### Enhanced 4-Step Workflow for Tracking Center

```
┌──────────────────────────────────────────────────────────────┐
│ TRACKING CENTER - 4-STEP VEHICLE INSPECTION WORKFLOW         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ STEP 1: PRE-TRIP INSPECTION                                  │
│ ========================================                      │
│ • Select vehicle from fleet                                  │
│ • Vehicle checklist (oil, coolant, tires, lights, brakes)   │
│ • Record fuel level & odometer reading                       │
│ • Capture photo evidence (optional)                          │
│ • Add pre-trip notes/issues                                  │
│ • ✓ SAVE → Unlock Step 2                                    │
│                                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ STEP 2: ACTIVE TRACKING                                  │ │
│ │ ========================================                  │ │
│ │ • Live GPS tracking on map                               │ │
│ │ • Real-time speed & location display                     │ │
│ │ • Trip duration counter                                  │ │
│ │ • Media capture available:                               │ │
│ │   - 📸 Camera (incident photos)                          │ │
│ │   - 🎥 Video (event recording)                           │ │
│ │   - 🎙️ Audio (voice notes)                              │ │
│ │ • Live incident reporting                                │ │
│ │ • ✓ END TRIP → Move to Step 3                            │ │
│ │                                                           │ │
│ │ ┌───────────────────────────────────────────────────────┐ │ │
│ │ │ STEP 3: MEDIA DOCUMENTATION                           │ │ │
│ │ │ ========================================               │ │ │
│ │ │ • Review captured photos/videos                       │ │ │
│ │ │ • Add captions & incident descriptions                │ │ │
│ │ │ • Link media to specific locations                    │ │ │
│ │ │ • Upload additional documents                         │ │ │
│ │ │ • ✓ CONFIRM → Move to Step 4                          │ │ │
│ │ │                                                        │ │ │
│ │ │  ┌─────────────────────────────────────────────────┐  │ │ │
│ │ │  │ STEP 4: POST-TRIP REPORT                        │  │ │ │
│ │ │  │ ========================================          │  │ │ │
│ │ │  │ • Final vehicle condition assessment             │  │ │ │
│ │ │  │ • Damage documentation (if any)                  │  │ │ │
│ │ │  │ • Final fuel & odometer reading                  │  │ │ │
│ │ │  │ • Trip summary:                                  │  │ │ │
│ │ │  │   - Distance traveled                            │  │ │ │
│ │ │  │   - Duration                                     │  │ │ │
│ │ │  │   - Incidents count                              │  │ │ │
│ │ │  │ • Completion notes                               │  │ │ │
│ │ │  │ • ✓ FINALIZE → Trip Closed                       │  │ │ │
│ │ │  └─────────────────────────────────────────────────┘  │ │ │
│ │ └───────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Add Vehicle Inspection Form to TrackingCenter

#### 1. Create Inspection Step Component
```typescript
// src/components/tracking/VehicleInspectionStep.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface VehicleInspectionStepProps {
  vehicleId: string;
  onComplete: (inspectionData: any) => void;
}

export function VehicleInspectionStep({
  vehicleId,
  onComplete,
}: VehicleInspectionStepProps) {
  const [inspectionData, setInspectionData] = useState({
    vehicleCondition: 'good', // good, warning, bad
    engineOil: 'good',
    coolant: 'good',
    tires: 'good',
    lights: 'good',
    brakes: 'good',
    fuelLevel: 100,
    odometerReading: '',
    notes: '',
    photo: null as File | null,
  });

  const handleSubmit = () => {
    onComplete({
      ...inspectionData,
      timestamp: new Date().toISOString(),
      type: 'pre-trip',
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'bad': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✓ Tốt';
      case 'warning': return '⚠ Cảnh báo';
      case 'bad': return '✗ Hỏng';
      default: return '-';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          B1: Báo Cáo Nhận Xe
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Kiểm tra tình trạng xe trước khi bắt đầu chuyến
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vehicle Condition Overview */}
        <div className="grid grid-cols-3 gap-2">
          {['engineOil', 'coolant', 'tires', 'lights', 'brakes'].map((item) => (
            <div
              key={item}
              className={`p-3 rounded border-2 cursor-pointer text-center transition-all ${statusColor(
                inspectionData[item as keyof typeof inspectionData] as string
              )}`}
              onClick={() => {
                const current = inspectionData[item as keyof typeof inspectionData];
                const nextStatus = current === 'good' ? 'warning' : current === 'warning' ? 'bad' : 'good';
                setInspectionData({ ...inspectionData, [item]: nextStatus });
              }}
            >
              <div className="text-xs font-bold uppercase">
                {item === 'engineOil' && 'Dầu'}
                {item === 'coolant' && 'Nước'}
                {item === 'tires' && 'Lốp'}
                {item === 'lights' && 'Đèn'}
                {item === 'brakes' && 'Phanh'}
              </div>
              <div className="text-xs mt-1">
                {statusIcon(inspectionData[item as keyof typeof inspectionData] as string)}
              </div>
            </div>
          ))}
        </div>

        {/* Fuel & Odometer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Xăng dầu (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={inspectionData.fuelLevel}
              onChange={(e) =>
                setInspectionData({
                  ...inspectionData,
                  fuelLevel: parseInt(e.target.value),
                })
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Công tơ (km)</label>
            <Input
              type="number"
              value={inspectionData.odometerReading}
              onChange={(e) =>
                setInspectionData({
                  ...inspectionData,
                  odometerReading: e.target.value,
                })
              }
              placeholder="120500"
              className="mt-1"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium">Vấn đề / Ghi chú</label>
          <Textarea
            value={inspectionData.notes}
            onChange={(e) =>
              setInspectionData({ ...inspectionData, notes: e.target.value })
            }
            placeholder="Ghi chép bất thường, hư hỏng hoặc cần chú ý..."
            className="mt-1 min-h-20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1">
            ✓ Xác Nhận Báo Cáo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 2: Integrate into TrackingCenter as Modal Steps

#### 2. Update TrackingCenter.tsx to Add 4-Step Workflow

```typescript
// Key additions to src/pages/TrackingCenter.tsx

interface TripInspectionState {
  step: 1 | 2 | 3 | 4; // 1=pre-trip, 2=active, 3=media, 4=post-trip
  preTrip: any | null;
  activeTracking: any | null;
  mediaCapture: any[];
  postTrip: any | null;
}

export default function TrackingCenter() {
  // ... existing hooks ...
  
  const [inspectionState, setInspectionState] = useState<TripInspectionState>({
    step: 1,
    preTrip: null,
    activeTracking: null,
    mediaCapture: [],
    postTrip: null,
  });

  const [showInspectionWorkflow, setShowInspectionWorkflow] = useState(false);

  const handlePreTripComplete = (data: any) => {
    setInspectionState((prev) => ({
      ...prev,
      preTrip: data,
      step: 2,
    }));
    toast({ title: '✓ Pre-trip inspection saved', description: 'Ready to start tracking' });
  };

  const handleEndTrip = (data: any) => {
    setInspectionState((prev) => ({
      ...prev,
      activeTracking: data,
      step: 3,
    }));
    toast({ title: '✓ Trip ended', description: 'Proceed to document media' });
  };

  const handleMediaComplete = () => {
    setInspectionState((prev) => ({
      ...prev,
      step: 4,
    }));
  };

  const handlePostTripComplete = (data: any) => {
    setInspectionState((prev) => ({
      ...prev,
      postTrip: data,
      step: 1,
    }));
    setShowInspectionWorkflow(false);
    toast({ title: '✅ Trip completed', description: 'All documents saved' });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Existing content */}

      {/* 4-Step Workflow Button */}
      {!showInspectionWorkflow && (
        <Button
          onClick={() => setShowInspectionWorkflow(true)}
          className="w-full h-12 text-base"
          variant="default"
        >
          📋 Bắt Đầu Quy Trình 4 Bước
        </Button>
      )}

      {/* 4-Step Workflow Modal */}
      {showInspectionWorkflow && (
        <Card className="fixed inset-4 z-50 overflow-auto max-h-screen">
          {/* Step Indicator */}
          <div className="flex gap-1 p-4 bg-blue-50 sticky top-0">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`flex-1 py-2 px-2 rounded text-center text-sm font-bold transition-all ${
                  inspectionState.step === stepNum
                    ? 'bg-blue-600 text-white'
                    : inspectionState.step > stepNum
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {stepNum}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="p-4">
            {inspectionState.step === 1 && (
              <VehicleInspectionStep
                vehicleId={selectedTripId}
                onComplete={handlePreTripComplete}
              />
            )}

            {inspectionState.step === 2 && (
              <ActiveTrackingStep
                tripId={selectedTripId}
                preTrip={inspectionState.preTrip}
                onEndTrip={handleEndTrip}
              />
            )}

            {inspectionState.step === 3 && (
              <MediaDocumentationStep
                tripId={selectedTripId}
                media={inspectionState.mediaCapture}
                onComplete={handleMediaComplete}
              />
            )}

            {inspectionState.step === 4 && (
              <PostTripReportStep
                tripId={selectedTripId}
                preTrip={inspectionState.preTrip}
                activeTracking={inspectionState.activeTracking}
                onComplete={handlePostTripComplete}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
```

---

## Step Details & Implementation

### Step 1: Pre-Trip Inspection
**Checklist Items (from /driver/menu):**
- Dầu động cơ (Engine Oil)
- Nước làm mát (Coolant)
- Lốp xe (Tires)
- Đèn chiếu sáng (Lights)
- Phanh (Brakes)
- Xăng dầu % (Fuel Level)
- Công tơ km (Odometer)
- Vấn đề/Ghi chú (Issues/Notes)

**Output:**
```json
{
  "type": "pre-trip",
  "vehicleId": "VE001",
  "inspection": {
    "engineOil": "good",
    "coolant": "good",
    "tires": "warning",
    "lights": "good",
    "brakes": "good",
    "fuelLevel": 85,
    "odometerReading": 120500,
    "issues": "Một lốp hơi yếu, cần kiểm tra"
  },
  "timestamp": "2026-04-04T08:30:00Z"
}
```

---

### Step 2: Active Tracking
**Features:**
- Real-time GPS map display
- Speed & location updates (every 10 seconds)
- Trip timer (duration)
- Media capture buttons (integrated from Phase 4):
  - 📸 Camera - Incident photos
  - 🎥 Video - Event recording
  - 🎙️ Audio - Voice notes
- Live chat/notes
- End trip button

**Output:**
```json
{
  "type": "active-tracking",
  "tripId": "T001",
  "tracking": {
    "startTime": "2026-04-04T08:45:00Z",
    "endTime": "2026-04-04T11:15:00Z",
    "distance": 85.3,
    "avgSpeed": 42.5,
    "maxSpeed": 78,
    "waypoints": [...],
    "mediaCaptures": [
      { "type": "photo", "lat": 10.776, "lng": 106.695, "timestamp": "..." },
      { "type": "video", "lat": 10.802, "lng": 106.721, "timestamp": "..." }
    ]
  }
}
```

---

### Step 3: Media Documentation
**Actions:**
- Review/edit captured media
- Add captions & descriptions
- Link media to incidents
- Upload additional documents
- Organize by type

**Output:**
```json
{
  "type": "media-documentation",
  "tripId": "T001",
  "media": [
    {
      "id": "photo-1",
      "type": "photo",
      "url": "gs://fleetpro-app/trips/T001/photo-1.jpg",
      "caption": "Traffic incident at intersection",
      "location": { "lat": 10.776, "lng": 106.695 },
      "timestamp": "2026-04-04T09:15:30Z"
    },
    {
      "id": "video-1",
      "type": "video",
      "url": "gs://fleetpro-app/trips/T001/video-1.webm",
      "caption": "Fuel stop evidence",
      "location": { "lat": 10.802, "lng": 106.721 },
      "timestamp": "2026-04-04T10:45:00Z"
    }
  ]
}
```

---

### Step 4: Post-Trip Report
**Assessment:**
- Final vehicle condition (same checklist as pre-trip)
- Damage report (photo evidence)
- Fuel level (verify consumption)
- Odometer reading (verify distance)
- Trip summary:
  - Total distance
  - Total duration
  - Fuel consumption
  - Incidents count
  - Average speed
- Completion notes

**Output:**
```json
{
  "type": "post-trip",
  "tripId": "T001",
  "postTrip": {
    "vehicleCondition": {
      "engineOil": "good",
      "coolant": "good",
      "tires": "good",
      "lights": "good",
      "brakes": "good"
    },
    "damage": {
      "reported": false,
      "notes": ""
    },
    "fuel": {
      "startLevel": 85,
      "endLevel": 62,
      "consumed": 23,
      "cost": 230000
    },
    "odometer": {
      "start": 120500,
      "end": 120585,
      "distance": 85
    },
    "summary": {
      "duration": "02:30:00",
      "avgSpeed": 34,
      "incidents": 1,
      "mediaCount": 3
    },
    "notes": "Chuyến thành công, tài xế lái an toàn"
  },
  "timestamp": "2026-04-04T11:30:00Z"
}
```

---

## Integration Benefits

### For Drivers
✅ Structured workflow (no confusion)
✅ Clear step-by-step guidance
✅ Real-time tracking during trip
✅ Easy media documentation
✅ Quick report completion

### For Dispatchers
✅ Live trip visibility
✅ Instant incident notifications
✅ Media evidence for issues
✅ Trip verification at completion
✅ Historical audit trail

### For Accountant
✅ Complete trip documentation
✅ Fuel consumption tracking
✅ Damage assessment evidence
✅ Distance verification
✅ Reconciliation data

### For Manager
✅ KPI tracking (distance, time, incidents)
✅ Driver performance metrics
✅ Vehicle maintenance alerts
✅ Trip cost analysis
✅ Compliance verification

---

## Technical Implementation Checklist

- [ ] Create VehicleInspectionStep component
- [ ] Create ActiveTrackingStep component
- [ ] Create MediaDocumentationStep component
- [ ] Create PostTripReportStep component
- [ ] Integration into TrackingCenter.tsx
- [ ] Add Firestore schema for inspection data
- [ ] Add PDF export for trip reports
- [ ] Add email notifications on trip completion
- [ ] Add KPI dashboard metrics
- [ ] Add compliance reporting

---

## Migration Path

1. **Week 1**: Create components, integrate Step 1 (Pre-Trip)
2. **Week 2**: Integrate Step 2 (Active Tracking)
3. **Week 3**: Integrate Step 3 (Media Documentation)
4. **Week 4**: Integrate Step 4 (Post-Trip Report)
5. **Week 5**: Testing, refinement, deployment

---

## Success Metrics

- ✅ 100% of trips complete 4-step workflow
- ✅ Average step completion time < 5 minutes
- ✅ Media capture usage > 80% of trips
- ✅ Zero data loss on trip submission
- ✅ Driver satisfaction score > 4/5

---

*Generated: 2026-04-04*
*Status: Ready for Implementation*
