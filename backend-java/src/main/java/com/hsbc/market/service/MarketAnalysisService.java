package com.hsbc.market.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class MarketAnalysisService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String ML_API_URL = "http://ml-api:8000/predict";

    @Cacheable("marketStats")
    public Map<String, Object> getAggregateStats() {
        // simulation data,（connect DB if exsist）
        return Map.of(
            "total_properties", 12500,
            "avg_price", 328000,
            "median_price", 295000,
            "price_growth_yoy", 8.7,
            "hot_districts", Map.of("Central", 12.3, "Kowloon", 9.8)
        );
    }

    public Map<String, Object> predictWithPythonModel(Map<String, Object> features) {
        var payload = Map.of("features", features);
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        var response = restTemplate.postForObject(
            ML_API_URL,
            new HttpEntity<>(payload, headers),
            Map.class
        );

        return Map.of(
            "input", features,
            "predicted_price", response != null ? response.get("predictions") : "N/A",
            "source", "Python ML Model (R² 0.987)",
            "cached", false
        );
    }
}
