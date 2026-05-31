import { createClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/api/client";
import type { ReportComment } from "@/types/community-map";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export type StatusChangedPayload = {
  reportId: string;
  newStatus: string;
  updatedAt: string;
};

export type NewCommentPayload = {
  reportId: string;
  comment: ReportComment;
};

export type NewReportPayload = {
  report: unknown;
};

export type NewMessagePayload = {
  message: ChatMessage;
};

export function subscribeToReports(callbacks: {
  onStatusChanged?: (payload: StatusChangedPayload) => void;
  onNewComment?: (payload: NewCommentPayload) => void;
  onNewReport?: (payload: NewReportPayload) => void;
}): () => void {
  if (!supabase) return () => {};

  const channel = supabase.channel("reports");

  if (callbacks.onStatusChanged) {
    channel.on("broadcast", { event: "status-changed" }, (event) => {
      callbacks.onStatusChanged!(event.payload as StatusChangedPayload);
    });
  }

  if (callbacks.onNewComment) {
    channel.on("broadcast", { event: "new-comment" }, (event) => {
      callbacks.onNewComment!(event.payload as NewCommentPayload);
    });
  }

  if (callbacks.onNewReport) {
    channel.on("broadcast", { event: "new-report" }, (event) => {
      callbacks.onNewReport!(event.payload as NewReportPayload);
    });
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToChat(
  reportId: string,
  onMessage: (payload: NewMessagePayload) => void,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`chat:${reportId}`)
    .on("broadcast", { event: "new-message" }, (event) => {
      onMessage(event.payload as NewMessagePayload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
