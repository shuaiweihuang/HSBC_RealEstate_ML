import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HSBC Real Estate AI Platform",
  description: "Property Valuation System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
