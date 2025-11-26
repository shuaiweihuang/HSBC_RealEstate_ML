package com.hsbc.market.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 代表市場趨勢圖表中的一個資料點。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrendDataPoint {
    // 時間點 (例如：年份)
    private String label; 
    // 平均房價
    private double avgPrice; 
}
