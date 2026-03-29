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

interface ColumnMapping {
    key: string;
    header: string;
    required: boolean;
    type: 'text' | 'number' | 'date';
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

const COLUMN_MAPPINGS: ColumnMapping[] = [
    { key: 'driver_code', header: 'Mã TX', required: true, type: 'text' },
    { key: 'full_name', header: 'Họ tên', required: true, type: 'text' },
    { key: 'phone', header: 'Điện thoại', required: false, type: 'text' },
    { key: 'date_of_birth', header: 'Ngày sinh', required: false, type: 'date' },
    { key: 'tax_code', header: 'Mã số thuế', required: false, type: 'text' },
    { key: 'id_card', header: 'Số CCCD', required: false, type: 'text' },
    { key: 'id_issue_date', header: 'Cấp ngày', required: false, type: 'date' },
    { key: 'address', header: 'Hộ khẩu TT', required: false, type: 'text' },
    { key: 'license_class', header: 'Hạng GPLX', required: false, type: 'text' },
    { key: 'license_expiry', header: 'Hết hạn GPLX', required: false, type: 'date' },
    { key: 'hire_date', header: 'Ngày vào làm', required: false, type: 'date' },
    { key: 'contract_type', header: 'Loại HĐ', required: false, type: 'text' },
    { key: 'base_salary', header: 'Lương cơ bản', required: false, type: 'number' },
    { key: 'status', header: 'Trạng thái', required: false, type: 'text' },
    { key: 'notes', header: 'Ghi chú', required: false, type: 'text' },
];

interface DriverImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: Record<string, unknown>[]) => Promise<void>;
    existingCodes: string[];
}

