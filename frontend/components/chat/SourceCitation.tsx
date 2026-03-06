import type { SourceCitation } from "@/lib/types";

interface Props {
  sources: SourceCitation[];
}

export function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sources.map((s) => (
        <span
          key={s.id}
          title={`Relevance: ${(s.score * 100).toFixed(0)}%`}
          className="inline-flex items-center gap-1 text-xs bg-sky-50 border border-sky-200 text-sky-700 rounded-full px-2.5 py-0.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {s.source}
        </span>
      ))}
    </div>
  );
}
