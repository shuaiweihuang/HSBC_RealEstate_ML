package com.hsbc.market;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class MarketAnalysisApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(MarketAnalysisApiApplication.class, args);
	}

	// CRITICAL FIX: 配置 CORS 允許前端應用程式的請求
	@Bean
	public WebMvcConfigurer corsConfigurer() {
		return new WebMvcConfigurer() {
			@Override
			public void addCorsMappings(CorsRegistry registry) {
				// 允許來自 http://localhost:3000 的所有方法和標頭
				// 這是前端瀏覽器訪問時的 Origin
				registry.addMapping("/**")
						.allowedOrigins("http://localhost:3000")
						.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
						.allowedHeaders("*")
						.allowCredentials(true);
			}
		};
	}
}
