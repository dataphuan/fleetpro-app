
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { aiQueryService } from "./AIQueryService";

interface ApiKey {
    id: string;
    key: string;
    label: string;
    isActive: boolean;
    createdAt: number;
}

const STORAGE_KEY = "gemini_api_keys";

// Helper: check if running in Electron with safeStorage
const hasSafeStorage = () =>
    typeof window !== 'undefined' &&
    (window as any).electronAPI?.safeStorage;

/**
 * Load API keys: try safeStorage first, fallback to localStorage, auto-migrate
 */
async function loadApiKeys(): Promise<ApiKey[]> {
    try {
        if (hasSafeStorage()) {
            const result = await (window as any).electronAPI.safeStorage.retrieve(STORAGE_KEY);
            if (result?.success && result.data) {
                return JSON.parse(result.data) as ApiKey[];
            }
            // If no keys in safeStorage, check localStorage and migrate
            const localKeys = localStorage.getItem(STORAGE_KEY);
            if (localKeys) {
                const keys = JSON.parse(localKeys) as ApiKey[];
                // Migrate: save to safeStorage, remove from localStorage
                await (window as any).electronAPI.safeStorage.store(STORAGE_KEY, localKeys);
                localStorage.removeItem(STORAGE_KEY);
                console.log('[GeminiService] ✓ Migrated API keys from localStorage to safeStorage');
                return keys;
            }
            return [];
        }
    } catch (e) {
        console.error('[GeminiService] safeStorage load failed, falling back to localStorage', e);
    }
    // Fallback: localStorage (non-Electron)
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved) as ApiKey[];
        
        // Final fallback: Environment variable
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envKey) {
            return [{
                id: 'env-key',
                key: envKey,
                label: 'Environment Key',
                isActive: true,
                createdAt: Date.now()
            }];
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Save API keys to safeStorage (preferred) or localStorage (fallback)
 */
async function saveApiKeys(keys: ApiKey[]): Promise<void> {
    const json = JSON.stringify(keys);
    try {
        if (hasSafeStorage()) {
            await (window as any).electronAPI.safeStorage.store(STORAGE_KEY, json);
            // Remove from localStorage if it exists (cleanup)
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
    } catch (e) {
        console.error('[GeminiService] safeStorage save failed, falling back', e);
    }
    // Fallback
    localStorage.setItem(STORAGE_KEY, json);
}

// Define available functions for AI
const FUNCTION_DECLARATIONS = [
    {
        name: "searchVehicles",
        description: "Tìm kiếm xe theo biển số, loại xe, hoặc trạng thái. Dùng khi người dùng hỏi về xe cụ thể hoặc muốn biết danh sách xe.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                licensePlate: {
                    type: SchemaType.STRING,
                    description: "Biển số xe (ví dụ: 51A-12345, 29C, 30H)"
                },
                type: {
                    type: SchemaType.STRING,
                    description: "Loại xe",
                    enum: ["truck", "trailer", "van", "container"]
                },
                status: {
                    type: SchemaType.STRING,
                    description: "Trạng thái xe",
                    enum: ["active", "maintenance", "inactive"],
                    nullable: true
                }
            },
            required: []
        }
    },
    {
        name: "searchDrivers",
        description: "Tìm kiếm tài xế theo tên, số điện thoại, hoặc số bằng lái. Dùng khi người dùng hỏi về tài xế cụ thể.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: {
                    type: SchemaType.STRING,
                    description: "Tên tài xế (có thể là tên đầy đủ hoặc một phần)"
                },
                phone: {
                    type: SchemaType.STRING,
                    description: "Số điện thoại"
                },
                licenseNumber: {
                    type: SchemaType.STRING,
                    description: "Số bằng lái xe"
                }
            },
            required: []
        }
    },
    {
        name: "getTripsByVehicle",
        description: "Lấy danh sách chuyến đi của một xe cụ thể. Dùng khi người dùng hỏi về lịch sử chuyến đi của xe.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                vehicleId: {
                    type: SchemaType.STRING,
                    description: "ID của xe"
                },
                licensePlate: {
                    type: SchemaType.STRING,
                    description: "Biển số xe (nếu không có vehicleId)"
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    },
    {
        name: "getTripsByDriver",
        description: "Lấy danh sách chuyến đi của một tài xế. Dùng khi người dùng hỏi về hiệu suất hoặc lịch sử chuyến đi của tài xế.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                driverId: {
                    type: SchemaType.STRING,
                    description: "ID của tài xế"
                },
                driverName: {
                    type: SchemaType.STRING,
                    description: "Tên tài xế (nếu không có driverId)"
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    },
    {
        name: "getRevenueStats",
        description: "Lấy thống kê doanh thu trong một khoảng thời gian. Dùng khi người dùng hỏi về doanh thu, lợi nhuận.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: ["startDate", "endDate"]
        }
    },
    {
        name: "getExpensesByCategory",
        description: "Lấy thống kê chi phí theo loại. Dùng khi người dùng hỏi về chi phí nhiên liệu, bảo trì, lương tài xế, v.v.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                category: {
                    type: SchemaType.STRING,
                    description: "Loại chi phí",
                    enum: ["cat_fuel", "cat_toll", "cat_salary", "cat_maint", "cat_loading", "cat_insurance", "cat_other"]
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    },
    {
        name: "getMaintenanceAlerts",
        description: "Lấy danh sách cảnh báo bảo trì xe. Dùng khi người dùng hỏi về lịch bảo trì hoặc xe nào cần bảo trì.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                vehicleId: {
                    type: SchemaType.STRING,
                    description: "ID của xe"
                },
                licensePlate: {
                    type: SchemaType.STRING,
                    description: "Biển số xe"
                }
            },
            required: []
        }
    },
    {
        name: "getVehicleStats",
        description: "Lấy thống kê tổng quan về đội xe (số lượng xe theo trạng thái). Dùng khi người dùng hỏi 'có bao nhiêu xe', 'bao nhiêu xe đang hoạt động'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
        }
    },
    {
        name: "getDriverStats",
        description: "Lấy thống kê tổng quan về tài xế (số lượng tài xế theo trạng thái). Dùng khi người dùng hỏi 'có bao nhiêu tài xế'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
        }
    },
    {
        name: "searchCustomers",
        description: "Tìm kiếm khách hàng theo tên hoặc mã số thuế. Dùng khi người dùng hỏi về khách hàng cụ thể.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: {
                    type: SchemaType.STRING,
                    description: "Tên khách hàng"
                },
                taxCode: {
                    type: SchemaType.STRING,
                    description: "Mã số thuế"
                }
            },
            required: []
        }
    },
    {
        name: "getTopDrivers",
        description: "Lấy danh sách top tài xế có nhiều chuyến đi nhất. Dùng khi người dùng hỏi 'tài xế nào có nhiều chuyến nhất', 'top tài xế hiệu quả'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                limit: {
                    type: SchemaType.NUMBER,
                    description: "Số lượng tài xế muốn xem (mặc định 5)"
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    },
    {
        name: "getTopCustomers",
        description: "Lấy danh sách top khách hàng có doanh thu cao nhất. Dùng khi người dùng hỏi 'khách hàng nào có doanh thu cao nhất', 'top khách hàng'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                limit: {
                    type: SchemaType.NUMBER,
                    description: "Số lượng khách hàng muốn xem (mặc định 5)"
                },
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    },
    {
        name: "getPendingTrips",
        description: "Lấy danh sách các chuyến đi đang chờ xử lý (scheduled, confirmed, in_transit). Dùng khi người dùng hỏi 'chuyến nào đang pending', 'chuyến cần xử lý'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
        }
    },
    {
        name: "getDashboardSummary",
        description: "Lấy tóm tắt tổng quan dashboard (doanh thu, chi phí, lợi nhuận, số chuyến, số xe/tài xế). Dùng khi người dùng hỏi 'tóm tắt hoạt động', 'báo cáo nhanh', 'tình hình hôm nay'.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                startDate: {
                    type: SchemaType.STRING,
                    description: "Ngày bắt đầu (YYYY-MM-DD)"
                },
                endDate: {
                    type: SchemaType.STRING,
                    description: "Ngày kết thúc (YYYY-MM-DD)"
                }
            },
            required: []
        }
    }
];