export function DriverImportDialog({
    isOpen,
    onClose,
    onImport,
    existingCodes,
}: DriverImportDialogProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const validateRow = (row: Record<string, unknown>, index: number): ImportRow => {
        const errors: ValidationError[] = [];
        const data = { ...row };

        // Required fields
        if (!data.driver_code) {
            errors.push({ row: index, column: 'driver_code', message: 'Mã tài xế không được để trống.' });
        }
        if (!data.full_name) {
            errors.push({ row: index, column: 'full_name', message: 'Họ tên không được để trống.' });
        }

        // Duplicate checks
        if (data.driver_code && existingCodes.includes(String(data.driver_code))) {
            errors.push({ row: index, column: 'driver_code', message: 'Mã tài xế đã tồn tại. Vui lòng kiểm tra lại.' });
        }

        // Phone validation (Vietnam format)
        if (data.phone) {
            const phone = String(data.phone).replace(/\D/g, '');
            // Vietnamese phone: 10 digits (0xxxxxxxxx) or 11 digits (84xxxxxxxxx)
            const isValid = (phone.length === 10 && phone.startsWith('0')) ||
                (phone.length === 11 && phone.startsWith('84'));
            if (!isValid && phone.length > 0) {
                errors.push({ row: index, column: 'phone', message: 'Số điện thoại phải có 10 số (bắt đầu bằng 0) hoặc 11 số (bắt đầu bằng 84).' });
            }
        }

        // CCCD validation (9 or 12 digits)
        if (data.id_card) {
            const idCard = String(data.id_card).replace(/\D/g, '');
            if (idCard.length !== 9 && idCard.length !== 12) {
                errors.push({ row: index, column: 'id_card', message: 'Số CCCD không hợp lệ.' });
            }
        }

        // License expiry warning
        if (data.license_expiry) {
            const expiryDate = new Date(data.license_expiry as string);
            if (expiryDate < new Date()) {
                errors.push({ row: index, column: 'license_expiry', message: 'GPLX đã hết hạn. Vui lòng cập nhật.' });
            }
        }

        // Base salary validation
        if (data.base_salary !== undefined && data.base_salary !== null && data.base_salary !== '') {
            const num = Number(data.base_salary);
            if (isNaN(num) || num < 0) {
                errors.push({ row: index, column: 'base_salary', message: 'Lương cơ bản phải >= 0.' });
            } else {
                data.base_salary = num;
            }
        }

        // Status normalization
        if (data.status) {
            const normalizedStatus = String(data.status).toLowerCase().trim();
            const statusMap: Record<string, string> = {
                'đang làm việc': 'active',
                'hoạt động': 'active',
                'active': 'active',
                'nghỉ phép': 'on_leave',
                'on_leave': 'on_leave',
                'ngừng làm việc': 'inactive',
                'ngừng': 'inactive',
                'inactive': 'inactive',
            };
            data.status = statusMap[normalizedStatus] || 'active';
        } else {
            data.status = 'active';
        }

        return {
            data,
            errors: errors.filter(e => !e.message.includes('Vui lòng cập nhật')), // Don't block on warnings
            isValid: errors.filter(e => !e.message.includes('Vui lòng cập nhật')).length === 0,
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

                // Helper function to normalize column headers (remove special chars, trim)
                const normalizeHeader = (header: string): string => {
                    return header
                        .replace(/[+*\s]/g, '') // Remove +, *, and spaces
                        .toLowerCase()
                        .trim();
                };

                // Helper to convert Excel serial date to ISO string
                const formatExcelDate = (val: any): string | any => {
                    if (typeof val === 'number') {
                        // Excel dates are number of days since 1900-01-01
                        const date = new Date(Math.round((val - 25569) * 864e5));
                        return date.toISOString().split('T')[0];
                    }
                    if (typeof val === 'string') {
                        // Try to parse dd/mm/yyyy
                        const parts = val.split(/[/.-]/);
                        if (parts.length === 3) {
                            const [d, m, y] = parts.map(Number);
                            if (y > 1000) return new Date(y, m - 1, d).toISOString().split('T')[0];
                        }
                    }
                    return val;
                };

                const mappedData = jsonData.map((row: unknown) => {
                    const rowData = row as Record<string, unknown>;
                    const mapped: Record<string, unknown> = {};

                    COLUMN_MAPPINGS.forEach(col => {
                        // Try exact match first
                        let value = rowData[col.header] ?? rowData[col.key];

                        // If not found, try normalized matching
                        if (value === undefined) {
                            const normalizedTarget = normalizeHeader(col.header);
                            const matchingKey = Object.keys(rowData).find(key =>
                                normalizeHeader(key) === normalizedTarget
                            );
                            if (matchingKey) {
                                value = rowData[matchingKey];
                            }
                        }

                        if (value !== undefined) {
                            // Format date if needed
                            if (col.type === 'date' && value) {
                                mapped[col.key] = formatExcelDate(value);
                            } else {
                                mapped[col.key] = value;
                            }
                        }
                    });

                    return mapped;
                });

                handleDataUploaded(mappedData);
            };

            reader.readAsBinaryString(file);
        } catch (error) {
            console.error('Error reading Excel file:', error);
        }
    };

    const handleImport = async () => {
        const validRows = importRows.filter(r => r.isValid).map(r => r.data);
        if (validRows.length === 0) return;

        setIsImporting(true);
        try {
            await onImport(validRows);
            handleClose();
        } catch (error) {
            console.error('Import error:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setStep('upload');
        setImportRows([]);
        onClose();
    };

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');

            // Create sample data with correct format
            const sampleData = [
                {
                    'Mã TX': 'TX0001',
                    'Họ tên': 'Nguyễn Văn A',
                    'Điện thoại': '0901234567',
                    'Ngày sinh': '15/03/1985',
                    'Mã số thuế': '8012345678',
                    'Số CCCD': '001234567890',
                    'Cấp ngày': '01/01/2020',
                    'Hộ khẩu TT': 'Hà Nội',
                    'Hạng GPLX': 'C',
                    'Hết hạn GPLX': '31/12/2025',
                    'Ngày vào làm': '01/01/2023',
                    'Loại HĐ': 'Chính thức',
                    'Lương cơ bản': 8000000,
                    'Trạng thái': 'Đang làm việc',
                    'Ghi chú': 'Tài xế giỏi'
                },
                {
                    'Mã TX': 'TX0002',
                    'Họ tên': 'Trần Thị B',
                    'Điện thoại': '0912345678',
                    'Ngày sinh': '20/05/1990',
                    'Mã số thuế': '8023456789',
                    'Số CCCD': '002345678901',
                    'Cấp ngày': '15/02/2021',
                    'Hộ khẩu TT': 'TP.HCM',
                    'Hạng GPLX': 'D',
                    'Hết hạn GPLX': '30/06/2026',
                    'Ngày vào làm': '15/03/2023',
                    'Loại HĐ': 'Thử việc',
                    'Lương cơ bản': 7000000,
                    'Trạng thái': 'Đang làm việc',
                    'Ghi chú': ''
                },
                {
                    'Mã TX': 'TX0003',
                    'Họ tên': 'Lê Văn C',
                    'Điện thoại': '0923456789',
                    'Ngày sinh': '10/08/1988',
                    'Mã số thuế': '',
                    'Số CCCD': '003456789012',
                    'Cấp ngày': '20/03/2022',
                    'Hộ khẩu TT': 'Đà Nẵng',
                    'Hạng GPLX': 'E',
                    'Hết hạn GPLX': '15/09/2027',
                    'Ngày vào làm': '01/06/2023',
                    'Loại HĐ': 'Chính thức',
                    'Lương cơ bản': 9000000,
                    'Trạng thái': 'Đang làm việc',
                    'Ghi chú': 'Kinh nghiệm 10 năm'
                }
            ];

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(sampleData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 10 },  // Mã TX
                { wch: 20 },  // Họ tên
                { wch: 12 },  // Điện thoại
                { wch: 12 },  // Ngày sinh
                { wch: 12 },  // Mã số thuế
                { wch: 14 },  // Số CCCD
                { wch: 12 },  // Cấp ngày
                { wch: 15 },  // Hộ khẩu TT
                { wch: 10 },  // Hạng GPLX
                { wch: 14 },  // Hết hạn GPLX
                { wch: 14 },  // Ngày vào làm
                { wch: 12 },  // Loại HĐ
                { wch: 14 },  // Lương cơ bản
                { wch: 16 },  // Trạng thái
                { wch: 20 },  // Ghi chú
            ];

            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Tài Xế');

            // Download file
            XLSX.writeFile(workbook, 'Template_Import_Tai_Xe.xlsx');
        } catch (error) {
            console.error('Error generating template:', error);
        }
    };

    const stats = useMemo(() => ({
        total: importRows.length,
        valid: importRows.filter(r => r.isValid).length,
        invalid: importRows.filter(r => !r.isValid).length,
    }), [importRows]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Nhập tài xế từ Excel
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file Excel (.xlsx, .xls, .csv) với 15 cột theo mẫu
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Kéo thả file hoặc click để chọn</p>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="driver-excel-upload"
                        />
                        <div className="flex flex-col items-center gap-2">
                            <label htmlFor="driver-excel-upload">
                                <Button asChild>
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

                        <p className="text-xs text-muted-foreground mt-6">
                            Cột bắt buộc: <strong>Mã TX</strong>, <strong>Họ tên</strong>
                        </p>
                    </div>
                )}

                {step === 'preview' && (
                    <>
                        <div className="flex items-center gap-4 py-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Tổng: {stats.total} dòng
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

                        <div className="flex-1 border rounded-lg overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted z-10">
                                    <TableRow>
                                        <TableHead className="w-8">#</TableHead>
                                        <TableHead className="w-16">Status</TableHead>
                                        {COLUMN_MAPPINGS.slice(0, 8).map(col => (
                                            <TableHead key={col.key} className="whitespace-nowrap">
                                                {col.header}
                                                {col.required && <span className="text-destructive">*</span>}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importRows.map((row, index) => (
                                        <TableRow key={index} className={cn(!row.isValid && 'bg-red-50')}>
                                            <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell>
                                                {row.isValid ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                                        <span className="text-xs text-red-600">{row.errors.length}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            {COLUMN_MAPPINGS.slice(0, 8).map(col => {
                                                const hasError = row.errors.some(e => e.column === col.key);
                                                const errorMsg = row.errors.find(e => e.column === col.key)?.message;
                                                return (
                                                    <TableCell
                                                        key={col.key}
                                                        className={cn(
                                                            'text-xs max-w-[120px] truncate',
                                                            hasError && 'text-red-600 font-medium'
                                                        )}
                                                        title={hasError ? errorMsg : String(row.data[col.key] || '')}
                                                    >
                                                        {String(row.data[col.key] || '-')}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {stats.invalid > 0 && (
                            <p className="text-sm text-amber-600 mt-2">
                                ⚠️ {stats.invalid} dòng có lỗi sẽ bị bỏ qua khi nhập
                            </p>
                        )}
                    </>
                )}

                <DialogFooter>
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                <X className="w-4 h-4 mr-2" />
                                Chọn file khác
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={stats.valid === 0 || isImporting}
                            >
                                {isImporting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Nhập {stats.valid} dòng hợp lệ
                            </Button>
                        </>
                    )}
                    {step === 'upload' && (
                        <Button variant="outline" onClick={handleClose}>
                            Hủy
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
