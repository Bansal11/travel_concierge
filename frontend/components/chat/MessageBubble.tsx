import type { ChatMessage } from "@/lib/types";
import { SourceCitations } from "./SourceCitation";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Avatar label */}
        <span className="text-xs text-slate-400 px-1">
          {isUser ? "You" : "Concierge"}
        </span>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-sky-600 text-white rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Source citations (assistant only) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}

        {/* Latency (assistant only, subtle) */}
        {!isUser && message.latency && (
          <span className="text-xs text-slate-300 px-1">
            retrieved in {message.latency.retrieval_ms.toFixed(0)} ms
          </span>
        )}
      </div>
    </div>
  );
}
