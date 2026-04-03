import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrips } from '@/hooks/useTrips';
import { useTripLocationLogs, useTripPathSummary } from '@/hooks/useTripLocationLogs';
import { TripReplayMap } from '@/components/tracking/TripReplayMap';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { Download, FileJson, FileText, Loader2, MessageSquare, Image as ImageIcon, Video, Send, CheckCircle2, Camera, Mic } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { TrackingPlaceholderFleetMap, buildMockMarkers } from '@/components/tracking/TrackingPlaceholderFleetMap';
import { CameraCapture } from '@/components/tracking/CameraCapture';
import { VideoRecorder } from '@/components/tracking/VideoRecorder';
import { AudioRecorder } from '@/components/tracking/AudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUserRole } from '@/lib/rbac';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

type ReportMediaType = 'text' | 'photo' | 'video';

const coordinationSteps = [
  {
    id: 'step-1',
    title: 'B1 - Điều phối lệnh',
    owner: 'dispatcher/admin',
    description: 'Tạo nhiệm vụ, gắn chuyến, tài xế, thời gian và SLA phản hồi.',
  },
  {
    id: 'step-2',
    title: 'B2 - Tài xế cập nhật',
    owner: 'driver',
    description: 'Chat hiện trường, gửi ảnh/video chứng cứ và trạng thái theo thời gian thực.',
  },
  {
    id: 'step-3',
    title: 'B3 - Kế toán đối soát',
    owner: 'accountant',
    description: 'Xác nhận chứng từ, chi phí và ghi chú chênh lệch nếu có.',
  },
  {
    id: 'step-4',
    title: 'B4 - Quản lý chốt báo cáo',
    owner: 'manager/admin',
    description: 'Phê duyệt cuối cùng, khóa ca và lưu log hoàn tất phiên phối hợp.',
  },
];

const rolePlaybook: Record<string, string[]> = {
  driver: [
    'Xác nhận GPS đầu ca trên điện thoại.',
    'Gửi checklist xe + ảnh/video trước khi chạy.',
    'Nhận lệnh điều động trong 3 phút.',
    'Nếu chưa có lệnh, tạo bản nháp và báo Telegram.',
  ],
  dispatcher: [
    'Nhận trạng thái sẵn sàng từ tài xế.',
    'Gán lệnh theo khu vực + tải trọng.',
    'Theo dõi timeout xác nhận và đẩy cảnh báo.',
    'Chốt phân công cuối ngày, không để treo.',
  ],
  accountant: [
    'Lọc chuyến đã hoàn thành trong ngày.',
    'Đối soát chứng từ ảnh/video.',
    'Duyệt hoặc trả lại có lý do.',
    'Chốt trạng thái RECONCILED/PENDING.',
  ],
  manager: [
    'Theo dõi KPI đầu ngày trên dashboard.',
    'Xử lý cảnh báo quá hạn 3 phút.',
    'Phê duyệt ngoại lệ phát sinh.',
    'Khóa sổ cuối ngày và giao việc tiếp theo.',
  ],
  admin: [
    'Giám sát sức khỏe toàn bộ hệ thống.',
    'Xử lý tài khoản/quyền hạn khi cần.',
    'Cân bằng tài nguyên và luồng điều phối.',
    'Chốt báo cáo ngày và lưu audit log.',
  ],
};

