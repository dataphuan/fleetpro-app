import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, RefreshCw, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface GoogleDriveSyncProps {
  onSync?: () => Promise<void>;
  lastSync?: Date;
  isConnected?: boolean;
  onConnect?: () => void;
}

export function GoogleDriveSync({
  onSync,
  lastSync,
  isConnected = false,
  onConnect
}: GoogleDriveSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleSync = async () => {
    if (!isConnected) {
      toast({
        title: "Chưa kết nối Google Drive",
        description: "Vui lòng kết nối Google Drive trước khi đồng bộ.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      await onSync?.();
      setSyncStatus('success');
      toast({
        title: "Đồng bộ thành công",
        description: "Dữ liệu đã được đồng bộ với Google Drive.",
      });
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Lỗi đồng bộ",
        description: "Không thể đồng bộ dữ liệu. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Chưa đồng bộ';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Google Drive Sync</CardTitle>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Đã kết nối" : "Chưa kết nối"}
          </Badge>
        </div>
        <CardDescription>
          Tự động sao lưu và đồng bộ dữ liệu với Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Lần đồng bộ cuối:</span>
          <span>{formatLastSync(lastSync)}</span>
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Settings className="mr-2 h-4 w-4" />
                  Kết nối Google Drive
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kết nối Google Drive</DialogTitle>
                  <DialogDescription>
                    Kết nối tài khoản Google Drive để tự động sao lưu và đồng bộ dữ liệu.
                    Điều này giúp bảo vệ dữ liệu của bạn và cho phép truy cập từ nhiều thiết bị.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <h4 className="font-medium mb-2">Lợi ích:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Tự động sao lưu dữ liệu hàng ngày</li>
                      <li>Đồng bộ giữa nhiều thiết bị</li>
                      <li>Khôi phục dữ liệu khi cần thiết</li>
                      <li>Bảo mật dữ liệu với Google Security</li>
                    </ul>
                  </div>
                  <Button onClick={onConnect} className="w-full">
                    <Cloud className="mr-2 h-4 w-4" />
                    Cho phép truy cập Google Drive
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1"
              variant={syncStatus === 'success' ? 'default' : 'outline'}
            >
              {isSyncing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : syncStatus === 'success' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="text-xs text-muted-foreground">
            Dữ liệu sẽ được tự động đồng bộ mỗi 24 giờ hoặc khi có thay đổi quan trọng.
          </div>
        )}
      </CardContent>
    </Card>
  );
}