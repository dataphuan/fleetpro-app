import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bot, Key, Plus, Trash2, CheckCircle, AlertTriangle, ExternalLink, Copy, Loader2, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { geminiService } from "@/services/GeminiService";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ApiKey {
    id: string;
    key: string;
    label: string;
    isActive: boolean;
    createdAt: number;
}

export function AISettingsForm() {
    const { toast } = useToast();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [newKey, setNewKey] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

    // Load keys from safeStorage (or localStorage fallback) on mount
    useEffect(() => {
        const loadKeys = async () => {
            try {
                const electronAPI = (window as any).electronAPI;
                if (electronAPI?.safeStorage) {
                    const result = await electronAPI.safeStorage.retrieve('gemini_api_keys');
                    if (result?.success && result.data) {
                        setKeys(JSON.parse(result.data));
                    } else {
                        // Check localStorage for migration
                        const localKeys = localStorage.getItem('gemini_api_keys');
                        if (localKeys) {
                            const parsed = JSON.parse(localKeys);
                            setKeys(parsed);
                            // Auto-migrate to safeStorage
                            await electronAPI.safeStorage.store('gemini_api_keys', localKeys);
                            localStorage.removeItem('gemini_api_keys');
                        }
                    }
                } else {
                    // Non-electron fallback
                    const saved = localStorage.getItem('gemini_api_keys');
                    if (saved) setKeys(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Failed to load API keys', e);
            }
        };
        loadKeys();

        const savedModel = localStorage.getItem("gemini_model");
        if (savedModel) {
            setSelectedModel(savedModel);
        }
    }, []);

    // Test all active keys
    const testAllKeys = async () => {
        const activeKeys = keys.filter(k => k.isActive);
        if (activeKeys.length === 0) {
            toast({
                title: "Không có key",
                description: "Vui lòng thêm và kích hoạt ít nhất 1 API Key",
                variant: "destructive",
            });
            return;
        }

        setIsTesting(true);
        setTestResults({});
        let successCount = 0;

        for (const k of activeKeys) {
            const result = await geminiService.testApiKey(k.key);
            setTestResults(prev => ({ ...prev, [k.id]: result }));
            if (result.success) successCount++;
        }

        setIsTesting(false);

        if (successCount === activeKeys.length) {
            toast({
                title: "✅ Kết nối thành công!",
                description: `Tất cả ${successCount} key đều hoạt động tốt.`,
            });
        } else if (successCount > 0) {
            toast({
                title: "⚠️ Một số key có vấn đề",
                description: `${successCount}/${activeKeys.length} key hoạt động. Xem chi tiết bên dưới.`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "❌ Không thể kết nối!",
                description: "Tất cả các key đều lỗi. Xem hướng dẫn khắc phục bên dưới.",
                variant: "destructive",
            });
        }
    };

    // Save keys to safeStorage (preferred) or localStorage (fallback)
    const saveKeys = async (updatedKeys: ApiKey[]) => {
        setKeys(updatedKeys);
        const json = JSON.stringify(updatedKeys);
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.safeStorage) {
                await electronAPI.safeStorage.store('gemini_api_keys', json);
                localStorage.removeItem('gemini_api_keys'); // cleanup
                return;
            }
        } catch (e) {
            console.error('safeStorage save failed', e);
        }
        localStorage.setItem('gemini_api_keys', json);
    };

    const handleAddKey = () => {
        if (!newKey.trim()) {
            toast({
                title: "Lỗi",
                description: "Vui lòng nhập API Key",
                variant: "destructive",
            });
            return;
        }

        if (keys.some(k => k.key === newKey.trim())) {
            toast({
                title: "Lỗi",
                description: "API Key này đã tồn tại",
                variant: "destructive",
            });
            return;
        }

        const newApiKey: ApiKey = {
            id: crypto.randomUUID(),
            key: newKey.trim(),
            label: newLabel.trim() || `Key ${keys.length + 1}`,
            isActive: true,
            createdAt: Date.now(),
        };

        saveKeys([...keys, newApiKey]);
        setNewKey("");
        setNewLabel("");

        toast({
            title: "Thành công",
            description: "Đã thêm API Key mới",
        });
    };

    const handleDeleteKey = (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa Key này không?")) {
            const updatedKeys = keys.filter(k => k.id !== id);
            saveKeys(updatedKeys);
            // Clear test result for deleted key
            setTestResults(prev => {
                const newResults = { ...prev };
                delete newResults[id];
                return newResults;
            });
            // Reset genAI instance to force re-initialization  
            geminiService.resetInstance();
            toast({
                title: "Đã xóa",
                description: "Đã xóa API Key khỏi hệ thống",
            });
        }
    };

    const toggleKey = (id: string) => {
        saveKeys(keys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k));
    };

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem("gemini_model", model);
        toast({
            title: "Đã cập nhật",
            description: `Đã chuyển sang model ${model}`,
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        Cấu hình Trợ lý AI (Gemini)
                    </CardTitle>
                    <CardDescription>
                        Quản lý các khóa API Gemini để sử dụng tính năng Chat thông minh.
                        Hệ thống sẽ **tự động xoay vòng** các khóa đang hoạt động để tránh bị giới hạn.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Instructions */}
                    <Alert className="bg-blue-50 border-blue-200">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Làm thế nào để lấy API Key?</AlertTitle>
                        <AlertDescription className="text-blue-700 mt-2 text-sm">
                            <p className="mb-2">Google cung cấp API Key miễn phí cho Gemini Pro. Bạn có thể tạo nhiều key để tăng giới hạn sử dụng.</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-medium hover:text-blue-900 inline-flex items-center gap-1">Google AI Studio <ExternalLink className="w-3 h-3" /></a></li>
                                <li>Đăng nhập bằng tài khoản Google</li>
                                <li>Nhấn <strong>"Create API key"</strong></li>
                                <li>Copy key và dán vào bên dưới</li>
                            </ol>
                        </AlertDescription>
                    </Alert>

                    {/* Model Selector */}
                    <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50">
                        <Label htmlFor="model-select" className="text-base font-semibold">Chọn Model AI</Label>
                        <Select value={selectedModel} onValueChange={handleModelChange}>
                            <SelectTrigger id="model-select" className="w-full bg-white">
                                <SelectValue placeholder="Chọn model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-3-pro-preview">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Gemini 3 Pro (Preview)</span>
                                        <span className="text-xs text-muted-foreground">Thế hệ mới nhất, phân tích đa kênh cực mạnh</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="gemini-2.5-flash">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Gemini 2.5 Flash</span>
                                        <span className="text-xs text-muted-foreground">Tốc độ siêu nhanh, xử lý thời gian thực</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="gemini-flash-latest">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">Gemini Flash (Latest)</span>
                                        <span className="text-xs text-muted-foreground">Phiên bản ổn định nhất (Khuyến nghị)</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Model hiện tại: <strong className="text-purple-600">{selectedModel}</strong>
                        </p>
                    </div>

                    {/* Add Key Form */}
                    <div className="grid gap-4 p-4 border rounded-lg bg-gray-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">Gemini API Key</Label>
                                <div className="relative">
                                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="apiKey"
                                        placeholder="AIzaSy..."
                                        className="pl-9"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="keyLabel">Ghi chú (Tùy chọn)</Label>
                                <Input
                                    id="keyLabel"
                                    placeholder="Ví dụ: Key cá nhân, Key công ty..."
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddKey} className="w-full md:w-auto md:ml-auto gap-2">
                            <Plus className="w-4 h-4" />
                            Thêm Key
                        </Button>
                    </div>

                    {/* Key List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Danh sách API Key ({keys.length})</Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={testAllKeys}
                                    disabled={isTesting || keys.filter(k => k.isActive).length === 0}
                                    className="gap-1"
                                >
                                    {isTesting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Wifi className="w-3 h-3" />
                                    )}
                                    {isTesting ? "Đang test..." : "Test kết nối"}
                                </Button>
                                <Badge variant="outline" className="font-normal">
                                    {keys.filter(k => k.isActive).length} Đang hoạt động
                                </Badge>
                            </div>
                        </div>

                        {keys.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                                Chưa có API Key nào được cấu hình.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {keys.map((k) => (
                                    <div key={k.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`p-2 rounded-full ${k.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Key className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium truncate">{k.label}</p>
                                                    {k.isActive ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] h-5">Active</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                                                    )}
                                                    {/* Test Result Indicator */}
                                                    {testResults[k.id] && (
                                                        testResults[k.id].success ? (
                                                            <Badge className="bg-green-600 text-white text-[10px] h-5 gap-1">
                                                                <CheckCircle className="w-3 h-3" /> OK
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="text-[10px] h-5 gap-1" title={testResults[k.id].error}>
                                                                <AlertTriangle className="w-3 h-3" /> Lỗi
                                                            </Badge>
                                                        )
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                                                    {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 6)}
                                                </p>
                                                {/* Show error details */}
                                                {testResults[k.id] && !testResults[k.id].success && (
                                                    <p className="text-xs text-red-600 mt-1">
                                                        {testResults[k.id].error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Switch
                                                checked={k.isActive}
                                                onCheckedChange={() => toggleKey(k.id)}
                                                title="Bật/Tắt Key"
                                            />
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteKey(k.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
