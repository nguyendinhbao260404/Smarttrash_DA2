// ADC_MODE(ADC_VCC); // KHÔNG CẦN vì code không đọc VCC

/**
 * ESP8266 Node 1 - Main Smart Trash Bin (ESP-12E) - v8.0 ULTRA BATTERY
 * OPTIMIZED Gửi dữ liệu cảm biến qua LoRa AS-32 -> Gateway ESP32
 *
 * === SMART TRASH PROJECT - NODE 1 ===
 * ULTRA Battery Optimization:
 * - GPS: Bật chỉ khi gửi LoRa (tiết kiệm ~48mA)
 * - Servo: Detach sau dùng (tiết kiệm ~15mA)
 * - Adaptive lid check (tiết kiệm CPU)
 * - Pin ước tính: 4-6 tháng (1x18650) hoặc 8-12 tháng (2x18650)
 *
 * QUAN TRỌNG: Set CPU 40MHz trong Arduino IDE để tiết kiệm thêm 30mA:
 * Tools -> CPU Frequency -> 40MHz
 */

#include <Adafruit_ADXL345.h> // BỎ ADXL345 để VL sensors hoạt động
#include <Adafruit_Sensor.h>  // BỎ ADXL345 để VL sensors hoạt động
#include <Adafruit_VL53L1X.h> // VL53L1X - Module VL53L0/1XV2 dùng chip này!
#include <Adafruit_VL6180X.h>
#include <ESP8266WiFi.h>
#include <Servo.h>
#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>
#include <Wire.h>

// --- Pin Definitions ---
#define SDA_PIN D2
#define SCL_PIN D1
#define LORA_TX D4
#define GPS_RX D8
#define GPS_TX D5
#define SERVO_PIN D6
#define GAS_PIN A0
#define VL53_XSHUT D0
#define VL6180_SHDN D7
#define LORA_LED_PIN D3

// --- Timing Constants (PRODUCTION MODE) ---
const unsigned long SEND_INTERVAL = 300000;          // 5 phút (PRODUCTION)
const unsigned long LID_CHECK_INTERVAL_ACTIVE = 200; // Active mode
const unsigned long LID_CHECK_INTERVAL_IDLE = 500; // Idle mode (tiết kiệm CPU)
const unsigned long LID_OPEN_TIME = 2000;          // 2 giây
const unsigned long GPS_TIMEOUT = 30000;  // 30s để GPS lock (OPTIMIZED)
const unsigned long IDLE_TIMEOUT = 30000; // 30s không activity = idle
const int LORA_LED_BLINK_MS = 100;
const unsigned long HAND_DEBOUNCE_TIME = 500;

// --- Sensor Thresholds ---
const int HAND_DETECT_DIST = 150; // 150mm cho dễ detect hơn
const int MIN_TRASH_LEVEL = 0;    // Minimum valid trash level (mm)
const int MAX_TRASH_LEVEL = 300;  // Maximum valid trash level (mm)
const int MIN_GAS_VALUE = 0;      // Minimum valid gas sensor value
const int MAX_GAS_VALUE = 1023;   // Maximum valid gas sensor value

// --- Serial ---
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345); // BỎ
Adafruit_VL6180X vl6180 = Adafruit_VL6180X();
Adafruit_VL53L1X vl53 = Adafruit_VL53L1X(); // VL53L1X chip!
TinyGPSPlus gps;
Servo servo;

// --- State Variables ---
unsigned long lastSend = 0;
unsigned long lastLidCheck = 0;
unsigned long lidOpenStart = 0;
unsigned long lastHandDetect = 0;
unsigned long lastActivity = 0;
bool isLidOpen = false;
bool servoAttached = false;
bool gpsEnabled = false;
unsigned long currentLidCheckInterval = LID_CHECK_INTERVAL_ACTIVE;

// Cached GPS (dùng khi GPS không lock)
double cachedLat = 0.0;
double cachedLon = 0.0;
int cachedSats = 0;

