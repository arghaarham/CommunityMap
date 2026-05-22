import type {
  AppUser,
  Report,
  ReportComment,
  ReportImage,
  ReportStatus,
} from "@/types/community-map";
import { CLIENT_API_BASE_URL, readApiResponse } from "./base";

export class ClientApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string | null;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
    requestId?: string | null,
  ) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

async function clientRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${CLIENT_API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  return readApiResponse(
    response,
    (status, message, code, details, requestId) =>
      new ClientApiError(status, message, code, details, requestId),
    "Gagal memproses permintaan.",
  );
}

export async function login(input: {
  email: string;
  password: string;
}) {
  return clientRequest<{ user: AppUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function register(input: {
  username: string;
  fullName: string;
  email: string;
  password: string;
  role: AppUser["role"];
}) {
  return clientRequest<{ user: AppUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return clientRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function updateProfile(input: {
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}) {
  return clientRequest<{ user: AppUser }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function uploadAsset(input: {
  file: File;
  purpose: "report" | "resolution" | "avatar";
  alt?: string;
}) {
  const body = new FormData();
  body.set("file", input.file);
  body.set("purpose", input.purpose);
  if (input.alt) {
    body.set("alt", input.alt);
  }

  return clientRequest<ReportImage>("/uploads", {
    method: "POST",
    body,
  });
}

export async function createReport(input: {
  categorySlug: Report["categorySlug"];
  title: string;
  description: string;
  address: string;
  district?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  imageAlt?: string;
  storageKey?: string;
}) {
  return clientRequest<Report>("/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function upvoteReport(id: string) {
  return clientRequest<Report>(`/reports/${id}/upvote`, {
    method: "POST",
  });
}

export async function removeUpvote(id: string) {
  return clientRequest<Report>(`/reports/${id}/upvote`, {
    method: "DELETE",
  });
}

export async function downvoteReport(id: string) {
  return clientRequest<Report>(`/reports/${id}/downvote`, {
    method: "POST",
  });
}

export async function removeDownvote(id: string) {
  return clientRequest<Report>(`/reports/${id}/downvote`, {
    method: "DELETE",
  });
}

export async function addReportComment(id: string, body: string, parentId?: string | null) {
  return clientRequest<ReportComment>(`/reports/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parentId }),
  });
}

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderRole: "citizen" | "admin";
  senderAvatarUrl?: string | null;
  body: string;
  createdAt: string;
};

export async function getChatMessages(referenceCode: string) {
  return clientRequest<ChatMessage[]>(`/chats/${referenceCode}`, {
    method: "GET",
  });
}

export async function sendChatMessage(referenceCode: string, body: string) {
  return clientRequest<ChatMessage>(`/chats/${referenceCode}`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function verifyReport(id: string, note?: string) {
  return clientRequest<Report>(`/admin/reports/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export async function updateReportStatus(
  id: string,
  nextStatus: ReportStatus,
  input?: {
    note?: string;
    resolutionImages?: ReportImage[];
  },
) {
  return clientRequest<Report>(`/admin/reports/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      nextStatus,
      note: input?.note || "Status diperbarui dari dashboard admin.",
      resolutionImages: input?.resolutionImages,
    }),
  });
}

export async function rejectReport(id: string, reason: string) {
  return clientRequest<Report>(`/admin/reports/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function downloadAdminReportsCsv() {
  const response = await fetch(`${CLIENT_API_BASE_URL}/admin/reports/export`, {
    credentials: "include",
  });

  if (!response.ok) {
    await readApiResponse(
      response,
      (status, message, code, details, requestId) =>
        new ClientApiError(status, message, code, details, requestId),
      "Gagal mengunduh ekspor laporan.",
    );
  }

  return response.blob();
}

export async function searchUsers(query: string) {
  const data = await clientRequest<{ users: { username: string; name: string }[] }>(`/users/search?q=${encodeURIComponent(query)}`);
  return data.users;
}
