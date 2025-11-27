"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Filter, Download, Loader2 } from "lucide-react";

interface Property {
  id: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  lotSize: number;
  distanceToCityCenter: number;
  schoolRating: number;
  price: number;
}

interface YearlyStats {
  year: number;
  avgPrice: number;
  medianPrice: number;
  count: number;
  avgSquareFootage: number;
  minPrice: number;
  maxPrice: number;
}

export default function HistoricalAnalysisPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter conditions
  const [filters, setFilters] = useState({
    yearFrom: 1950,
    yearTo: 2022,
    bedroomsMin: 1,
    bedroomsMax: 10,
    priceMin: 0,
    priceMax: 1000000,
  });

  const JAVA_API_URL = typeof window !== 'undefined'
    ? "http://localhost:8080"
    : (process.env.NEXT_PUBLIC_JAVA_API_URL || "http://java-api:8080");

  // Fetch all property data
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${JAVA_API_URL}/api/properties/filter?` +
        `yearFrom=${filters.yearFrom}&yearTo=${filters.yearTo}&` +
        `minPrice=${filters.priceMin}&maxPrice=${filters.priceMax}`
      );
      
      if (response.ok) {
        const apiResponse = await response.json();
        const propertiesData = apiResponse.data.content || [];
        setProperties(propertiesData);
        
        // Calculate yearly statistics
        calculateYearlyStats(propertiesData);
        setError(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (e) {
      setError(`Unable to fetch property data: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate yearly statistics
  const calculateYearlyStats = (data: Property[]) => {
    const yearMap = new Map<number, Property[]>();
    
    data.forEach(prop => {
      if (!yearMap.has(prop.yearBuilt)) {
        yearMap.set(prop.yearBuilt, []);
      }
      yearMap.get(prop.yearBuilt)!.push(prop);
    });

    const stats: YearlyStats[] = [];
    yearMap.forEach((props, year) => {
      const prices = props.map(p => p.price).sort((a, b) => a - b);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const medianPrice = prices[Math.floor(prices.length / 2)];
      const avgSquareFootage = props.reduce((sum, p) => sum + p.squareFootage, 0) / props.length;

      stats.push({
        year,
        avgPrice: Math.round(avgPrice),
        medianPrice: Math.round(medianPrice),
        count: props.length,
        avgSquareFootage: Math.round(avgSquareFootage),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      });
    });

    setYearlyStats(stats.sort((a, b) => a.year - b.year));
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Apply filters
  const applyFilters = () => {
    fetchProperties();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      yearFrom: 1950,
      yearTo: 2022,
      bedroomsMin: 1,
      bedroomsMax: 10,
      priceMin: 0,
      priceMax: 1000000,
    });
  };

  // Calculate growth rate
  const calculateGrowthRate = () => {
    if (yearlyStats.length < 2) return 0;
    const first = yearlyStats[0].avgPrice;
    const last = yearlyStats[yearlyStats.length - 1].avgPrice;
    return ((last - first) / first * 100).toFixed(2);
  };

  // Calculate Compound Annual Growth Rate (CAGR)
  const calculateCAGR = () => {
    if (yearlyStats.length < 2) return 0;
    const first = yearlyStats[0].avgPrice;
    const last = yearlyStats[yearlyStats.length - 1].avgPrice;
    const years = yearlyStats[yearlyStats.length - 1].year - yearlyStats[0].year;
    const cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
    return cagr.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading historical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-5xl font-extrabold text-gray-800 mb-2">
          Historical Analysis
        </h1>
        <p className="text-xl text-gray-600">
          Long-term real estate market trends and price evolution analysis
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
          <p className="font-bold">Data Loading Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800">Data Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Year Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Construction Year Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={filters.yearFrom}
                onChange={(e) => setFilters({...filters, yearFrom: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                placeholder="Start Year"
              />
              <span className="flex items-center text-gray-500">-</span>
              <input
                type="number"
                value={filters.yearTo}
                onChange={(e) => setFilters({...filters, yearTo: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                placeholder="End Year"
              />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price Range ($)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => setFilters({...filters, priceMin: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                placeholder="Min Price"
              />
              <span className="flex items-center text-gray-500">-</span>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => setFilters({...filters, priceMax: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-red-500"
                placeholder="Max Price"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-3">
            <button
              onClick={applyFilters}
              className="ml-auto px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {yearlyStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-600">Total Growth Rate</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">
              +{calculateGrowthRate()}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {yearlyStats[0].year} - {yearlyStats[yearlyStats.length - 1].year}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-600">Compound Annual Growth Rate</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {calculateCAGR()}%
            </p>
            <p className="text-sm text-gray-500 mt-1">CAGR</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Data Points</h3>
            <p className="text-3xl font-bold text-gray-800">
              {yearlyStats.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Years</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Properties</h3>
            <p className="text-3xl font-bold text-gray-800">
              {properties.length.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Records</p>
          </div>
        </div>
      )}

      {/* Charts Area */}
      <div className="space-y-8">
        {/* Price Trend Area Chart */}
        {yearlyStats.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📊 Historical Price Trends
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={yearlyStats}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="avgPrice" 
                  stroke="#dc2626" 
                  fillOpacity={1} 
                  fill="url(#colorAvg)" 
                  name="Average Price"
                />
                <Area 
                  type="monotone" 
                  dataKey="medianPrice" 
                  stroke="#2563eb" 
                  fillOpacity={1} 
                  fill="url(#colorMedian)" 
                  name="Median Price"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Property Count Bar Chart */}
        {yearlyStats.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🏘️ Property Distribution by Year
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Property Count', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any) => [value, 'Properties']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Bar dataKey="count" fill="#059669" name="Property Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Price Range Trend */}
        {yearlyStats.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Price Volatility Range
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="maxPrice" 
                  stroke="#7c3aed" 
                  strokeWidth={2}
                  name="Max Price"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgPrice" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  name="Average Price"
                />
                <Line 
                  type="monotone" 
                  dataKey="minPrice" 
                  stroke="#059669" 
                  strokeWidth={2}
                  name="Min Price"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Data Table */}
      {yearlyStats.length > 0 && (
        <div className="mt-8 bg-white p-8 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Annual Detailed Data
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Year</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Properties</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Median</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Min Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Max Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Area</th>
                </tr>
              </thead>
              <tbody>
                {yearlyStats.map((stat, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold">{stat.year}</td>
                    <td className="text-right py-3 px-4">{stat.count}</td>
                    <td className="text-right py-3 px-4 font-semibold text-red-600">
                      ${stat.avgPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-blue-600">
                      ${stat.medianPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-green-600">
                      ${stat.minPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-purple-600">
                      ${stat.maxPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {stat.avgSquareFootage.toLocaleString()} ft²
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
