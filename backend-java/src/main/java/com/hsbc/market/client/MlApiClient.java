package com.hsbc.market.client;

import com.hsbc.market.dto.request.PredictionRequest;
import com.hsbc.market.dto.response.PredictionResponse;
import com.hsbc.market.exception.MlApiException;
import com.hsbc.market.model.ModelInfo; 
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * ML API 客戶端
 * 負責與 Python ML API 進行通訊
 */
@Component
@Slf4j
public class MlApiClient {
    
    private final WebClient webClient;
    
    public MlApiClient(@Value("${app.ml-api-url}") String mlApiUrl) {
        log.info("Initializing ML API Client with URL: {}", mlApiUrl);
        
        // 配置 HTTP 客戶端
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(30))
                .doOnConnected(conn -> 
                    conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(30, TimeUnit.SECONDS))
                );

        this.webClient = WebClient.builder()
                .baseUrl(mlApiUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
    
    /**
     * 獲取模型資訊
     */
    public Mono<ModelInfo> getModelInfo() {
        log.debug("Requesting model info from ML API");
        return webClient.get()
                .uri("/model-info")
                .retrieve()
                .bodyToMono(ModelInfo.class)
                .doOnSuccess(info -> log.debug("Model info received: {}", info.getModelVersion())) 
                .onErrorResume(e -> {
                    log.error("Failed to get model info", e);
                    return Mono.empty();
                });
    }

    /**
     * 獲取單個物業的價格預測
     * @param request 預測請求數據
     * @return 預測響應
     */
    public Mono<PredictionResponse> getPrediction(PredictionRequest request) {
        log.debug("Sending prediction request to ML API: {}", request);
        
        return webClient.post()
                .uri("/predict")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PredictionResponse.class)
                .doOnSuccess(response -> log.debug("Received prediction response: {}", response))
                .onErrorResume(WebClientResponseException.class, e -> {
                    log.error("Prediction API error: {} - {}\nRequest: {}", 
                              e.getStatusCode(), e.getResponseBodyAsString(), request);
                    return Mono.error(new MlApiException("Prediction failed: " + e.getResponseBodyAsString(), e));
                })
                .onErrorResume(Exception.class, e -> {
                    log.error("Error during prediction: {}", e.getMessage());
                    return Mono.error(new MlApiException("Prediction error", e));
                });
    }

    /**
     * 獲取批次預測
     */
    public Mono<Map<String, Object>> getBatchPrediction(Map<String, Object> features) {
        log.debug("Sending batch prediction request to ML API");
        
        return webClient.post()
                .uri("/predict-batch")
                .bodyValue(features)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .doOnSuccess(response -> log.debug("Received batch prediction response"))
                .onErrorResume(WebClientResponseException.class, e -> {
                    log.error("Batch prediction error: {} - {}\nRequest Body: {}", 
                              e.getStatusCode(), e.getResponseBodyAsString(), features);
                    return Mono.error(new MlApiException("Batch prediction failed", e));
                })
                .onErrorResume(Exception.class, e -> {
                    log.error("Error during batch prediction: {}", e.getMessage());
                    return Mono.error(new MlApiException("Batch prediction error", e));
                });
    }
    
    /**
     * 健康檢查
     */
    public Mono<String> checkHealth() {
        return webClient.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(status -> log.debug("ML API health status: {}", status))
                .onErrorResume(e -> {
                    log.warn("ML API health check failed: {}", e.getMessage());
                    return Mono.just("ML API is unavailable");
                });
    }
}
