"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getChatMessages, sendChatMessage, type ChatMessage } from "@/lib/api/client";
import { subscribeToChat } from "@/lib/realtime";
import type { AppUser, Report } from "@/types/community-map";

export function ReportChat({
  report,
  currentUser,
}: {
  report: Report;
  currentUser: AppUser;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if current user has access
  const hasAccess = currentUser.role === "admin" || currentUser.id === report.reporterId;

  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }

    getChatMessages(report.id)
      .then((data) => {
        setMessages(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setFeedback("Gagal memuat pesan.");
        setIsLoading(false);
      });
  }, [report.id, hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;

    return subscribeToChat(report.id, (payload) => {
      setMessages((current) => {
        if (current.some((msg) => msg.id === payload.message.id)) {
          return current;
        }
        return [...current, payload.message];
      });
    });
  }, [report.id, hasAccess]);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function submitMessage() {
    if (!body.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const msg = await sendChatMessage(report.id, body);
        setMessages((current) => [...current, msg]);
        setBody("");
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "Gagal mengirim pesan.");
      }
    });
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <MessageSquare className="size-5 text-[var(--teal)]" />
        <h3 className="font-black text-[var(--asphalt)]">Chat Per Laporan</h3>
        <span className="ml-auto rounded bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold">
          Hanya untuk Warga & Admin
        </span>
      </div>

      <div className="flex max-h-[400px] min-h-[200px] flex-col gap-3 overflow-y-auto px-1 py-2">
        {isLoading ? (
          <p className="m-auto text-sm text-[var(--muted)]">Memuat pesan...</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-sm text-[var(--muted)]">
            Belum ada pesan. Mulai obrolan untuk berkoordinasi.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 max-w-[85%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                  {isMe ? (
                    <span className="font-bold">Kamu</span>
                  ) : (
                    <Link href={`/users/${msg.senderUsername}`} className="font-bold hover:underline hover:text-[var(--teal)]">
                      {msg.senderName}
                    </Link>
                  )}
                  {!isMe && msg.senderRole === "admin" && (
                    <span className="rounded bg-[var(--teal)]/10 px-1 font-bold text-[var(--teal)]">
                      Admin
                    </span>
                  )}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    isMe
                      ? "bg-[var(--teal)] text-white rounded-br-none"
                      : "bg-[var(--surface-strong)] text-[var(--asphalt)] rounded-bl-none"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitMessage();
            }
          }}
          className="min-h-10 flex-1 rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--teal)]"
          placeholder="Tulis pesan..."
        />
        <Button disabled={pending} onClick={submitMessage} className="px-3">
          <Send className="size-4" />
          <span className="sr-only">Kirim</span>
        </Button>
      </div>
      {feedback && <p className="text-sm font-semibold text-[var(--danger)]">{feedback}</p>}
    </div>
  );
}
