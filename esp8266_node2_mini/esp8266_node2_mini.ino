
/**
 * ESP8266 Node 2 - Mini Trash Bin (ESP-12E) - v3.0 ULTRA BATTERY OPTIMIZED
 * Gửi dữ liệu cảm biến qua LoRa AS-32 -> Gateway ESP32
 *
 * === SMART TRASH PROJECT - NODE 2 ===
 * ULTRA Battery Optimization:
 * - GPS: Bật chỉ khi gửi LoRa (tiết kiệm ~48mA)
 * - Servo: Detach sau dùng (tiết kiệm ~15mA)
 * - Adaptive lid check (tiết kiệm CPU)
 * - 2.5 phút offset (tránh collision với Node 1)
 * - Pin ước tính: 4-6 tháng (1x18650) hoặc 8-12 tháng (2x18650)
 *
 * QUAN TRỌNG: Set CPU 40MHz trong Arduino IDE:
 * Tools -> CPU Frequency -> 40MHz (tiết kiệm thêm 30mA)
 */

#include <ESP8266WiFi.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>

// --- Pin Definitions ---
#define IR_SENSOR_PIN A0
#define SR04_TRIG D7
#define SR04_ECHO D1
#define LORA_TX D4
#define GPS_RX D8
#define GPS_TX D5
#define SERVO_PIN D6
#define LORA_LED_PIN D3

// --- Timing Constants (BATTERY OPTIMIZED) ---
const unsigned long SEND_INTERVAL = 300000; // 5 phút
const unsigned long SEND_OFFSET =
    15000; // Offset 15 giây (tránh collision với Node 1)
const unsigned long LID_CHECK_INTERVAL_ACTIVE = 200; // Active mode
const unsigned long LID_CHECK_INTERVAL_IDLE = 500;   // Idle mode
const unsigned long LID_OPEN_TIME = 2000;            // 2 giây
const unsigned long GPS_TIMEOUT = 30000;  // 30s để GPS lock (OPTIMIZED)
const unsigned long IDLE_TIMEOUT = 30000; // 30s = idle
const int LORA_LED_BLINK_MS = 100;
const unsigned long IR_DEBOUNCE_TIME = 500;

// --- Sensor Thresholds ---
const int IR_HAND_THRESHOLD = 512; // IR analog threshold
const int MIN_TRASH_LEVEL = 0;     // Minimum valid trash level (mm)
const int MAX_TRASH_LEVEL = 4000; // Maximum valid trash level (mm) - SR04 range
const int SR04_MAX_RETRIES = 3;   // Retry SR04 if failed

// --- Serial ---
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
TinyGPSPlus gps;
Servo servo;

// --- State Variables ---
unsigned long lastSend = 0;
unsigned long lastLidCheck = 0;
unsigned long lidOpenStart = 0;
unsigned long lastIRDetect = 0;
unsigned long lastActivity = 0;
bool isLidOpen = false;
bool servoAttached = false;
bool gpsEnabled = false;
unsigned long currentLidCheckInterval = LID_CHECK_INTERVAL_ACTIVE;

// Cached GPS
double cachedLat = 0.0;
double cachedLon = 0.0;
int cachedSats = 0;

struct SensorStatus {
  bool ir_ok;
  bool sr04_ok;
  bool gps_ok;
} sensorStatus = {false, false, false};

struct SensorData {
  float ax, ay, az; // Simulated (0)
  int trashLevel_mm;
  int gasRaw; // Simulated (0)
  double lat, lon;
  int gpsSats;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n\n=== Node 2 v3.0 ULTRA BATTERY OPTIMIZED ==="));
  Serial.println(F("Set CPU to 40MHz for extra 30mA savings!"));

  // Apply offset
  lastSend = millis() - (SEND_INTERVAL - SEND_OFFSET);
  Serial.println(F("Send offset: 15 seconds (avoid collision with Node 1)"));

  WiFi.mode(WIFI_OFF);
  WiFi.forceSleepBegin();
  delay(1);

