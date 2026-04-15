/**
 * 📸 REAL Invoice OCR Service — powered by Gemini Vision
 * 
 * Sử dụng Gemini Flash Vision để extract thông tin từ ảnh chứng từ:
 * - Số tiền (amount)
 * - Mô tả / diễn giải
 * - Ngày chứng từ
 * - Loại chi phí (nhiên liệu, cầu đường, ăn uống...)
 * - Biển số xe (nếu có)
 * 
 * KHÔNG FAKE — gọi API thật, xử lý ảnh thật.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const STORAGE_KEY = "gemini_api_keys";

export interface OCRResult {
    success: boolean;
    data?: {
        amount: number;
        description: string;
        date: string;          // YYYY-MM-DD
        category: string;      // cat_fuel, cat_toll, cat_meal, cat_maint, cat_other
        vehicle_plate?: string; // detected license plate
        vendor_name?: string;   // tên cửa hàng / trạm xăng
        confidence: number;    // 0-1
        raw_text: string;      // full OCR text
    };
    error?: string;
}

/**
 * Convert File to base64
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:image/jpeg;base64,)
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Get the active Gemini API key
 */
function getApiKey(): string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const keys = JSON.parse(saved);
            const active = keys.find((k: any) => k.isActive);
            if (active) return active.key;
        }
    } catch { /* ignore */ }
    
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    
    throw new Error("Chưa có Gemini API Key. Vào Cài đặt → AI để thêm key.");
}

/**
 * Scan an invoice/receipt image and extract structured data
 */
export async function scanInvoice(imageFile: File): Promise<OCRResult> {
    try {
        const apiKey = getApiKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
        });

        const base64Data = await fileToBase64(imageFile);
        const mimeType = imageFile.type || 'image/jpeg';

        const prompt = `Bạn là hệ thống OCR chuyên xử lý chứng từ vận tải Việt Nam.
Phân tích ảnh chứng từ/hóa đơn/phiếu chi này và trích xuất thông tin sau:

Trả lời ĐÚNG JSON format (không markdown, không code block):
{
  "amount": <số tiền VND, kiểu number, ví dụ 450000>,
  "description": "<mô tả ngắn gọn, ví dụ: Đổ dầu diesel 50L>",
  "date": "<ngày trên chứng từ, format YYYY-MM-DD, ví dụ: 2026-04-15>",
  "category": "<một trong: cat_fuel, cat_toll, cat_meal, cat_maint, cat_loading, cat_insurance, cat_other>",
  "vehicle_plate": "<biển số xe nếu thấy trên chứng từ, null nếu không có>",
  "vendor_name": "<tên cửa hàng/trạm xăng/nhà cung cấp nếu có>",
  "confidence": <độ tin cậy 0.0 đến 1.0>,
  "raw_text": "<toàn bộ text nhận dạng được từ ảnh>"
}

Quy tắc phân loại category:
- cat_fuel: xăng, dầu, diesel, gas
- cat_toll: cầu đường, phí BOT, phí cầu, trạm thu phí
- cat_meal: ăn uống, nhà hàng, quán ăn
- cat_maint: sửa chữa, thay nhớt, lốp xe, bảo trì
- cat_loading: bốc xếp, nâng hạ
- cat_insurance: bảo hiểm
- cat_other: khác

Nếu không đọc được, trả về: {"amount": 0, "description": "Không nhận dạng được", "confidence": 0}`;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            },
        ]);

        const responseText = result.response.text().trim();
        
        // Clean potential markdown wrapping
        let jsonStr = responseText;
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonStr);

        return {
            success: true,
            data: {
                amount: Number(parsed.amount) || 0,
                description: parsed.description || '',
                date: parsed.date || new Date().toISOString().slice(0, 10),
                category: parsed.category || 'cat_other',
                vehicle_plate: parsed.vehicle_plate || undefined,
                vendor_name: parsed.vendor_name || undefined,
                confidence: Number(parsed.confidence) || 0,
                raw_text: parsed.raw_text || '',
            },
        };
    } catch (err: any) {
        console.error('[InvoiceOCR] Error:', err);
        
        if (err.message?.includes('API key')) {
            return { success: false, error: 'Gemini API Key không hợp lệ. Kiểm tra trong Cài đặt → AI.' };
        }
        if (err.message?.includes('quota') || err.message?.includes('429')) {
            return { success: false, error: 'API đã hết quota. Thử lại sau hoặc thêm API key khác.' };
        }
        if (err.message?.includes('fetch') || err.message?.includes('network')) {
            return { success: false, error: 'Lỗi mạng. Kiểm tra kết nối internet.' };
        }
        
        return { 
            success: false, 
            error: err.message || 'Không thể phân tích ảnh chứng từ.' 
        };
    }
}
