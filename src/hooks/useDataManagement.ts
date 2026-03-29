import { useToast } from '@/hooks/use-toast';
import {
  tripAdapter,
  expenseAdapter,
  driverAdapter,
  vehicleAdapter,
  routeAdapter,
  customerAdapter
} from '@/lib/data-adapter';
import { prepareExcelData } from '@/lib/export';

export const useDataExport = () => {
  const { toast } = useToast();

  const exportData = async (format: 'json' | 'csv' | 'excel') => {
    try {
      // Fetch all main tables
      const trips = await tripAdapter.list();
      const expenses = await expenseAdapter.list();
      const drivers = await driverAdapter.list();
      const vehicles = await vehicleAdapter.list();
      const routes = await routeAdapter.list();
      const customers = await customerAdapter.list();

      // Define standard columns matching Excel Import templates
      const tripColumns = [
        { key: 'trip_code', header: 'Mã chuyến' },
        { key: 'departure_date', header: 'Ngày đi' },
        { key: 'vehicle.license_plate', header: 'Biển số xe' },
        { key: 'driver.full_name', header: 'Tài xế' },
        { key: 'customer.customer_name', header: 'Khách hàng' },
        { key: 'route.route_name', header: 'Tuyến đường' },
        { key: 'cargo_weight_tons', header: 'Tải trọng (tấn)' },
        { key: 'actual_distance_km', header: 'Km thực tế' },
        { key: 'freight_revenue', header: 'Doanh thu cước' },
        { key: 'additional_charges', header: 'Phụ phí' },
        { key: 'total_revenue', header: 'Tổng doanh thu' },
        { key: 'status', header: 'Trạng thái' },
        { key: 'notes', header: 'Ghi chú' },
      ];

      const expenseColumns = [
        { key: 'expense_code', header: 'Mã phiếu' },
        { key: 'expense_date', header: 'Ngày chi' },
        { key: 'category.category_name', header: 'Loại chi phí' },
        { key: 'description', header: 'Diễn giải' },
        { key: 'vehicle.license_plate', header: 'Biển số xe' },
        { key: 'amount', header: 'Số tiền' },
        { key: 'status', header: 'Trạng thái' },
      ];

      const driverColumns = [
        { key: 'driver_code', header: 'Mã TX' },
        { key: 'full_name', header: 'Họ tên' },
        { key: 'phone', header: 'Điện thoại' },
        { key: 'national_id', header: 'CCCD' },
        { key: 'birth_date', header: 'Ngày sinh' },
        { key: 'hometown', header: 'Quê quán' },
        { key: 'hire_date', header: 'Ngày vào làm' },
        { key: 'license_number', header: 'Số GPLX' },
        { key: 'license_class', header: 'Hạng' },
        { key: 'license_expiry', header: 'Hạn GPLX' },
        { key: 'license_issue_date', header: 'Ngày cấp GPLX' },
        { key: 'license_issue_place', header: 'Nơi cấp' },
        { key: 'experience_years', header: 'Thâm niên (năm)' },
        { key: 'base_salary', header: 'Lương cơ bản' },
        { key: 'status', header: 'Trạng thái' },
        { key: 'notes', header: 'Ghi chú' },
      ];

      const vehicleColumns = [
        { key: 'vehicle_code', header: 'Mã xe' },
        { key: 'license_plate', header: 'Biển số' },
        { key: 'vehicle_type', header: 'Loại xe' },
        { key: 'brand', header: 'Nhãn hiệu xe' },
        { key: 'capacity_tons', header: 'Tải trọng' },
        { key: 'fuel_type', header: 'Nhiên liệu' },
        { key: 'usage_limit_years', header: 'Niên hạn sử dụng' },
        { key: 'engine_number', header: 'Số máy' },
        { key: 'chassis_number', header: 'Số Khung' },
        { key: 'insurance_purchase_date', header: 'Ngày mua bảo hiểm' },
        { key: 'insurance_expiry_date', header: 'Ngày hết hạn bảo hiểm' },
        { key: 'insurance_cost', header: 'Số tiền mua bảo hiểm' },
        { key: 'registration_cycle', header: 'Chu kỳ đăng kiểm' },
        { key: 'registration_date', header: 'Ngày đăng kiểm' },
        { key: 'registration_expiry_date', header: 'Ngày hết hạn đăng kiểm' },
        { key: 'registration_cost', header: 'Số tiền đăng kiểm' },
        { key: 'current_location', header: 'Vị trí xe' },
        { key: 'status', header: 'Trạng thái xe' },
        { key: 'notes', header: 'Ghi chú' },
      ];

      const routeColumns = [
        { key: 'route_code', header: 'Mã tuyến' },
        { key: 'route_name', header: 'Tên tuyến' },
        { key: 'origin', header: 'Điểm đi' },
        { key: 'destination', header: 'Điểm đến' },
        { key: 'distance_km', header: 'Khoảng cách (km)' },
        { key: 'estimated_duration_hours', header: 'Thời gian (giờ)' },
        { key: 'cargo_type', header: 'Loại hàng' },
        { key: 'cargo_weight_standard', header: 'Số tấn' },
        { key: 'base_price', header: 'Đơn giá' },
        { key: 'transport_revenue_standard', header: 'Doanh thu VC' },
        { key: 'driver_allowance_standard', header: 'Tiền Tài Xế' },
        { key: 'support_fee_standard', header: 'Bồi Dưỡng' },
        { key: 'police_fee_standard', header: 'Công An' },
        { key: 'fuel_liters_standard', header: 'Số lít dầu' },
        { key: 'fuel_cost_standard', header: 'Tiền Dầu' },
        { key: 'tire_service_fee_standard', header: 'Bơm/Vá' },
        { key: 'toll_cost', header: 'Cầu đường' },
        { key: 'default_extra_fee', header: 'Phí khác' },
        { key: 'total_cost_standard', header: 'Tổng Chi' },
        { key: 'profit_standard', header: 'Lợi Nhuận' },
      ];

      const maintenanceColumns = [
        { key: 'order_code', header: 'Mã lệnh' },
        { key: 'vehicle.license_plate', header: 'Biển số xe' },
        { key: 'maintenance_type', header: 'Loại bảo trì' },
        { key: 'scheduled_date', header: 'Ngày dự kiến' },
        { key: 'actual_date', header: 'Ngày thực hiện' },
        { key: 'vendor_name', header: 'Đơn vị thực hiện' },
        { key: 'total_cost', header: 'Tổng chi phí' },
        { key: 'status', header: 'Trạng thái' },
      ];

      const customerColumns = [
        { key: 'customer_code', header: 'Mã KH' },
        { key: 'customer_name', header: 'Tên khách hàng' },
        { key: 'customer_type', header: 'Loại KH' },
        { key: 'tax_code', header: 'MST' },
        { key: 'contact_person', header: 'Người liên hệ' },
        { key: 'phone', header: 'Điện thoại' },
        { key: 'email', header: 'Email' },
        { key: 'address', header: 'Địa chỉ' },
        { key: 'credit_limit', header: 'Hạn mức công nợ' },
        { key: 'current_debt', header: 'Công nợ hiện tại' },
        { key: 'payment_terms', header: 'Hạn TT (ngày)' },
        { key: 'status', header: 'Trạng thái KH' },
        { key: 'notes', header: 'Ghi chú' },
      ];

      // Prepare data using standardized mappings
      const preparedData = {
        trips: prepareExcelData(trips, tripColumns),
        expenses: prepareExcelData(expenses, expenseColumns),
        drivers: prepareExcelData(drivers, driverColumns),
        vehicles: prepareExcelData(vehicles, vehicleColumns),
        routes: prepareExcelData(routes, routeColumns),
        customers: prepareExcelData(customers, customerColumns),
        maintenance: prepareExcelData(await (await import('@/lib/data-adapter')).maintenanceAdapter.list(), maintenanceColumns),
      };

      let content: string;
      let filename: string;

      if (format === 'json') {
        // Use raw objects for JSON format back-up
        const allData = { trips, expenses, drivers, vehicles, routes, customers };
        content = JSON.stringify(allData, null, 2);
        filename = `export_${new Date().toISOString().split('T')[0]}.json`;

        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'excel') {
        // Excel export with multiple sheets
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();

        // Add each table as a separate sheet
        const addSheet = (data: any[], sheetName: string) => {
          if (data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            // Auto width columns
            const colWidths = Object.keys(data[0]).map(key => ({
              wch: Math.max(key.length, 15)
            }));
            worksheet['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
          }
        };

        addSheet(preparedData.trips, 'Chuyến Xe');
        addSheet(preparedData.expenses, 'Chi Phí');
        addSheet(preparedData.drivers, 'Tài Xế');
        addSheet(preparedData.vehicles, 'Phương Tiện');
        addSheet(preparedData.routes, 'Tuyến Đường');
        addSheet(preparedData.customers, 'Khách Hàng');
        addSheet(preparedData.maintenance, 'Bảo Trì');

        filename = `export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
      } else {
        // CSV format - flatten and convert
        const csvRows: string[] = [];

        const appendCsvSection = (title: string, dataArray: any[]) => {
          csvRows.push(title);
          if (dataArray.length > 0) {
            csvRows.push(Object.keys(dataArray[0]).join(','));
            dataArray.forEach((row: any) => csvRows.push(Object.values(row).map(v => `"${v}"`).join(',')));
          }
          csvRows.push('');
        };

        appendCsvSection('===== CHUYẾN XE =====', preparedData.trips);
        appendCsvSection('===== CHI PHÍ =====', preparedData.expenses);
        appendCsvSection('===== TÀI XẾ =====', preparedData.drivers);
        appendCsvSection('===== PHƯƠNG TIỆN =====', preparedData.vehicles);
        appendCsvSection('===== TUYẾN ĐƯỜNG =====', preparedData.routes);
        appendCsvSection('===== KHÁCH HÀNG =====', preparedData.customers);
        appendCsvSection('===== BẢO TRÌ =====', preparedData.maintenance);

        content = csvRows.join('\n');
        filename = `export_${new Date().toISOString().split('T')[0]}.csv`;

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: 'Xuất dữ liệu thành công', description: `File đã được tải về.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Lỗi khi xuất';
      toast({ title: 'Lỗi xuất dữ liệu', description: msg, variant: 'destructive' });
    }
  };

  return { exportData };
};

import { isElectron } from '@/lib/data-adapter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useBackupsList = () => {
  return useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      if (!isElectron()) return [];
      // @ts-ignore
      const res = await window.electronAPI.backup.list();
      return res.success ? res.data : [];
    }
  });
};

