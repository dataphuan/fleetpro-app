import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Globe, Server, Database, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppConfig {
    mode: 'LOCAL' | 'LAN_SERVER' | 'LAN_CLIENT';
    serverIp?: string;
    serverPort?: number;
    lanToken?: string;
    clientName?: string;
}

export function LanSettingsForm() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [config, setConfig] = useState<AppConfig>({
        mode: 'LOCAL',
        serverIp: '127.0.0.1',
        serverPort: 3000,
        lanToken: 'LOGISTICS_2024',
        clientName: ''
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            // @ts-ignore
            const saved = await window.electronAPI.config.get();
            setConfig({
                mode: saved.mode || 'LOCAL',
                serverIp: saved.serverIp || '127.0.0.1',
                serverPort: saved.serverPort || 3000,
                lanToken: saved.lanToken || 'LOGISTICS_2024',
                clientName: saved.clientName || `Client-${Math.floor(Math.random() * 1000)}`
            });
            // Sync to local storage for adapter usage
            localStorage.setItem('app_mode', saved.mode || 'LOCAL');
            localStorage.setItem('lan_server_url', `http://${saved.serverIp || '127.0.0.1'}:${saved.serverPort || 3000}`);
            localStorage.setItem('lan_token', saved.lanToken || 'LOGISTICS_2024');

        } catch (error) {
            console.error(error);
            toast({ title: "Lỗi", description: "Không thể tải cấu hình LAN", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI.config.save(config);

            // Update LocalStorage for immediate adapter usage
            if (config.mode === 'LAN_CLIENT') {
                localStorage.setItem('app_mode', 'LAN_CLIENT');
                localStorage.setItem('lan_server_url', `http://${config.serverIp}:${config.serverPort}`);
                localStorage.setItem('lan_token', config.lanToken || '');
            } else {
                localStorage.setItem('app_mode', 'LOCAL'); // LOCAL or LAN_SERVER implies local usage for renderer
            }

            toast({ title: "Thành công", description: "Đã lưu cấu hình. Vui lòng khởi động lại ứng dụng nếu thay đổi chế độ Server." });
        } catch (error) {
            toast({ title: "Lỗi", description: "Lưu cấu hình thất bại", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const url = `http://${config.serverIp}:${config.serverPort}/health`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                setTestResult('success');
                toast({ title: "Kết nối thành công", description: "Đã tìm thấy LAN Server." });
            } else {
                setTestResult('error');
                toast({ title: "Kết nối thất bại", description: `Server phản hồi: ${res.statusText}`, variant: "destructive" });
            }
        } catch (error) {
            setTestResult('error');
            toast({ title: "Lỗi kết nối", description: "Không thể kết nối đến Server. Kiểm tra IP/Port và Firewall.", variant: "destructive" });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div>Đang tải cấu hình...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cấu hình Kết nối LAN</CardTitle>
                <CardDescription>
                    Thiết lập chế độ hoạt động: Offline (Local) hoặc LAN (Server/Client)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Chế độ hoạt động</Label>
                    <Select
                        value={config.mode}
                        onValueChange={(val: any) => setConfig(prev => ({ ...prev, mode: val }))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn chế độ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOCAL">
                                <div className="flex items-center">
                                    <Database className="w-4 h-4 mr-2" />
                                    Offline (Cá nhân)
                                </div>
                            </SelectItem>
                            <SelectItem value="LAN_SERVER">
                                <div className="flex items-center">
                                    <Server className="w-4 h-4 mr-2" />
                                    LAN Server (Máy chủ)
                                </div>
                            </SelectItem>
                            <SelectItem value="LAN_CLIENT">
                                <div className="flex items-center">
                                    <Globe className="w-4 h-4 mr-2" />
                                    LAN Client (Máy trạm)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        {config.mode === 'LOCAL' && "Dữ liệu được lưu trữ trên máy này. Không chia sẻ."}
                        {config.mode === 'LAN_SERVER' && "Máy này sẽ chứa dữ liệu trung tâm và cho phép các máy khác kết nối."}
                        {config.mode === 'LAN_CLIENT' && "Kết nối đến máy chủ LAN để xem và sửa đổi dữ liệu."}
                    </p>
                </div>

                {config.mode === 'LAN_SERVER' && (
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                        <div className="space-y-2">
                            <Label>Cổng Server (Port)</Label>
                            <Input
                                type="number"
                                value={config.serverPort}
                                onChange={e => setConfig(p => ({ ...p, serverPort: parseInt(e.target.value) || 3000 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mã Bảo Mật (Token)</Label>
                            <div className="relative">
                                <Input
                                    value={config.lanToken}
                                    onChange={e => setConfig(p => ({ ...p, lanToken: e.target.value }))}
                                    type={showToken ? "text" : "password"}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">Chia sẻ mã này cho các máy trạm để kết nối.</p>
                        </div>
                    </div>
                )}

                {config.mode === 'LAN_CLIENT' && (
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Địa chỉ IP Server</Label>
                                <Input
                                    placeholder="VD: 192.168.1.100"
                                    value={config.serverIp}
                                    onChange={e => setConfig(p => ({ ...p, serverIp: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cổng (Port)</Label>
                                <Input
                                    type="number"
                                    value={config.serverPort}
                                    onChange={e => setConfig(p => ({ ...p, serverPort: parseInt(e.target.value) || 3000 }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Mã Bảo Mật (Token)</Label>
                            <div className="relative">
                                <Input
                                    value={config.lanToken}
                                    onChange={e => setConfig(p => ({ ...p, lanToken: e.target.value }))}
                                    type={showToken ? "text" : "password"}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowToken(!showToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tên Máy Trạm</Label>
                            <Input
                                value={config.clientName}
                                onChange={e => setConfig(p => ({ ...p, clientName: e.target.value }))}
                                placeholder="VD: Máy Kế Toán 01"
                            />
                        </div>

                        <div className="pt-2">
                            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
                                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                                Kiểm tra kết nối
                            </Button>
                            {testResult === 'success' && <span className="ml-3 text-green-600 flex items-center inline-flex"><CheckCircle2 className="w-4 h-4 mr-1" /> Kết nối OK</span>}
                            {testResult === 'error' && <span className="ml-3 text-red-600 flex items-center inline-flex"><XCircle className="w-4 h-4 mr-1" /> Thất bại</span>}
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Lưu Cấu Hình
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
