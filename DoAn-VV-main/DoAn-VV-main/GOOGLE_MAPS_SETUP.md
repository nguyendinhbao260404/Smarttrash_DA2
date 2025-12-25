# 🗺️ Google Maps API Integration Guide

## Bước 1: Lấy API Key (MIỄN PHÍ)

### 1.1 Tạo Google Cloud Project

1. Vào: https://console.cloud.google.com/
2. Đăng nhập Google account
3. Click **"Create Project"** hoặc **"Chọn dự án"** → **"New Project"**
4. Đặt tên: `Smart Trash System`
5. Click **"Create"**

### 1.2 Enable Maps JavaScript API

1. Vào: https://console.cloud.google.com/apis/library
2. Search: **"Maps JavaScript API"**
3. Click vào kết quả
4. Click **"ENABLE"**

### 1.3 Tạo API Key

1. Vào: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy API key (dạng: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX`)
4. Click **"Restrict Key"** (quan trọng!)

### 1.4 Restrict API Key (Bảo mật)

1. **Application restrictions**: HTTP referrers
2. Add referrers:
   ```
   http://localhost:*
   http://127.0.0.1:*
   http://your-domain.com/*
   ```
3. **API restrictions**: Restrict key → Chọn "Maps JavaScript API"
4. **Save**

---

## Bước 2: Cài thư viện

Đã làm sẵn! Chỉ cần chạy lại Docker hoặc npm install.

---

## Bước 3: Thêm API Key vào project

Tạo file `.env` trong `doan2-frontend/`:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**Thay `YOUR_API_KEY_HERE` bằng API key vừa copy!**

---

## Bước 4: Test

1. Chạy frontend: `npm run dev`
2. Vào `/map`
3. Sẽ thấy Google Maps với markers!

---

## 💰 Chi phí

**MIỄN PHÍ** cho:
- Đầu tiên tháng: $200 credit
- Sau đó: 28,000 map loads/tháng miễn phí
- Demo/development: Hoàn toàn đủ!

---

## 🔒 Bảo mật

**QUAN TRỌNG**: 
- LUÔN restrict API key!
- KHÔNG commit `.env` vào Git!
- Dùng environment variables cho production

---

## ✅ Checklist

- [ ] Tạo Google Cloud Project
- [ ] Enable Maps JavaScript API
- [ ] Lấy API Key
- [ ] Restrict API Key
- [ ] Tạo file `.env`
- [ ] Paste API key vào `.env`
- [ ] Test map

**Làm xong báo tôi để implement code!** 🚀
