import { useMemo, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { Camera, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type OCRExpenseDraft = {
  category_id: string;
  amount: number;
  expense_date: string;
  description: string;
  vendor_name: string;
};

interface InvoiceOCRMockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (draft: OCRExpenseDraft) => void;
}

export function InvoiceOCRMockDialog({ open, onOpenChange, onApply }: InvoiceOCRMockDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [hasDetected, setHasDetected] = useState(false);
  const [draft, setDraft] = useState<OCRExpenseDraft>({
    category_id: "fuel",
    amount: 450000,
    expense_date: format(new Date(), "yyyy-MM-dd"),
    description: "Do dau diesel",
    vendor_name: "Tram xang Shell Nha Trang",
  });

  const canDetect = useMemo(() => !!previewUrl && !isReading, [previewUrl, isReading]);

  const resetState = () => {
    setPreviewUrl(null);
    setIsReading(false);
    setHasDetected(false);
    setDraft({
      category_id: "fuel",
      amount: 450000,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "Do dau diesel",
      vendor_name: "Tram xang Shell Nha Trang",
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setHasDetected(false);
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    setHasDetected(false);
  };

  const handleDetect = async () => {
    if (!previewUrl) return;
    setIsReading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setDraft({
      category_id: "fuel",
      amount: 450000,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "Do dau diesel",
      vendor_name: "Tram xang Shell Nha Trang",
    });

    setIsReading(false);
    setHasDetected(true);
  };

  const close = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetState();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Hoa Don (OCR Mock)
          </DialogTitle>
          <DialogDescription>
            Tai anh hoa don, bam nhan dang de AI tu dien form chi phi. Ban co the sua truoc khi luu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Label>Upload anh hoa don</Label>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 hover:bg-slate-100">
              <Upload className="mb-2 h-5 w-5" />
              Keo tha hoac click de chon anh
              <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-56 w-full rounded-md border object-contain" />
            ) : (
              <div className="rounded-md border p-4 text-xs text-muted-foreground">Chua co anh duoc chon.</div>
            )}

            <Button onClick={handleDetect} disabled={!canDetect} className="w-full">
              {isReading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dang doc hoa don...
                </>
              ) : (
                "Nhan dang hoa don"
              )}
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border bg-amber-50/40 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Form AI tu dien</Label>
              {hasDetected ? <Badge className="bg-amber-500 text-white">AI</Badge> : null}
            </div>

            <div className="space-y-1">
              <Label>Loai chi phi</Label>
              <Input
                value={draft.category_id === "fuel" ? "Nhien lieu" : draft.category_id}
                onChange={(e) => setDraft((prev) => ({ ...prev, category_id: e.target.value }))}
                className="bg-amber-100/60"
              />
            </div>

            <div className="space-y-1">
              <Label>So tien</Label>
              <Input
                type="number"
                value={draft.amount}
                onChange={(e) => setDraft((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))}
                className="bg-amber-100/60"
              />
            </div>

            <div className="space-y-1">
              <Label>Ngay</Label>
              <Input
                type="date"
                value={draft.expense_date}
                onChange={(e) => setDraft((prev) => ({ ...prev, expense_date: e.target.value }))}
                className="bg-amber-100/60"
              />
            </div>

            <div className="space-y-1">
              <Label>Mo ta</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-amber-100/60"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Noi mua</Label>
              <Input
                value={draft.vendor_name}
                onChange={(e) => setDraft((prev) => ({ ...prev, vendor_name: e.target.value }))}
                className="bg-amber-100/60"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Huy</Button>
          <Button
            onClick={() => {
              onApply(draft);
              close(false);
            }}
            disabled={!hasDetected}
          >
            Dien vao phieu chi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
