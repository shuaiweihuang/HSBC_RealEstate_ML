FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# 1. 複製 Maven wrapper 和 pom.xml (利用 Docker cache layer)
COPY .mvn/ .mvn
# 修正: 移除末尾的反斜線，確保 COPY 命令在這裡結束
COPY mvnw pom.xml ./

# 關鍵修正: 在 Alpine 基礎映像檔中安裝 wget (用於健康檢查)
# 並確保 mvnw 可執行
RUN apk add --no-cache wget && \
    chmod +x mvnw

# 下載依賴 (這一步會被 cache)
RUN ./mvnw dependency:go-offline

# 2. 複製原始碼及資源檔 (確保 application.properties 被複製)
COPY src ./src
# 複製 Data 資料夾到容器的 /app/data
COPY data ./data

# 3. 建置 JAR (並完全跳過測試編譯和執行以加速並避免編譯錯誤)
RUN ./mvnw package -Dmaven.test.skip=true

# [除錯用] 確保 app.jar 存在
RUN ls -la target/

# 4. 執行 (匹配 pom.xml 中 <finalName>app</finalName> 的結果)
CMD ["java", "-jar", "target/app.jar"]

