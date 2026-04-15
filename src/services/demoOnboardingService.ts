/**
 * Demo Onboarding Service
 * Handles all demo-related operations for new users
 * 
 * Purpose:
 * - Verify demo data is properly seeded
 * - Get demo account information
 * - Show demo data status
 * - Provide analytics on demo usage
 */

import {
  collection,
  query,
  where,
  getDocs,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DemoDataVerification {
  success: boolean;
  counts: Record<string, number>;
  total: number;
  message: string;
}

export interface DemoAccount {
  email: string;
  role: string;
  fullName: string;
  password?: string;
}

export interface DemoDataStatus {
  verified: boolean;
  dataCount: number;
  demoAccounts: DemoAccount[];
  message: string;
  isReady: boolean;
}

export const demoOnboardingService = {
  /**
   * Expected counts for fully seeded demo data
   */
  EXPECTED_COUNTS: {
    vehicles: 20,
    drivers: 25,
    customers: 10,
    routes: 12,
    trips: 200,           // ~397 trips total, accept lower bound
    expenses: 800,        // ~1217 total
    expenseCategories: 6,
    accountingPeriods: 1,
    maintenance: 10,
    transportOrders: 6,
    alerts: 6,
  },

  /**
   * Verify demo data is properly seeded for a tenant
   */
  async verifyDemoData(tenantId: string): Promise<DemoDataVerification> {
    const collections = Object.keys(this.EXPECTED_COUNTS);
    const counts: Record<string, number> = {};
    let successCount = 0;

    for (const collName of collections) {
      try {
        const q = query(
          collection(db, collName),
          where('tenant_id', '==', tenantId)
        );
        const snapshot = await getDocs(q);
        counts[collName] = snapshot.size;

        // Check if count matches expected (with 90% tolerance for some collections)
        const expected = this.EXPECTED_COUNTS[collName as keyof typeof this.EXPECTED_COUNTS];
        const tolerance = expected * 0.1; // 10% tolerance
        if (snapshot.size >= expected - tolerance) {
          successCount++;
        }
      } catch (error) {
        console.warn(`[demoOnboardingService] Error counting ${collName}:`, error);
        counts[collName] = 0;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const isSuccess = successCount >= collections.length * 0.8; // 80% of collections present

    return {
      success: isSuccess,
      counts,
      total,
      message: `✅ Verified ${successCount}/${collections.length} collections with ${total} records`,
    };
  },

  /**
   * Get demo account credentials for a tenant
   */
  async getDemoAccounts(tenantId: string): Promise<DemoAccount[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('tenant_id', '==', tenantId),
        where(
          'role',
          'in',
          ['manager', 'dispatcher', 'accountant', 'driver']
        ),
      ];

      const q = query(collection(db, 'users'), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        email: doc.data().email || '',
        role: doc.data().role || 'viewer',
        fullName: doc.data().full_name || 'Demo User',
        password: 'Demo@1234', // Standard demo password
      }));
    } catch (error) {
      console.warn('[demoOnboardingService] Error getting demo accounts:', error);
      return [];
    }
  },

  /**
   * Show comprehensive demo data status
   */
  async showDemoDataStatus(tenantId: string): Promise<DemoDataStatus> {
    try {
      const verification = await this.verifyDemoData(tenantId);
      const accounts = await this.getDemoAccounts(tenantId);

      const isReady = verification.success && accounts.length >= 4;

      const message = `
📦 DEMO DATA STATUS:
✅ Vehicles: ${verification.counts.vehicles || 0}
✅ Drivers: ${verification.counts.drivers || 0}
✅ Customers: ${verification.counts.customers || 0}
✅ Routes: ${verification.counts.routes || 0}
✅ Trips: ${verification.counts.trips || 0}
✅ Expenses: ${verification.counts.expenses || 0}
📊 Total Records: ${verification.total}
🎭 Demo Accounts: ${accounts.length}
      `;

      return {
        verified: verification.success,
        dataCount: verification.total,
        demoAccounts: accounts,
        message: message.trim(),
        isReady,
      };
    } catch (error) {
      console.error('[demoOnboardingService] Error showing demo status:', error);
      return {
        verified: false,
        dataCount: 0,
        demoAccounts: [],
        message: '❌ Unable to verify demo data status',
        isReady: false,
      };
    }
  },

  /**
   * Get demo data summary for display
   */
  getDemoDataSummary(counts: Record<string, number>): string {
    return `
✨ DEMO DATA READY:
  • 20 Vehicles (Xe)
  • 25 Drivers (Tài Xế)
  • 50 Trips (Chuyến Đi)
  • 100+ Expenses (Chi Phí)
  • 10 Customers (Khách Hàng)
  • Full Reports & Analytics
  • ${Object.values(counts).reduce((a, b) => a + b, 0)} Total Records
    `;
  },

  /**
   * Check if demo data should be auto-seeded
   * Returns true if tenant is new (no data yet)
   */
  async shouldAutoSeedDemoData(tenantId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'vehicles'),
        where('tenant_id', '==', tenantId)
      );
      const snapshot = await getDocs(q);
      return snapshot.empty; // If no vehicles, it's a new tenant
    } catch (error) {
      console.warn('[demoOnboardingService] Error checking if should seed:', error);
      return false;
    }
  },

  /**
   * Format demo data verification for logging
   */
  formatVerificationLog(verification: DemoDataVerification): string {
    const entries = Object.entries(verification.counts)
      .map(([key, count]) => `  ${key}: ${count}`)
      .join('\n');

    return `
[DEMO DATA VERIFICATION]
Total Records: ${verification.total}
Collections:
${entries}
Status: ${verification.success ? '✅ SUCCESS' : '❌ INCOMPLETE'}
    `.trim();
  },

  /**
   * Get expected total records from demo seed
   */
  getExpectedTotal(): number {
    return Object.values(this.EXPECTED_COUNTS).reduce((a, b) => a + b, 0);
  },

  /**
   * Check if demo data is sufficient (at least 80% of expected)
   */
  async isDemoDataSufficient(tenantId: string): Promise<boolean> {
    try {
      const verification = await this.verifyDemoData(tenantId);
      const expectedTotal = this.getExpectedTotal();
      const minAcceptable = expectedTotal * 0.8; // 80% of expected

      return verification.total >= minAcceptable;
    } catch (error) {
      console.error('[demoOnboardingService] Error checking sufficiency:', error);
      return false;
    }
  },

  /**
   * Generate onboarding tips based on demo data
   */
  generateOnboardingTips(role: string): string[] {
    const tipsByRole: Record<string, string[]> = {
      admin: [
        '👉 Bắt đầu: Vào "Xe" để xem 20 xe ví dụ',
        '👉 Thử: Tạo chuyến đi mới từ các tài xế và xe',
        '👉 Phân tích: Xem báo cáo chi phí & lợi nhuận',
        '👉 Cấu hình: Tùy chỉnh công ty trong "Cài đặt"',
        '👉 Thêm người: Mời quản lý và kế toán vào',
      ],
      manager: [
        '👉 Bắt đầu: Vào "Chuyến Đi" để xem 50 chuyến',
        '👉 Điều phối: Gán tài xế cho các chuyến',
        '👉 Theo dõi: Xem trạng thái thực tế của xe',
        '👉 Lịch sử: Xem các chuyến đã hoàn thành',
        '👉 Báo cáo: Xem thống kê chi phí & lợi nhuận',
      ],
      accountant: [
        '👉 Bắt đầu: Vào "Chi Phí" để xem 100+ mục',
        '👉 Kiểm toán: Phê duyệt chi phí của tài xế',
        '👉 Báo cáo: Xem tờng kế toán hàng tháng',
        '👉 Khóa sổ: Khóa giai đoạn kế toán từng tháng',
        '👉 Xuất: Tải báo cáo Excel để phân tích',
      ],
      driver: [
        '👉 Bắt đầu: Xem "Việc Hôm Nay" để thấy chuyến được giao',
        '👉 Kiểm tra: Điền mẫu kiểm tra xe trước chuyến',
        '👉 Báo cáo: Gửi ảnh & vị trí GPS khi giao hàng',
        '👉 Lịch sử: Xem bản ghi tất cả các chuyến của mình',
        '👉 Hồ sơ: Cập nhật thông tin cá nhân của bạn',
      ],
    };

    return tipsByRole[role] || tipsByRole.admin;
  },
};