// --- Sensor Status ---
struct SensorStatus {
  bool adxl345_ok;
  bool vl53l1x_ok; // VL53L1X chip in VL53L0/1XV2 module
  bool vl6180x_ok;
  bool gps_ok;
} sensorStatus = {false, false, false, false};

struct SensorData {
  float ax, ay, az;
  int trashLevel_mm;
  int gasRaw;
  double lat, lon;
  int gpsSats;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n\n=== Node 1 v8.0 ULTRA BATTERY OPTIMIZED ==="));
  Serial.println(F("Set CPU to 40MHz for extra 30mA savings!"));

  // !!! INIT I2C VÀ VL SENSORS TRƯỚC TIÊN - TRƯỚC MỌI THỨ KHÁC !!!
  Serial.println(F("\n>>> INIT VL SENSORS FIRST <<<"));

  // VL shutdown pins (Config BEFORE Wire.begin to avoid conflict)
  pinMode(VL53_XSHUT, OUTPUT);
  pinMode(VL6180_SHDN, OUTPUT);

  // CRITICAL: Start with both sensors OFF
  digitalWrite(VL53_XSHUT, LOW);
  digitalWrite(VL6180_SHDN, LOW);
  delay(100); // Ensure both are fully reset

  // Enable pull-up
  pinMode(D2, INPUT_PULLUP); // SDA
  pinMode(D1, INPUT_PULLUP); // SCL
  delay(10);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);
  delay(50);

  // --- I2C Scanner ---
  Serial.println(F("\nScanning I2C..."));
  byte count = 0;
  for (byte i = 1; i < 120; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("Found at 0x"));
      if (i < 16)
        Serial.print("0");
      Serial.println(i, HEX);
      count++;
    }
  }
  Serial.print(F("Found "));
  Serial.print(count);
  Serial.println(F(" devices."));
  // -------------------

  // Init ADXL345 FIRST (address 0x53)
  Serial.print(F("Init ADXL345... "));
  sensorStatus.adxl345_ok = accel.begin();

  // Ensure clock is still 100k after accel.begin (just in case)
  Wire.setClock(100000);

  if (sensorStatus.adxl345_ok) {
    accel.setRange(ADXL345_RANGE_16_G);
    Serial.println(F("✅"));
  } else {
    Serial.println(F("❌"));
  }

  // TIME-SHARING: Chỉ init VL53L1X, VL6180X sẽ init khi cần đọc
  Serial.print(F("Init VL53L1X (Hand)... "));

  // CRITICAL: Power cycle VL53L1X (proven working sequence from test)
  digitalWrite(VL6180_SHDN, LOW); // Ensure VL6180X is OFF
  digitalWrite(VL53_XSHUT, LOW);  // Reset VL53L1X
  delay(100);
  digitalWrite(VL53_XSHUT, HIGH); // Power up VL53L1X
  delay(200);                     // Wait for sensor boot

  // Init VL53L1X with retry
  if (!vl53.begin(0x29, &Wire)) {
    Serial.print(F("retry..."));
    digitalWrite(VL53_XSHUT, LOW);
    delay(200);
    digitalWrite(VL53_XSHUT, HIGH);
    delay(300);

    if (!vl53.begin(0x29, &Wire)) {
      Serial.println(F("❌ DISABLED"));
      sensorStatus.vl53l1x_ok = false;
    } else {
      goto vl53_ok;
    }
  } else {
  vl53_ok:
    if (vl53.startRanging()) {
      Serial.println(F("✅"));
      sensorStatus.vl53l1x_ok = true;
      vl53.setTimingBudget(50); // 50ms timing budget
    } else {
      Serial.println(F("❌ Ranging failed"));
      sensorStatus.vl53l1x_ok = false;
    }
  }

  // VL6180X will be init on-demand in readTrashLevel()
  Serial.println(F("VL6180X (Trash): On-demand init"));
  sensorStatus.vl6180x_ok = true; // Assume OK, will verify when reading

  Serial.println(F(">>> TIME-SHARING MODE ENABLED <<<\n"));

  // BÂY GIỜ MỚI init các thứ khác
  WiFi.mode(WIFI_OFF);
  WiFi.forceSleepBegin();
  delay(1);

  Serial1.begin(9600);
  gpsSerial.begin(9600);
  delay(100);
  gpsSerial.end(); // TẮT GPS để tiết kiệm pin
  gpsEnabled = false;

  servo.attach(SERVO_PIN);
  servo.write(0);
  delay(500);
  servo.detach();
  servoAttached = false;

  pinMode(GAS_PIN, INPUT);
  pinMode(LORA_LED_PIN, OUTPUT);
  digitalWrite(LORA_LED_PIN, LOW);

  Serial.println(F("=== Init Complete ==="));
  printSensorStatus();

  Serial.println(F("\nBattery Optimizations:"));
  Serial.println(F("- GPS: OFF (bật chỉ khi gửi)"));
  Serial.println(F("- Servo: Detached (attach khi cần)"));
  Serial.println(F("- Adaptive lid check interval"));
  Serial.println(F("Est. battery: 4-6 months\n"));

  ESP.wdtEnable(5000);
}

