"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import type { PackageInfo } from "@/lib/types";

interface Props {
  /** Increment this to trigger a refresh from the parent (e.g. after upload). */
  refreshKey?: number;
}

export function PackageList({ refreshKey = 0 }: Props) {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listPackages();
      setPackages(res.packages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load packages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleDelete(source: string) {
    if (!confirm(`Delete all chunks for "${source}"?`)) return;
    setDeleting(source);
    try {
      await apiClient.deletePackage(source);
      setPackages((prev) => prev.filter((p) => p.source !== source));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Ingested Packages{" "}
          <span className="text-sm font-normal text-slate-400">({packages.length})</span>
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-sky-600 hover:text-sky-800 disabled:opacity-40 flex items-center gap-1"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {!loading && packages.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">
          No packages ingested yet. Upload one above.
        </p>
      )}

      <div className="space-y-2">
        {packages.map((pkg) => (
          <div
            key={pkg.source}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{pkg.source}</p>
              <p className="text-xs text-slate-400">
                {pkg.chunk_count} chunks &middot; {formatDate(pkg.last_updated)}
              </p>
            </div>
            <button
              onClick={() => handleDelete(pkg.source)}
              disabled={deleting === pkg.source}
              className="ml-4 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 flex items-center gap-1 shrink-0"
            >
              {deleting === pkg.source ? (
                "Deleting..."
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
