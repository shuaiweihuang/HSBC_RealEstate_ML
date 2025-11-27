"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Home, DollarSign, Calendar, Loader2, RefreshCw } from "lucide-react";

interface MarketStats {
  averagePrice: number;
  medianPrice: number;
  totalVolume: number;
  priceChangePercent: number;
  averageSquareFootage: number;
  oldestYear: number;
  newestYear: number;
}

interface TrendData {
  year: number;
  label: string;
  avgPrice: number;
  count: number;
}

interface BedroomSegment {
  bedrooms: number;
  count: number;
  avgPrice: number;
  percentage: number;
}

export default function MarketAnalysisPage() {
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [bedroomSegments, setBedroomSegments] = useState<BedroomSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const JAVA_API_URL = typeof window !== 'undefined'
    ? "http://localhost:8080"
    : (process.env.NEXT_PUBLIC_JAVA_API_URL || "http://java-api:8080");

  // Fetch market statistics
  const fetchMarketStats = async () => {
    try {
      const response = await fetch(`${JAVA_API_URL}/api/market-analysis/stats`);
      if (response.ok) {
        const apiResponse = await response.json();
        setMarketStats(apiResponse.data);
        setError(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      setError(`Unable to fetch market statistics: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  // Fetch trend data
  const fetchTrendData = async () => {
    try {
      const response = await fetch(`${JAVA_API_URL}/api/market-analysis/trend`);
      if (response.ok) {
        const apiResponse = await response.json();
        setTrendData(apiResponse.data);
        setError(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      console.error("Failed to fetch trend data:", e);
    }
  };

  // Fetch bedroom segments data
  const fetchBedroomSegments = async () => {
    try {
      const response = await fetch(`${JAVA_API_URL}/api/market-analysis/segments/bedrooms`);
      if (response.ok) {
        const apiResponse = await response.json();
        const data = apiResponse.data;
        
        // Transform data format
        const segments: BedroomSegment[] = Object.entries(data).map(([key, value]: [string, any]) => {
          const bedrooms = parseInt(key.replace('_bedrooms', ''));
          return {
            bedrooms,
            count: value.count,
            avgPrice: value.avgPrice,
            percentage: 0 // Calculate later
          };
        });

        // Calculate percentages
        const total = segments.reduce((sum, s) => sum + s.count, 0);
        segments.forEach(s => s.percentage = (s.count / total) * 100);

        setBedroomSegments(segments.sort((a, b) => a.bedrooms - b.bedrooms));
        setError(null);
      }
    } catch (e) {
      console.error("Failed to fetch bedroom segments:", e);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMarketStats(),
        fetchTrendData(),
        fetchBedroomSegments()
      ]);
      setLoading(false);
      setLastUpdate(new Date());
    };

    loadAllData();
    const interval = setInterval(loadAllData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchMarketStats(),
      fetchTrendData(),
      fetchBedroomSegments()
    ]);
    setLoading(false);
    setLastUpdate(new Date());
  };

  // Chart colors
  const COLORS = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2', '#2563eb', '#7c3aed'];

  if (loading && !marketStats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-extrabold text-gray-800 mb-2">
              Market Statistics
            </h1>
            <p className="text-xl text-gray-600">
              Real-time real estate market data and trend analysis
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Last Updated: {lastUpdate.toLocaleString('en-US')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
          <p className="font-bold">Data Loading Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Key Metrics Cards */}
      {marketStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Average Price */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                marketStats.priceChangePercent >= 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {marketStats.priceChangePercent >= 0 ? '+' : ''}
                {marketStats.priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Average Price</h3>
            <p className="text-3xl font-bold text-gray-800">
              ${Math.round(marketStats.averagePrice).toLocaleString()}
            </p>
          </div>

          {/* Median Price */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Median Price</h3>
            <p className="text-3xl font-bold text-gray-800">
              ${Math.round(marketStats.medianPrice).toLocaleString()}
            </p>
          </div>

          {/* Total Properties */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Home className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Properties</h3>
            <p className="text-3xl font-bold text-gray-800">
              {marketStats.totalVolume.toLocaleString()}
            </p>
          </div>

          {/* Average Area */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Average Area</h3>
            <p className="text-3xl font-bold text-gray-800">
              {Math.round(marketStats.averageSquareFootage).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Square Feet</p>
          </div>
        </div>
      )}

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Annual Average Price Trend */}
        {trendData.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Annual Average Price Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Average Price ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Average Price']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgPrice" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  name="Average Price"
                  dot={{ fill: '#dc2626', r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Data covers {trendData[0]?.year} - {trendData[trendData.length - 1]?.year}</p>
            </div>
          </div>
        )}

        {/* Bedroom Distribution Bar Chart */}
        {bedroomSegments.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Bedroom Count Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bedroomSegments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bedrooms" 
                  label={{ value: 'Bedrooms', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Property Count', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Properties'];
                    return [`$${value.toLocaleString()}`, 'Average Price'];
                  }}
                  labelFormatter={(label) => `${label} Bedrooms`}
                />
                <Legend />
                <Bar dataKey="count" fill="#dc2626" name="Property Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Average Price by Bedroom Count */}
        {bedroomSegments.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Average Price by Bedroom Count
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bedroomSegments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bedrooms" 
                  label={{ value: 'Bedrooms', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Average Price ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Average Price']}
                  labelFormatter={(label) => `${label} Bedrooms`}
                />
                <Legend />
                <Bar dataKey="avgPrice" fill="#2563eb" name="Average Price" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Market Share Pie Chart */}
        {bedroomSegments.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Market Share by Bedroom Count
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bedroomSegments}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ bedrooms, percentage }) => `${bedrooms} BR (${percentage.toFixed(1)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {bedroomSegments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [value, 'Properties']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Data Table */}
      {bedroomSegments.length > 0 && (
        <div className="mt-8 bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Detailed Market Data
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Bedroom Count</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Properties</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Average Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Market Share</th>
                </tr>
              </thead>
              <tbody>
                {bedroomSegments.map((segment, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">{segment.bedrooms} Bedrooms</td>
                    <td className="text-right py-3 px-4">{segment.count.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-semibold text-blue-600">
                      ${Math.round(segment.avgPrice).toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {segment.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