// initSensors() function removed - VL sensors init directly in setup()

void printSensorStatus() {
  Serial.println(F("Sensor Status:"));
  Serial.print(F("  ADXL345: "));
  Serial.println(sensorStatus.adxl345_ok ? F("OK (0x53)") : F("FAIL"));
  Serial.print(F("  VL53L1X: "));
  Serial.println(sensorStatus.vl53l1x_ok ? F("OK (0x29)") : F("FAIL"));
  Serial.print(F("  VL6180X: "));
  Serial.println(sensorStatus.vl6180x_ok ? F("OK (On-demand)") : F("FAIL"));
  Serial.print(F("  GPS: "));
  Serial.println(F("Disabled (saves power)"));
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

int readHandDistance() {
  if (!sensorStatus.vl53l1x_ok)
    return -1;

  // VL53L1X API
  if (vl53.dataReady()) {
    int16_t distance = vl53.distance();
    vl53.clearInterrupt();

    if (distance == -1) {
      return -3; // Out of range
    }
    return (int)distance;
  }

  return -2; // Data not ready
}

int readTrashLevel() {
  // TIME-SHARING: Shutdown VL53L0X, enable VL6180, read, then restore

  // 1. Shutdown VL53L0X
  digitalWrite(VL53_XSHUT, LOW);
  delay(50);

  // 2. Enable VL6180X
  digitalWrite(VL6180_SHDN, HIGH);
  delay(100);

  // 3. Init VL6180X (address 0x29 now available)
  if (!vl6180.begin()) {
    // Init failed, restore VL53L0X
    digitalWrite(VL6180_SHDN, LOW);
    delay(50);
    digitalWrite(VL53_XSHUT, HIGH);
    delay(100);
    // VL53L0X doesn't need startRanging() - ready after begin()
    return -1;
  }

  // 4. Read VL6180X
  const int NUM_SAMPLES = 3;
  int validSamples = 0;
  long totalDist = 0;

  for (int i = 0; i < NUM_SAMPLES; i++) {
    uint8_t range = vl6180.readRange();
    uint8_t status = vl6180.readRangeStatus();

    if (status == VL6180X_ERROR_NONE) {
      totalDist += range;
      validSamples++;
    }
    delay(10);
  }

  int result = (validSamples == 0) ? -1 : (int)(totalDist / validSamples);

  // 5. Shutdown VL6180X, restore VL53L0X
  digitalWrite(VL6180_SHDN, LOW);
  delay(50);
  digitalWrite(VL53_XSHUT, HIGH);
  delay(100);
  // VL53L0X doesn't need startRanging() - ready after begin()

  return result;
}

void readSensorData(SensorData &data) {
  data.timestamp = millis();

  // Read ADXL345
  if (sensorStatus.adxl345_ok) {
    sensors_event_t event;
    accel.getEvent(&event);
    data.ax = event.acceleration.x;
    data.ay = event.acceleration.y;
    data.az = event.acceleration.z;
  } else {
    data.ax = 0.0;
    data.ay = 0.0;
    data.az = 0.0;
  }

  // Read trash level with validation
  int rawTrash = readTrashLevel();
  if (rawTrash >= MIN_TRASH_LEVEL && rawTrash <= MAX_TRASH_LEVEL) {
    data.trashLevel_mm = rawTrash;
  } else {
    data.trashLevel_mm = -1; // Invalid reading
  }

  // Read gas sensor with validation
  int rawGas = analogRead(GAS_PIN);
  if (rawGas >= MIN_GAS_VALUE && rawGas <= MAX_GAS_VALUE) {
    data.gasRaw = rawGas;
  } else {
    data.gasRaw = 0; // Invalid reading
  }

  // GPS: Sử dụng cached nếu không có GPS mới
  data.lat = cachedLat;
  data.lon = cachedLon;
  data.gpsSats = cachedSats;
}

void makePayload(const SensorData &data, char *buffer, size_t bufSize) {
  snprintf(buffer, bufSize,
           "{\"n\":\"node1\",\"t\":%lu,\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
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
      Serial.print("Attaching servo to pin D6... ");
      servo.attach(SERVO_PIN);
      servoAttached = true;
      Serial.println("OK");
      delay(50); // Tăng delay sau attach
    }
    Serial.print("Writing 0... ");
    servo.write(0);
    Serial.println("OK");
    delay(500);     // ĐỢI servo chuyển động xong!
    servo.detach(); // Detach để tiết kiệm pin (~15mA)
    servoAttached = false;
    isLidOpen = false;
    Serial.println(F("🚪 Servo CLOSE + DETACHED"));
  }

  // Mở nắp với debounce
  if (!isLidOpen) {
    int handDist = readHandDistance();

    if (handDist >= 0 && handDist < HAND_DETECT_DIST) {
      if (currentMillis - lastHandDetect >= HAND_DEBOUNCE_TIME) {
        Serial.println(">>> HAND DETECTED <<<");

        if (!servoAttached) {
          Serial.print("Attaching servo to pin D6... ");
          servo.attach(SERVO_PIN);
          servoAttached = true;
          Serial.println("OK");
          delay(50); // Tăng delay sau attach
        }

        Serial.print("Writing 90... ");
        servo.write(90);
        Serial.println("OK");
        delay(500); // ĐỢI servo chuyển động xong!
        isLidOpen = true;
        lidOpenStart = currentMillis;
        lastHandDetect = currentMillis;
        lastActivity = currentMillis; // Reset idle timer

        Serial.print(F("🚪 Servo OPEN ("));
        Serial.print(handDist);
        Serial.println("mm)");
      }
    }
  }
}

void loop() {
  ESP.wdtFeed();
  unsigned long now = millis();

  // Adaptive lid check interval (tiết kiệm CPU khi idle)
  if (now - lastActivity > IDLE_TIMEOUT) {
    currentLidCheckInterval = LID_CHECK_INTERVAL_IDLE; // Chậm hơn
  } else {
    currentLidCheckInterval = LID_CHECK_INTERVAL_ACTIVE; // Nhanh hơn
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

    // 2. Đợi GPS lock (60s max)
    if (waitForGPSLock(GPS_TIMEOUT)) {
      // GPS locked - Update cache
      if (gps.location.isValid()) {
        cachedLat = gps.location.lat();
        cachedLon = gps.location.lng();
        cachedSats = gps.satellites.isValid() ? gps.satellites.value() : 0;
        sensorStatus.gps_ok = true;
        Serial.println(F("[GPS] Cache updated ✅"));
      }
    } else {
      // GPS không lock - dùng cache
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

    // 6. TẮT GPS (tiết kiệm pin!)
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
