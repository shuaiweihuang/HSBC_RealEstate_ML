"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Zap, HeartHandshake, XCircle, BarChart3 } from "lucide-react";

// --- Type Definitions ---
type Status = "healthy" | "unhealthy";

interface ApiStatus {
  status: Status;
  message: string;
  port: number;
}

interface MarketStats {
  averagePrice: number;
  medianPrice: number;
  totalVolume: number;
  priceChangePercent: number;
  averageSquareFootage: number;
  oldestYear: number;
  newestYear: number;
}

const schema = z.object({
  square_footage: z.coerce.number().min(500).max(10000),
  bedrooms: z.coerce.number().int().min(1).max(10),
  bathrooms: z.coerce.number().min(1).max(10),
  year_built: z.coerce.number().min(1900).max(new Date().getFullYear()),
  lot_size: z.coerce.number().min(1000).max(50000),
  distance_to_city_center: z.coerce.number().min(0).max(100),
  school_rating: z.coerce.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

// --- StatusPill Component ---
const StatusPill: React.FC<ApiStatus> = ({ status, message, port }) => {
  const color = status === "healthy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  const Icon = status === "healthy" ? HeartHandshake : XCircle;

  return (
    <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${color}`}>
      <Icon className="w-4 h-4" />
      <span>{message} (Port: {port})</span>
    </div>
  );
};

// --- Main Application Component ---
export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      square_footage: 1800,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 2005,
      lot_size: 7000,
      distance_to_city_center: 4.5,
      school_rating: 8.5,
    },
  });

  const [pythonApiStatus, setPythonApiStatus] = useState<ApiStatus>({ 
    status: "unhealthy", 
    message: "Loading...", 
    port: 8000 
  });
  const [javaApiStatus, setJavaApiStatus] = useState<ApiStatus>({ 
    status: "unhealthy", 
    message: "Loading...", 
    port: 8080 
  });
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PYTHON_API_URL = typeof window !== 'undefined' 
    ? "http://localhost:8000"
    : (process.env.NEXT_PUBLIC_ML_API_URL || "http://ml-api:8000");
    
  const JAVA_API_URL = typeof window !== 'undefined'
    ? "http://localhost:8080"
    : (process.env.NEXT_PUBLIC_JAVA_API_URL || "http://java-api:8080");

  // Check Python API status
  const checkPythonApiStatus = useCallback(async () => {
    try {
      const response = await fetch(`${PYTHON_API_URL}/health`);
      if (response.ok) {
        setPythonApiStatus({ status: "healthy", message: "ML API Healthy", port: 8000 });
      } else {
        setPythonApiStatus({ status: "unhealthy", message: "ML API Not Ready", port: 8000 });
      }
    } catch (e) {
      setPythonApiStatus({ status: "unhealthy", message: "ML API Disconnected", port: 8000 });
    }
  }, [PYTHON_API_URL]);

  // Check Java API status
  const checkJavaApiStatus = useCallback(async () => {
    try {
      const response = await fetch(`${JAVA_API_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setJavaApiStatus({ 
          status: "healthy", 
          message: `Java API: ${data.data?.status || 'UP'}`, 
          port: 8080 
        });
      } else {
        setJavaApiStatus({ status: "unhealthy", message: "Java API Not Ready", port: 8080 });
      }
    } catch (e) {
      setJavaApiStatus({ status: "unhealthy", message: "Java API Disconnected", port: 8080 });
    }
  }, [JAVA_API_URL]);

  const fetchMarketStats = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${JAVA_API_URL}/api/market-analysis/stats`);
      if (response.ok) {
        const apiResponse = await response.json();
        // Java API returns ApiResponse<MarketStatsResponse>, data is in the data field
        setMarketStats(apiResponse.data);
      } else {
        const errorText = await response.text();
        setError(`Java API Error (${response.status}): ${errorText.substring(0, 100)}...`);
        setMarketStats(null);
      }
    } catch (e) {
      setError(`Connection failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setMarketStats(null);
    }
  }, [JAVA_API_URL]);

  // Periodic API status and data checks
  useEffect(() => {
    checkPythonApiStatus();
    checkJavaApiStatus();
    fetchMarketStats();

    const pythonInterval = setInterval(checkPythonApiStatus, 5000);
    const javaInterval = setInterval(checkJavaApiStatus, 5000);
    const statsInterval = setInterval(fetchMarketStats, 10000);

    return () => {
      clearInterval(pythonInterval);
      clearInterval(javaInterval);
      clearInterval(statsInterval);
    };
  }, [checkPythonApiStatus, checkJavaApiStatus, fetchMarketStats]);

  // Form submission handler
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (javaApiStatus.status !== "healthy") {
      setError("Java API is not ready yet. Please try again later.");
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${JAVA_API_URL}/api/properties/what-if`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      const apiResponse = await response.json();
      setResult(apiResponse.data?.predictedPrice || apiResponse.predicted_price);
    } catch (e) {
      console.error(e);
      setError(`Prediction failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || javaApiStatus.status !== "healthy";

  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-12 lg:p-16">
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-6xl font-extrabold text-gray-800 mb-4 tracking-tight">
          HSBC Real Estate AI Platform
        </h1>
        <p className="text-xl text-gray-600">Property valuation system combining machine learning with real-time data</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* API Status & Market Data */}
        <div className="lg:col-span-1 bg-white p-8 shadow-2xl rounded-3xl space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Zap className="text-yellow-500 w-8 h-8" />
              API Service Status
            </h2>
            <div className="space-y-4">
              <StatusPill {...pythonApiStatus} />
              <StatusPill {...javaApiStatus} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-500 w-8 h-8" />
              Market Data Overview
            </h2>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg">
                <p className="font-bold">Data Loading Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {marketStats ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm font-semibold text-red-600">Total Properties</p>
                  <p className="text-3xl font-extrabold text-red-800">
                    {marketStats.totalVolume.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-600">Average Price</p>
                  <p className="text-3xl font-extrabold text-gray-800">
                    ${Math.round(marketStats.averagePrice).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm font-semibold text-blue-600">Median Price</p>
                  <p className="text-3xl font-extrabold text-blue-800">
                    ${Math.round(marketStats.medianPrice).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm font-semibold text-green-600">Price Change</p>
                  <p className="text-3xl font-extrabold text-green-800">
                    {marketStats.priceChangePercent > 0 ? '+' : ''}
                    {marketStats.priceChangePercent.toFixed(2)}%
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Average Area: {Math.round(marketStats.averageSquareFootage).toLocaleString()} sq ft
                  </p>
                  <p className="text-sm text-gray-600">
                    Construction Years: {marketStats.oldestYear} - {marketStats.newestYear}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Waiting for market data from Java API...</p>
            )}
          </div>
        </div>
        
        {/* Prediction Form & Results */}
        <div className="lg:col-span-2 bg-white p-10 shadow-2xl rounded-3xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Property Details</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
                <p className="font-bold">Connection or Prediction Error</p>
                <p>{error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Square Footage */}
              <div>
                <label htmlFor="square_footage" className="block text-lg font-medium text-gray-700 mb-2">
                  Total Area (sq ft)
                </label>
                <input
                  id="square_footage"
                  type="number"
                  step="any"
                  {...register("square_footage")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.square_footage && (
                  <p className="text-red-500 text-sm mt-1">{errors.square_footage.message}</p>
                )}
              </div>

              {/* Bedrooms */}
              <div>
                <label htmlFor="bedrooms" className="block text-lg font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  id="bedrooms"
                  type="number"
                  step="1"
                  {...register("bedrooms")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.bedrooms && <p className="text-red-500 text-sm mt-1">{errors.bedrooms.message}</p>}
              </div>

              {/* Bathrooms */}
              <div>
                <label htmlFor="bathrooms" className="block text-lg font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  {...register("bathrooms")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.bathrooms && <p className="text-red-500 text-sm mt-1">{errors.bathrooms.message}</p>}
              </div>

              {/* Year Built */}
              <div>
                <label htmlFor="year_built" className="block text-lg font-medium text-gray-700 mb-2">
                  Year Built
                </label>
                <input
                  id="year_built"
                  type="number"
                  step="1"
                  {...register("year_built")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.year_built && <p className="text-red-500 text-sm mt-1">{errors.year_built.message}</p>}
              </div>

              {/* Lot Size */}
              <div>
                <label htmlFor="lot_size" className="block text-lg font-medium text-gray-700 mb-2">
                  Lot Size (sq ft)
                </label>
                <input
                  id="lot_size"
                  type="number"
                  step="any"
                  {...register("lot_size")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.lot_size && <p className="text-red-500 text-sm mt-1">{errors.lot_size.message}</p>}
              </div>

              {/* Distance to City Center */}
              <div>
                <label htmlFor="distance_to_city_center" className="block text-lg font-medium text-gray-700 mb-2">
                  Distance to City Center (miles)
                </label>
                <input
                  id="distance_to_city_center"
                  type="number"
                  step="any"
                  {...register("distance_to_city_center")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.distance_to_city_center && (
                  <p className="text-red-500 text-sm mt-1">{errors.distance_to_city_center.message}</p>
                )}
              </div>

              {/* School Rating */}
              <div className="md:col-span-2">
                <label htmlFor="school_rating" className="block text-lg font-medium text-gray-700 mb-2">
                  School District Rating (1-10)
                </label>
                <input
                  id="school_rating"
                  type="number"
                  step="0.1"
                  {...register("school_rating")}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-red-500 focus:ring-red-500 transition"
                  disabled={isFormDisabled}
                />
                {errors.school_rating && (
                  <p className="text-red-500 text-sm mt-1">{errors.school_rating.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isFormDisabled}
              className="w-full bg-red-600 text-white py-6 rounded-2xl text-2xl font-bold hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-4 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-8 h-8" /> Predicting...
                </>
              ) : (
                "Estimate Property Value"
              )}
            </button>
          </form>

          {result !== null && (
            <div className="mt-12 text-center bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-16 shadow-2xl border-t-4 border-red-600">
              <p className="text-2xl font-semibold text-red-700 mb-4">Estimated Property Value</p>
              <p className="text-8xl font-bold text-red-800">
                ${result.toLocaleString()}
              </p>
              <p className="text-lg text-gray-600 mt-4">
                This valuation is generated by an AI model combining real-time market data.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