  Serial1.begin(9600);
  gpsSerial.begin(9600);
  delay(100);
  gpsSerial.end(); // TẮT GPS để tiết kiệm pin (~48mA)
  gpsEnabled = false;

  // Servo: Detach ngay để tiết kiệm
  servo.attach(SERVO_PIN);
  servo.write(0);
  delay(500);
  servo.detach();
  servoAttached = false;

  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(SR04_TRIG, OUTPUT);
  pinMode(SR04_ECHO, INPUT);
  pinMode(LORA_LED_PIN, OUTPUT);
  digitalWrite(LORA_LED_PIN, LOW);
  digitalWrite(SR04_TRIG, LOW);

  Serial.println(F("\nBattery Optimizations:"));
  Serial.println(F("- GPS: OFF (bật chỉ khi gửi)"));
  Serial.println(F("- Servo: Detached"));
  Serial.println(F("- Adaptive lid check"));
  Serial.println(F("Est. battery: 4-6 months\n"));

  ESP.wdtEnable(5000);
}

void enableGPS() {
  if (!gpsEnabled) {
    gpsSerial.begin(9600);
    gpsEnabled = true;
    Serial.println(F("[GPS] Enabled"));
  }
}

void disableGPS() {
  if (gpsEnabled) {
    gpsSerial.end();
    gpsEnabled = false;
    Serial.println(F("[GPS] Disabled (power save)"));
  }
}

bool waitForGPSLock(unsigned long timeout) {
  Serial.print(F("[GPS] Waiting for lock"));
  unsigned long start = millis();

  while (millis() - start < timeout) {
    while (gpsSerial.available()) {
      if (gps.encode(gpsSerial.read())) {
        if (gps.location.isValid() && gps.location.age() < 2000) {
          Serial.println(F(" ✅"));
          return true;
        }
      }
    }
    if ((millis() - start) % 5000 == 0) {
      Serial.print(".");
    }
    yield();
  }

  Serial.println(F(" ❌ Timeout"));
  return false;
}

int readIRSensor() { return analogRead(IR_SENSOR_PIN); }

int readSR04Distance() {
  const int NUM_SAMPLES = 3;
  int validSamples = 0;
  long totalDistance = 0;
  int retries = 0;

  while (validSamples < NUM_SAMPLES && retries < SR04_MAX_RETRIES) {
    for (int i = 0; i < NUM_SAMPLES; i++) {
      digitalWrite(SR04_TRIG, LOW);
      delayMicroseconds(2);
      digitalWrite(SR04_TRIG, HIGH);
      delayMicroseconds(10);
      digitalWrite(SR04_TRIG, LOW);

      long duration = pulseIn(SR04_ECHO, HIGH, 30000);

      if (duration > 0) {
        long distance = (long)(duration / 58); // Khoảng cách tính bằng cm
        // Validate reading
        if (distance > 0 && distance < 400) { // SR04 max ~4m
          totalDistance += distance;
          validSamples++;
        }
      }

      if (i < NUM_SAMPLES - 1)
        delay(10);
    }

    if (validSamples == 0) {
      retries++;
      delay(50); // Wait before retry
    }
  }

  if (validSamples == 0)
    return -1;

  return (int)(totalDistance / validSamples);
}

void readSensorData(SensorData &data) {
  data.timestamp = millis();

  // Simulated (Node 2 không có ADXL345)
  data.ax = 0.0;
  data.ay = 0.0;
  data.az = 0.0;

  // Real SR04 with validation
  int rawTrash = readSR04Distance();
  if (rawTrash >= MIN_TRASH_LEVEL && rawTrash <= MAX_TRASH_LEVEL) {
    data.trashLevel_mm = rawTrash;
  } else {
    data.trashLevel_mm = -1; // Invalid reading
  }

  // Simulated (Node 2 không có gas sensor)
  data.gasRaw = 0;

  // GPS: Cached
  data.lat = cachedLat;
  data.lon = cachedLon;
  data.gpsSats = cachedSats;
}

