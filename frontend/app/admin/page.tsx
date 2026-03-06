"use client";

import { useState } from "react";
import { UploadForm } from "@/components/admin/UploadForm";
import { PackageList } from "@/components/admin/PackageList";

export default function AdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleUploadSuccess(_source: string, _chunks: number) {
    // Bump key to trigger PackageList refresh after a successful upload
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-10">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <UploadForm onSuccess={handleUploadSuccess} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <PackageList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