export default function TrackingCenter() {
  const { data: trips = [] } = useTrips();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const { user, role, tenantId } = useAuth();
  const { toast } = useToast();
  const normalizedRole = normalizeUserRole(role);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportStep, setReportStep] = useState<string>('step-1');
  const [reportMediaType, setReportMediaType] = useState<ReportMediaType>('text');
  const [reportText, setReportText] = useState<string>('');
  const [reportMediaUrl, setReportMediaUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const recentTrips = useMemo(() => {
    let rows = [...trips]
      .filter((trip: any) => ['in_progress', 'completed', 'closed', 'cancelled'].includes(trip.status))
      .sort((a: any, b: any) => new Date(b.departure_date || 0).getTime() - new Date(a.departure_date || 0).getTime());

    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() >= from);
    }

    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() <= to);
    }

    return rows.slice(0, 200);
  }, [trips, fromDate, toDate]);

  const effectiveTripId = selectedTripId || recentTrips[0]?.id || '';
  const { data: logs = [], isLoading } = useTripLocationLogs(effectiveTripId);

  const filteredLogs = useMemo(() => {
    let rows = [...logs];
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      rows = rows.filter((item) => new Date(item.recorded_at).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      rows = rows.filter((item) => new Date(item.recorded_at).getTime() <= to);
    }
    return rows;
  }, [logs, fromDate, toDate]);

  const summary = useTripPathSummary(filteredLogs);

  const selectedTrip = useMemo(() => {
    return recentTrips.find((trip: any) => trip.id === effectiveTripId) || null;
  }, [recentTrips, effectiveTripId]);

  const maxRiskScore = useMemo(() => {
    if (!filteredLogs.length) return 0;
    return Math.max(...filteredLogs.map((item) => Number(item.integrity_risk_score || 0)));
  }, [filteredLogs]);

  const mockFleetMarkers = useMemo(() => buildMockMarkers(vehicles, drivers, trips), [vehicles, drivers, trips]);
  const practicalSteps = rolePlaybook[normalizedRole] || rolePlaybook.manager;
  const telegramExperienceLink = String(
    import.meta.env.VITE_CUSTOMER_TELEGRAM_GROUP || import.meta.env.VITE_SUPPORT_TELEGRAM || '',
  ).trim();

  const handleExportReplay = () => {
    if (!filteredLogs.length) return;
    exportToCSV(filteredLogs, `tracking_replay_${effectiveTripId || 'trip'}`, [
      { key: 'trip_code', header: 'Ma chuyen' },
      { key: 'event_type', header: 'Su kien' },
      { key: 'recorded_at', header: 'Thoi gian' },
      { key: 'latitude', header: 'Vi do' },
      { key: 'longitude', header: 'Kinh do' },
      { key: 'accuracy_m', header: 'Do lech m' },
      { key: 'inferred_speed_kmh', header: 'Toc do suy luan kmh' },
      { key: 'integrity_risk_score', header: 'Risk score' },
      { key: 'integrity_flags', header: 'Flags' },
    ]);
  };

  const handleExportReplayJson = () => {
    if (!filteredLogs.length) return;

    const payload = {
      generated_at: new Date().toISOString(),
      trip: selectedTrip
        ? {
            id: selectedTrip.id,
            trip_code: selectedTrip.trip_code,
            status: selectedTrip.status,
            departure_date: selectedTrip.departure_date,
          }
        : null,
      filters: {
        from_date: fromDate || null,
        to_date: toDate || null,
      },
      summary: {
        total_points: summary.totalPoints,
        suspicious_points: summary.suspiciousPoints,
        max_risk_score: maxRiskScore,
        first_recorded_at: summary.firstPoint?.recorded_at || null,
        last_recorded_at: summary.lastPoint?.recorded_at || null,
      },
      logs: filteredLogs,
    };

    exportToJSON(payload, `tracking_replay_audit_${effectiveTripId || 'trip'}`);
  };

  const handleExportReplayPdf = async () => {
    if (!filteredLogs.length) return;

    const { exportToPDF } = await import('@/lib/pdf-export');

    exportToPDF({
      title: 'BAO CAO AUDIT HANH TRINH',
      subtitle: `Chuyen ${selectedTrip?.trip_code || effectiveTripId || ''} | Diem: ${summary.totalPoints} | Nghi ngo: ${summary.suspiciousPoints} | Risk max: ${maxRiskScore}`,
      filename: `BaoCao_Audit_Tracking_${effectiveTripId || 'trip'}.pdf`,
      columns: [
        { header: 'Thoi gian', dataKey: 'recorded_at', width: 35 },
        { header: 'Su kien', dataKey: 'event_type', width: 22 },
        { header: 'Vi do', dataKey: 'latitude', width: 22 },
        { header: 'Kinh do', dataKey: 'longitude', width: 22 },
        { header: 'Acc(m)', dataKey: 'accuracy_m', width: 18 },
        { header: 'Speed(kmh)', dataKey: 'inferred_speed_kmh', width: 22 },
        { header: 'Risk', dataKey: 'integrity_risk_score', width: 15 },
        { header: 'Flags', dataKey: 'flags_text', width: 50 },
      ],
      data: filteredLogs.map((item) => ({
        ...item,
        flags_text: (item.integrity_flags || []).join(', '),
      })),
      orientation: 'landscape',
    });
  };

  const handleUploadMedia = async (file: File | null) => {
    if (!file) return;
    if (reportMediaType === 'text') {
      toast({ title: 'Chọn loại báo cáo', description: 'Hãy đổi loại báo cáo sang ảnh hoặc video trước khi upload.' });
      return;
    }

    setIsUploading(true);
    try {
      const folder = reportMediaType === 'photo' ? 'photos' : 'videos';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `tracking-reports/${tenantId || 'public'}/${folder}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setReportMediaUrl(url);
      toast({ title: 'Upload thành công', description: 'Đã lấy URL media để gửi Telegram.' });
    } catch (error: any) {
      toast({
        title: 'Upload thất bại',
        description: error?.message || 'Không thể upload file lên Firebase Storage.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDirectMediaCapture = async (blob: Blob, mediaType: 'photo' | 'video' | 'audio') => {
    setIsUploading(true);
    try {
      const extensions: Record<string, { ext: string; mimeType: string }> = {
        photo: { ext: 'jpg', mimeType: 'image/jpeg' },
        video: { ext: 'webm', mimeType: 'video/webm' },
        audio: { ext: 'webm', mimeType: 'audio/webm' },
      };

      const { ext, mimeType } = extensions[mediaType];
      const fileName = `${mediaType}_${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type: mimeType });

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

  const handleSendTelegramReport = async () => {
    const text = reportText.trim();
    if (!text) {
      toast({ title: 'Thiếu nội dung', description: 'Vui lòng nhập nội dung báo cáo trước khi gửi.', variant: 'destructive' });
      return;
    }

    if (reportMediaType !== 'text' && !reportMediaUrl.trim()) {
      toast({
        title: 'Thiếu media',
        description: 'Báo cáo ảnh/video cần có URL media hoặc upload file trước khi gửi.',
        variant: 'destructive',
      });
      return;
    }

    const activeStep = coordinationSteps.find((step) => step.id === reportStep);
    const tripLabel = selectedTrip?.trip_code || effectiveTripId || 'N/A';
    const payloadText = [
      'FleetPro Tracking Coordination',
      `Step: ${activeStep?.title || reportStep}`,
      `Owner lane: ${activeStep?.owner || 'unknown'}`,
      `Role: ${normalizedRole}`,
      `User: ${user?.email || user?.id || 'anonymous'}`,
      `Trip: ${tripLabel}`,
      '',
      text,
    ].join('\n');

    setIsSending(true);
    try {
      const response = await fetch('/api/notify/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payloadText,
          mediaType: reportMediaType === 'text' ? null : reportMediaType,
          mediaUrl: reportMediaType === 'text' ? null : reportMediaUrl.trim(),
          event: {
            event_type: 'TRACKING_COORDINATION_REPORT',
            actor_role: normalizedRole,
            actor_name: user?.email || user?.id || 'anonymous',
            action: activeStep?.title || reportStep,
            timestamp: new Date().toISOString(),
            trip_code: tripLabel,
            location: selectedTrip?.route_id || null,
            status_after_action: `step:${reportStep}`,
            media_url: reportMediaType === 'text' ? null : reportMediaUrl.trim(),
            tenant_id: tenantId || null,
            extra: {
              tenant_id: tenantId || null,
              owner_lane: activeStep?.owner || 'unknown',
              media_type: reportMediaType,
            },
          },
        }),
      });

      const json = await response.json().catch(() => null as any);
      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || `Telegram endpoint error (${response.status})`);
      }

      toast({
        title: 'Đã gửi Telegram',
        description: `Báo cáo ${reportMediaType === 'text' ? 'text' : reportMediaType} đã vào kênh Telegram.`,
      });

      setReportText('');
      setReportMediaUrl('');
      setReportMediaType('text');
    } catch (error: any) {
      toast({
        title: 'Gửi Telegram thất bại',
        description: error?.message || 'Không gửi được báo cáo lên Telegram.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tracking Replay Center</h1>
        <p className="text-sm text-slate-600">Xem lại hành trình và điểm nghi ngờ GPS theo từng chuyến.</p>
      </div>

      <TrackingPlaceholderFleetMap markers={mockFleetMarkers} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Luồng phối hợp 4 bước (PC/Mobile đồng bộ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {coordinationSteps.map((step) => {
              const isSelected = reportStep === step.id;
              const isCurrentRoleOwner = step.owner.includes(normalizedRole);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setReportStep(step.id)}
                  className={`rounded-lg border p-3 text-left transition ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    {isCurrentRoleOwner ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Vai trò chính: {step.owner}</p>
                  <p className="mt-2 text-xs text-slate-500">{step.description}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-600">
            Mỗi bước đều dùng chung một payload báo cáo và gửi tập trung về Telegram để điều phối, tài xế, kế toán, quản lý theo dõi trên cùng kênh.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Playbook thực chiến theo vai trò</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-700">
            Vai trò hiện tại: <span className="font-semibold uppercase">{normalizedRole}</span>
          </p>
          <div className="space-y-2">
            {practicalSteps.map((task, index) => (
              <div key={`${normalizedRole}-${index}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold mr-1">B{index + 1}.</span>{task}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gửi chat/báo cáo về Telegram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Bước phối hợp</Label>
              <Select value={reportStep} onValueChange={setReportStep}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bước" />
                </SelectTrigger>
                <SelectContent>
                  {coordinationSteps.map((step) => (
                    <SelectItem key={step.id} value={step.id}>{step.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Loại báo cáo</Label>
              <Select value={reportMediaType} onValueChange={(value) => setReportMediaType(value as ReportMediaType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Text</div></SelectItem>
                  <SelectItem value="photo"><div className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />Ảnh</div></SelectItem>
                  <SelectItem value="video"><div className="flex items-center gap-2"><Video className="w-4 h-4" />Video</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Trip hiện tại</Label>
              <Input value={selectedTrip?.trip_code || effectiveTripId || ''} readOnly placeholder="N/A" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nội dung</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nhập nội dung phối hợp: tình trạng hiện trường, yêu cầu hỗ trợ, xác nhận đối soát..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />
          </div>

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

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSendTelegramReport} disabled={isSending || isUploading}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Gửi về Telegram
            </Button>
            {telegramExperienceLink ? (
              <Button variant="outline" onClick={() => window.open(telegramExperienceLink, '_blank', 'noopener,noreferrer')}>
                Vào nhóm Telegram trải nghiệm
              </Button>
            ) : null}
            {isUploading ? <span className="text-xs text-slate-600">Đang upload media...</span> : null}
            {!isUploading && reportMediaUrl ? <span className="text-xs text-emerald-700">Media sẵn sàng gửi</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bộ lọc chuyến</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-slate-600">Từ ngày</label>
              <input
                type="date"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Đến ngày</label>
              <input
                type="date"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
              Xóa lọc
            </Button>
            <Button size="sm" onClick={handleExportReplay} disabled={!filteredLogs.length}>
              <Download className="mr-2 h-4 w-4" /> Export replay
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReplayJson} disabled={!filteredLogs.length}>
              <FileJson className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReplayPdf} disabled={!filteredLogs.length}>
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>

          <Select value={effectiveTripId || undefined} onValueChange={(value) => setSelectedTripId(value)}>
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Chọn chuyến" />
            </SelectTrigger>
            <SelectContent>
              {recentTrips.map((trip: any) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.trip_code} | {trip.status} | {trip.departure_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Tổng điểm: {summary.totalPoints}</Badge>
            <Badge variant={summary.suspiciousPoints > 0 ? 'destructive' : 'secondary'}>
              Điểm nghi ngờ: {summary.suspiciousPoints}
            </Badge>
            {summary.firstPoint ? <Badge variant="outline">Bắt đầu: {new Date(summary.firstPoint.recorded_at).toLocaleString()}</Badge> : null}
            {summary.lastPoint ? <Badge variant="outline">Kết thúc: {new Date(summary.lastPoint.recorded_at).toLocaleString()}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-sm text-slate-600">Đang tải track logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-sm text-slate-600">Chuyến này chưa có track logs.</div>
          ) : (
            <TripReplayMap logs={filteredLogs} highlightedIndex={highlightedIndex} />
          )}
        </CardContent>
      </Card>

      {filteredLogs.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Danh sách điểm vị trí</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {filteredLogs.map((item, index) => {
              const hasFlags = (item.integrity_flags || []).length > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded border border-slate-200 p-2 text-left hover:bg-slate-50"
                  onClick={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{item.event_type || 'track_point'}</span>
                    <span>{new Date(item.recorded_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} | acc {Math.round(item.accuracy_m || 0)}m
                  </div>
                  {hasFlags ? (
                    <div className="mt-1 text-xs text-red-600">
                      Flag: {(item.integrity_flags || []).join(', ')} | Risk: {item.integrity_risk_score || 0}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

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
