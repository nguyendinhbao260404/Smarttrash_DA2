/* ==========================================================================
   ESP32 GATEWAY - SMART TRASH PROJECT v3.0 MQTT
   LoRa -> MQTT Bridge with SSL/TLS

   Chức năng:
   - Nhận dữ liệu từ ESP8266 nodes qua LoRa AS-32
   - Publish lên MQTT broker (HiveMQ Cloud SSL)
   - LCD hiển thị stats
   - Topics: smarttrash/node1/data, smarttrash/node2/data
   ========================================================================== */

#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

// ================== WIFI CONFIG ==================
const char *STA_SSID = "YOUR_WIFI_SSID";     // Thay bằng tên WiFi của bạn
const char *STA_PASS = "YOUR_WIFI_PASSWORD"; // Thay bằng mật khẩu WiFi
const char *AP_SSID = "SmartTrash_AP";
const char *AP_PASS = "12345678";

// ================== MQTT CONFIG ==================
const char *MQTT_BROKER = "e475fd80cdeb43c78a9cc8ac1abec5d7.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char *MQTT_USER = "YOUR_MQTT_USERNAME"; // Thay bằng MQTT username
const char *MQTT_PASS = "YOUR_MQTT_PASSWORD"; // Thay bằng MQTT password
const char *MQTT_CLIENT_ID = "esp32-gateway-001";

// MQTT Topics
const char *TOPIC_NODE1 = "smarttrash/node1/data";
const char *TOPIC_NODE2 = "smarttrash/node2/data";

// ================== HARDWARE CONFIG ==================
LiquidCrystal_I2C lcd(0x27, 16, 2);
#define LORA_RX_PIN 16
#define LORA_TX_PIN 17
#define LORA_BAUD_RATE 9600

// ================== TIMING ==================
const unsigned long LCD_UPDATE_INTERVAL = 500;
const unsigned long MQTT_RECONNECT_INTERVAL = 5000;

// ================== OBJECTS ==================
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

unsigned long lastLcdUpdate = 0;
unsigned long lastMqttReconnect = 0;
unsigned long packetsReceived = 0;
unsigned long mqttPublished = 0;

// ================== FUNCTIONS ==================
void startSoftAP() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress ip = WiFi.softAPIP();
  Serial.printf("[WiFi] AP Mode: %s, IP: %s\n", AP_SSID, ip.toString().c_str());
  lcd.clear();
  lcd.print("AP Mode:");
  lcd.setCursor(0, 1);
  lcd.print(ip);
}

bool connectToWiFi(uint16_t timeoutMs = 15000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(STA_SSID, STA_PASS);
  Serial.printf("[WiFi] Connecting to %s...\n", STA_SSID);
  lcd.clear();
  lcd.print("Connecting WiFi");

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(500);
    Serial.print(".");
    yield();
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    lcd.clear();
    lcd.print("WiFi OK");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    return true;
  }

  Serial.println("[WiFi] Failed!");
  lcd.clear();
  lcd.print("WiFi Failed!");
  return false;
}

void connectToMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi not connected!");
    return;
  }

  // Skip if recently tried
  if (millis() - lastMqttReconnect < MQTT_RECONNECT_INTERVAL) {
    return;
  }
  lastMqttReconnect = millis();

  Serial.print("[MQTT] Connecting to ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  lcd.clear();
  lcd.print("MQTT Connect...");

  // Connect to MQTT
  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
    Serial.println("[MQTT] Connected!");
    lcd.clear();
    lcd.print("MQTT OK");
    delay(1000);
  } else {
    Serial.print("[MQTT] Failed, rc=");
    Serial.println(mqttClient.state());
    lcd.clear();
    lcd.print("MQTT Error:");
    lcd.setCursor(0, 1);
    lcd.print("Code ");
    lcd.print(mqttClient.state());
  }
}

void publishToMQTT(const char *payload) {
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Not connected, skipping publish");
    return;
  }

  // Parse JSON to get node name
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("[JSON] Parse error: ");
    Serial.println(error.c_str());
    return;
  }

  const char *nodeName = doc["n"];
  if (!nodeName) {
    Serial.println("[JSON] No 'n' field found");
    return;
  }

  // Determine topic
  const char *topic = nullptr;
  if (strcmp(nodeName, "node1") == 0) {
    topic = TOPIC_NODE1;
  } else if (strcmp(nodeName, "node2") == 0) {
    topic = TOPIC_NODE2;
  } else {
    Serial.printf("[MQTT] Unknown node: %s\n", nodeName);
    return;
  }

  // Publish
  if (mqttClient.publish(topic, payload)) {
    mqttPublished++;
    Serial.printf("[MQTT] Published to %s\n", topic);
    Serial.printf("       Payload: %s\n", payload);
  } else {
    Serial.println("[MQTT] Publish failed!");
  }
}

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  Serial2.begin(LORA_BAUD_RATE, SERIAL_8N1, LORA_RX_PIN, LORA_TX_PIN);

  lcd.init();
  lcd.backlight();
  lcd.print("Booting...");
  Serial.println("\n=== Smart Trash Gateway v3.0 MQTT ===");

  // Connect WiFi
  bool wifiOk = connectToWiFi();
  if (!wifiOk) {
    startSoftAP();
    wifiOk = false;
  }

  if (wifiOk) {
    // Setup MQTT with SSL
    espClient.setInsecure(); // Skip certificate validation (for testing)
    // For production, use: espClient.setCACert(root_ca);

    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setBufferSize(512);

    // Connect to MQTT
    connectToMQTT();
  }

  Serial.println("=== Setup Complete ===\n");
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
}

// ================== LOOP ==================
void loop() {
  yield();

  // Maintain MQTT connection
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      connectToMQTT();
    }
    mqttClient.loop();
  }

  // LoRa Processing
  if (Serial2.available()) {
    static char loraBuffer[512];
    static int bufferIndex = 0;

    while (Serial2.available()) {
      char c = Serial2.read();

      if (c == '\n' || c == '\r') {
        if (bufferIndex > 0) {
          loraBuffer[bufferIndex] = '\0';

          // Validate JSON
          if (bufferIndex > 5 && loraBuffer[0] == '{' &&
              loraBuffer[bufferIndex - 1] == '}') {

            Serial.printf("[LoRa] RX: %s\n", loraBuffer);

            // Publish to MQTT
            publishToMQTT(loraBuffer);

            packetsReceived++;

            // Update LCD (with debounce)
            unsigned long now = millis();
            if (now - lastLcdUpdate >= LCD_UPDATE_INTERVAL) {
              lcd.clear();
              lcd.print("RX:");
              lcd.print(packetsReceived);
              lcd.print(" TX:");
              lcd.print(mqttPublished);
              lcd.setCursor(0, 1);

              if (mqttClient.connected()) {
                lcd.print("MQTT OK ");
              } else {
                lcd.print("MQTT ERR ");
              }

              lcd.print(now / 1000);
              lcd.print("s");
              lastLcdUpdate = now;
            }

          } else {
            Serial.printf("[LoRa] Invalid: %s\n", loraBuffer);
          }

          bufferIndex = 0;
        }
      } else if (bufferIndex < sizeof(loraBuffer) - 1) {
        loraBuffer[bufferIndex++] = c;
      } else {
        Serial.println("[LoRa] Buffer overflow!");
        bufferIndex = 0;
      }
    }
  }
}