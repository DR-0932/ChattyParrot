
"use client";

import { useRef, useState } from "react";
import Sidebar from "@/components/sidebar";
import ChatInput from "@/components/chat";
import ChatWindow, { type Message } from "@/components/chat-window";
import { ingestFiles, sendChatMessage } from "@/lib/api";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");

    try {
      await ingestFiles(files);
      setUploadedFiles((prev) => [
        ...new Set([...prev, ...files.map((file) => file.name)]),
      ]);
      setUploaded(true);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }


function updateLast(change: (m: Message) => Message) {
  setMessages((prev) => {
    if (prev.length === 0) return prev;

    return [
      ...prev.slice(0, -1),
      change(prev[prev.length - 1]),
    ];
  });
}

async function handleSend(message: string) {
  if (loading || !message.trim()) return;

  const history = messages
    .filter((m) => m.content)
    .map(({ role, content }) => ({ role, content }));

  setMessages((prev) => [
    ...prev,
    { role: "user", content: message },
    { role: "assistant", content: "" },
  ]);

  setLoading(true);

  try {
    const response = await sendChatMessage(message, history);

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!line) continue;

        const payload = line.slice(5).trim();

        if (!payload || payload === "[DONE]") continue;

        const data = JSON.parse(payload);

        if (data.type === "token") {
          updateLast((m) => ({
            ...m,
            content: m.content + data.text,
          }));
        } else if (data.type === "sources") {
          updateLast((m) => ({
            ...m,
            sources: data.sources,
          }));
        } else if (data.type === "error") {
          updateLast((m) => ({
            ...m,
            content: `Error: ${data.message}`,
          }));
        }
      }
    }

    // Process any final event left in the buffer.
    buffer += decoder.decode();

    const finalEvent = buffer.trim();
    if (finalEvent.startsWith("data:")) {
      const payload = finalEvent.slice(5).trim();

      if (payload && payload !== "[DONE]") {
        const data = JSON.parse(payload);

        if (data.type === "token") {
          updateLast((m) => ({
            ...m,
            content: m.content + data.text,
          }));
        } else if (data.type === "sources") {
          updateLast((m) => ({
            ...m,
            sources: data.sources,
          }));
        } else if (data.type === "error") {
          updateLast((m) => ({
            ...m,
            content: `Error: ${data.message}`,
          }));
        }
      }
    }
  } catch (err) {
    updateLast((m) => ({
      ...m,
      content: `Something went wrong: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    }));
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="flex h-dvh overflow-hidden bg-black text-white">
      <Sidebar onNewChat={() => setMessages([])} />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-center border-b border-neutral-900">
          <span className="text-sm text-neutral-400">
            chattyParrot · Document Assistant
          </span>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="min-h-0 flex-1 px-4">
          <ChatWindow
            messages={messages}
            loading={loading}
            uploaded={uploaded}
            uploading={uploading}
            uploadedFiles={uploadedFiles}
            uploadError={uploadError}
            onUploadClick={() => fileInputRef.current?.click()}
          />
        </div>

        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 pt-3">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </section>
    </main>
  );
}