export const useDataBackup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const performBackup = async () => {
    try {
      if (isElectron()) {
        // @ts-ignore
        const res = await window.electronAPI.backup.create();
        if (res.success) {
          toast({ title: 'Sao lưu thành công', description: `Đã tạo bản sao lưu: ${res.data.name}` });
          queryClient.invalidateQueries({ queryKey: ['backups'] });
          return;
        } else {
          throw new Error(res.error);
        }
      }

      // Web/Fallback logic
      // Fetch all critical tables
      const trips = await tripAdapter.list();
      const expenses = await expenseAdapter.list();
      const drivers = await driverAdapter.list();
      const vehicles = await vehicleAdapter.list();
      const routes = await routeAdapter.list();
      const customers = await customerAdapter.list();

      const backupData = {
        trips,
        expenses,
        drivers,
        vehicles,
        routes,
        customers,
        backup_at: new Date().toISOString()
      };

      const json = JSON.stringify(backupData, null, 2);
      const filename = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

      // Fallback: download backup file to user's computer
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Sao lưu thành công',
        description: `Tệp sao lưu ${filename} đã được tải về máy của bạn.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Lỗi khi sao lưu';
      toast({ title: 'Lỗi sao lưu', description: msg, variant: 'destructive' });
    }
  };

  const exportBackup = async (backupPath: string) => {
    try {
      if (!isElectron()) return;
      // @ts-ignore
      const res = await window.electronAPI.backup.export(backupPath);
      if (res.success) {
        toast({ title: 'Xuất file thành công', description: `Đã lưu file tại: ${res.filePath}` });
      } else if (res.error !== 'Cancelled') {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast({ title: 'Lỗi xuất file', description: error.message, variant: 'destructive' });
    }
  };

  return { performBackup, exportBackup };
};

export const useHealthCheck = () => {
  const { toast } = useToast();

  const checkHealth = async () => {
    try {
      if (!isElectron()) return { success: false, error: 'Only available in Electron' };
      // @ts-ignore
      const res = await window.electronAPI.debug.healthCheck();
      return res;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return { checkHealth };
};

export const usePurgeData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purgeAllData = async () => {
    try {
      if (!isElectron()) return { success: false, error: 'Only available in Electron' };
      // @ts-ignore
      const res = await window.electronAPI.database.purgeAll();
      if (res.success) {
        // Invalidate all caches so UI refreshes
        queryClient.invalidateQueries();
        toast({
          title: 'Xóa dữ liệu thành công',
          description: `Đã xóa tất cả dữ liệu. Bản sao lưu đã được tạo tự động.`,
        });
      }
      return res;
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
      return { success: false, error: error.message };
    }
  };

  return { purgeAllData };
};
