import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: typeof autoTable;
    }
}

export interface PDFColumn {
    header: string;
    dataKey: string;
    width?: number;
}

export interface PDFExportOptions {
    title: string;
    subtitle?: string;
    filename: string;
    columns: PDFColumn[];
    data: any[];
    orientation?: 'portrait' | 'landscape';
    showFooter?: boolean;
}

/**
 * Export data to PDF with professional formatting
 */
export function exportToPDF(options: PDFExportOptions) {
    const {
        title,
        subtitle,
        filename,
        columns,
        data,
        orientation = 'landscape',
        showFooter = true
    } = options;

    // Create new PDF document
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
    });

    // Add Vietnamese font support (using default fonts for now)
    doc.setFont('helvetica');

    // Header Section
    let yPosition = 15;

    // Company name
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('CÔNG TY VẬN TẢI SAVACO', 14, yPosition);
    yPosition += 5;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPosition);
    yPosition += 7;

    // Subtitle
    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, 14, yPosition);
        yPosition += 5;
    }

    // Date
    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi });
    doc.text(`Ngày xuất: ${dateStr}`, 14, yPosition);
    yPosition += 10;

    // Table
    autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(c => {
            const value = row[c.dataKey];
            // Format numbers and currency
            if (typeof value === 'number') {
                if (c.dataKey.includes('revenue') || c.dataKey.includes('expense') || c.dataKey.includes('profit') || c.dataKey.includes('cost')) {
                    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
                }
                return new Intl.NumberFormat('vi-VN').format(value);
            }
            return value || '';
        })),
        startY: yPosition,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            halign: 'left'
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: columns.reduce((acc, col, index) => {
            acc[index] = {
                cellWidth: col.width || 'auto',
                halign: col.dataKey.includes('count') || col.dataKey.includes('revenue') || col.dataKey.includes('expense') || col.dataKey.includes('profit') || col.dataKey.includes('pct')
                    ? 'right'
                    : 'left'
            };
            return acc;
        }, {} as any),
        didDrawPage: (data) => {
            // Footer
            if (showFooter) {
                const pageCount = (doc as any).internal.getNumberOfPages();
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height || pageSize.getHeight();

                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Trang ${data.pageNumber} / ${pageCount}`,
                    pageSize.width / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        }
    });

    // Save PDF
    doc.save(filename);
}

/**
 * Export Fleet Report to PDF
 */
export function exportFleetReportToPDF(data: any[], groupBy: string) {
    const groupByLabel = groupBy === 'vehicle_type' ? 'Loại xe' : 'Trạng thái xe';

    exportToPDF({
        title: 'BÁO CÁO TỔNG HỢP THEO ĐỘI XE',
        subtitle: `Nhóm theo: ${groupByLabel}`,
        filename: `BaoCao_DoiXe_${groupBy}_${format(new Date(), 'ddMMyyyy_HHmmss')}.pdf`,
        columns: [
            { header: 'Nhóm', dataKey: 'group_name', width: 40 },
            { header: 'Số lượng xe', dataKey: 'items_count', width: 25 },
            { header: 'Tổng chuyến', dataKey: 'trip_count', width: 25 },
            { header: 'Doanh thu', dataKey: 'total_revenue', width: 35 },
            { header: 'Chi phí', dataKey: 'total_expense', width: 35 },
            { header: 'Lợi nhuận', dataKey: 'profit', width: 35 },
            { header: 'Biên LN (%)', dataKey: 'profit_margin_pct', width: 25 }
        ],
        data,
        orientation: 'landscape'
    });
}

/**
 * Export Vehicle Report to PDF
 */
export function exportVehicleReportToPDF(data: any[]) {
    exportToPDF({
        title: 'BÁO CÁO TỔNG HỢP THEO XE',
        subtitle: 'Chi tiết hiệu suất từng xe',
        filename: `BaoCao_TheoXe_${format(new Date(), 'ddMMyyyy_HHmmss')}.pdf`,
        columns: [
            { header: 'Biển số', dataKey: 'license_plate', width: 30 },
            { header: 'Loại xe', dataKey: 'vehicle_type', width: 30 },
            { header: 'Tổng chuyến', dataKey: 'trip_count', width: 25 },
            { header: 'Doanh thu', dataKey: 'total_revenue', width: 35 },
            { header: 'Chi phí', dataKey: 'total_expense', width: 35 },
            { header: 'Lợi nhuận', dataKey: 'profit', width: 35 },
            { header: 'Biên LN (%)', dataKey: 'profit_margin_pct', width: 25 }
        ],
        data,
        orientation: 'landscape'
    });
}

/**
 * Export Driver Report to PDF
 */
export function exportDriverReportToPDF(data: any[]) {
    exportToPDF({
        title: 'BÁO CÁO TỔNG HỢP THEO TÀI XẾ',
        subtitle: 'Chi tiết hiệu suất từng tài xế',
        filename: `BaoCao_TheoTaiXe_${format(new Date(), 'ddMMyyyy_HHmmss')}.pdf`,
        columns: [
            { header: 'Tài xế', dataKey: 'driver_name', width: 40 },
            { header: 'SĐT', dataKey: 'phone', width: 30 },
            { header: 'Tổng chuyến', dataKey: 'trip_count', width: 25 },
            { header: 'Doanh thu', dataKey: 'total_revenue', width: 35 },
            { header: 'Chi phí', dataKey: 'total_expense', width: 35 },
            { header: 'Lợi nhuận', dataKey: 'profit', width: 35 }
        ],
        data,
        orientation: 'landscape'
    });
}
