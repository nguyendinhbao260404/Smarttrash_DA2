# 🐳 Docker Deployment Guide

## ✨ Cách dùng CỰC ĐƠN GIẢN

### **Bước 1: Cài Docker Desktop**
- Tải: https://www.docker.com/products/docker-desktop
- Cài đặt và khởi động Docker Desktop
- Chờ Docker khởi động xong (icon docker màu xanh)

### **Bước 2: Chạy hệ thống**
**Double-click** vào file: **`docker-start.bat`**

**VẬY THÔI!** 🎉

---

## 📋 Chi tiết

### Lần đầu chạy:
- Build images: ~5-10 phút
- Sau đó tự động khởi động
- Browser tự động mở

### Lần sau:
- Chỉ mất ~30 giây
- Tất cả sẵn sàng ngay!

---

## 🌐 Truy cập

Sau khi chạy xong:

- **Web App**: http://localhost
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8000/docs
- **Database**: localhost:3306

### Login:
```
Username: admin
Password: admin123
```

---

## 🛑 Dừng hệ thống

Double-click: **`docker-stop.bat`**

---

## 📊 Xem logs

Mở terminal trong folder, gõ:
```bash
docker compose logs -f
```

Xem log từng service:
```bash
docker compose logs -f backend
docker compose logs -f ai-service
docker compose logs -f frontend
```

---

## 🔧 Troubleshooting

### Docker Desktop chưa chạy:
```
Start Docker Desktop và đợi khởi động xong
```

### Port đã được dùng:
```
Dừng app khác đang dùng port 80, 8080, 8000
Hoặc đổi port trong docker-compose.yml
```

### Build lỗi:
```
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Reset toàn bộ:
```
docker compose down -v
docker-start.bat
```

---

## 🎯 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | React UI + Nginx |
| Backend | 8080 | Spring Boot API |
| AI Service | 8000 | FastAPI ML |
| MySQL | 3306 | Database |

---

## 💾 Data Persistence

Database data được lưu trong **Docker volume**: `mysql_data`

Dùng khi cần:
- Dừng/khởi động: Data giữ nguyên ✅
- `docker compose down`: Data giữ nguyên ✅  
- `docker compose down -v`: **XÓA DATA** ❌

---

## ⚙️ Configuration

Đổi config trong `docker-compose.yml`:

```yaml
environment:
  MYSQL_PASSWORD: your-password-here
```

---

## 🚀 Production

Để deploy lên server:

1. Copy toàn bộ folder
2. Cài Docker
3. Chạy: `docker compose up -d`
4. Done!

---

**VẬY LÀ CHỈ CẦN 1 CLICK!** 🎉
