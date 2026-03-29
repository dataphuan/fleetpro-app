// @ts-nocheck
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useCompanySettings, useSaveCompanySettings } from "@/hooks/useCompanySettings";
import { useSecuritySettings, useSaveSecuritySettings } from "@/hooks/useSecuritySettings";
import { useDataExport, useDataBackup, useBackupsList, useHealthCheck, usePurgeData } from "@/hooks/useDataManagement";
import { useUsers, useAddUser, useUpdateUserRole, useDeleteUser } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Users as UsersIcon,
  Trash2,
  Plus,
  Shield,
  Database,
  RefreshCw,
  Download,
  X,
  Bot,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { GDriveSettingsForm } from "@/components/settings/GDriveSettingsForm";
import { Cloud } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const hasElectronApi = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const { role, userId } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'company';

  // Update URL on tab change
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set('tab', value);
    navigate({ search: newParams.toString() }, { replace: true });
  };

  useEffect(() => {
    if (currentTab === 'lan') {
      handleTabChange('cloud');
    }
  }, [currentTab]);

  const { data: companySettings, isLoading: companyLoading } = useCompanySettings();
  const companySave = useSaveCompanySettings();

  const { data: securitySettings, isLoading: secLoading } = useSecuritySettings();
  const secSave = useSaveSecuritySettings();

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const addUserMutation = useAddUser();
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  const { exportData } = useDataExport();
  const { performBackup, exportBackup } = useDataBackup();
  const { data: backups = [] } = useBackupsList();
  const { checkHealth } = useHealthCheck();
  const [healthResult, setHealthResult] = useState<any>(null);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const { purgeAllData } = usePurgeData();
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purging, setPurging] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    company_name: '', tax_code: '', address: '', phone: '', email: '', website: ''
  });

  const [secForm, setSecForm] = useState({
    two_factor_enabled: false, lock_completed_data: false, log_all_actions: false, auto_logout_30min: false
  });

  const [addUserForm, setAddUserForm] = useState({
    email: '', full_name: '', password: '', role: 'viewer'
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Sync state with fetching
  useEffect(() => {
    if (companySettings) {
      setCompanyForm({
        company_name: companySettings.company_name || '',
        tax_code: companySettings.tax_code || '',
        address: companySettings.address || '',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        website: companySettings.website || ''
      });
    }
  }, [companySettings]);

  useEffect(() => {
    if (securitySettings) {
      setSecForm({
        two_factor_enabled: !!securitySettings.two_factor_enabled,
        lock_completed_data: !!securitySettings.lock_completed_data,
        log_all_actions: !!securitySettings.log_all_actions,
        auto_logout_30min: !!securitySettings.auto_logout_30min,
      });
    }
  }, [securitySettings]);


  const handleAddUser = () => {
    addUserMutation.mutate(addUserForm, {
      onSuccess: () => {
        setShowAddUserModal(false);
        setAddUserForm({ email: '', full_name: '', password: '', role: 'viewer' });
      }
    });
  };

  const handleDeleteUser = (id: string) => {
    // confirm is not available in Electron sometimes, use window.confirm
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      deleteUserMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Cài Đặt Hệ Thống"
        description="Quản lý cấu hình và tùy chỉnh hệ thống"
      />

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap w-full lg:w-auto justify-start h-auto gap-1 p-1">
          <TabsTrigger value="company" className="gap-2 flex-1 lg:flex-none">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Công ty</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 flex-1 lg:flex-none">
            <UsersIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Người dùng</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 flex-1 lg:flex-none">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Bảo mật</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 flex-1 lg:flex-none">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Dữ liệu</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 flex-1 lg:flex-none">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </TabsTrigger>

          <div className="hidden lg:block w-px h-6 bg-border mx-1 self-center"></div>

          <TabsTrigger 
            value="cloud" 
            className="gap-2 flex-1 lg:flex-none transition-all duration-300
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 
              data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/20
              data-[state=inactive]:text-blue-600 dark:data-[state=inactive]:text-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Đám mây Firebase</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>
                Cập nhật thông tin doanh nghiệp (chỉ Admin)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Tên công ty</Label>
                  <Input
                    id="company_name"
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, company_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_code">Mã số thuế</Label>
                  <Input id="tax_code" value={companyForm.tax_code} onChange={(e) => setCompanyForm((s) => ({ ...s, tax_code: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input id="address" value={companyForm.address} onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" value={companyForm.phone} onChange={(e) => setCompanyForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={companyForm.email} onChange={(e) => setCompanyForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={companyForm.website} onChange={(e) => setCompanyForm((s) => ({ ...s, website: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => companySave.mutate(companyForm)} disabled={companySave.isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${companySave.isLoading ? 'animate-spin' : ''}`} />
                  Lưu thay đổi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>
                Phân quyền và quản lý tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => setShowAddUserModal(true)} className="mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm người dùng
                </Button>

                {/* Add User Modal */}
                {showAddUserModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Thêm người dùng mới</CardTitle>
                        <button onClick={() => setShowAddUserModal(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input type="email" placeholder="user@company.vn" value={addUserForm.email} onChange={(e) => setAddUserForm(s => ({ ...s, email: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Họ tên</Label>
                          <Input placeholder="Nguyễn Văn A" value={addUserForm.full_name} onChange={(e) => setAddUserForm(s => ({ ...s, full_name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Mật khẩu tạm</Label>
                          <Input type="password" placeholder="Mật khẩu tạm thời" value={addUserForm.password} onChange={(e) => setAddUserForm(s => ({ ...s, password: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Quyền</Label>
                          <select className="w-full px-3 py-2 border rounded-md" value={addUserForm.role} onChange={(e) => setAddUserForm(s => ({ ...s, role: e.target.value }))}>
                            <option value="admin">Quản trị viên</option>
                            <option value="manager">Quản lý</option>
                            <option value="dispatcher">Điều phối</option>
                            <option value="accountant">Kế toán</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddUser} disabled={addUserMutation.isLoading} className="flex-1">
                            Thêm
                          </Button>
                          <Button variant="outline" onClick={() => setShowAddUserModal(false)} className="flex-1">
                            Hủy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Users Table */}
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Họ tên</th>
                        <th className="px-4 py-2 text-left">Quyền</th>
                        <th className="px-4 py-2 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-center text-muted-foreground">
                            Đang tải...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-center text-muted-foreground">
                            Không có người dùng
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="border-t hover:bg-muted/50">
                            <td className="px-4 py-2">{u.email}</td>
                            <td className="px-4 py-2">{u.user_metadata?.full_name || '—'}</td>
                            <td className="px-4 py-2">
                              <select
                                value={u.role || 'viewer'}
                                onChange={(e) => updateRoleMutation.mutate({ user_id: u.id, role: e.target.value })}
                                className="px-2 py-1 border rounded text-xs"
                                disabled={updateRoleMutation.isLoading}
                              >
                                <option value="admin">Quản trị viên</option>
                                <option value="manager">Quản lý</option>
                                <option value="dispatcher">Điều phối</option>
                                <option value="accountant">Kế toán</option>
                                <option value="driver">Tài xế</option>
                                <option value="viewer">Xem</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={deleteUserMutation.isLoading}
                                className="text-red-500 hover:text-red-700 inline-flex"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Bảo mật & Quyền truy cập</CardTitle>
              <CardDescription>
                Cài đặt bảo mật hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Yêu cầu xác thực 2 bước</Label>
                  <p className="text-sm text-muted-foreground">
                    Bảo vệ tài khoản bằng xác thực 2 bước
                  </p>
                </div>
                <Switch
                  checked={secForm.two_factor_enabled}
                  onCheckedChange={(checked) => setSecForm(s => ({ ...s, two_factor_enabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Khóa chỉnh sửa dữ liệu đã chốt</Label>
                  <p className="text-sm text-muted-foreground">
                    Không cho phép sửa chuyến/chi phí đã hoàn thành
                  </p>
                </div>
                <Switch
                  checked={secForm.lock_completed_data}
                  onCheckedChange={(checked) => setSecForm(s => ({ ...s, lock_completed_data: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ghi log tất cả thao tác</Label>
                  <p className="text-sm text-muted-foreground">
                    Lưu lại lịch sử tất cả các thay đổi
                  </p>
                </div>
                <Switch
                  checked={secForm.log_all_actions}
                  onCheckedChange={(checked) => setSecForm(s => ({ ...s, log_all_actions: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tự động đăng xuất sau 30 phút</Label>
                  <p className="text-sm text-muted-foreground">
                    Đăng xuất tự động khi không hoạt động
                  </p>
                </div>
                <Switch
                  checked={secForm.auto_logout_30min}
                  onCheckedChange={(checked) => setSecForm(s => ({ ...s, auto_logout_30min: checked }))}
                />
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button onClick={() => secSave.mutate(secForm)} disabled={secSave.isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${secSave.isLoading ? 'animate-spin' : ''}`} />
                  Lưu cấu hình bảo mật
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Change Password Section */}
          <div className="mt-6">
            <ChangePasswordForm userId={userId || ''} />
          </div>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý dữ liệu</CardTitle>
              <CardDescription>
                Sao lưu, khôi phục và xuất dữ liệu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <RefreshCw className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">Sao lưu dữ liệu</p>
                        <p className="text-sm text-muted-foreground">
                          Sao lưu tất cả dữ liệu hệ thống
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => performBackup()}>
                      Sao lưu ngay
                    </Button>
                  </CardContent>
                </Card>

                {/* Integrity Check */}
                {hasElectronApi && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">Kiểm tra dữ liệu</p>
                          <p className="text-sm text-muted-foreground">
                            Quét lỗi mồ côi, trùng lặp
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" onClick={async () => {
                        const res = await checkHealth();
                        if (res.success) {
                          setHealthResult(res.data);
                          setHealthDialogOpen(true);
                        } else {
                          toast({ title: 'Lỗi', description: res.error, variant: 'destructive' });
                        }
                      }}>
                        Kiểm tra ngay
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Download className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Xuất dữ liệu</p>
                        <p className="text-sm text-muted-foreground">
                          Xuất ra file JSON/CSV/Excel
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 text-sm" onClick={() => exportData('json')}>
                        JSON
                      </Button>
                      <Button variant="outline" className="flex-1 text-sm" onClick={() => exportData('csv')}>
                        CSV
                      </Button>
                      <Button variant="outline" className="flex-1 text-sm bg-green-50 border-green-200 text-green-700 hover:bg-green-100" onClick={() => exportData('excel')}>
                        Excel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Backups List */}
              {hasElectronApi && (
                <Card>
                  <CardHeader>
                    <CardTitle>Danh sách bản sao lưu (SQLite)</CardTitle>
                    <CardDescription>
                      Danh sách các file backup hệ thống (Lưu nội bộ)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left">Tên file</th>
                            <th className="px-4 py-2 text-left">Ngày tạo</th>
                            <th className="px-4 py-2 text-left">Kích thước</th>
                            <th className="px-4 py-2 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backups.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Chưa có bản sao lưu nào</td></tr>
                          ) : (
                            backups.map((bk: any) => (
                              <tr key={bk.name} className="border-t">
                                <td className="px-4 py-2 font-medium">{bk.name}</td>
                                <td className="px-4 py-2">{new Date(bk.createdAt).toLocaleString('vi-VN')}</td>
                                <td className="px-4 py-2">{(bk.size / 1024 / 1024).toFixed(2)} MB</td>
                                <td className="px-4 py-2 text-right">
                                  <Button variant="outline" size="sm" onClick={() => exportBackup(bk.path)}>
                                    <Download className="w-3 h-3 mr-1" /> Xuất file
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Lưu ý:</strong> Sao lưu tạo một bản sao toàn bộ dữ liệu của bạn.
                  Các sao lưu được lưu trữ và tải về máy.
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Danger Zone - Admin Only */}
          {hasElectronApi && role === 'admin' && (
            <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Vùng nguy hiểm
                </CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/80">
                  Xóa toàn bộ dữ liệu để nhập dữ liệu thực tế. Hệ thống sẽ tự động tạo bản sao lưu trước khi xóa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => { setPurgeConfirmText(''); setPurgeDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa toàn bộ dữ liệu
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <AISettingsForm />
        </TabsContent>

        <TabsContent value="cloud">
          <GDriveSettingsForm />
        </TabsContent>
      </Tabs>

      {/* Health Check Dialog */}
      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kết quả kiểm tra dữ liệu</DialogTitle>
            <DialogDescription>
              {healthResult?.status === 'CLEAN' ? (
                <div className="flex flex-col items-center py-4 text-green-600">
                  <div className="p-3 bg-green-100 rounded-full mb-2"><CheckCircle className="w-8 h-8" /></div>
                  <span className="font-bold text-lg">Hệ thống khỏe mạnh (100% Clean)</span>
                  <p className="text-sm text-center text-muted-foreground mt-2">Không tìm thấy lỗi dữ liệu nào.</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="flex items-center gap-2 mb-2 text-red-600 font-bold">
                    <AlertCircle className="w-5 h-5" /> Phát hiện {healthResult?.errors?.length} vấn đề lỗi:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-red-700 max-h-40 overflow-y-auto">
                    {healthResult?.errors?.map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setHealthDialogOpen(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation Dialog */}
      <Dialog open={purgeDialogOpen} onOpenChange={(open) => {
        if (!open) { setPurgeDialogOpen(false); setPurgeConfirmText(''); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Xác nhận xóa toàn bộ dữ liệu
            </DialogTitle>
            <DialogDescription>
              <span className="block mb-2">
                Thao tác này sẽ <strong className="text-red-600">xóa toàn bộ</strong> dữ liệu: xe, tài xế, khách hàng,
                tuyến đường, chuyến xe, chi phí, bảo trì, nhật ký.
              </span>
              <span className="block mb-2">
                Bản sao lưu sẽ được tạo tự động trước khi xóa. Tài khoản người dùng và cài đặt công ty sẽ được giữ lại.
              </span>
              <span className="block font-bold text-red-600">
                Nhập CONFIRM để xác nhận:
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Nhập CONFIRM"
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              className="border-red-300 focus:border-red-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPurgeDialogOpen(false); setPurgeConfirmText(''); }}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={purgeConfirmText !== 'CONFIRM' || purging}
              onClick={async () => {
                setPurging(true);
                const res = await purgeAllData();
                setPurging(false);
                setPurgeDialogOpen(false);
                setPurgeConfirmText('');
              }}
            >
              {purging ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang xóa...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Xóa tất cả</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
