import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Unlink, Save } from "lucide-react";

export function GDriveSettingsForm() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(true); // Default to true to match screenshot state
  
  // State for form fields
  const [clientId, setClientId] = useState("239300485878-48buuqogm89gfdrp8vjr1pracv0s3o0o.apps.googleusercontent.com");
  const [clientSecret, setClientSecret] = useState("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [folderId, setFolderId] = useState("1a_Je1VuTA_mqQAMgMUlQrAfpxJZzfMZn");

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Đã ngắt kết nối",
      description: "Đã ngắt kết nối với Google Drive.",
    });
  };

  const handleSaveFolder = () => {
    toast({
      title: "Đã lưu thư mục",
      description: `Đã cập nhật ID Thư mục: ${folderId}`,
    });
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="p-6 space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="flex items-center text-xl font-semibold gap-2 mb-1">
            <Cloud className="w-6 h-6 text-blue-500" />
            Đồng bộ Google Drive
          </h2>
          <p className="text-sm text-gray-500">
            Thiết lập đồng bộ file sao lưu tự động lên Google Drive.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Google OAuth Client ID
            </label>
            <Input 
              type="text" 
              value={clientId} 
              onChange={(e) => setClientId(e.target.value)}
              className="bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Google OAuth Client Secret
            </label>
            <Input 
              type="password" 
              value={clientSecret} 
              onChange={(e) => setClientSecret(e.target.value)}
              className="bg-gray-50/50 text-xl font-black tracking-widest"
              placeholder="..................."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              ID Thư mục Google Drive lưu trữ
            </label>
            <div className="flex gap-2">
              <Input 
                type="text" 
                value={folderId} 
                onChange={(e) => setFolderId(e.target.value)}
                className="bg-gray-50/50 flex-1"
              />
              <Button 
                variant="outline" 
                className="bg-gray-50"
                onClick={handleSaveFolder}
              >
                Lưu Thư mục
              </Button>
            </div>
          </div>
        </div>

        {/* Status Line */}
        {isConnected && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2 font-medium text-sm">
            <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-green-600 text-green-600 shrink-0">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.6667 3.5L5.25004 9.91667L2.33337 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Đã kết nối tài khoản Google Drive thành công! Hệ thống sẽ tự động upload bản sao lưu.
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="px-6 pb-6 mt-2 relative">
         <Button 
           variant="destructive" 
           className="w-full bg-[#d32f2f] hover:bg-[#b71c1c] text-white h-11 text-base font-semibold"
           onClick={handleDisconnect}
         >
           <Unlink className="w-5 h-5 mr-2" />
           Ngắt kết nối
         </Button>
      </div>
    </div>
  );
}
