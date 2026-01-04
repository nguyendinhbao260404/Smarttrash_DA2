package com.trsang.doan2.repositories;

import com.trsang.doan2.entities.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ISensorDataRepository extends JpaRepository<SensorData, UUID> {

    @Query(value = """
            SELECT sd.* FROM sensor_data sd
            INNER JOIN (
                SELECT user_id, MAX(timestamp) as max_timestamp
                FROM sensor_data
                GROUP BY user_id
            ) latest ON sd.user_id = latest.user_id AND sd.timestamp = latest.max_timestamp
            ORDER BY sd.timestamp DESC
            """, nativeQuery = true)
    List<SensorData> findLatestByUser();

    List<SensorData> findTop100ByOrderByTimestampDesc();
}
