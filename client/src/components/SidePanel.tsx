import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Color } from "../types/chess";
import { MoveList } from "./MoveList";

interface SidePanelProps {
  moves: string[];
  chatMessages: ChatMessage[];
  playerColor: Color;
  onSendChat: (text: string) => void;
  disabled: boolean; // true when game is finished
}

type Tab = "moves" | "chat";

export function SidePanel({
  moves,
  chatMessages,
  playerColor,
  onSendChat,
  disabled,
}: SidePanelProps) {
  const [tab, setTab] = useState<Tab>("moves");
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [input, setInput] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset unread when switching to chat
  useEffect(() => {
    if (tab === "chat") setLastSeenCount(chatMessages.length);
  }, [tab, chatMessages.length]);

  // Auto-scroll on new messages when chat is visible
  useEffect(() => {
    if (tab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length, tab]);

  const unread = tab === "moves" ? chatMessages.length - lastSeenCount : 0;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    onSendChat(text);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div
      className="flex flex-col"
      style={{
        flex: 1,
        minHeight: 0,
        background: "var(--c-surface-2)",
        border: "1px solid var(--c-border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid var(--c-border-faint)" }}
      >
        {(["moves", "chat"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-xs font-medium capitalize relative transition-colors"
              style={{
                color: active ? "var(--c-accent)" : "var(--c-text-faint)",
                background: active ? "var(--c-accent-dim)" : "transparent",
                borderBottom: active ? "2px solid var(--c-accent)" : "2px solid transparent",
              }}
            >
              {t}
              {t === "chat" && unread > 0 && (
                <span
                  className="absolute top-1.5 right-2 text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--c-accent)",
                    color: "var(--c-bg)",
                    minWidth: "14px",
                    height: "14px",
                    padding: "0 3px",
                  }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "moves" ? (
        // MoveList fills remaining height — pass "100%" since it's inside a flex child
        <div className="flex-1 min-h-0 overflow-hidden">
          <MoveList moves={moves} height="100%" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
            {chatMessages.length === 0 ? (
              <p
                className="text-center text-xs py-6"
                style={{ color: "var(--c-text-faint)" }}
              >
                No messages yet
              </p>
            ) : (
              chatMessages.map((msg, i) => {
                const isMe = msg.from === playerColor;
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-0.5"
                    style={{ alignItems: isMe ? "flex-end" : "flex-start" }}
                  >
                    <div
                      className="text-xs px-2.5 py-1.5 rounded-xl max-w-full break-words"
                      style={{
                        background: isMe
                          ? "var(--c-accent-dim)"
                          : "var(--c-surface-2)",
                        color: isMe ? "var(--c-text)" : "var(--c-text-muted)",
                        borderRadius: isMe
                          ? "12px 12px 4px 12px"
                          : "12px 12px 12px 4px",
                        maxWidth: "88%",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="shrink-0 flex gap-1.5 px-2 py-2"
            style={{ borderTop: "1px solid var(--c-border-faint)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={disabled ? "Game over" : "Message…"}
              disabled={disabled}
              maxLength={200}
              className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg outline-none"
              style={{
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                opacity: disabled ? 0.4 : 1,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--c-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--c-border)")
              }
            />
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background:
                  disabled || !input.trim()
                    ? "var(--c-accent-dim)"
                    : "var(--c-accent)",
                color:
                  disabled || !input.trim() ? "var(--c-text-faint)" : "var(--c-bg)",
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
