# Smart Trash IoT System

Hệ thống thùng rác thông minh sử dụng ESP8266, ESP32, cảm biến và MQTT.

## Tính năng
- Tự động mở nắp khi phát hiện tay
- Đo mức độ đầy thùng rác
- Theo dõi vị trí GPS
- Gửi dữ liệu realtime qua MQTT
- Dashboard web hiển thị bản đồ và dữ liệu

## Cấu hình trước khi chạy

### 1. ESP32 Gateway
Mở file `esp32_gateway_server.ino` và thay đổi:
```cpp
const char *STA_SSID = "YOUR_WIFI_SSID";  // Tên WiFi của bạn
const char *STA_PASS = "YOUR_WIFI_PASSWORD";  // Mật khẩu WiFi
const char *MQTT_USER = "YOUR_MQTT_USERNAME";
const char *MQTT_PASS = "YOUR_MQTT_PASSWORD";
```

### 2. Backend
Tạo file `.env` trong thư mục `DoAn-VV-trsang/doan2/`:
```
DB_PASSWORD=your_mysql_password
MQTT_PASSWORD=your_mqtt_password
```

### 3. Frontend
Tạo file `.env` trong thư mục `DoAn-VV-trsang/doan2-frontend/`:
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Chạy dự án
```bash
# Backend + Frontend + Database
cd DoAn-VV-trsang/DoAn-VV-trsang
docker-compose up -d
```

Truy cập: `http://localhost:3000`

## Giấy phép
MIT License
