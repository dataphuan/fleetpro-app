import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Upload, X, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface ImportColumn {
    key: string;
    header: string;
    required?: boolean;
    type?: 'text' | 'number' | 'date';
    description?: string; // For template comment
}

interface ValidationError {
    row: number;
    column: string;
    message: string;
}

interface ImportRow {
    data: Record<string, unknown>;
    errors: ValidationError[];
    isValid: boolean;
}

interface ExcelImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => Promise<void>;
    entityName: string; // e.g. "tài xế", "xe"
    columns: ImportColumn[];
    sampleData?: any[]; // For generating template
    existingCodes?: string[]; // Optional: List of existing codes to check duplication
    codeField?: string; // Field name to check duplication
}

export function ExcelImportDialog({
    isOpen,
    onClose,
    onImport,
    entityName,
    columns,
    sampleData = [],
    existingCodes = [],
    codeField = ''
}: ExcelImportDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const validateRow = (row: Record<string, unknown>, index: number): ImportRow => {
        const errors: ValidationError[] = [];
        const data = { ...row };

        columns.forEach(col => {
            const value = data[col.key];

            // 1. Required check
            if (col.required && (value === undefined || value === null || String(value).trim() === '')) {
                errors.push({ row: index, column: col.key, message: `Bắt buộc nhập ${col.header}` });
            }

            // 2. Type check
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                if (col.type === 'number') {
                    const num = Number(value);
                    if (isNaN(num)) {
                        errors.push({ row: index, column: col.key, message: `${col.header} phải là số` });
                    } else {
                        data[col.key] = num;
                    }
                }
                // Date check is handled during parsing usually, but we can double check
            }
        });

        // 3. Duplicate code check
        if (codeField && data[codeField] && existingCodes.includes(String(data[codeField]))) {
            errors.push({ row: index, column: codeField, message: `${columns.find(c => c.key === codeField)?.header || 'Mã'} đã tồn tại` });
        }

        return {
            data,
            errors,
            isValid: errors.length === 0,
        };
    };

    const handleDataUploaded = (data: Record<string, unknown>[]) => {
        const validated = data.map((row, index) => validateRow(row, index + 1));
        setImportRows(validated);
        setStep('preview');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();

            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Helper: Normalize header string (remove special chars, lowercase)
                const normalize = (str: string) => str.replace(/[+*\s]/g, '').toLowerCase().trim();

                // Helper: Parse Excel Date
                const parseExcelDate = (val: any) => {
                    if (typeof val === 'number') {
                        const date = new Date(Math.round((val - 25569) * 864e5));
                        return date.toISOString().split('T')[0];
                    }
                    if (typeof val === 'string') {
                        // Try YYYY-MM-DD or DD/MM/YYYY
                        if (val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
                        const parts = val.split(/[/.-]/);
                        if (parts.length === 3) {
                            // Assuming DD/MM/YYYY
                            const [d, m, y] = parts.map(Number);
                            if (y > 1000) return new Date(y, m - 1, d).toISOString().split('T')[0];
                        }
                    }
                    return val;
                };

                const mappedData = jsonData.map((row: any) => {
                    const mapped: Record<string, unknown> = {};

                    columns.forEach(col => {
                        // Try exact match
                        let val = row[col.header] ?? row[col.key];

                        // Try normalized match
                        if (val === undefined) {
                            const target = normalize(col.header);
                            const foundKey = Object.keys(row).find(k => normalize(k) === target);
                            if (foundKey) val = row[foundKey];
                        }

                        if (val !== undefined) {
                            if (col.type === 'date') {
                                mapped[col.key] = parseExcelDate(val);
                            } else {
                                mapped[col.key] = val;
                            }
                        }
                    });
                    return mapped;
                });

                handleDataUploaded(mappedData);
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error(error);
            toast({ title: "Lỗi đọc file", description: "File không đúng định dạng", variant: "destructive" });
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');

            // Generate headers
            const sample = sampleData.length > 0 ? sampleData : [{}];

            // Map sample data keys to Headers
            // Logic: We want headers to be human readable (col.header), but sample data properties match col.key?
            // Wait, sampleData provided should probably have Keys matching col.header for direct export?
            // Better: We convert sampleData (which has keys matching col.key) to objects with keys matching col.header.

            const exportData = sample.map(item => {
                const newItem: any = {};
                columns.forEach(col => {
                    newItem[col.header] = item[col.key] || '';
                });
                return newItem;
            });

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Auto width
            const wscols = columns.map(c => ({ wch: c.header.length + 5 }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            XLSX.writeFile(workbook, `Mau_Nhap_${entityName.replace(/\s/g, '_')}.xlsx`);

        } catch (error) {
            toast({ title: "Lỗi tạo file mẫu", description: "Không thể tạo file mẫu", variant: "destructive" });
        }
    };

    const handleImportClick = async () => {
        const validRows = importRows.filter(r => r.isValid).map(r => r.data);
        if (validRows.length === 0) return;

        setIsImporting(true);
        try {
            await onImport(validRows);
            handleClose();
        } catch (error) {
            // onImport handled error or not? usually handled by parent 
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setStep('upload');
        setImportRows([]);
        if (onClose) onClose();
    };

    const stats = {
        total: importRows.length,
        valid: importRows.filter(r => r.isValid).length,
        invalid: importRows.filter(r => !r.isValid).length
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Nhập {entityName} từ Excel
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel (.xlsx, .xls) với các cột theo mẫu
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Kéo thả file hoặc click để chọn</p>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id={`excel-upload-${entityName}`}
                        />
                        <div className="flex flex-col items-center gap-2">
                            <label htmlFor={`excel-upload-${entityName}`}>
                                <Button asChild variant="default" className="cursor-pointer">
                                    <span>Chọn file Excel</span>
                                </Button>
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Tải file mẫu (.xlsx)
                            </Button>
                        </div>
                        <div className="mt-8 text-xs text-muted-foreground text-center">
                            <p className="font-semibold mb-1">Cột bắt buộc:</p>
                            <div className="flex flex-wrap gap-1 justify-center max-w-md">
                                {columns.filter(c => c.required).map(c => (
                                    <Badge key={c.key} variant="outline" className="bg-white">{c.header}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <>
                        <div className="flex items-center gap-4 py-2 border-b">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Tổng: {stats.total}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Hợp lệ: {stats.valid}
                            </Badge>
                            {stats.invalid > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Lỗi: {stats.invalid}
                                </Badge>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 rounded border">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="w-[80px]">Check</TableHead>
                                        {columns.slice(0, 8).map(col => (
                                            <TableHead key={col.key} className="whitespace-nowrap">
                                                {col.header} {col.required && <span className="text-red-500">*</span>}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importRows.map((row, idx) => (
                                        <TableRow key={idx} className={!row.isValid ? "bg-red-50" : ""}>
                                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell>
                                                {row.isValid ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-600" title={row.errors.map(e => e.message).join('\n')}>
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-xs font-bold">{row.errors.length}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            {columns.slice(0, 8).map(col => {
                                                const error = row.errors.find(e => e.column === col.key);
                                                return (
                                                    <TableCell key={col.key} className={cn("text-xs max-w-[150px] truncate", error && "text-red-600 font-medium bg-red-100/50")}>
                                                        {error ? (
                                                            <span title={error.message}>{String(row.data[col.key] || '')}</span>
                                                        ) : (
                                                            <span title={String(row.data[col.key] || '')}>{String(row.data[col.key] || '')}</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {stats.invalid > 0 && (
                            <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {stats.invalid} dòng dữ liệu không hợp lệ sẽ bị bỏ qua.
                            </p>
                        )}
                    </>
                )}

                <DialogFooter className="mt-4">
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Chọn lại</Button>
                            <Button onClick={handleImportClick} disabled={stats.valid === 0 || isImporting}>
                                {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Nhập {stats.valid} dòng
                            </Button>
                        </>
                    )}
                    {step === 'upload' && <Button variant="ghost" onClick={handleClose}>Hủy bỏ</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
