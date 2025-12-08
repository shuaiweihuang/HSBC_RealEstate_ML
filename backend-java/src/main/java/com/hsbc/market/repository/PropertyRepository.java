package com.hsbc.market.repository;

import com.hsbc.market.model.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * 物業數據訪問接口
 * 支援多種數據源實作（CSV、Database 等）
 */
public interface PropertyRepository {
    
    /**
     * 查詢所有物業
     */
    List<Property> findAll();
    
    /**
     * 分頁查詢所有物業
     */
    Page<Property> findAll(Pageable pageable);
    
    /**
     * 複合條件查詢（支援分頁和排序）
     */
    Page<Property> findByFilters(
        Integer bedrooms,
        Double minPrice,
        Double maxPrice,
        Integer yearFrom,
        Integer yearTo,
        Pageable pageable
    );
    
    /**
     * 獲取總數
     */
    long count();
}
