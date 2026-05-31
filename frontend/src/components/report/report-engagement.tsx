"use client";

import { MessageCircle, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  addReportComment,
  downvoteReport,
  removeDownvote,
  removeUpvote,
  upvoteReport,
  searchUsers,
} from "@/lib/api/client";
import { subscribeToReports } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import type { Report, ReportComment, ReportStatus } from "@/types/community-map";

export function ReportEngagement({
  report: initialReport,
  compact = false,
  onReportChange,
}: {
  report: Report;
  compact?: boolean;
  onReportChange?: (report: Report) => void;
}) {
  const [report, setReport] = useState(initialReport);
  const [comments, setComments] = useState<ReportComment[]>(
    initialReport.comments || [],
  );
  const [commentBody, setCommentBody] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<{ username: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return subscribeToReports({
      onStatusChanged: (payload) => {
        if (payload.reportId === report.id) {
          setReport((current) => ({
            ...current,
            status: payload.newStatus as ReportStatus,
            updatedAt: payload.updatedAt,
          }));
        }
      },
      onNewComment: (payload) => {
        if (payload.reportId === report.id) {
          setComments((current) => [...current, payload.comment]);
          setReport((current) => ({
            ...current,
            commentCount: current.commentCount + 1,
          }));
        }
      },
    });
  }, [report.id]);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    // Fetch from backend
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(mentionQuery);
        setMentionResults(users);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  function handleCommentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setCommentBody(val);
    
    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(username: string) {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart || commentBody.length;
    const textBeforeCursor = commentBody.slice(0, cursor);
    const textAfterCursor = commentBody.slice(cursor);
    const textBeforeMention = textBeforeCursor.replace(/@\w*$/, "");
    
    const newText = textBeforeMention + `@${username} ` + textAfterCursor;
    setCommentBody(newText);
    setMentionQuery(null);
    inputRef.current.focus();
  }

  // Helper to parse @username in comment body
  const parseBody = (body: string) => {
    const parts = body.split(/(@[\w_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link key={index} href={`/users/${username}`} className="font-semibold text-[var(--teal)] hover:underline">
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  function applyReport(nextReport: Report) {
    setReport(nextReport);
    setComments(nextReport.comments || comments);
    onReportChange?.(nextReport);
  }

  function vote(kind: "up" | "down") {
    setFeedback(null);
    startTransition(async () => {
      try {
        const nextReport =
          kind === "up"
            ? report.hasUpvoted
              ? await removeUpvote(report.id)
              : await upvoteReport(report.id)
            : report.hasDownvoted
              ? await removeDownvote(report.id)
              : await downvoteReport(report.id);
        applyReport(nextReport);
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Gagal memperbarui vote. Pastikan kamu sudah login.",
        );
      }
    });
  }

  function submitComment() {
    if (!commentBody.trim()) {
      setFeedback("Komentar tidak boleh kosong.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        const comment = await addReportComment(report.id, commentBody, replyingTo?.id || null);
        setComments((current) => [...current, comment]);
        setReport((current) => ({
          ...current,
          commentCount: current.commentCount + 1,
          comments: [...(current.comments || []), comment],
        }));
        setCommentBody("");
        setReplyingTo(null);
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Gagal mengirim komentar.",
        );
      }
    });
  }

  // Group comments
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const visibleComments = compact ? rootComments.slice(-2) : rootComments;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => vote("up")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition disabled:opacity-60",
            report.hasUpvoted
              ? "border-[var(--teal)] bg-[rgb(0_107_98_/_10%)] text-[var(--teal)]"
              : "border-[var(--border)] bg-white hover:border-[var(--teal)]",
          )}
        >
          <ThumbsUp className="size-4" />
          {report.upvoteCount}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => vote("down")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition disabled:opacity-60",
            report.hasDownvoted
              ? "border-[var(--danger)] bg-[rgb(239_59_45_/_9%)] text-[var(--danger)]"
              : "border-[var(--border)] bg-white hover:border-[var(--danger)]",
          )}
        >
          <ThumbsDown className="size-4" />
          {report.downvoteCount}
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black">
            <MessageCircle className="size-4 text-[var(--teal)]" />
            Komentar
          </h3>
          <span className="text-xs font-bold text-[var(--muted)]">
            {report.commentCount || comments.length}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {visibleComments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Belum ada komentar. Jadilah yang pertama memberi konteks.
            </p>
          ) : (
            visibleComments.map((comment) => (
              <div key={comment.id} className="flex flex-col gap-2">
                <div className="rounded-md bg-[var(--surface-strong)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/users/${comment.userUsername}`} className="text-sm font-bold hover:underline">
                        {comment.userName}
                      </Link>
                      <Link href={`/users/${comment.userUsername}`} className="text-xs text-[var(--muted)] hover:underline">
                        @{comment.userUsername}
                      </Link>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      {new Date(comment.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--asphalt)]">
                    {parseBody(comment.body)}
                  </p>
                  <button 
                    type="button" 
                    onClick={() => {
                      setReplyingTo({ id: comment.id, username: comment.userUsername });
                      setCommentBody(`@${comment.userUsername} `);
                    }}
                    className="mt-2 text-xs font-semibold text-[var(--teal)] hover:underline"
                  >
                    Balas
                  </button>
                </div>
                
                {/* Replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="ml-6 flex flex-col gap-2 border-l-2 border-[var(--border)] pl-4">
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="rounded-md bg-[var(--surface-strong)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link href={`/users/${reply.userUsername}`} className="text-sm font-bold hover:underline">
                              {reply.userName}
                            </Link>
                            <Link href={`/users/${reply.userUsername}`} className="text-xs text-[var(--muted)] hover:underline">
                              @{reply.userUsername}
                            </Link>
                          </div>
                          <p className="text-[11px] text-[var(--muted)]">
                            {new Date(reply.createdAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--asphalt)]">
                          {parseBody(reply.body)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {replyingTo && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--surface-strong)] px-3 py-2 text-sm">
            <span>Membalas <span className="font-bold">@{replyingTo.username}</span></span>
            <button type="button" onClick={() => { setReplyingTo(null); setCommentBody(""); }} className="font-bold text-[var(--muted)] hover:text-[var(--danger)]">
              Batal
            </button>
          </div>
        )}
        <div className="relative mt-3 flex gap-2">
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-md border border-[var(--border)] bg-white shadow-[var(--shadow)] overflow-hidden">
              <div className="max-h-40 overflow-y-auto">
                {mentionResults.map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => insertMention(user.username)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[var(--surface-strong)]"
                  >
                    <span className="text-sm font-bold text-[var(--asphalt)]">{user.name}</span>
                    <span className="text-xs text-[var(--muted)]">@{user.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            value={commentBody}
            onChange={handleCommentChange}
            className="min-h-10 flex-1 rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--teal)]"
            placeholder={replyingTo ? `Balas @${replyingTo.username}...` : "Tulis komentar..."}
          />
          <Button
            type="button"
            disabled={pending}
            onClick={submitComment}
            className="px-3"
          >
            <Send className="size-4" />
            <span className="sr-only">Kirim</span>
          </Button>
        </div>
        {feedback && (
          <p className="mt-3 text-sm font-semibold text-[var(--danger)]">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
