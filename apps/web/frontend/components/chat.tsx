import { useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";

type ChatInputProps = {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
};

export default function ChatInput({
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e?: { preventDefault: () => void }) {
    e?.preventDefault();

    if (!message.trim() || sending || disabled) return;

    setSending(true);

    try {
      await onSend(message.trim());
      setMessage("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition focus-within:border-violet-300 focus-within:shadow-md sm:p-4"
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(
            e.target.scrollHeight,
            180
          )}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Ask anything..."
        rows={2}
        disabled={disabled || sending}
        className="max-h-[180px] min-h-16 w-full resize-none bg-transparent px-1 py-2 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50 sm:text-base"
      />

      <div className="mt-2 flex items-center justify-end">
        <span className="mr-3 hidden text-xs text-gray-400 sm:block">
          Shift + Enter for new line
        </span>

        <button
          type="submit"
          disabled={
            disabled || sending || !message.trim()
          }
          aria-label="Send message"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </form>
  );
}