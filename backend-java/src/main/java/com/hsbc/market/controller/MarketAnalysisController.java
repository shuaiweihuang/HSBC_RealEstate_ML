package com.hsbc.market.controller;

import com.hsbc.market.service.MarketAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketAnalysisController {

    private final MarketAnalysisService service;

    // get aggregate stats
    @GetMapping("/stats")
    public Map<String, Object> getMarketStats() {
        return service.getAggregateStats();
    }

    //call Python ML model
    @PostMapping("/what-if")
    public Map<String, Object> whatIfAnalysis(@RequestBody Map<String, Object> features) {
        return service.predictWithPythonModel(features);
    }

    // healthy check
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "healthy", "service", "java-market-api");
    }
}
