import * as XLSX from 'xlsx';

export interface ImportColumn {
  key: string;
  header: string;
  required?: boolean;
}

export function prepareExcelData<T>(data: T[], columns: { key: string; header: string }[]) {
    return data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            // Support nested keys (e.g. vehicle.license_plate)
            const keys = col.key.split('.');
            let value: any = row;
            for (const k of keys) {
                value = (value as any)?.[k];
            }
            
            // Handle null/undefined
            obj[col.header] = value === null || value === undefined ? '' : value;
        });
        return obj;
    });
}

export function exportToCSV<T>(data: T[], filename: string, columns: { key: string; header: string }[]) {
    if (!data || data.length === 0) {
        return;
    }

    // Transform data into array of objects using exactly the specified columns
    const transformedData = prepareExcelData(data, columns);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Auto-fit column widths
    const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // Write file with Vietnamese filename and current date
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}

export function exportToJSON(data: unknown, filename: string) {
    if (!data) {
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function importFromFile(
  file: File,
  columns: ImportColumn[],
  onProgress?: (message: string) => void
): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('File Excel không chứa dữ liệu'));
          return;
        }

        // Validate required columns
        const requiredColumns = columns.filter(col => col.required).map(col => col.header);
        const excelHeaders = Object.keys(jsonData[0]);
        const missingColumns = requiredColumns.filter(col => !excelHeaders.includes(col));

        if (missingColumns.length > 0) {
          reject(new Error(`Các cột bắt buộc bị thiếu: ${missingColumns.join(', ')}`));
          return;
        }

        // Map Excel columns to database keys
        const mappedData = jsonData.map((row: Record<string, any>) => {
          const mappedRow: Record<string, any> = {};
          columns.forEach(col => {
            if (row[col.header] !== undefined && row[col.header] !== null && row[col.header] !== '') {
              mappedRow[col.key] = row[col.header];
            }
          });
          return mappedRow;
        });

        onProgress?.(`Đã đọc ${mappedData.length} bản ghi từ file`);
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * 📊 Xuất báo cáo thuế chuẩn VN — Mẫu B01-DN (Thông tư 200)
 * 
 * Multi-sheet Excel:
 * Sheet 1: Tổng hợp (Summary)
 * Sheet 2: Doanh thu theo chuyến
 * Sheet 3: Chi phí theo loại
 * Sheet 4: Lãi/Lỗ theo xe
 */
export function exportTaxReportB01DN(
    trips: any[],
    expenses: any[],
    companyName: string,
    reportMonth: number,
    reportYear: number,
) {
    const wb = XLSX.utils.book_new();
    const monthLabel = `T${String(reportMonth).padStart(2, '0')}/${reportYear}`;

    // Filter data for the specific month
    const isInMonth = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() + 1 === reportMonth && d.getFullYear() === reportYear;
    };

    const monthTrips = trips.filter(t => isInMonth(t.departure_date || t.created_at));
    const monthExpenses = expenses.filter(e => isInMonth(e.expense_date || e.created_at) && !e.is_deleted);

    const totalRevenue = monthTrips.reduce((s, t) => s + Number(t.total_revenue || t.freight_revenue || 0), 0);
    const totalExpense = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalProfit = totalRevenue - totalExpense;

    // === Sheet 1: Tổng hợp ===
    const summaryData = [
        [`BÁO CÁO KẾT QUẢ KINH DOANH — ${monthLabel}`],
        [`Đơn vị: ${companyName}`],
        [`Mẫu: B01-DN (Thông tư 200/2014-TT/BTC)`],
        [],
        ['CHỈ TIÊU', 'SỐ TIỀN (VNĐ)'],
        ['1. Doanh thu vận tải', totalRevenue],
        ['2. Tổng chi phí vận hành', totalExpense],
        ['3. Lợi nhuận gộp (1-2)', totalProfit],
        ['4. Số chuyến trong kỳ', monthTrips.length],
        ['5. Số phiếu chi trong kỳ', monthExpenses.length],
        [],
        ['Ngày xuất báo cáo:', new Date().toLocaleDateString('vi-VN')],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');

    // === Sheet 2: Doanh thu theo chuyến ===
    const revenueData = monthTrips.map(t => ({
        'Mã chuyến': t.trip_code || t.id,
        'Ngày': t.departure_date || t.created_at || '',
        'Tuyến': t.route?.route_name || t.route_name || '',
        'Xe': t.vehicle?.license_plate || '',
        'Tài xế': t.driver?.full_name || t.driver_name || '',
        'Cước vận chuyển': Number(t.freight_revenue || 0),
        'Phụ phí': Number(t.surcharge || 0),
        'Tổng doanh thu': Number(t.total_revenue || t.freight_revenue || 0),
        'Trạng thái': t.status,
    }));
    const ws2 = XLSX.utils.json_to_sheet(revenueData);
    ws2['!cols'] = Array(9).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws2, 'Doanh thu');

    // === Sheet 3: Chi phí theo loại ===
    const expenseData = monthExpenses.map(e => ({
        'Mã phiếu': e.expense_code || '',
        'Ngày chi': e.expense_date || e.created_at || '',
        'Loại chi phí': e.category?.category_name || e.category_id || '',
        'Diễn giải': e.description || '',
        'Số tiền': Number(e.amount || 0),
        'Xe': e.vehicle?.license_plate || '',
        'Chuyến': e.trip?.trip_code || '',
        'Trạng thái': e.status,
    }));
    const ws3 = XLSX.utils.json_to_sheet(expenseData);
    ws3['!cols'] = Array(8).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws3, 'Chi phí');

    // === Sheet 4: Lãi/Lỗ theo xe ===
    const vehicleMap = new Map<string, { plate: string; revenue: number; expense: number; trips: number }>();

    monthTrips.forEach(t => {
        const plate = t.vehicle?.license_plate || t.vehicle_plate || 'Không xác định';
        const existing = vehicleMap.get(plate) || { plate, revenue: 0, expense: 0, trips: 0 };
        existing.revenue += Number(t.total_revenue || t.freight_revenue || 0);
        existing.trips += 1;
        vehicleMap.set(plate, existing);
    });

    monthExpenses.forEach(e => {
        const plate = e.vehicle?.license_plate || 'Không xác định';
        const existing = vehicleMap.get(plate) || { plate, revenue: 0, expense: 0, trips: 0 };
        existing.expense += Number(e.amount || 0);
        vehicleMap.set(plate, existing);
    });

    const plData = Array.from(vehicleMap.values()).map(v => ({
        'Biển số xe': v.plate,
        'Số chuyến': v.trips,
        'Doanh thu': v.revenue,
        'Chi phí': v.expense,
        'Lợi nhuận': v.revenue - v.expense,
        'Biên lợi nhuận (%)': v.revenue > 0 ? Math.round(((v.revenue - v.expense) / v.revenue) * 100) : 0,
    }));
    const ws4 = XLSX.utils.json_to_sheet(plData);
    ws4['!cols'] = Array(6).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws4, 'Lãi lỗ theo xe');

    // Write file
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `BaoCao_B01DN_${monthLabel.replace('/', '-')}_${timestamp}.xlsx`);
}

