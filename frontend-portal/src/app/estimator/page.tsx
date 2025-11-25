"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const schema = z.object({
  square_footage: z.coerce.number().min(100),
  bedrooms: z.coerce.number().int().min(1).max(10),
  bathrooms: z.coerce.number().min(1).max(10),
  year_built: z.coerce.number().min(1800).max(new Date().getFullYear()),
  lot_size: z.coerce.number().min(0),
  distance_to_city_center: z.coerce.number().min(0),
  school_rating: z.coerce.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

export default function Estimator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      square_footage: 1850,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 2005,
      lot_size: 8200,
      distance_to_city_center: 4.8,
      school_rating: 8.7,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: data }),
      });
      const json = await res.json();
      setResult(Math.round(json.predictions[0]));
    } catch (err) {
      alert("ML API not ready yet. Please wait or check if ml-api is running");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-12 text-red-600">
          Property Value Estimator
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Square Footage</label>
              <input placeholder="Square Footage" {...register("square_footage")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Bedrooms</label>
              <input placeholder="Bedrooms" {...register("bedrooms")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Bathrooms</label>
              <input placeholder="Bathrooms" {...register("bathrooms")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Year Built</label>
              <input placeholder="Year Built" {...register("year_built")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Lot Size (sq ft)</label>
              <input placeholder="Lot Size" {...register("lot_size")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Distance to City Center (km)</label>
              <input placeholder="Distance to City Center (km)" {...register("distance_to_city_center")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-semibold mb-2">School Rating (1-10)</label>
              <input placeholder="School Rating (1-10)" {...register("school_rating")} className="w-full px-6 py-4 border-2 rounded-xl text-lg" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-6 rounded-2xl text-2xl font-bold hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-4"
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

        {result && (
          <div className="mt-12 text-center bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-16 shadow-2xl">
            <p className="text-8xl font-bold text-red-600">
              ${result.toLocaleString()}
            </p>
            <p className="text-4xl text-red-700 mt-6">Estimated Property Value</p>
            <p className="text-xl text-gray-600 mt-4">
              Powered by HSBC Real Estate AI Engine
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
