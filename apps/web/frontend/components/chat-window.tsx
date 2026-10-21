
"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Upload, CheckCircle2 } from "lucide-react";

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
  uploaded?: boolean;
  uploading?: boolean;
  uploadedFiles?: string[];
  uploadError?: string;
  onUploadClick?: () => void;
};

export default function ChatWindow({
  messages,
  loading = false,
  uploaded = false,
  uploading = false,
  uploadedFiles = [],
  uploadError = "",
  onUploadClick,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 mx-60 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          {!uploaded ? (
            <>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900">
                <FileText size={30} className="text-neutral-200" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Chat with your documents
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
                Upload your PDFs and documents, then ask questions
                and get answers grounded in your knowledge base.
              </p>

              <button
                type="button"
                onClick={onUploadClick}
                disabled={uploading}
                className="mt-7 flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                <Upload size={18} />
                {uploading ? "Uploading documents..." : "Upload documents"}
              </button>

              <p className="mt-3 text-xs text-neutral-500">
                PDF, DOCX, TXT, Markdown and images
              </p>

              {uploadError && (
                <p className="mt-4 text-sm text-red-400">
                  {uploadError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 size={30} className="text-green-400" />
              </div>

              <h1 className="text-2xl font-semibold">
                Ready for your questions
              </h1>

              <p className="mt-2 text-sm text-neutral-400">
                Your documents are ready. Ask anything about them.
              </p>

              {uploadedFiles.map((name) => (
                <div
                  key={name}
                  className="mt-3 flex max-w-full items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300"
                >
                  <FileText size={16} className="shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-900 text-neutral-100"
                }`}
              >
                <ReactMarkdown>{m.content || (loading ? "…" : "")}</ReactMarkdown>
              </div>

              {m.sources && m.sources.length > 0 && (
                <details className="mt-2 max-w-[85%] text-sm text-neutral-400">
                  <summary className="cursor-pointer">
                    {m.sources.length} sources
                  </summary>
                  {m.sources.map((s, j) => (
                    <div
                      key={j}
                      className="mt-2 rounded-lg bg-neutral-900 p-3"
                    >
                      <strong>
                        [{j + 1}] {s.source}
                      </strong>
                      {" "}· chunk {s.chunk_index} · score {s.score}
                      <p className="mt-1 text-neutral-500">{s.snippet}…</p>
                    </div>
                  ))}
                </details>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {uploadError && messages.length > 0 && (
        <p className="px-4 pb-2 text-sm text-red-400">{uploadError}</p>
      )}
    </div>
  );
}