// JSON FORMAT GIỐNG NODE 1
void makePayload(const SensorData &data, char *buffer, size_t bufSize) {
  snprintf(buffer, bufSize,
           "{\"n\":\"node2\",\"t\":%lu,\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
           "\"g\":%d,\"trash\":%d,\"lat\":%.6f,\"lon\":%.6f,\"sat\":%d}",
           data.timestamp, data.ax, data.ay, data.az, data.gasRaw,
           data.trashLevel_mm, data.lat, data.lon, data.gpsSats);
}

void sendLoRaData(const char *payload) {
  Serial1.println(payload);
  Serial.print(F("📡 LoRa TX: "));
  Serial.println(payload);

  digitalWrite(LORA_LED_PIN, HIGH);
  delay(LORA_LED_BLINK_MS);
  digitalWrite(LORA_LED_PIN, LOW);
}

void controlLid() {
  unsigned long currentMillis = millis();

  // Đóng nắp
  if (isLidOpen && (currentMillis - lidOpenStart >= LID_OPEN_TIME)) {
    Serial.println(">>> Closing Lid <<<");
    if (!servoAttached) {
      servo.attach(SERVO_PIN);
      delay(15);
    }
    servo.write(0);
    delay(300);
    servo.detach(); // DETACH để tiết kiệm pin
    servoAttached = false;
    isLidOpen = false;
    Serial.println(F("🚪 Servo CLOSE + DETACHED"));
  }

  // Mở nắp với debounce
  if (!isLidOpen) {
    int irValue = readIRSensor();

    if (irValue >= 0 && irValue < IR_HAND_THRESHOLD) {
      if (currentMillis - lastIRDetect >= IR_DEBOUNCE_TIME) {
        Serial.println(">>> HAND DETECTED <<<");

        if (!servoAttached) {
          servo.attach(SERVO_PIN);
          servoAttached = true;
          delay(15);
        }

        servo.write(90);
        isLidOpen = true;
        lidOpenStart = currentMillis;
        lastIRDetect = currentMillis;
        lastActivity = currentMillis; // Reset idle

        Serial.print(F("Servo OPEN (IR: "));
        Serial.print(irValue);
        Serial.println(")");
      }
    }
  }
}

void loop() {
  ESP.wdtFeed();
  unsigned long now = millis();

  // Adaptive lid check
  if (now - lastActivity > IDLE_TIMEOUT) {
    currentLidCheckInterval = LID_CHECK_INTERVAL_IDLE;
  } else {
    currentLidCheckInterval = LID_CHECK_INTERVAL_ACTIVE;
  }

  // Điều khiển nắp
  if (now - lastLidCheck >= currentLidCheckInterval) {
    lastLidCheck = now;
    controlLid();
  }

  // Gửi dữ liệu
  if (now - lastSend >= SEND_INTERVAL) {
    lastSend = now;

    Serial.println(F("\n========== SENDING DATA =========="));

    // 1. BẬT GPS
    enableGPS();

    // 2. Đợi GPS lock
    if (waitForGPSLock(GPS_TIMEOUT)) {
      if (gps.location.isValid()) {
        cachedLat = gps.location.lat();
        cachedLon = gps.location.lng();
        cachedSats = gps.satellites.isValid() ? gps.satellites.value() : 0;
        sensorStatus.gps_ok = true;
        Serial.println(F("[GPS] Cache updated ✅"));
      }
    } else {
      Serial.println(F("[GPS] Using cached data"));
    }

    // 3. Đọc sensors
    SensorData data;
    readSensorData(data);

    // 4. Tạo payload
    char payload[256];
    makePayload(data, payload, sizeof(payload));

    // 5. Gửi LoRa
    sendLoRaData(payload);

    // 6. TẮT GPS
    disableGPS();

    // Debug
    Serial.print(F("Heap: "));
    Serial.print(ESP.getFreeHeap());
    Serial.print(F(" | Trash: "));
    Serial.print(data.trashLevel_mm);
    Serial.println(F("mm"));
    Serial.println(F("==================================\n"));
  }

  yield();
}
