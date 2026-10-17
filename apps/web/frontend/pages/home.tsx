"use client";

import ChatInput from "@/components/chat";
import {sendChatMessage} from '@/lib/api'
import UploadDocuments from "@/components/upload"

const Home = () => {
  async function handleSend(message: string) {
    await sendChatMessage(message);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <UploadDocuments />
      <ChatInput onSend={handleSend} />
    </main>
  );
};

export default Home;
