# 🔴 FIX: Firebase API Key Lỗi - hướng dẫn chi tiết

**Ngày:** 2026-03-31  
**Lỗi:** `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`  
**Trạng thái:** Critical - ảnh hưởng 100% người dùng

---

## 🎯 Vấn đề & Nguyên nhân

### Phân biệt: API Key vs Authorized Domains

| Thành phần | Mục đích | Kiểm soát |
|-----------|---------|----------|
| **API Key** | Credentials để kết nối Firebase | Xác thực ứng dụng với Firebase services |
| **Authorized Domains** | OAuth security whitelist | ✅/❌ cho phép redirect từ domain nào |

❌ **Sai hiểu:** "Authorized Domains fix auth/api-key-not-valid"  
✅ **Đúng:** "API Key mismatch fix auth/api-key-not-valid"

**Lỗi này xuất hiện khi:**
- API Key trong source code **không khớp** với API Key trong Firebase Console
- API Key đã bị xóa hoặc hết hạn
- API Key chưa được enable service tương ứng

---

## 🔧 Giải pháp 

### **Bước 1: Lấy API Key đúng từ Firebase Console**

1. Vào **https://console.firebase.google.com**
2. Chọn project: **fleetpro-app**
3. Chọn **Project Settings** (⚙️ biểu tượng tuning)
4. Chọn tab **General** (hoặc **Service Accounts** → **Private Key file**)
5. Cuộn xuống tìm section **Your apps** hoặc **Web API key**
6. **Copy toàn bộ API Key** (không include dấu ngoặc kép)

**Ví dụ:**
```
AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4
```

### **Bước 2: Cập nhật Source Code**

**File:** `src/lib/firebase.ts` hoặc `.env.local`

**Option A: Qua Environment Variables (.env.local)**

```bash
VITE_FIREBASE_API_KEY=AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4
VITE_FIREBASE_AUTH_DOMAIN=fleetpro-app.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=fleetpro-app
VITE_FIREBASE_STORAGE_BUCKET=fleetpro-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1094737819291
VITE_FIREBASE_APP_ID=1:1094737819291:web:15871bf0c228943519f83e
VITE_FIREBASE_MEASUREMENT_ID=G-H5WZJ5X22T
```

**Option B: Hardcode trong firebase.ts (dev only)**

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyDYCsMHuHyQSJ0PMTyibPT86SeLAYSdEn4",
  authDomain: "fleetpro-app.firebaseapp.com",
  databaseURL: "https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fleetpro-app",
  storageBucket: "fleetpro-app.firebasestorage.app",
  messagingSenderId: "1094737819291",
  appId: "1:1094737819291:web:15871bf0c228943519f83e",
  measurementId: "G-H5WZJ5X22T"
};
```

### **Bước 3: Kiểm tra Authorized Domains (Optional)**

Authorized Domains chỉ cần check nếu sử dụng OAuth3 (Google Sign In). Để fix `auth/api-key-not-valid`, bước này **không bắt buộc**.

Nhưng nếu muốn:
1. Tại Project Settings, chọn tab **Authentication**
2. Chọn **Settings**
3. Cuộn xuống tìm section **Authorized Domains**
4. **Thêm các domain:**
   ```
   tnc.io.vn
   www.tnc.io.vn
   fleetpro-app.pages.dev
   localhost
   ```

### **Bước 4: Kích hoạt Authentication Method**

1. Tại Firebase Console, chọn **Authentication**
2. Chọn **Sign-in method**
3. **Enable:** Email/Password (nếu chưa)

### **Bước 5: Clear Cache & Rebuild**

```powershell
# Xóa cache build
rm -r dist
rm -r node_modules/.vite

# Rebuild
npm run build

# Clear browser cache
# Ctrl + Shift + Delete → Clear All time
```

### **Bước 6: Test Login**

1. Truy cập **https://tnc.io.vn/auth** (hoặc localhost:5173)
2. Click vào tab **"TÀI KHOẢN DÙNG THỬ (DEMO MODE)"**
3. Click vào tài khoản CEO: `CEO@demo.tnc.io.vn`
4. Nếu thành công → lỗi đã fix ✅

---

## 🚨 Nếu gặp `auth/too-many-requests`

**Nguyên nhân:** Đã thử đăng nhập quá nhiều lần  
**Giải pháp:**
- ⏸️ Chờ 5-10 phút để Firebase reset rate limit
- Kiểm tra email/password đúng
- Thử lại

---

## 📋 Checklist Fix

- [ ] Vào Firebase Console fleetpro-app
- [ ] Copy API Key từ Project Settings
- [ ] Cập nhật `.env.local` hoặc `firebase.ts` với API Key mới
- [ ] Kiểm tra `VITE_FIREBASE_DATABASE_URL` có tồn tại
- [ ] Enable Email/Password authentication
- [ ] Clear cache build (rm -r dist, node_modules/.vite)
- [ ] npm run build
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Test login với demo account
- [ ] Test đăng ký tài khoản mới
- [ ] Test khôi phục mật khẩu

---

## 🆘 Nếu vẫn gặp lỗi

### Kiểm tra thêm:

1. **Xác nhận API Key tồn tại:**
   ```bash
   # Vào Firebase Console → Project Settings
   # Kiểm tra "Web API Key" có giá trị
   # So sánh với .env.local VITE_FIREBASE_API_KEY
   ```

2. **Kiểm tra Network tab trong DevTools:**
   - F12 → Network tab
   - Thực hiện đăng nhập
   - Tìm request gửi tới `identitytoolkit.googleapis.com`
   - Kiểm tra response error code

3. **Enable Debug Logging:**
   - Mở DevTools → Console
   - Nên thấy: `Firebase initialized successfully` ✅
   - Nếu thấy: `Firebase Initialization Failed` ❌ → check API Key

4. **Reset Firebase Configuration:**
   - Xóa toàn bộ API Keys
   - Tạo lại API Key mới
   - Cấu hình từ đầu

5. **Liên hệ Firebase Support:**
   - https://firebase.google.com/support

---

## 📊 Cấu hình Firebase đúng (Production)

| Thuộc tính | Giá trị | Bắt buộc |
|-----------|--------|---------|
| **apiKey** | AIzaSyDYCsMHu... | ✅ YES |
| **authDomain** | fleetpro-app.firebaseapp.com | ✅ YES |
| **databaseURL** | https://fleetpro-app-default-rtdb... | ✅ YES |
| **projectId** | fleetpro-app | ✅ YES |
| **storageBucket** | fleetpro-app.firebasestorage.app | ⚠️ Recommended |
| **messagingSenderId** | 1094737819291 | ⚠️ Recommended |
| **appId** | 1:1094737819291:web:... | ✅ YES |
| **measurementId** | G-H5WZJ5X22T | ⚠️ Optional |

---

## 🎉 Kết quả mong đợi

Khi fix thành công:

```javascript
✅ Firebase initialized successfully
✅ Demo account login works
✅ Signup form works
✅ Password reset works
```

---

## 📞 Hỗ trợ

- **Liên hệ Admin:** Zalo 0989890022
- **Issue Tracker:** GitHub Issues
- **Email:** support@fleetpro.vn
