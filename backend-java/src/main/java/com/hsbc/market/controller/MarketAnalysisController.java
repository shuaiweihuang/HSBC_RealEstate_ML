package com.hsbc.market.controller;

import com.hsbc.market.model.MarketStatistics;
import com.hsbc.market.model.TrendDataPoint;
import com.hsbc.market.service.ExportService;
import com.hsbc.market.service.MarketAnalysisService;
import com.itextpdf.text.DocumentException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 處理所有市場分析相關的 API 請求。
 */
@RestController
@RequestMapping("/api/market-analysis")
@RequiredArgsConstructor
@Slf4j
public class MarketAnalysisController {

    private final MarketAnalysisService marketAnalysisService;
    private final ExportService exportService;

    /**
     * 獲取市場趨勢資料 (例如：歷年平均價格變化)。
     * @return 趨勢資料點列表
     */
    @GetMapping("/trend")
    public ResponseEntity<List<TrendDataPoint>> getMarketTrend() {
        log.info("Received request for market trend data.");
        List<TrendDataPoint> trend = marketAnalysisService.getMarketTrend();
        return ResponseEntity.ok(trend);
    }

    /**
     * 獲取市場整體統計資料 (例如：平均價格、總交易量)。
     * @return 市場統計資料物件
     */
    @GetMapping("/stats")
    public ResponseEntity<MarketStatistics> getMarketStatistics() {
        log.info("Received request for market statistics.");
        MarketStatistics stats = marketAnalysisService.getMarketStatistics();
        return ResponseEntity.ok(stats);
    }
    
    /**
     * 導出市場分析報告為 PDF 檔案。
     * @return PDF 檔案的位元組陣列
     */
    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportReport() {
        log.info("Received request to export PDF report.");
        try {
            byte[] pdfBytes = exportService.generateMarketReportPdf();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            // 讓瀏覽器下載檔案，檔名為 market_report.pdf
            headers.setContentDispositionFormData("filename", "market_report.pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (DocumentException e) {
            log.error("Error creating PDF report", e);
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

