import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, Clock, User, Database, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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

export default function Logs() {
  const { tenantId, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['system_logs', tenantId, currentPage],
    queryFn: async () => {
      const q = query(
        collection(db, 'system_logs'),
        where("tenant_id", "==", tenantId),
        orderBy("timestamp", "desc"),
        limit(100) // Show last 100 logs for now
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    },
    enabled: !!tenantId && role === 'admin'
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

  const filteredLogs = logs?.filter(log => 
    log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.collection_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (role !== 'admin') {
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm theo email, hành động hoặc bảng dữ liệu..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                  <TableHead><User className="w-4 h-4 inline mr-2" />Người dùng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead><Database className="w-4 h-4 inline mr-2" />Bảng / Đối tượng</TableHead>
                  <TableHead>ID Đối tượng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy lịch sử hoạt động nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-sm font-medium">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">{log.user_email}</span>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 uppercase font-semibold tracking-tighter">
                        {log.collection_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">
                        {log.entity_id}
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
          * Nhật ký ghi lại 100 hoạt động gần nhất. Dữ liệu này không thể bị xóa hoặc sửa đổi.
        </p>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" disabled><ChevronLeft className="w-4 h-4" /></Button>
           <Button variant="outline" size="sm" disabled><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
