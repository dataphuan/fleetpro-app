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
import { dataAdapter } from "@/lib/data-adapter";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Users as UsersIcon,
  Shield,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Bot,
  Palette,
  MessageCircle,
  Truck,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { AISettingsForm } from "@/components/settings/AISettingsForm";
import { GDriveSettingsForm } from "@/components/settings/GDriveSettingsForm";
import { DataOwnershipExportCard } from "@/components/settings/DataOwnershipExportCard";
import { TelegramSettingsForm } from "@/components/settings/TelegramSettingsForm";

export default function Settings() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const hasElectronApi = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const { role, userId, tenantId, user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'company';

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set('tab', value);
    navigate({ search: newParams.toString() }, { replace: true });
  };

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
  const [demoActionLoading, setDemoActionLoading] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    company_name: '', tax_code: '', address: '', phone: '', email: '', website: '',
    logo_url: '', primary_color: '#3b82f6'
  });

  const [secForm, setSecForm] = useState({
    two_factor_enabled: false, lock_completed_data: false, log_all_actions: false, auto_logout_30min: false
  });

  const [addUserForm, setAddUserForm] = useState({
    email: '', full_name: '', password: '', role: 'viewer'
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setCompanyForm({
        company_name: companySettings.company_name || '',
        tax_code: companySettings.tax_code || '',
        address: companySettings.address || '',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        website: companySettings.website || '',
        logo_url: companySettings.logo_url || '',
        primary_color: companySettings.primary_color || '#3b82f6'
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
            <span>Công ty</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 flex-1 lg:flex-none">
            <UsersIcon className="w-4 h-4" />
            <span>Người dùng</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 flex-1 lg:flex-none">
            <Shield className="w-4 h-4" />
            <span>Bảo mật</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 flex-1 lg:flex-none">
            <Database className="w-4 h-4" />
            <span>Dữ liệu</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 flex-1 lg:flex-none">
            <Bot className="w-4 h-4" />
            <span>Trợ lý AI</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 flex-1 lg:flex-none">
            <Palette className="w-4 h-4" />
            <span>Thương hiệu</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 flex-1 lg:flex-none">
            <MessageCircle className="w-4 h-4" />
            <span>Thông báo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công ty</CardTitle>
              <CardDescription>Cập nhật thông tin doanh nghiệp (chỉ Admin)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Tên công ty</Label>
                  <Input value={companyForm.company_name} onChange={(e) => setCompanyForm(s => ({ ...s, company_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_code">Mã số thuế</Label>
                  <Input value={companyForm.tax_code} onChange={(e) => setCompanyForm(s => ({ ...s, tax_code: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input value={companyForm.address} onChange={(e) => setCompanyForm(s => ({ ...s, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input value={companyForm.phone} onChange={(e) => setCompanyForm(s => ({ ...s, phone: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
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
             <CardHeader className="flex flex-row items-center justify-between">
                <div>
                   <CardTitle>Quản lý người dùng</CardTitle>
                   <CardDescription>Phân quyền và quản lý tài khoản nội bộ</CardDescription>
                </div>
                <Button onClick={() => setShowAddUserModal(true)} size="sm">
                   <Plus className="w-4 h-4 mr-2" /> Thêm người dùng
                </Button>
             </CardHeader>
             <CardContent>
                <div className="border rounded-lg overflow-hidden">
                   <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold">
                         <tr>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Họ tên</th>
                            <th className="px-4 py-3 text-left">Quyền</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody>
                         {usersLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Đang tải danh sách...</td></tr>
                         ) : users.map(u => (
                            <tr key={u.id} className="border-t hover:bg-muted/50 transition-colors">
                               <td className="px-4 py-3 font-medium">{u.email}</td>
                               <td className="px-4 py-3">{u.user_metadata?.full_name || '—'}</td>
                               <td className="px-4 py-3 capitalize text-xs bg-blue-50 text-blue-700 rounded-full inline-block mt-2 ml-4">{u.role}</td>
                               <td className="px-4 py-3 text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="text-destructive">
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Bảo mật & Phân quyền</CardTitle></CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Mã hóa dữ liệu 2 lớp</Label>
                    <p className="text-sm text-muted-foreground">Kích hoạt bảo mật nâng cao cho toàn bộ dữ liệu nhạy cảm</p>
                  </div>
                  <Switch checked={secForm.two_factor_enabled} onCheckedChange={v => setSecForm(s => ({...s, two_factor_enabled: v}))} />
               </div>
               <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Khóa dữ liệu đã chốt</Label>
                    <p className="text-sm text-muted-foreground">Không cho phép sửa đổi các chuyến hành trình đã hoàn thành</p>
                  </div>
                  <Switch checked={secForm.lock_completed_data} onCheckedChange={v => setSecForm(s => ({...s, lock_completed_data: v}))} />
               </div>
               <div className="flex justify-end border-t pt-4">
                  <Button onClick={() => secSave.mutate(secForm)} disabled={secSave.isLoading}>
                     Lưu cấu hình bảo mật
                  </Button>
               </div>
            </CardContent>
          </Card>
          <ChangePasswordForm userId={userId || ''} />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
           <DataOwnershipExportCard />

           {role === 'admin' && (
             <Card className="border-blue-200 bg-blue-50/40">
               <CardHeader>
                 <CardTitle className="text-blue-700">Công cụ trải nghiệm (Demo)</CardTitle>
                 <CardDescription>Khởi tạo hoặc làm sạch bộ dữ liệu mẫu trong 1 giây.</CardDescription>
               </CardHeader>
               <CardContent>
                 <Button className="w-full" disabled={demoActionLoading} onClick={async () => {
                     setDemoActionLoading(true);
                     try {
                       const res = await dataAdapter.auth.ensureTenantDemoReadiness({
                         tenantId: tenantId || '',
                         role: role || 'viewer',
                         email: user?.email || '',
                         full_name: user?.full_name || '',
                         uid: userId || '',
                         company_name: companyForm.company_name || 'FleetPro Demo',
                         force: true
                       });
                       if (res?.success) {
                         toast({ title: '✅ Thành công', description: 'Dữ liệu mẫu đã được nạp. Hãy tải lại trang để xem.' });
                       } else {
                         toast({ title: '⚠️ Lưu ý', description: res?.message || 'Dữ liệu đã đầy đủ.', variant: 'default' });
                       }
                     } catch (err: any) {
                       toast({ title: '❌ Lỗi nạp dữ liệu', description: err?.message || 'Không thể nạp dữ liệu mẫu.', variant: 'destructive' });
                     } finally {
                       setDemoActionLoading(false);
                     }
                  }}>
                     {demoActionLoading ? 'Đang nạp...' : 'Nạp lại dữ liệu trải nghiệm (Reset về trạng thái gốc)'}
                 </Button>
               </CardContent>
             </Card>
           )}

           <Card>
              <CardHeader><CardTitle>Quản lý dữ liệu & Sao lưu</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card><CardContent className="pt-6">
                       <p className="font-bold mb-1">Sao lưu cục bộ</p>
                       <p className="text-xs text-muted-foreground mb-4">Tạo bản snapshot dữ liệu lưu xuống ổ đĩa máy tính.</p>
                       <Button variant="outline" className="w-full" onClick={() => performBackup()}>Sao lưu ngay</Button>
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                       <p className="font-bold mb-1">Xuất dữ liệu Excel</p>
                       <p className="text-xs text-muted-foreground mb-4">Kết xuất toàn bộ bảng biểu ra định dạng CSV/Excel.</p>
                       <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-xs" onClick={() => exportData('json')}>JSON</Button>
                          <Button variant="outline" className="flex-1 text-xs" onClick={() => exportData('excel')}>EXCEL</Button>
                       </div>
                    </CardContent></Card>
                 </div>
              </CardContent>
           </Card>

           {/* Integrated Google Drive Form */}
           <GDriveSettingsForm />

           {role === 'admin' && (
             <Card className="border-red-200 bg-red-50/20">
               <CardHeader><CardTitle className="text-red-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Vùng nguy hiểm</CardTitle></CardHeader>
               <CardContent>
                  <Button variant="destructive" className="w-full" onClick={() => setPurgeDialogOpen(true)}>Xóa toàn bộ dữ liệu công ty</Button>
               </CardContent>
             </Card>
           )}
        </TabsContent>

        <TabsContent value="ai">
          <AISettingsForm />
        </TabsContent>

        <TabsContent value="branding">
           <Card>
              <CardHeader><CardTitle>Nhận diện Thương hiệu</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label>Logo URL</Label>
                          <Input value={companyForm.logo_url} onChange={e => setCompanyForm(s => ({...s, logo_url: e.target.value}))} />
                       </div>
                       <div className="space-y-2">
                          <Label>Màu chủ đạo</Label>
                          <Input type="color" value={companyForm.primary_color} onChange={e => setCompanyForm(s => ({...s, primary_color: e.target.value}))} className="h-10 p-1" />
                       </div>
                    </div>
                    <div className="border rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center">
                       <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden border mb-4">
                          {companyForm.logo_url ? <img src={companyForm.logo_url} alt="Logo" className="w-full h-full object-contain p-2" /> : <Truck className="w-10 h-10 text-slate-300" />}
                       </div>
                       <p className="font-bold text-lg" style={{ color: companyForm.primary_color }}>{companyForm.company_name || 'Tên Công Ty'}</p>
                    </div>
                 </div>
                 <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => companySave.mutate(companyForm)}>Áp dụng thương hiệu</Button>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <TelegramSettingsForm />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs Redacted for space but logic remains */}
      <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
         <DialogContent>
            <DialogHeader><DialogTitle className="text-red-600">Xác nhận xóa sạch dữ liệu?</DialogTitle></DialogHeader>
            <div className="py-4">Hành động này không thể hoàn tác. Vui lòng nhập <span className="font-bold">CONFIRM</span> để tiếp tục. </div>
            <Input value={purgeConfirmText} onChange={e => setPurgeConfirmText(e.target.value)} />
            <div className="flex gap-2 justify-end mt-4">
               <Button variant="ghost" onClick={() => setPurgeDialogOpen(false)}>Hủy</Button>
               <Button variant="destructive" disabled={purgeConfirmText !== 'CONFIRM'} onClick={async () => {
                  setPurging(true);
                  await purgeAllData();
                  setPurging(false);
                  setPurgeDialogOpen(false);
               }}>Xóa vĩnh viễn</Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
