package com.hsbc.market.service;

import com.hsbc.market.model.MarketStatistics;
import com.hsbc.market.model.TrendDataPoint;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference; // FIX: 導入 Spring 專用的 ParameterizedTypeReference
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 負責所有市場分析邏輯，包括從 ML API 獲取資料。
 */
@Service
@Slf4j
public class MarketAnalysisService {

    private final WebClient webClient;

    // 注入 ML API 的基礎 URL
    public MarketAnalysisService(@Value("${ml.api.base.url}") String mlApiBaseUrl) {
        // 設定 Netty 以調整連線逾時
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000) // 連線逾時 5 秒
                .responseTimeout(Duration.ofSeconds(20)) // 總體響應逾時 20 秒
                .doOnConnected(conn -> 
                    conn.addHandlerLast(new ReadTimeoutHandler(20, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(20, TimeUnit.SECONDS)));

        this.webClient = WebClient.builder()
                .baseUrl(mlApiBaseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    /**
     * 獲取市場趨勢資料。
     * @return 市場趨勢資料點的列表
     */
    @Cacheable("marketTrend")
    public List<TrendDataPoint> getMarketTrend() {
        log.info("Fetching market trend from ML API...");
        try {
            // ML API 端點： /market-trend
            List<TrendDataPoint> trend = webClient.get()
                    .uri("/market-trend")
                    .retrieve()
                    // FIX: 必須使用 ParameterizedTypeReference 來正確處理泛型列表
                    .bodyToMono(new ParameterizedTypeReference<List<TrendDataPoint>>() {}) 
                    .block(); // 阻塞等待結果 (在 Spring Service 中是常見做法)

            return trend != null ? trend : Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to fetch market trend from ML API", e);
            return Collections.emptyList(); // 發生錯誤時返回空列表
        }
    }

    /**
     * 獲取市場整體統計資料。
     * @return 市場統計資料物件
     */
    @Cacheable("marketStats")
    public MarketStatistics getMarketStatistics() {
        log.info("Fetching overall market statistics from ML API...");
        try {
            // ML API 端點： /market-stats
            MarketStatistics stats = webClient.get()
                    .uri("/market-stats")
                    .retrieve()
                    .bodyToMono(MarketStatistics.class)
                    .block();

            return stats != null ? stats : new MarketStatistics();
        } catch (Exception e) {
            log.error("Failed to fetch market statistics from ML API", e);
            return new MarketStatistics(); // 發生錯誤時返回空物件
        }
    }
}

