package com.hsbc.market.repository.impl;

import com.hsbc.market.exception.DataNotFoundException;
import com.hsbc.market.model.Property;
import com.hsbc.market.repository.PropertyRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * CSV 文件數據訪問實作
 * 支持 ClassPath 和文件系統路徑
 */
@Repository
@Slf4j
public class CsvPropertyRepository implements PropertyRepository {

    @Value("${app.data-path}")
    private String csvPath;

    private List<Property> cachedProperties;

    /**
     * 初始化時載入所有數據到內存
     */
    @PostConstruct
    public void init() {
        log.info("Initializing CSV Property Repository with path: {}", csvPath);
        loadDataFromCsv();
    }

    /**
     * 從 CSV 檔案載入數據
     * 支持 ClassPath 和文件系統路徑
     */
    private void loadDataFromCsv() {
        Resource resource = null;
        
        try {

            log.info("Loading CSV from classpath: {}", csvPath);
            resource = new ClassPathResource(csvPath);
            
            if (!resource.exists()) {
                throw new DataNotFoundException("CSV file not found at: " + csvPath);
            }
            
            try (Reader reader = new InputStreamReader(resource.getInputStream());
                 CSVReader csvReader = new CSVReader(reader)) {

                // 讀取所有行
                List<String[]> allRows = csvReader.readAll();
                
                if (allRows.isEmpty()) {
                    throw new DataNotFoundException("CSV file is empty: " + csvPath);
                }
                
                // 移除標題行
                if (!allRows.isEmpty()) {
                    log.info("CSV header: {}", String.join(", ", allRows.get(0)));
                    allRows.remove(0);
                }

                // 將 CSV 行轉換為 Property 對象，並過濾掉解析失敗的行
                cachedProperties = allRows.stream()
                        .map(Property::fromCsvRow)
                        .filter(p -> p != null && p.getPrice() != null)
                        .collect(Collectors.toList());

                log.info("Successfully loaded {} properties from CSV.", cachedProperties.size());

                if (cachedProperties.isEmpty()) {
                    throw new DataNotFoundException("Loaded 0 valid properties. Check CSV file content and format.");
                }

            }

        } catch (DataNotFoundException e) {
            // 重新拋出 DataNotFoundException
            throw e;
        } catch (IOException | CsvException e) {
            log.error("Failed to load data from CSV file: {}", csvPath, e);
            throw new DataNotFoundException("Failed to load property data from: " + csvPath, e);
        }
    }

    // -----------------------------------------------------------------
    // PropertyRepository 介面實作
    // -----------------------------------------------------------------

    @Override
    @Cacheable(value = "properties", key = "'all'")
    public List<Property> findAll() {
        return List.copyOf(cachedProperties);
    }

    @Override
    public Page<Property> findByFilters(
            Integer bedrooms,
            Double minPrice,
            Double maxPrice,
            Integer yearFrom,
            Integer yearTo,
            Pageable pageable) {

        List<Property> filtered = cachedProperties.stream()
                .filter(p -> bedrooms == null || (p.getBedrooms() != null && p.getBedrooms().equals(bedrooms)))
                .filter(p -> minPrice == null || (p.getPrice() != null && p.getPrice() >= minPrice))
                .filter(p -> maxPrice == null || (p.getPrice() != null && p.getPrice() <= maxPrice))
                .filter(p -> yearFrom == null || (p.getYearBuilt() != null && p.getYearBuilt() >= yearFrom))
                .filter(p -> yearTo == null || (p.getYearBuilt() != null && p.getYearBuilt() <= yearTo))
                .collect(Collectors.toList());

        // 分頁邏輯
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());

        // 排序處理
        List<Property> sorted = filtered;
        if (pageable.getSort().isSorted()) {
            sorted = applySorting(filtered, pageable);
        }

        List<Property> pageContent = sorted.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    @Override
    public Page<Property> findAll(Pageable pageable) {
        List<Property> all = findAll();
        
        // 排序
        if (pageable.getSort().isSorted()) {
            all = applySorting(all, pageable);
        }
        
        // 分頁
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), all.size());
        
        List<Property> pageContent = all.subList(start, end);
        return new PageImpl<>(pageContent, pageable, all.size());
    }

    @Override
    public long count() {
        return cachedProperties.size();
    }

    /**
     * 應用排序
     */
    private List<Property> applySorting(List<Property> properties, Pageable pageable) {
        return properties.stream()
                .sorted((p1, p2) -> {
                    for (var order : pageable.getSort()) {
                        int comparison = compareByProperty(p1, p2, order.getProperty());
                        if (comparison != 0) {
                            return order.isAscending() ? comparison : -comparison;
                        }
                    }
                    return 0;
                })
                .collect(Collectors.toList());
    }

    /**
     * 根據屬性比較
     */
    private int compareByProperty(Property p1, Property p2, String property) {
        switch (property.toLowerCase()) {
            case "price":
                Double price1 = p1.getPrice() != null ? p1.getPrice() : Double.MIN_VALUE;
                Double price2 = p2.getPrice() != null ? p2.getPrice() : Double.MIN_VALUE;
                return Double.compare(price1, price2);
            case "squarefootage":
                Integer sf1 = p1.getSquareFootage();
                Integer sf2 = p2.getSquareFootage();
                if (sf1 == null || sf2 == null) return 0;
                return Integer.compare(sf1, sf2);
            case "bedrooms":
                Integer b1 = p1.getBedrooms();
                Integer b2 = p2.getBedrooms();
                if (b1 == null || b2 == null) return 0;
                return Integer.compare(b1, b2);
            case "yearbuilt":
                Integer yb1 = p1.getYearBuilt();
                Integer yb2 = p2.getYearBuilt();
                if (yb1 == null || yb2 == null) return 0;
                return Integer.compare(yb1, yb2);
            default:
                return 0;
        }
    }
}
