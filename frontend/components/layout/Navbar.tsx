"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-sky-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">Travel Concierge</span>
        <div className="flex gap-6 text-sm font-medium">
          <Link
            href="/chat"
            className={`hover:text-sky-200 transition-colors ${pathname === "/chat" ? "text-white border-b-2 border-sky-300 pb-0.5" : "text-sky-100"}`}
          >
            Chat
          </Link>
          <Link
            href="/admin"
            className={`hover:text-sky-200 transition-colors ${pathname === "/admin" ? "text-white border-b-2 border-sky-300 pb-0.5" : "text-sky-100"}`}
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