export class GeminiService {
    private static instance: GeminiService;
    private genAI: GoogleGenerativeAI | null = null;
    private currentKeyIndex = 0;

    private cachedKeys: ApiKey[] = [];

    private constructor() { }

    public static getInstance(): GeminiService {
        if (!GeminiService.instance) {
            GeminiService.instance = new GeminiService();
        }
        return GeminiService.instance;
    }

    /**
     * Load keys from secure storage (async, must be called before chat)
     */
    async ensureKeysLoaded(): Promise<void> {
        if (this.cachedKeys.length === 0) {
            this.cachedKeys = await loadApiKeys();
        }
    }

    private getActiveKeys(): ApiKey[] {
        return this.cachedKeys.filter(k => k.isActive);
    }

    private initializeAI() {
        const keys = this.getActiveKeys();
        if (keys.length === 0) {
            throw new Error("Chưa có API Key Gemini. Vui lòng thêm key trong phần Cài đặt.");
        }

        const keyToUse = keys[this.currentKeyIndex % keys.length];
        this.currentKeyIndex++;

        this.genAI = new GoogleGenerativeAI(keyToUse.key);
        return this.genAI;
    }

    /**
     * Reset the AI instance (call when API keys change)
     */
    public resetInstance() {
        this.genAI = null;
        this.currentKeyIndex = 0;
    }

