import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  tripId: string;
  onSuccess?: () => void;
}

export function DocumentUpload({ tripId, onSuccess }: DocumentUploadProps) {
  const { toast } = useToast();
  const { user, tenantId } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const storagePath = `drivers/${tenantId}/${user?.id}/documents/${tripId}/${timestamp}_${file.name}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      setDocumentUrl(url);
      setFileName(file.name);
      toast({
        title: '✅ Upload thành công',
        description: `${file.name} đã được lưu trữ`,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: '❌ Lỗi upload',
        description: 'Không thể tải lên tài liệu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <FileText className="w-5 h-5" />
          Gửi tài liệu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Tài liệu (PDF, Ảnh, ...)</label>
          <div className="flex gap-2 mt-2">
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
        </div>

        {documentUrl && (
          <div className="bg-green-50 p-3 rounded border border-green-200 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900">{fileName}</p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline text-xs"
              >
                Xem tài liệu
              </a>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Ghi chú</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mô tả tài liệu này..."
            className="mt-2"
            rows={3}
          />
        </div>

        <Button className="w-full" onClick={() => onSuccess?.()}>
          <Upload className="w-4 h-4 mr-2" />
          Hoàn thành
        </Button>
      </CardContent>
    </Card>
  );
}
