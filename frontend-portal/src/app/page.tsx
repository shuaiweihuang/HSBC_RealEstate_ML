export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center px-8">
        <div className="mb-12">
          <div className="w-24 h-24 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-5xl font-bold">H</div>
          <h1 className="text-6xl md:text-7xl font-bold mb-4">HSBC Real Estate AI</h1>
          <p className="text-2xl md:text-3xl text-red-400">Production-Ready Platform</p>
        </div>
        <div className="space-y-6 text-xl">
          <p>Python ML API ✓ Running on :8000</p>
          <p>Java Market API ✓ Running on :8080</p>
          <p>Next.js Portal ✓ You are here</p>
        </div>
        <a href="/estimator" className="inline-block mt-12 px-12 py-6 bg-red-600 text-white text-2xl font-bold rounded-xl hover:bg-red-700 transition shadow-2xl">
          Launch Property Estimator →
        </a>
      </div>
    </main>
  );
}
