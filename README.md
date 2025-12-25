# 🗑️ Smart Trash WiFi System - Firmware

IoT Smart Trash monitoring system using ESP8266/ESP32 with LoRa communication.

## 📋 System Overview

3-node system with real-time trash monitoring and automatic lid control:
- **Node 1 (ESP8266)**: Main trash bin with hand detection & auto-open lid
- **Node 2 (ESP8266)**: Secondary trash bin  
- **Gateway (ESP32)**: LoRa to WiFi/MQTT bridge

## 🔧 Hardware Components

### Node 1 - Main Bin (ESP8266)
- **ESP8266 NodeMCU** (v1.0 ESP-12E)
- **VL53L1X**: Hand detection (2m range) - Module VL53L0/1XV2
- **VL6180X**: Trash level measurement (200mm range)
- **ADXL345**: Accelerometer (tilt/movement detection)
- **MiCS-5524**: Gas sensor (odor detection)
- **GPS NEO-6M**: Location tracking
- **Servo SG90**: Auto-open lid mechanism
- **LoRa AS-32 (433MHz)**: Wireless communication

### Node 2 - Secondary Bin (ESP8266)
- **ESP8266 NodeMCU**
- **HC-SR04**: Ultrasonic distance sensor
- **IR Sensor**: Lid state detection
- **ADXL345**: Accelerometer
- **MiCS-5524**: Gas sensor
- **GPS NEO-6M**: Location tracking
- **LoRa AS-32**: Wireless communication

### Gateway (ESP32)
- **ESP32 DevKit V1**
- **LoRa AS-32**: Receive from nodes
- **WiFi**: Internet connectivity
- **MQTT**: Cloud communication

## 📡 Communication Flow

```
Node 1/2 (LoRa TX) → Gateway (LoRa RX) → WiFi/MQTT → Backend Server
```

## ⚡ Key Features

### Node 1 - Main Bin
✅ **Hand Detection** - VL53L1X detects hand approach (< 300mm) → Auto-open lid  
✅ **Trash Level** - VL6180X measures fill percentage  
✅ **Time-Sharing** - VL53L1X & VL6180X share I2C address 0x29  
✅ **Battery Optimized** - GPS/Servo power management  
✅ **Movement Detection** - ADXL345 for bin tilt/tampering  
✅ **Gas Monitoring** - MiCS-5524 for odor levels  

### Node 2 - Secondary Bin
✅ **Ultrasonic Level** - HC-SR04 for trash measurement  
✅ **Lid State** - IR sensor detects open/closed  
✅ **Location Tracking** - GPS positioning  

### Gateway
✅ **LoRa Hub** - Receives from both nodes  
✅ **MQTT Bridge** - Forwards to cloud backend  
✅ **Data Aggregation** - Combines sensor data  

## 🚀 Getting Started

### Prerequisites
- **Arduino IDE** 1.8.19+
- **ESP8266 Board Package** 3.1.2
- **ESP32 Board Package** 2.0.14+

### Required Libraries

**Node 1 & 2:**
```
Adafruit ADXL345
Adafruit VL53L1X (for Node 1 VL53L0/1XV2 module)
Adafruit VL6180X
TinyGPSPlus
EspSoftwareSerial
Servo (ESP8266)
```

**Gateway:**
```
PubSubClient (MQTT)
ArduinoJson
WiFiManager
```

### Installation

1. **Install Libraries:**
   ```
   Arduino IDE → Tools → Manage Libraries
   Search and install each library listed above
   ```

2. **Configure WiFi/MQTT:**
   Edit gateway code with your credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI";
   const char* password = "YOUR_PASSWORD";
   const char* mqtt_server = "YOUR_MQTT_BROKER";
   ```

3. **Upload Firmware:**
   - **Node 1**: `esp8266_node_mqtt.ino`
   - **Node 2**: `esp8266_node2_mqtt.ino`
   - **Gateway**: `gateway_esp32_lora_mqtt.ino`

4. **Board Settings:**
   - **ESP8266**: NodeMCU 1.0, 80MHz, 4MB (FS:1MB OTA:~1019KB)
   - **ESP32**: ESP32 Dev Module, 240MHz, 4MB

## 📊 Pin Connections

### Node 1 (ESP8266)
| Component | Pin | Notes |
|-----------|-----|-------|
| VL53L1X XSHUT | D0 | Shutdown control |
| VL6180X SHDN | D7 | Shutdown control (HIGH=ON) |
| SDA (I2C) | D2 | Shared bus |
| SCL (I2C) | D1 | Shared bus |
| LoRa TX | D4 | Serial1 |
| GPS RX | D8 | SoftwareSerial |
| GPS TX | D5 | SoftwareSerial |
| Servo | D6 | PWM control |
| Gas Sensor | A0 | Analog input |
| LoRa LED | D3 | Status indicator |

### VL Sensor Time-Sharing
VL53L1X and VL6180X both use I2C address **0x29**. Time-sharing logic:
- **Default**: VL53L1X ON (hand detection), VL6180X OFF
- **Reading trash level**: VL53L1X OFF, VL6180X ON  
- **After reading**: VL53L1X ON, VL6180X OFF

## 🔋 Power Optimization

**Node 1 Battery Life: 4-6 months** (1x18650) or **8-12 months** (2x18650)

Optimizations:
- ✅ GPS OFF by default, ON only when sending data
- ✅ Servo detached after use (~15mA savings)
- ✅ Adaptive lid check interval (idle mode)
- ✅ WiFi sleep mode
- ✅ CPU 80MHz (40MHz may cause crashes)

## 🐛 Troubleshooting

### Fatal Exception (0) - VL53L1X
**Problem**: ESP8266 crashes with `epc1=0x40100000`  
**Solution**: Module VL53L0/1XV2 uses **VL53L1X chip**, not VL53L0X  
```cpp
#include <Adafruit_VL53L1X.h>  // Correct!
// NOT Adafruit_VL53L0X.h
```

### I2C Scan Returns 0 Devices
**Problem**: Both VL sensors ON → address conflict  
**Solution**: Ensure power cycle in setup():
```cpp
digitalWrite(VL53_XSHUT, LOW);
digitalWrite(VL6180_SHDN, LOW);
delay(100);  // Both OFF before Wire.begin()
```

### VL6180X Not Detected
**Logic**: VL6180X SHDN is **active HIGH**
```cpp
digitalWrite(VL6180_SHDN, HIGH);  // ON
digitalWrite(VL6180_SHDN, LOW);   // OFF
```

## 📝 Data Format

**LoRa JSON Payload:**
```json
{
  "node": 1,
  "trash": 45,
  "gas": 234,
  "ax": -0.12,
  "ay": 0.05,
  "az": 9.81,
  "lat": 10.762622,
  "lon": 106.660172,
  "sats": 8
}
```

## 🎯 Project Status

✅ **Hardware**: Fully wired and tested  
✅ **Node 1**: Hand detection + auto-open working  
✅ **Node 2**: Ultrasonic trash level working  
✅ **Gateway**: LoRa→MQTT bridge operational  
✅ **Time-Sharing**: VL sensors switching correctly  
🔄 **Backend**: Integration in progress  
🔄 **Frontend**: Dashboard development  

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributors

- Main Developer: DADTVT2 Team
- Hardware Design: [Your Name]
- Firmware: [Your Name]

## 🙏 Acknowledgments

- Adafruit for sensor libraries
- ESP8266/ESP32 community
- LoRa433MHz community

---

**Last Updated**: 2025-12-25  
**Firmware Version**: v8.0 - Ultra Battery Optimized
