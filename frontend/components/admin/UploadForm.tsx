"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";

interface Props {
  onSuccess: (source: string, chunks: number) => void;
}

export function UploadForm({ onSuccess }: Props) {
  const [source, setSource] = useState("");
  const [docType, setDocType] = useState<"markdown" | "json">("markdown");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-detect type from extension
    if (file.name.endsWith(".json")) setDocType("json");
    else setDocType("markdown");

    // Auto-fill source with filename if empty
    if (!source) setSource(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !source.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await apiClient.ingest(content, source, docType);
      setStatus("success");
      setMessage(`Uploaded ${res.chunks_stored} chunks for "${res.source}"`);
      onSuccess(res.source, res.chunks_stored);
      // Reset form
      setContent("");
      setSource("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Upload Package</h2>

      {/* Source name + format */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Source name</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. bali-summer-2025.md"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Format</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as "markdown" | "json")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      {/* File picker */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Upload file <span className="text-slate-400">(or paste below)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,.json"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-700 hover:file:bg-sky-100"
        />
      </div>

      {/* Content textarea */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={docType === "json" ? '{"destination": "Bali", "price": 1500, ...}' : "# Package Title\n\nDescribe the holiday package..."}
          rows={10}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
        />
      </div>

      {/* Feedback */}
      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !content.trim() || !source.trim()}
        className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
      >
        {status === "loading" ? "Uploading..." : "Upload Package"}
      </button>
    </form>
  );
}
