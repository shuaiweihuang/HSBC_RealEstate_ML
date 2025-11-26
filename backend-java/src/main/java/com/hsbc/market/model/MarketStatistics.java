package com.hsbc.market.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 房產市場的綜合統計資料。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketStatistics {
    // 平均房價
    private double averagePrice;
    // 總交易量
    private long totalVolume;
    // 市場價值中位數
    private double medianValue;
    // 價格變動 (%)，用於顯示趨勢
    private double priceChangePercent;
}
