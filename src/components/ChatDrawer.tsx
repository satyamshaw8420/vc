import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Focus as FocusIcon, MessageSquare, Send, Users, X } from "lucide-react";
import { useCallCtx } from "../context/CallContext";
import type { DrawerTab } from "../context/CallContext";
import type { ChatMessage } from "../types";
import { ParticipantList } from "./ParticipantList";
import { FocusMonitor } from "./FocusMonitor";

const TABS: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare size={13} /> },
  { id: "people", label: "People", icon: <Users size={13} /> },
  { id: "focus", label: "Focus", icon: <FocusIcon size={13} /> },
];

export function ChatDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    drawerTab,
    openDrawer,
    unread,
    messages,
    sendMessage,
    participants,
  } = useCallCtx();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, drawerOpen, drawerTab]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    void sendMessage(text);
    setText("");
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            className="z-40 fixed inset-x-0 bottom-0 max-h-[76vh] rounded-t-2xl border-t border-line bg-surface shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.7)] lg:static lg:inset-auto lg:h-full lg:max-h-none lg:w-[350px] lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none flex flex-col"
            initial={{ opacity: 0, y: reduce ? 0 : 60, x: reduce ? 0 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 60 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: "easeOut" }}
            role="complementary"
            aria-label="Session panel"
          >
            {/* tabs */}
            <div className="flex items-center gap-1 border-b border-line px-3 pt-2.5 pb-0 shrink-0">
              {TABS.map((t) => {
                const active = drawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => openDrawer(t.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-t-lg text-xs font-bold transition-colors cursor-pointer ${
                      active ? "text-ink" : "text-faint hover:text-muted"
                    }`}
                    aria-pressed={active}
                  >
                    {t.icon}
                    {t.label}
                    {t.id === "chat" && unread > 0 && (
                      <motion.span
                        key={unread}
                        initial={{ scale: reduce ? 1 : 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 16 }}
                        className="grid place-items-center min-w-[16px] h-4 px-1 rounded-full bg-accent2 text-[#1b2a04] font-mono text-[9px] font-bold"
                      >
                        {unread > 9 ? "9+" : unread}
                      </motion.span>
                    )}
                    {t.id === "people" && (
                      <span className="font-mono text-[10px] text-faint">{participants.length}</span>
                    )}
                    {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full" />}
                  </button>
                );
              })}
              <button
                onClick={() => setDrawerOpen(false)}
                className="ml-auto mb-1 grid place-items-center h-7 w-7 rounded-lg text-faint hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* content */}
            {drawerTab === "chat" && (
              <>
                <div ref={listRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1.5 min-h-0">
                  {messages.length === 0 ? (
                    <div className="h-full grid place-items-center text-center px-6">
                      <div>
                        <span className="text-2xl" aria-hidden="true">👋</span>
                        <p className="mt-2 text-sm font-bold text-ink">Say hi</p>
                        <p className="mt-1 text-xs text-muted leading-relaxed">
                          Messages sirf is session ke participants ko dikhte hain aur end mein
                          transcript ke saath download hote hain.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => <MessageRow key={m.id} m={m} />)
                  )}
                </div>
                <form onSubmit={submit} className="shrink-0 border-t border-line p-3 flex gap-2">
                  <input
                    id="ss-chat-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Message likho… (Enter = send)"
                    aria-label="Chat message"
                    className="flex-1 h-10 rounded-lg border border-line bg-surface-2 px-3 text-[13px] font-semibold text-ink placeholder:text-faint outline-none focus:border-accent transition-colors min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    aria-label="Send message"
                    className="h-10 w-10 shrink-0 grid place-items-center rounded-lg bg-accent text-[#04252a] transition-all hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}
            {drawerTab === "people" && <ParticipantList />}
            {drawerTab === "focus" && <FocusMonitor />}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageRow({ m }: { m: ChatMessage }) {
  const reduce = useReducedMotion();
  const nameColor = m.role === "mentor" ? "text-accent2-ink" : "text-accent-ink";
  return (
    <motion.div
      initial={{ opacity: 0, x: reduce ? 0 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
      className={`rounded-lg px-3 py-2 ${
        m.own ? "bg-accent-soft border border-accent/20" : "bg-surface-2/70 border border-transparent"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[11px] font-bold ${nameColor}`}>
          {m.senderName}
          {m.own && <span className="text-faint font-semibold"> · you</span>}
        </span>
        <time className="font-mono text-[9.5px] text-faint tabular-nums shrink-0">
          {new Date(m.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </time>
      </div>
      <p className="mt-0.5 text-[13px] text-ink leading-snug break-words whitespace-pre-wrap">{m.text}</p>
    </motion.div>
  );
}
