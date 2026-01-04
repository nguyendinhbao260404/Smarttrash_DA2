package com.trsang.doan2.controllers;

import com.trsang.doan2.dtos.SensorDataResponse;
import com.trsang.doan2.entities.SensorData;
import com.trsang.doan2.repositories.ISensorDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sensor-data")
@RequiredArgsConstructor
public class SensorDataController {

        private final ISensorDataRepository sensorDataRepository;
        private static final DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;

        @GetMapping("/latest")
        public ResponseEntity<Map<String, Object>> getLatestSensorData() {
                List<SensorData> latestData = sensorDataRepository.findLatestByUser();

                List<SensorDataResponse> response = latestData.stream()
                                .map(data -> SensorDataResponse.builder()
                                                .id(data.getId().toString())
                                                .nodeName(data.getNodeName())
                                                .latitude(data.getLatitude())
                                                .longitude(data.getLongitude())
                                                .distance(data.getDistance())
                                                .gas(data.getGas())
                                                .timestamp(data.getTimestamp().format(formatter))
                                                .build())
                                .collect(Collectors.toList());

                Map<String, Object> result = new HashMap<>();
                result.put("data", response);
                return ResponseEntity.ok(result);
        }

        @GetMapping("/history")
        public ResponseEntity<Map<String, Object>> getSensorHistory() {
                List<SensorData> history = sensorDataRepository.findTop100ByOrderByTimestampDesc();

                List<SensorDataResponse> response = history.stream()
                                .map(data -> SensorDataResponse.builder()
                                                .id(data.getId().toString())
                                                .nodeName(data.getNodeName())
                                                .latitude(data.getLatitude())
                                                .longitude(data.getLongitude())
                                                .distance(data.getDistance())
                                                .gas(data.getGas())
                                                .timestamp(data.getTimestamp().format(formatter))
                                                .build())
                                .collect(Collectors.toList());

                Map<String, Object> result = new HashMap<>();
                result.put("data", response);
                return ResponseEntity.ok(result);
        }
}
