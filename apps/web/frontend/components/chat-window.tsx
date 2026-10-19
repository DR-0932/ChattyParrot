"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export type Source = {
  source: string;
  chunk_index: number;
  score: number;
  snippet: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type ChatWindowProps = {
  messages: Message[];
  loading?: boolean;
};

export default function ChatWindow({messages , loading = false}:ChatWindowProps){
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(()=>{
        bottomRef.current?.scrollIntoView({behavior: "smooth"})
    }, [messages])

    return(
    <div className="h-[500px] space-y-3 overflow-y-auto rounded-lg border p-4">
      {messages.length === 0 && (
        <p className="text-sm text-gray-500">
          Ask something about your documents.
        </p>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex flex-col ${
            m.role === "user" ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2 ${
              m.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
          <ReactMarkdown
            components={{
              mark: ({ children }) => (
                <mark className="rounded bg-yellow-200 px-1 text-gray-900">
                  {children}
                </mark>
              ),
            }}
          >
            {m.content || (loading ? "…" : "")}
          </ReactMarkdown> 
         
         </div>
          {m.sources && m.sources.length > 0 && (
            <details className="mt-1 max-w-[85%] text-sm text-gray-600">
              <summary className="cursor-pointer">
                {m.sources.length} sources
              </summary>
              {m.sources.map((s, j) => (
                <div key={j} className="mt-1 rounded bg-gray-50 p-2">
                  <strong>
                    [{j + 1}] {s.source}
                  </strong>{" "}
                  · chunk {s.chunk_index} · score {s.score}
                  <p className="text-gray-500">{s.snippet}…</p>
                </div>
              ))}
            </details>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
    )

}