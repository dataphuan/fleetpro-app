import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, Clock, User, Database, ChevronLeft, ChevronRight, Loader2, MessageSquare, MapPin, BellRing, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  action: string;
  collection_name: string;
  entity_id: string;
  metadata?: any;
}

type TimelineSource = 'AUDIT' | 'OPS' | 'ALERT' | 'GPS';

type TimelineRow = {
  id: string;
  timestamp: string;
  source: TimelineSource;
  user_email?: string;
  action: string;
  collection_name?: string;
  entity_id?: string;
  description: string;
};

interface AlertLog {
  id: string;
  title?: string;
  message?: string;
  date?: string;
  created_at?: string;
  driver_id?: string;
  severity?: string;
}

interface TripLocationLog {
  id: string;
  event_type?: string;
  trip_code?: string;
  driver_email?: string;
  recorded_at?: string;
  latitude?: number;
  longitude?: number;
  integrity_risk_score?: number;
}

export default function Logs() {
  const { tenantId, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<'ALL' | TimelineSource>('ALL');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: timelineRows = [], isLoading } = useQuery({
    queryKey: ['timeline_logs', tenantId],
    queryFn: async () => {
      const rows: TimelineRow[] = [];

      const systemLogsQ = query(
        collection(db, 'system_logs'),
        where('tenant_id', '==', tenantId),
        orderBy('timestamp', 'desc'),
        limit(120)
      );
      const systemSnap = await getDocs(systemLogsQ);
      systemSnap.docs.forEach((doc) => {
        const data = doc.data() as AuditLog;
        const isOps = data.action === 'OPS_EVENT' || data.collection_name === 'ops_events';
        const eventType = data.metadata?.event?.event_type || data.action;
        rows.push({
          id: `sys-${doc.id}`,
          timestamp: data.timestamp,
          source: isOps ? 'OPS' : 'AUDIT',
          user_email: data.user_email,
          action: eventType || data.action,
          collection_name: data.collection_name,
          entity_id: data.entity_id,
          description: isOps
            ? `${data.metadata?.event?.action || 'ops_update'} | ${data.entity_id || 'N/A'}`
            : `${data.collection_name || 'unknown'} | ${data.entity_id || 'N/A'}`,
        });
      });

      try {
        const alertsQ = query(
          collection(db, 'alerts'),
          where('tenant_id', '==', tenantId),
          orderBy('date', 'desc'),
          limit(80)
        );
        const alertsSnap = await getDocs(alertsQ);
        alertsSnap.docs.forEach((doc) => {
          const data = doc.data() as AlertLog;
          const ts = data.date || data.created_at || new Date().toISOString();
          rows.push({
            id: `alert-${doc.id}`,
            timestamp: ts,
            source: 'ALERT',
            user_email: data.driver_id || '',
            action: data.title || 'ALERT',
            collection_name: 'alerts',
            entity_id: doc.id,
            description: data.message || 'Thông báo vận hành',
          });
        });
      } catch {
        // Optional source, keep timeline resilient.
      }

      try {
        const gpsQ = query(
          collection(db, 'tripLocationLogs'),
          where('tenant_id', '==', tenantId),
          orderBy('recorded_at', 'desc'),
          limit(80)
        );
        const gpsSnap = await getDocs(gpsQ);
        gpsSnap.docs.forEach((doc) => {
          const data = doc.data() as TripLocationLog;
          rows.push({
            id: `gps-${doc.id}`,
            timestamp: data.recorded_at || new Date().toISOString(),
            source: 'GPS',
            user_email: data.driver_email || '',
            action: data.event_type || 'track_point',
            collection_name: 'tripLocationLogs',
            entity_id: data.trip_code || doc.id,
            description: `${data.trip_code || 'N/A'} | ${data.latitude ?? ''}, ${data.longitude ?? ''} | risk ${data.integrity_risk_score ?? 0}`,
          });
        });
      } catch {
        // Optional source, keep timeline resilient.
      }

      return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    enabled: !!tenantId && ['superadmin', 'admin', 'manager', 'dispatcher', 'accountant'].includes(role)
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">TẠO MỚI</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">CẬP NHẬT</Badge>;
      case 'DELETE': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">XÓA</Badge>;
      case 'LOGIN': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">ĐĂNG NHẬP</Badge>;
      case 'ROLE_CHANGE': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">ĐỔI QUYỀN</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getSourceBadge = (source: TimelineSource) => {
    if (source === 'OPS') return <Badge className="bg-indigo-100 text-indigo-700 border-none">OPS</Badge>;
    if (source === 'ALERT') return <Badge className="bg-amber-100 text-amber-700 border-none">ALERT</Badge>;
    if (source === 'GPS') return <Badge className="bg-cyan-100 text-cyan-700 border-none">GPS</Badge>;
    return <Badge className="bg-slate-100 text-slate-700 border-none">AUDIT</Badge>;
  };

  const renderDelta = (metadata: any) => {
    if (!metadata || !metadata.diff) return <p className="text-slate-500 italic">Không có dữ liệu thay đổi chi tiết.</p>;
    
    const diff = metadata.diff;
    return (
      <div className="space-y-2 font-mono text-xs">
        {Object.entries(diff).map(([key, value]: [string, any]) => (
          <div key={key} className="grid grid-cols-12 gap-2 border-b border-slate-100 pb-2">
            <div className="col-span-3 font-bold text-slate-500">{key}</div>
            <div className="col-span-4 bg-red-50 text-red-700 px-2 py-1 rounded line-through overflow-hidden text-ellipsis italic">
              {JSON.stringify(value.oldValue ?? '—')}
            </div>
            <div className="col-span-1 flex justify-center items-center text-slate-300">→</div>
            <div className="col-span-4 bg-emerald-50 text-emerald-700 px-2 py-1 rounded overflow-hidden text-ellipsis font-bold">
              {JSON.stringify(value.newValue ?? '—')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const sourceStats = useMemo(() => {
    return {
      AUDIT: timelineRows.filter((row) => row.source === 'AUDIT').length,
      OPS: timelineRows.filter((row) => row.source === 'OPS').length,
      ALERT: timelineRows.filter((row) => row.source === 'ALERT').length,
      GPS: timelineRows.filter((row) => row.source === 'GPS').length,
    };
  }, [timelineRows]);

  const filteredLogs = timelineRows.filter((row) => {
    const q = searchQuery.toLowerCase();
    const hitQuery = !q
      || row.user_email?.toLowerCase().includes(q)
      || row.action?.toLowerCase().includes(q)
      || row.collection_name?.toLowerCase().includes(q)
      || row.description?.toLowerCase().includes(q);
    const hitSource = sourceFilter === 'ALL' || row.source === sourceFilter;
    return hitQuery && hitSource;
  });

  if (!['superadmin', 'admin', 'manager', 'dispatcher', 'accountant'].includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Truy cập bị từ chối</h2>
        <p className="text-muted-foreground">Bạn không có quyền xem nhật ký hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> Nhật ký hoạt động
          </h1>
          <p className="text-sm text-muted-foreground">
            Truy vết mọi thay đổi và hoạt động của người dùng trong tổ chức.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <div className="h-1 bg-emerald-500 w-full" />
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Log Bảo mật</p>
              <p className="text-xl font-bold">{sourceStats.AUDIT}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <div className="h-1 bg-blue-500 w-full" />
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bản ghi vận hành</p>
              <p className="text-xl font-bold">{sourceStats.OPS}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <div className="h-1 bg-amber-500 w-full" />
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
              <BellRing className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cảnh báo rủi ro</p>
              <p className="text-xl font-bold">{sourceStats.ALERT}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <div className="h-1 bg-cyan-500 w-full" />
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-cyan-50 rounded-xl group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tín hiệu GPS</p>
              <p className="text-xl font-bold">{sourceStats.GPS}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm theo email, hành động hoặc bảng dữ liệu..." 
            className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl shadow-sm border border-slate-100">
          <Button variant={sourceFilter === 'ALL' ? 'secondary' : 'ghost'} size="sm" className="h-9 px-3 rounded-lg" onClick={() => setSourceFilter('ALL')}>Tất cả</Button>
          <Button variant={sourceFilter === 'AUDIT' ? 'secondary' : 'ghost'} size="sm" className="h-9 px-3 rounded-lg gap-2" onClick={() => setSourceFilter('AUDIT')}>
            <Database className="w-4 h-4 text-emerald-600" /> {sourceStats.AUDIT}
          </Button>
          <Button variant={sourceFilter === 'OPS' ? 'secondary' : 'ghost'} size="sm" className="h-9 px-3 rounded-lg gap-2" onClick={() => setSourceFilter('OPS')}>
            <MessageSquare className="w-4 h-4 text-blue-600" /> {sourceStats.OPS}
          </Button>
          <Button variant={sourceFilter === 'ALERT' ? 'secondary' : 'ghost'} size="sm" className="h-9 px-3 rounded-lg gap-2" onClick={() => setSourceFilter('ALERT')}>
            <BellRing className="w-4 h-4 text-amber-600" /> {sourceStats.ALERT}
          </Button>
          <Button variant={sourceFilter === 'GPS' ? 'secondary' : 'ghost'} size="sm" className="h-9 px-3 rounded-lg gap-2" onClick={() => setSourceFilter('GPS')}>
            <MapPin className="w-4 h-4 text-cyan-600" /> {sourceStats.GPS}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[200px]"><Clock className="w-4 h-4 inline mr-2" />Thời gian</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead><User className="w-4 h-4 inline mr-2" />Người dùng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead><Database className="w-4 h-4 inline mr-2" />Bảng / Đối tượng</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy lịch sử hoạt động nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell className="text-sm font-medium">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                      </TableCell>
                      <TableCell>{getSourceBadge(log.source)}</TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-slate-700">{log.user_email || 'system'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400" />
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        {log.collection_name || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[300px] truncate">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground italic">
          * Timeline hợp nhất: Audit + Ops (Telegram) + Alert + GPS. Dữ liệu đọc trực tiếp từ Firestore theo tenant.
        </p>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" disabled><ChevronLeft className="w-4 h-4" /></Button>
           <Button variant="outline" size="sm" disabled><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Chi tiết bản ghi Nhật ký</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest">{selectedLog?.collection_name} | {selectedLog?.entity_id}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-white border-white/20">
              {selectedLog && getSourceBadge(selectedLog.source)}
            </Badge>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-white">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Tài khoản thực hiện</p>
                <p className="text-sm font-semibold">{selectedLog?.user_email || 'Hệ thống (System)'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Thời gian ghi nhận</p>
                <p className="text-sm font-semibold">
                  {selectedLog && format(new Date(selectedLog.timestamp), 'dd MMMM yyyy, HH:mm:ss', { locale: vi })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-slate-800">Dữ liệu Thay đổi (Delta-Diff)</h4>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                {selectedLog?.source === 'AUDIT' ? renderDelta(selectedLog?.metadata) : (
                  <div className="p-4 bg-slate-100 border rounded-lg">
                    <pre className="text-[10px] whitespace-pre-wrap text-slate-700">
                      {JSON.stringify(selectedLog?.metadata || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setDetailsDialogOpen(false)} variant="default" className="bg-slate-900 hover:bg-black px-8">
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
