package com.hsbc.market.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.hsbc.market.model.MarketStatistics;
import com.hsbc.market.model.TrendDataPoint;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * 負責將市場分析結果導出為 PDF 檔案。
 * 使用 iText 5.x 版本 API (com.itextpdf.text.*)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final MarketAnalysisService marketAnalysisService;

    /**
     * 生成包含市場統計和趨勢資料的 PDF 檔案。
     * @return 包含 PDF 內容的位元組陣列
     */
    public byte[] generateMarketReportPdf() throws DocumentException {
        // 獲取資料
        MarketStatistics stats = marketAnalysisService.getMarketStatistics();
        List<TrendDataPoint> trend = marketAnalysisService.getMarketTrend();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();
        
        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // 標題
            Font titleFont = new Font(Font.FontFamily.HELVETICA, 18, Font.BOLD, BaseColor.BLUE);
            Paragraph title = new Paragraph("HSBC Market Analysis Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // 1. 市場整體統計 (Market Statistics)
            document.add(new Paragraph("1. Overall Market Statistics", new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD)));
            document.add(Chunk.NEWLINE);

            PdfPTable statsTable = new PdfPTable(2);
            statsTable.setWidthPercentage(50); // 表格寬度佔頁面 50%
            statsTable.setHorizontalAlignment(Element.ALIGN_LEFT);
            statsTable.setSpacingAfter(20);

            addStatsRow(statsTable, "Average Price (平均房價):", String.format("$%,.2f", stats.getAveragePrice()));
            addStatsRow(statsTable, "Total Volume (總交易量):", String.format("%,d units", stats.getTotalVolume()));
            addStatsRow(statsTable, "Median Value (中位數):", String.format("$%,.2f", stats.getMedianValue()));
            addStatsRow(statsTable, "Price Change (% 變動):", String.format(" %.2f%%", stats.getPriceChangePercent()));

            document.add(statsTable);
            
            // 2. 價格趨勢分析 (Price Trend)
            document.add(new Paragraph("2. Price Trend Analysis", new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD)));
            document.add(Chunk.NEWLINE);

            PdfPTable trendTable = new PdfPTable(2);
            trendTable.setWidthPercentage(40);
            trendTable.setHorizontalAlignment(Element.ALIGN_LEFT);
            trendTable.setSpacingAfter(20);
            
            // 表格標題
            addTableHeader(trendTable, "Year");
            addTableHeader(trendTable, "Avg Price");
            
            // 表格資料
            for (TrendDataPoint point : trend) {
                trendTable.addCell(point.getLabel());
                trendTable.addCell(String.format("$%,.2f", point.getAvgPrice()));
            }

            document.add(trendTable);

            // 結尾
            Paragraph footer = new Paragraph("--- End of Report ---", new Font(Font.FontFamily.HELVETICA, 10, Font.ITALIC));
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(30);
            document.add(footer);


        } catch (DocumentException e) {
            log.error("Error generating PDF document", e);
            throw e;
        } finally {
            document.close();
        }

        return baos.toByteArray();
    }
    
    // 輔助方法：添加統計表格行
    private void addStatsRow(PdfPTable table, String label, String value) {
        Font labelFont = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD);
        Font valueFont = new Font(Font.FontFamily.HELVETICA, 10);
        
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(valueCell);
    }
    
    // 輔助方法：添加表格標題
    private void addTableHeader(PdfPTable table, String header) {
        PdfPCell headerCell = new PdfPCell(new Phrase(header, new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD, BaseColor.WHITE)));
        headerCell.setBackgroundColor(BaseColor.DARK_GRAY);
        headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(headerCell);
    }
}

