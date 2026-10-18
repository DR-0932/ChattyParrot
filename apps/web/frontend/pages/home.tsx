// File: app/page.tsx or wherever home.tsx lives (replace the file)
"use client";

import { useState } from "react";
import ChatInput from "@/components/chat";
import ChatWindow, { type Message } from "@/components/chat-window";
import { sendChatMessage } from "@/lib/api";
import UploadDocuments from "@/components/upload";

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  function updateLast(change: (m: Message) => Message) {
    setMessages((prev) => [
      ...prev.slice(0, -1),
      change(prev[prev.length - 1]),
    ]);
  }
 
  
  async function handleSend(message: string) {
    if (loading) return;

    // Earlier turns, so follow-up questions make sense
    const history = messages
      .filter((m) => m.content)
      .map(({ role, content }) => ({ role, content }));

    // Add the user's message and an empty AI message to fill in
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

        // Events end with a blank line. Keep any half-received event in the buffer.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data: ")) continue;

          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          const data = JSON.parse(payload);

          if (data.type === "token") {
            updateLast((m) => ({ ...m, content: m.content + data.text }));
          } else if (data.type === "sources") {
            updateLast((m) => ({ ...m, sources: data.sources }));
          } else if (data.type === "error") {
            updateLast((m) => ({
              ...m,
              content: m.content + `\n[error: ${data.message}]`,
            }));
          }
        }
      }
    } catch (err) {
      updateLast((m) => ({
        ...m,
        content: `Something went wrong: ${(err as Error).message}`,
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <UploadDocuments />
      <ChatWindow messages={messages} loading={loading} />
      <ChatInput onSend={handleSend} />
    </main>
  );
};

export default Home;