    /**
     * Execute a function call from AI
     */
    private async executeFunction(functionName: string, args: any): Promise<any> {
        console.log(`🤖 AI calling function: ${functionName}`, args);

        switch (functionName) {
            case "searchVehicles":
                return await aiQueryService.searchVehicles(args);
            case "searchDrivers":
                return await aiQueryService.searchDrivers(args);
            case "getTripsByVehicle":
                return await aiQueryService.getTripsByVehicle(args);
            case "getTripsByDriver":
                return await aiQueryService.getTripsByDriver(args);
            case "getRevenueStats":
                return await aiQueryService.getRevenueStats(args);
            case "getExpensesByCategory":
                return await aiQueryService.getExpensesByCategory(args);
            case "getMaintenanceAlerts":
                return await aiQueryService.getMaintenanceAlerts(args);
            case "getVehicleStats":
                return await aiQueryService.getVehicleStats();
            case "getDriverStats":
                return await aiQueryService.getDriverStats();
            case "searchCustomers":
                return await aiQueryService.searchCustomers(args);
            case "getTopDrivers":
                return await aiQueryService.getTopDrivers(args);
            case "getTopCustomers":
                return await aiQueryService.getTopCustomers(args);
            case "getPendingTrips":
                return await aiQueryService.getPendingTrips();
            case "getDashboardSummary":
                return await aiQueryService.getDashboardSummary(args);
            default:
                return { error: `Unknown function: ${functionName}` };
        }
    }

