
import {
  MessageSquare,
  Search,
  PanelLeft,
  Images,
  Clock,
  Library,
  Puzzle,
  Compass,
  Plus,
} from "lucide-react";

type SidebarProps = {
  recentChats?: string[];
  onNewChat?: () => void;
  onSelectChat?: (chat: string) => void;
};

export default function Sidebar({
  recentChats = [
    "Deploy Fullstack RAG",
    "Explain File Upload Loop",
    "Explain Node Streams",
    "Atomic git commits",
    "RAG System Prompt Rewrite",
    "Explain VectorStore Code",
  ],
  onNewChat,
  onSelectChat,
}: SidebarProps) {
  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col border-r border-neutral-800 bg-black text-neutral-300">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-xl font-semibold tracking-tight text-white">
          chattyParrot
        </span>
        <button
          type="button"
          aria-label="Toggle sidebar"
          className="rounded-lg p-2 hover:bg-neutral-800"
        >
          <PanelLeft size={19} />
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2.5 text-sm text-white hover:bg-neutral-700"
        >
          <Plus size={18} />
          New chat
        </button>

        <nav className="mt-2 space-y-1">
          {[
            { label: "Search chats", icon: Search },
            { label: "Images", icon: Images },
            { label: "History", icon: Clock },
            { label: "Knowledge library", icon: Library },
            { label: "Integrations", icon: Puzzle },
            { label: "Explore", icon: Compass },
          ].map(({ label, icon: Icon }) => (
            <button
              type="button"
              key={label}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-800"
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-2">
        <p className="px-3 pb-3 text-xs font-medium text-neutral-500">
          Recent chats
        </p>

        <div className="space-y-1">
          {recentChats.map((chat) => (
            <button
              type="button"
              key={chat}
              onClick={() => onSelectChat?.(chat)}
              title={chat}
              className="flex w-full items-center gap-3 truncate rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-800"
            >
              <MessageSquare
                size={16}
                className="shrink-0 text-neutral-500"
              />
              <span className="truncate">{chat}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold text-white">
            CP
          </div>
          <div>
            <p className="text-sm font-medium text-white">chattyParrot</p>
            <p className="text-xs text-neutral-500">RAG Assistant</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
