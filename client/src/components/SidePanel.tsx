import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Color } from "../types/chess";
import { MoveList } from "./MoveList";

interface SidePanelProps {
  moves: string[];
  chatMessages: ChatMessage[];
  playerColor: Color;
  onSendChat: (text: string) => void;
  height: string;
  disabled: boolean; // true when game is finished
}

type Tab = "moves" | "chat";

export function SidePanel({
  moves,
  chatMessages,
  playerColor,
  onSendChat,
  height,
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
      className="flex flex-col shrink-0"
      style={{
        width: "160px",
        height,
        background: "rgba(240,217,181,0.04)",
        border: "1px solid rgba(200,162,96,0.18)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid rgba(200,162,96,0.12)" }}
      >
        {(["moves", "chat"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-xs font-medium capitalize relative transition-colors"
              style={{
                color: active ? "#c8a56a" : "rgba(232,213,183,0.35)",
                background: active ? "rgba(200,162,96,0.08)" : "transparent",
                borderBottom: active ? "2px solid #c8a56a" : "2px solid transparent",
              }}
            >
              {t}
              {t === "chat" && unread > 0 && (
                <span
                  className="absolute top-1.5 right-2 text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: "#c8a56a",
                    color: "#1c1512",
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
                style={{ color: "rgba(232,213,183,0.18)" }}
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
                          ? "rgba(200,162,96,0.18)"
                          : "rgba(240,217,181,0.08)",
                        color: isMe ? "#e8d5b7" : "rgba(232,213,183,0.75)",
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
            style={{ borderTop: "1px solid rgba(200,162,96,0.1)" }}
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
                background: "rgba(240,217,181,0.07)",
                border: "1px solid rgba(200,162,96,0.18)",
                color: "#e8d5b7",
                opacity: disabled ? 0.4 : 1,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "rgba(200,162,96,0.45)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "rgba(200,162,96,0.18)")
              }
            />
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background:
                  disabled || !input.trim()
                    ? "rgba(200,162,96,0.1)"
                    : "#c8a56a",
                color:
                  disabled || !input.trim() ? "rgba(232,213,183,0.25)" : "#1c1512",
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