    public async chat(message: string, history: { role: "user" | "model", parts: string }[] = []) {
        await this.ensureKeysLoaded();

        if (!this.genAI) {
            this.initializeAI();
        }

        if (!this.genAI) throw new Error("Không thể khởi tạo Gemini AI");

        // Get selected model from localStorage, default to gemini-flash-latest (2026 standard)
        const selectedModel = localStorage.getItem("gemini_model") || "gemini-flash-latest";

        const model = this.genAI.getGenerativeModel({
            model: selectedModel,
            tools: [{ functionDeclarations: FUNCTION_DECLARATIONS as any }],
        });

        const systemPrompt = `
BẠN LÀ TRỢ LÝ THÔNG MINH CỦA HỆ THỐNG QUẢN LÝ VẬN TẢI SAVACO.
Bạn có khả năng TRUY VẤN DỮ LIỆU THỰC từ database để trả lời câu hỏi của người dùng.

NHIỆM VỤ:
- Khi người dùng hỏi về xe, tài xế, khách hàng, chuyến đi, doanh thu, chi phí → GỌI FUNCTION tương ứng để lấy dữ liệu
- Phân tích câu hỏi và trích xuất thông tin cần thiết (biển số xe, tên tài xế, khoảng thời gian...)
- Tổng hợp kết quả từ function thành câu trả lời TỰ NHIÊN, DỄ HIỂU

HƯỚNG DẪN TRẢ LỜI:
- Luôn sử dụng Tiếng Việt chuyên ngành
- Văn phong: Thân thiện, chuyên nghiệp, súc tích
- Trình bày: Markdown (bảng, danh sách, in đậm số liệu quan trọng)
- Nếu không tìm thấy dữ liệu: Nói rõ và gợi ý cách tìm khác

VÍ DỤ:
User: "Xe 51A-12345 đang ở đâu?"
→ Gọi searchVehicles({licensePlate: "51A-12345"})
→ Trả lời: "Xe 51A-12345 hiện đang trong trạng thái active, loại truck..."

User: "Doanh thu tuần này bao nhiêu?"
→ Tính startDate, endDate cho tuần này
→ Gọi getRevenueStats({startDate: "2026-02-03", endDate: "2026-02-09"})
→ Trả lời: "Doanh thu tuần này là 150 triệu đồng từ 25 chuyến..."

HÃY BẮT ĐẦU!
        `.trim();

        let finalMessage = message;
        if (history.length === 0) {
            finalMessage = `${systemPrompt}\n\n[Hệ thống: Bắt đầu vai trò trợ lý thông minh]\n\nCÂU HỎI: ${message}`;
        }

        const chatValues = history.map(h => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.parts }]
        }));

        const chat = model.startChat({
            history: chatValues,
        });

        try {
            let result = await chat.sendMessage(finalMessage);
            let response = result.response;

            // Check if AI wants to call functions
            const functionCalls = response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
                console.log(`🤖 AI requested ${functionCalls.length} function call(s)`);

                // Execute all function calls
                const functionResponses = await Promise.all(
                    functionCalls.map(async (fc) => {
                        const functionResult = await this.executeFunction(fc.name, fc.args);
                        return {
                            functionResponse: {
                                name: fc.name,
                                response: functionResult
                            }
                        };
                    })
                );

                // Send function results back to AI
                result = await chat.sendMessage(functionResponses);
                response = result.response;
            }

            return response.text();
        } catch (error: any) {
            console.error("Gemini Chat Error:", error);
            if (error.message?.includes("API key not valid")) {
                throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.");
            }
            throw error;
        }
    }

    /**
     * Test API key validity and network connectivity
     */
    public async testApiKey(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
        try {
            const testGenAI = new GoogleGenerativeAI(apiKey);
            // Use gemini-flash-latest as the most compatible test model (2026 standard)
            const model = testGenAI.getGenerativeModel({ model: "gemini-flash-latest" });

            // Simple test: generate a very short response
            // Increase timeout slightly for network issues
            const result = await model.generateContent("Reply with only: OK");
            const response = result.response.text();

            if (response && response.includes("OK")) {
                return { success: true, model: "gemini-flash-latest" };
            }
            return { success: false, error: "Không nhận được phản hồi hợp lệ từ API" };
        } catch (error: any) {
            console.error("API Key Test Error:", error);
            const rawMessage = error.message || "";

            // Parse common errors
            if (rawMessage.includes("API key not valid") || rawMessage.includes("API_KEY_INVALID")) {
                return { success: false, error: "API Key không hợp lệ. Kiểm tra lại key hoặc tạo key mới tại aistudio.google.com" };
            }
            if (rawMessage.includes("suspended")) {
                return { success: false, error: "API Key đã bị Google đình chỉ. Vui lòng tạo key mới." };
            }
            if (rawMessage.includes("404") || rawMessage.includes("not found")) {
                return { success: false, error: "Model không khả dụng hoặc vùng lãnh thổ của bạn chưa hỗ trợ Gemini." };
            }
            if (rawMessage.includes("fetch failed") || rawMessage.includes("Failed to fetch") || rawMessage.includes("ERR_CONNECTION")) {
                return { success: false, error: "Lỗi mạng: Không thể kết nối đến Google API. Kiểm tra Proxy/VPN." };
            }
            if (rawMessage.includes("quota") || rawMessage.includes("rate limit") || rawMessage.includes("429")) {
                // Include raw details for quota errors to see if it's RPM or TPM
                return { success: false, error: `API Key đã hết quota/vượt giới hạn. (${rawMessage.substring(0, 50)}...)` };
            }
            if (rawMessage.includes("blocked") || rawMessage.includes("CORS")) {
                return { success: false, error: "Yêu cầu bị chặn (CORS/CSP). Kiểm tra cấu hình mạng." };
            }

            return { success: false, error: rawMessage || "Lỗi không xác định" };
        }
    }
}

export const geminiService = GeminiService.getInstance();
