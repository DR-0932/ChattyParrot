"use client";

import ChatInput from "@/components/chat";

const Home = () => {
  async function handleSend(message: string, files: File[]) {
    const formData = new FormData();

    formData.append("message", message);

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <ChatInput onSend={handleSend} />
    </main>
  );
};

export default Home;
