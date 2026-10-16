import { useRef, useState, type FormEvent } from "react";
import {
  Paperclip,
  Plus,
  X,
  FileText,
  ArrowUp,
} from "lucide-react";

type ChatInputProps = {
  onSend: (message: string, files: File[]) => void | Promise<void>;
  disabled?: boolean;
};

export default function ChatInput({
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const allowedTypes = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".md",
  ];

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return;

    const validFiles = Array.from(selectedFiles).filter((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return allowedTypes.includes(extension) && file.size <= 10 * 1024 * 1024;
    });

    setFiles((prev) => {
      const combined = [...prev, ...validFiles];
      return combined.filter(
        (file, index, arr) =>
          arr.findIndex(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified === file.lastModified
          ) === index
      );
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();

    if ((!message.trim() && files.length === 0) || sending || disabled) {
      return;
    }

    const currentMessage = message.trim();
    const currentFiles = [...files];

    setSending(true);

    try {
      await onSend(currentMessage, currentFiles);
      setMessage("");
      setFiles([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition focus-within:border-violet-300 focus-within:shadow-md sm:p-4"
    >
      {/* Uploaded document previews */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="flex max-w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5"
            >
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                <FileText size={20} />
              </div>

              <div className="min-w-0">
                <p className="max-w-48 truncate text-sm font-medium text-gray-800">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message input */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Ask anything about your documents..."
        rows={2}
        disabled={disabled || sending}
        className="max-h-[180px] min-h-16 w-full resize-none bg-transparent px-1 py-2 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50 sm:text-base"
      />

      {/* Toolbar */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            aria-label="Attach documents"
            title="Attach documents"
            className="rounded-xl p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-violet-600 disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            aria-label="Add document"
            title="Add document"
            className="rounded-xl p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-violet-600 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>

          <span className="ml-2 hidden text-xs text-gray-400 sm:block">
            PDF, DOCX, TXT · Max 10 MB per file
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:block">
            Shift + Enter for new line
          </span>

          <button
            type="submit"
            disabled={
              disabled ||
              sending ||
              (!message.trim() && files.length === 0)
            }
            aria-label="Send message"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </form>
  );
}
