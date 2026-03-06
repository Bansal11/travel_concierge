"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "Hello! I'm your travel concierge. Ask me anything about our holiday packages — destinations, pricing, inclusions, and more.",
};

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: query };
    const history = messages.slice(-12); // keep last 6 turns (12 messages)
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiClient.chat(query, history);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        latency: res.latency,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 py-4">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 pt-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a destination, package, price..."
          rows={1}
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 max-h-32 overflow-y-auto"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          Send
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
