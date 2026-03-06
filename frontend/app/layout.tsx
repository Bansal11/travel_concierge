import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Travel Concierge",
  description: "AI-powered holiday package assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
