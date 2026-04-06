import { useState } from "react";
import { useUsers, useAddUser, useUpdateUserRole, useDeleteUser, UserWithRole } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Shield, Trash2, Edit2, Loader2, Users, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDrivers } from "@/hooks/useDrivers";
import { driverAdapter } from "@/lib/data-adapter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Members() {
  const { role: currentUserRole } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: drivers = [] } = useDrivers();
  const addUserMutation = useAddUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "viewer",
    linked_driver_id: ""
  });

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password) return;
    const result = await addUserMutation.mutateAsync(newMember);
    
    // AUTO-LINK: When creating a driver account, link user_id to driver record
    if (newMember.role === 'driver' && newMember.linked_driver_id && result?.data?.id) {
      try {
        await driverAdapter.update(newMember.linked_driver_id, {
          user_id: result.data.id,
          email: newMember.email,
          driver_email: newMember.email,
        });
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        toast({ title: 'Liên kết thành công', description: `Tài khoản đã được liên kết với hồ sơ tài xế.` });
      } catch (e) {
        console.error('Auto-link driver failed:', e);
      }
    }
    
    setIsAddDialogOpen(false);
    setNewMember({ email: "", password: "", full_name: "", role: "viewer", linked_driver_id: "" });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateUserRoleMutation.mutateAsync({ user_id: userId, role: newRole });
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Bạn có chắc muốn xóa thành viên này khỏi tổ chức?")) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-2 py-0.5">Quản trị</Badge>;
      case 'manager': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-2 py-0.5">Điều hành</Badge>;
      case 'dispatcher': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-2 py-0.5">Điều phối</Badge>;
      case 'accountant': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-2 py-0.5">Kế toán</Badge>;
      case 'driver': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-2 py-0.5">Tài xế</Badge>;
      case 'viewer': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-2 py-0.5">Chỉ xem</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  };

  // Find linked driver record for a user
  const getLinkedDriver = (userId: string, email: string) => {
    return drivers.find((d: any) =>
      d.user_id === userId || d.email === email || d.driver_email === email
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Quản lý thành viên
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý và phân quyền cho nhân viên trong tổ chức của bạn.
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <UserPlus className="w-4 h-4" /> Thêm thành viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm thành viên mới</DialogTitle>
                <DialogDescription>
                  Tạo tài khoản và phân quyền cho nhân viên mới.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ và tên</Label>
                  <Input 
                    id="name" placeholder="Nguyễn Văn A" 
                    value={newMember.full_name} 
                    onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" type="email" placeholder="example@company.com" 
                    value={newMember.email} 
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Mật khẩu</Label>
                  <Input 
                    id="pass" type="password" 
                    value={newMember.password} 
                    onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Select 
                    value={newMember.role} 
                    onValueChange={(val) => setNewMember({...newMember, role: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Quản trị (Admin)</SelectItem>
                      <SelectItem value="manager">Điều hành (Manager)</SelectItem>
                      <SelectItem value="dispatcher">Điều phối (Dispatcher)</SelectItem>
                      <SelectItem value="accountant">Kế toán (Accountant)</SelectItem>
                      <SelectItem value="driver">Tài xế (Driver)</SelectItem>
                      <SelectItem value="viewer">Chỉ xem (Viewer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Auto-link driver record when role=driver */}
                {newMember.role === 'driver' && (
                  <div className="space-y-2">
                    <Label>Liên kết hồ sơ tài xế</Label>
                    <Select
                      value={newMember.linked_driver_id}
                      onValueChange={(val) => setNewMember({...newMember, linked_driver_id: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tài xế để liên kết..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Không liên kết</SelectItem>
                        {drivers
                          .filter((d: any) => !d.user_id && d.status !== 'inactive')
                          .map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.driver_code} — {d.full_name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Liên kết tài khoản đăng nhập với hồ sơ tài xế trong danh mục.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleAddMember} disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending ? "Đang tạo..." : "Xác nhận thêm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Thành viên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Liên kết TX</TableHead>
                <TableHead>Ngày gia nhập</TableHead>
                {isAdmin && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{user.user_metadata?.full_name || 'Chưa đặt tên'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select 
                        defaultValue={user.role} 
                        onValueChange={(val) => handleRoleChange(user.id, val)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs border-none shadow-none focus:ring-0 px-0">
                          <SelectValue>{getRoleBadge(user.role || 'viewer')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Quản trị</SelectItem>
                          <SelectItem value="manager">Điều hành</SelectItem>
                          <SelectItem value="dispatcher">Điều phối</SelectItem>
                          <SelectItem value="accountant">Kế toán</SelectItem>
                          <SelectItem value="driver">Tài xế</SelectItem>
                          <SelectItem value="viewer">Chỉ xem</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(user.role || 'viewer')
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const linked = getLinkedDriver(user.id, user.email);
                      if (!linked) return <span className="text-xs text-muted-foreground">—</span>;
                      return (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <Link2 className="w-3 h-3" />
                          {linked.driver_code} — {linked.full_name}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '---'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                       <Button 
                        variant="ghost" size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deleteUserMutation.isPending}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
