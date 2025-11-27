import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HSBC Real Estate AI Platform",
  description: "Property Valuation System",
};

function Header() {
  const navItems = [
    { href: "/estimator", label: "Estimator" },
    { href: "/market-analysis", label: "Statistics" },
    { href: "/historical-analysis", label: "Historical Analysis" },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-md sticky top-0 z-10 rounded-b-xl mb-8">
      <div className="container max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-red-600 hover:text-red-700 transition">
          HSBC Real Estate AI
        </Link>
        <nav>
          <ul className="flex space-x-6 text-lg">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-gray-600 hover:text-red-600 transition font-medium">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen font-sans">
        <Header />
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
