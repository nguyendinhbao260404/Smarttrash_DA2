/*
 * LoRa Test - Node 2 (Transmit Only)
 * ESP8266 ESP-12E
 *
 * Hardware Connections (GIỐNG NHƯ TRONG WIRING GUIDE):
 * LoRa AS-32 RX  -> GPIO2 (D4) - ESP TX
 * LoRa AS-32 TX  -> KHÔNG NỐI (chỉ transmit)
 * LoRa AS-32 VCC -> 3.3V
 * LoRa AS-32 GND -> GND
 *
 * Frequency: 433MHz
 * Baud Rate: 9600
 */

#include <SoftwareSerial.h>

// LoRa sử dụng Serial1 (GPIO2 - D4)
// ESP8266 Serial1 chỉ có TX (GPIO2), không có RX
// TX: GPIO2 (D4) -> LoRa RX

int messageCount = 0;

void setup() {
  // Serial cho debug
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== LoRa Test Node 2 ===");

  // Serial1 cho LoRa (chỉ TX)
  Serial1.begin(9600);
  delay(1000);

  Serial.println("LoRa initialized on Serial1 (GPIO2)");
  Serial.println("Starting transmission test...\n");
}

void loop() {
  messageCount++;

  // Tạo message JSON đơn giản
  String message = "{\"node\":\"node2\",\"count\":" + String(messageCount) +
                   ",\"test\":\"ok\"}";

  // Gửi qua LoRa
  Serial1.println(message);

  // Debug qua Serial
  Serial.print("[TX] ");
  Serial.println(message);

  // LED blink để biết đang gửi
  digitalWrite(LED_BUILTIN, LOW); // LED on
  delay(100);
  digitalWrite(LED_BUILTIN, HIGH); // LED off

  // Gửi mỗi 7 giây (offset với Node 1)
  delay(7000);
}
