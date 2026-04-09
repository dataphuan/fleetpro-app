import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Cloud, RefreshCw, CheckCircle, AlertCircle, Settings, Link2, Unlink } from "lucide-react";
import { GoogleDriveSync } from "@/components/sync/GoogleDriveSync";
import { googleDriveService } from "@/services/googleDrive";

export function GDriveSettingsForm() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | undefined>();

  useEffect(() => {
    // Check if already connected on component mount
    const checkConnection = async () => {
      const initialized = await googleDriveService.initialize();
      if (initialized) {
        setIsConnected(googleDriveService.isAuthenticatedStatus());
        // Load last sync time from localStorage
        const lastSyncTime = localStorage.getItem('gdrive_last_sync');
        if (lastSyncTime) {
          setLastSync(new Date(lastSyncTime));
        }
      }
    };
    checkConnection();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const initialized = await googleDriveService.initialize();
      if (!initialized) {
        throw new Error('Không thể khởi tạo Google Drive API');
      }

      const authenticated = await googleDriveService.authenticate();
      if (authenticated) {
        setIsConnected(true);
        toast({
          title: "Kết nối thành công",
          description: "Đã kết nối với Google Drive.",
        });
      } else {
        throw new Error('Xác thực thất bại');
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      toast({
        title: "Lỗi kết nối",
        description: error.message || "Không thể kết nối với Google Drive.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    // Note: Google Drive API doesn't have a direct disconnect method
    // The connection will be re-established on next authentication
    toast({
      title: "Đã ngắt kết nối",
      description: "Đã ngắt kết nối với Google Drive.",
    });
  };

  const handleSync = async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      // Mock data sync - in real implementation, this would sync actual fleet data
      const mockData = {
        reportType: 'settings-sync',
        generatedAt: new Date().toISOString(),
        settings: {
          connected: true,
          lastSync: new Date().toISOString()
        }
      };

      const result = await googleDriveService.syncFleetData(mockData, 'current-tenant');

      if (result.success) {
        const now = new Date();
        setLastSync(now);
        localStorage.setItem('gdrive_last_sync', now.toISOString());
        toast({
          title: "Đồng bộ thành công",
          description: "Dữ liệu đã được đồng bộ với Google Drive.",
        });
      } else {
        throw new Error(result.error || 'Đồng bộ thất bại');
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: "Lỗi đồng bộ",
        description: error.message || "Không thể đồng bộ dữ liệu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            Google Drive Integration
          </CardTitle>
          <CardDescription>
            Đồng bộ và sao lưu dữ liệu tự động với Google Drive. Bảo vệ dữ liệu của bạn với bộ nhớ đám mây an toàn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? "Đã kết nối Google Drive" : "Chưa kết nối Google Drive"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? "Tài khoản Google Drive đã được liên kết"
                    : "Kết nối để bật tính năng đồng bộ đám mây"
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Kết nối Google Drive
                </Button>
              )}
            </div>
          </div>

          {/* Sync Component */}
          {isConnected && (
            <GoogleDriveSync
              onSync={handleSync}
              lastSync={lastSync}
              isConnected={isConnected}
              onConnect={handleConnect}
            />
          )}

          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Cloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Sao lưu tự động</h4>
                    <p className="text-sm text-muted-foreground">
                      Dữ liệu được sao lưu hàng ngày
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {isConnected ? "Đã bật" : "Cần kết nối"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Đồng bộ realtime</h4>
                    <p className="text-sm text-muted-foreground">
                      Đồng bộ dữ liệu giữa các thiết bị
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {isConnected ? "Đã bật" : "Cần kết nối"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Setup Instructions */}
          {!isConnected && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Hướng dẫn thiết lập
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-2 bg-blue-100 border border-blue-200 rounded text-blue-800 text-xs font-medium">
                  🛡️ Chế độ Demo: Bạn có thể nhấn "Kết nối" để trải nghiệm ngay tính năng mà không cần tài khoản thật.
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-amber-700">
                  <li>Nhấp vào nút "Kết nối Google Drive" ở trên</li>
                  <li>Cho phép truy cập khi được yêu cầu</li>
                  <li>Chọn tài khoản Google Drive bạn muốn sử dụng</li>
                  <li>Xác nhận quyền truy cập để FleetPro có thể tạo và quản lý file</li>
                </ol>
                <p className="text-xs text-amber-600 mt-3">
                  <strong>Lưu ý:</strong> FleetPro chỉ tạo thư mục riêng và không truy cập file khác của bạn.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
