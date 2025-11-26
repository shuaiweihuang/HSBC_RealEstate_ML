# Java Backend 部署說明

## 文件部署位置

### 1. 更新 pom.xml
```bash
cp pom.xml backend-java/pom.xml
```

### 2. 創建 Model 類
```bash
mkdir -p backend-java/src/main/java/com/hsbc/market/model
cp MarketStatistics.java backend-java/src/main/java/com/hsbc/market/model/
cp PropertySegment.java backend-java/src/main/java/com/hsbc/market/model/
cp MarketTrend.java backend-java/src/main/java/com/hsbc/market/model/
cp PropertyData.java backend-java/src/main/java/com/hsbc/market/model/
```

### 3. 創建 Service 類
```bash
mkdir -p backend-java/src/main/java/com/hsbc/market/service
cp ExportService.java backend-java/src/main/java/com/hsbc/market/service/
cp MarketAnalysisServiceComplete.java backend-java/src/main/java/com/hsbc/market/service/MarketAnalysisService.java
```

### 4. 更新 Controller
```bash
cp MarketAnalysisControllerComplete.java backend-java/src/main/java/com/hsbc/market/controller/MarketAnalysisController.java
```

### 5. 添加配置文件
```bash
mkdir -p backend-java/src/main/resources
cp application.properties backend-java/src/main/resources/
```

## 構建和運行

### 本地測試
```bash
cd backend-java
./mvnw clean package
java -jar target/market-api-0.0.1-SNAPSHOT.jar
```

### Docker 構建
```bash
docker-compose down
docker-compose up -d --build java-api
docker-compose logs -f java-api
```

## API 端點測試

### 健康檢查
```bash
curl http://localhost:8080/api/market/health
```

### 市場統計
```bash
curl http://localhost:8080/api/market/statistics
```

### 市場細分
```bash
curl http://localhost:8080/api/market/segments
```

### 市場趨勢
```bash
curl http://localhost:8080/api/market/trends?period=1y
```

### 屬性數據
```bash
curl http://localhost:8080/api/market/properties?limit=10
```

### What-if 分析
```bash
curl -X POST http://localhost:8080/api/market/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "square_footage": 2000,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 2010,
    "lot_size": 8000,
    "distance_to_city_center": 5.0,
    "school_rating": 8.5
  }'
```

### CSV 匯出
```bash
curl http://localhost:8080/api/market/export/csv?limit=50 -o market-data.csv
```

### PDF 匯出
```bash
curl http://localhost:8080/api/market/export/pdf?limit=20 -o market-report.pdf
```

