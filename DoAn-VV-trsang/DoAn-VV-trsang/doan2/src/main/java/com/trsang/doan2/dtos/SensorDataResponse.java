package com.trsang.doan2.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorDataResponse {
    private String id;
    private String nodeName;
    private double latitude;
    private double longitude;
    private double distance;
    private int gas;
    private String timestamp;
}
