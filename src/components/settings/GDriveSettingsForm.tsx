import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Unlink, Save, Loader2 } from "lucide-react";
import { useCompanySettings, useSaveCompanySettings } from "@/hooks/useCompanySettings";

export function GDriveSettingsForm() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useCompanySettings();
  const saveMutation = useSaveCompanySettings();
  
  // Local state for form fields
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [folderId, setFolderId] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Sync with database when settings load
  useEffect(() => {
    if (settings?.gdrive_config) {
      setClientId(settings.gdrive_config.clientId || "");
      setClientSecret(settings.gdrive_config.clientSecret || "");
      setFolderId(settings.gdrive_config.folderId || "");
      setIsConnected(settings.gdrive_config.isConnected || false);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!clientId) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập Client ID", variant: "destructive" });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...settings,
        gdrive_config: {
          clientId,
          clientSecret,
          folderId,
          isConnected: true, // Mark as connected when saved
          lastSync: new Date().toISOString()
        }
      });
      setIsConnected(true);
      toast({
        title: "Lưu thành công",
        description: "Thông tin kết nối Google Drive đã được cập nhật.",
      });
    } catch (error) {
      // Toast handled by mutation
    }
  };

  const handleDisconnect = async () => {
    try {
      await saveMutation.mutateAsync({
        ...settings,
        gdrive_config: {
          ...settings?.gdrive_config,
          clientId,
          folderId,
          isConnected: false
        }
      });
      setIsConnected(false);
      toast({
        title: "Đã ngắt kết nối",
        description: "Đã ngắt kết nối với Google Drive.",
      });
    } catch (error) {
       // Handled
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Card className="border-blue-100 shadow-sm overflow-hidden">
      <div className="bg-blue-600/10 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <Cloud className="w-5 h-5 text-white" />
             </div>
             <div>
                <h3 className="font-bold text-blue-900">Sao lưu lên Google Drive</h3>
                <p className="text-xs text-blue-700/70">Bảo mật dữ liệu an toàn tiêu chuẩn Google</p>
             </div>
         </div>
         {isConnected && (
           <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Đã kết nối
           </div>
         )}
      </div>
      <div className="p-6 space-y-6 bg-white">
        
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">
              Google OAuth Client ID
            </label>
            <Input 
              type="text" 
              value={clientId} 
              onChange={(e) => setClientId(e.target.value)}
              className="bg-gray-50/50"
              placeholder="VD: 12345-abcde.apps.googleusercontent.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">
              Google OAuth Client Secret
            </label>
            <Input 
              type="password" 
              value={clientSecret} 
              onChange={(e) => setClientSecret(e.target.value)}
              className="bg-gray-50/50"
              placeholder="Nhập Client Secret của bạn..."
            />
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">
              ID Thư mục Google Drive lưu trữ (Tùy chọn)
            </label>
            <Input 
              type="text" 
              value={folderId} 
              onChange={(e) => setFolderId(e.target.value)}
              className="bg-gray-50/50"
              placeholder="Nhập ID thư mục Google Drive (để trống để tự động tạo)"
            />
          </div>
        </div>

        {/* Status Line */}
        {!isConnected && (
          <div className="bg-slate-50 border px-4 py-3 rounded-md flex items-center gap-3 text-sm text-slate-600">
             <AlertCircle className="w-4 h-4 text-slate-400" />
             Chưa kết nối. Hệ thống cần quyền truy quyền Drive để tạo bản sao lưu an toàn.
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="px-6 pb-6 mt-2 flex flex-col md:flex-row gap-3">
         <Button 
           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-semibold shadow-lg shadow-blue-500/20"
           onClick={handleSave}
           disabled={saveMutation.isPending}
         >
           {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
           Lưu & Kết nối Google Drive
         </Button>

         {isConnected && (
           <Button 
             variant="ghost" 
             className="text-destructive hover:text-destructive hover:bg-destructive/10 h-11 text-base font-semibold"
             onClick={handleDisconnect}
             disabled={saveMutation.isPending}
           >
             <Unlink className="w-5 h-5 mr-2" />
             Ngắt kết nối
           </Button>
         )}
      </div>
    </Card>
  );
}

// Add these imports to Settings.tsx
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
