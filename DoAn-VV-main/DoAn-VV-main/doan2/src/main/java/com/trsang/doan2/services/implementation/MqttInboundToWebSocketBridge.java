package com.trsang.doan2.services.implementation;

import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MqttInboundToWebSocketBridge {

    private final SimpMessagingTemplate simpMessagingTemplate;

    public MqttInboundToWebSocketBridge(SimpMessagingTemplate simpMessagingTemplate) {
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(Message<?> message) {
        log.info("====== MQTT MESSAGE RECEIVED ======");

        String topic = (String) message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        Object payload = message.getPayload();

        log.info("Topic: {}", topic);
        log.info("Payload: {}", payload);

        // topic pattern is expected: smarttrash/{nodeName}/data
        String nodeName = "unknown";
        if (topic != null) {
            String[] parts = topic.split("/");
            if (parts.length >= 2) {
                nodeName = parts[1]; // Extract node1 or node2
            }
        }

        // Forward payload to STOMP destination for that node
        String destination = "/topic/sensors/" + nodeName;
        log.info("Forwarding to WebSocket destination: {}", destination);

        simpMessagingTemplate.convertAndSend(destination, payload);

        log.info("====== END MQTT MESSAGE ======");
    }

}
