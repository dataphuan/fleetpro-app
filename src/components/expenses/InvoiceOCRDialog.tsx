/**
 * 📸 Invoice OCR Dialog — REAL Gemini Vision Integration
 * 
 * Cho phép kế toán/tài xế chụp ảnh chứng từ → AI trích xuất tự động → điền form
 */

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, Check, AlertTriangle, FileText, Sparkles } from 'lucide-react';
import { scanInvoice, type OCRResult } from '@/services/InvoiceOCRService';

interface InvoiceOCRDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (data: {
        amount: number;
        description: string;
        date: string;
        category: string;
        vehicle_plate?: string;
    }) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    cat_fuel: '⛽ Nhiên liệu',
    cat_toll: '🛣️ Cầu đường',
    cat_meal: '🍜 Ăn uống',
    cat_maint: '🔧 Sửa chữa/Bảo trì',
    cat_loading: '📦 Bốc xếp',
    cat_insurance: '🛡️ Bảo hiểm',
    cat_other: '📋 Khác',
};

export function InvoiceOCRDialog({ open, onOpenChange, onApply }: InvoiceOCRDialogProps) {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<OCRResult | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setResult({ success: false, error: 'Chỉ hỗ trợ file ảnh (JPG, PNG, WEBP)' });
            return;
        }

        // Show preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setScanning(true);
        setResult(null);

        // Scan with Gemini Vision
        const ocrResult = await scanInvoice(file);
        setResult(ocrResult);
        setScanning(false);
    }, []);

    const handleApply = () => {
        if (result?.success && result.data) {
            onApply({
                amount: result.data.amount,
                description: result.data.description,
                date: result.data.date,
                category: result.data.category,
                vehicle_plate: result.data.vehicle_plate,
            });
            onOpenChange(false);
            // Cleanup
            setResult(null);
            setPreviewUrl(null);
        }
    };

    const handleReset = () => {
        setResult(null);
        setPreviewUrl(null);
        setScanning(false);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                        Scan Chứng Từ (Gemini AI)
                    </DialogTitle>
                    <DialogDescription>
                        Chụp ảnh hoặc tải ảnh chứng từ → AI tự động trích xuất số tiền, loại chi phí, ngày
                    </DialogDescription>
                </DialogHeader>

                {/* Upload area */}
                {!previewUrl && !scanning && (
                    <div className="space-y-3">
                        <div 
                            className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-700">Tải ảnh chứng từ lên</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — Tối đa 10MB</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                <Camera className="w-4 h-4 mr-2" />
                                Chụp ảnh
                            </Button>
                            <Button 
                                variant="outline"
                                className="flex-1" 
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Chọn file
                            </Button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                                e.target.value = '';
                            }}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                                e.target.value = '';
                            }}
                        />
                    </div>
                )}

                {/* Preview + scanning */}
                {previewUrl && (
                    <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden border max-h-48">
                            <img 
                                src={previewUrl} 
                                alt="Chứng từ" 
                                className={`w-full object-contain max-h-48 ${scanning ? 'opacity-50' : ''}`} 
                            />
                            {scanning && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-lg">
                                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                        <span className="text-sm font-semibold">Gemini đang phân tích...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && !scanning && (
                    <div className="space-y-3">
                        {result.success && result.data ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-bold text-emerald-800">Trích xuất thành công</span>
                                    <Badge variant="outline" className="ml-auto text-[10px]">
                                        Độ tin cậy: {Math.round(result.data.confidence * 100)}%
                                    </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Số tiền</p>
                                        <p className="font-black text-lg text-emerald-700">
                                            {result.data.amount.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Loại chi phí</p>
                                        <p className="font-semibold">
                                            {CATEGORY_LABELS[result.data.category] || result.data.category}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Ngày</p>
                                        <p className="font-medium">{result.data.date}</p>
                                    </div>
                                    {result.data.vehicle_plate && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-500">Biển số xe</p>
                                            <p className="font-medium">{result.data.vehicle_plate}</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Diễn giải</p>
                                    <p className="text-sm">{result.data.description}</p>
                                </div>

                                {result.data.vendor_name && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Nhà cung cấp</p>
                                        <p className="text-sm">{result.data.vendor_name}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red-800 text-sm">Không thể phân tích</p>
                                    <p className="text-xs text-red-600 mt-1">{result.error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {previewUrl && (
                        <Button variant="outline" onClick={handleReset}>
                            Chọn ảnh khác
                        </Button>
                    )}
                    {result?.success && result.data && (
                        <Button onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700">
                            <Check className="w-4 h-4 mr-2" />
                            Áp dụng vào phiếu chi
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
