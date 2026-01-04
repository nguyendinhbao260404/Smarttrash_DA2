package com.trsang.doan2.services.implementation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trsang.doan2.entities.SensorData;
import com.trsang.doan2.entities.User;
import com.trsang.doan2.repositories.ISensorDataRepository;
import com.trsang.doan2.repositories.IUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MqttDataSaver {

    private final ISensorDataRepository sensorDataRepository;
    private final IUserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void saveSensorData(Message<?> message) {
        try {
            String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);

            // Handle payload - can be String or byte[]
            String payload;
            Object payloadObj = message.getPayload();
            if (payloadObj instanceof String) {
                payload = (String) payloadObj;
            } else if (payloadObj instanceof byte[]) {
                payload = new String((byte[]) payloadObj);
            } else {
                log.warn("Unknown payload type: {}", payloadObj.getClass());
                return;
            }

            log.info("Received MQTT message on topic {}: {}", topic, payload);

            // Parse JSON payload
            JsonNode jsonNode = objectMapper.readTree(payload);

            // Extract node name from topic or payload
            String nodeName = jsonNode.has("n") ? jsonNode.get("n").asText() : extractNodeFromTopic(topic);

            // Find user by username (node name maps to username)
            Optional<User> userOpt = userRepository.findByUsername(nodeName);
            if (userOpt.isEmpty()) {
                // Try admin as default user
                userOpt = userRepository.findByUsername("admin");
                if (userOpt.isEmpty()) {
                    log.warn("No user found for node {}, skipping data save", nodeName);
                    return;
                }
            }

            User user = userOpt.get();

            // Map JSON fields to SensorData entity
            SensorData sensorData = SensorData.builder()
                    .user(user)
                    .nodeName(nodeName)
                    .distance(jsonNode.has("trash") ? jsonNode.get("trash").asDouble() : 0.0)
                    .gas(jsonNode.has("g") ? jsonNode.get("g").asInt() : 0)
                    .isDetectedHuman(false) // Not in current data format
                    .isTipping(detectTipping(jsonNode))
                    .latitude(jsonNode.has("lat") ? jsonNode.get("lat").asDouble() : 0.0)
                    .longitude(jsonNode.has("lon") ? jsonNode.get("lon").asDouble() : 0.0)
                    .satellites(jsonNode.has("sat") ? jsonNode.get("sat").asInt() : 0)
                    .build();

            sensorDataRepository.save(sensorData);
            log.info("Saved sensor data for node {} to database", nodeName);

        } catch (Exception e) {
            log.error("Error processing MQTT message: {}", e.getMessage(), e);
        }
    }

    private String extractNodeFromTopic(String topic) {
        // Topic format: smarttrash/node1/data -> extract "node1"
        if (topic != null && topic.contains("/")) {
            String[] parts = topic.split("/");
            if (parts.length > 1) {
                return parts[1];
            }
        }
        return "unknown";
    }

    private boolean detectTipping(JsonNode jsonNode) {
        // Detect tipping based on accelerometer values
        if (jsonNode.has("ax") && jsonNode.has("ay") && jsonNode.has("az")) {
            double ax = jsonNode.get("ax").asDouble();
            double ay = jsonNode.get("ay").asDouble();
            double az = jsonNode.get("az").asDouble();

            // Calculate total acceleration
            double totalAcc = Math.sqrt(ax * ax + ay * ay + az * az);

            // If z-axis is significantly less than total (not upright), might be tipping
            return Math.abs(az) < totalAcc * 0.5;
        }
        return false;
    }
}
