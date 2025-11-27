package com.hsbc.market.service;

import com.hsbc.market.client.MlApiClient;
import com.hsbc.market.dto.request.PredictionRequest;
import com.hsbc.market.dto.response.PredictionResponse;
import com.hsbc.market.exception.MlApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * 預測服務
 * 負責處理與物業價格預測相關的業務邏輯。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final MlApiClient mlApiClient;

    /**
     * 獲取單個物業的價格預測。
     * @param request 預測請求數據
     * @return 包含預測結果的 Mono
     */
    public Mono<PredictionResponse> getPricePrediction(PredictionRequest request) {
        log.info("Requesting price prediction for property: {}", request);
        
        // 呼叫 MlApiClient.getPrediction，它返回 Mono<PredictionResponse>
        return mlApiClient.getPrediction(request)
                .onErrorMap(MlApiException.class, e -> {
                    // 重新包裝 ML API 異常，以便全局異常處理器可以捕獲並返回 503
                    log.error("Failed to get prediction from ML API", e);
                    return new MlApiException("Failed to get prediction: " + e.getMessage(), e);
                });
    }

    // 可以在此處添加更多與預測相關的業務邏輯，例如批次預測或數據轉換
}
