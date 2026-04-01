import { Button } from "@/components/ui/button";
import { Download, FileDown, FileText, Sheet, Cloud, RefreshCw, HardDrive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  onExport: (type: 'csv' | 'xlsx' | 'pdf') => void;
  onGoogleDriveSync?: () => void;
  onLocalSave?: () => void;
  isLoading?: boolean;
  googleDriveConnected?: boolean;
}

export function ExportButtons({
  onExport,
  onGoogleDriveSync,
  onLocalSave,
  isLoading,
  googleDriveConnected = false
}: ExportButtonsProps) {
  const { toast } = useToast();

  const handleGoogleDriveSync = () => {
    if (!googleDriveConnected) {
      toast({
        title: "Chưa kết nối Google Drive",
        description: "Vui lòng kết nối Google Drive trong phần cài đặt để sử dụng tính năng này.",
        variant: "destructive",
      });
      return;
    }
    onGoogleDriveSync?.();
  };

  const handleLocalSave = () => {
    onLocalSave?.();
    toast({
      title: "Đã lưu xuống máy",
      description: "Báo cáo đã được tải về máy tính của bạn. Khuyến nghị duy trì bản lưu local định kỳ.",
    });
  };

  const handleExport = (type: 'csv' | 'xlsx' | 'pdf') => {
    onExport(type);
    toast({
      title: "Xuất báo cáo thành công",
      description: "Nên lưu bản local và bật đồng bộ Google Drive để đảm bảo an toàn dữ liệu lâu dài.",
    });
  };

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled={isLoading}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Xuất file
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('xlsx')}>
            <Sheet className="mr-2 h-4 w-4" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLocalSave}>
            <HardDrive className="mr-2 h-4 w-4" />
            Lưu xuống máy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGoogleDriveSync}>
            <Cloud className="mr-2 h-4 w-4" />
            Đồng bộ Google Drive
            {googleDriveConnected && <RefreshCw className="ml-2 h-3 w-3" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {googleDriveConnected && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={handleGoogleDriveSync}
          disabled={isLoading}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Sync Drive
          </span>
        </Button>
      )}
    </div>
  );
}
