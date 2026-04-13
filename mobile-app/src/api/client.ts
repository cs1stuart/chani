import { getApiUrl } from "@/lib/config";
import type { Message } from "@/types";

const base = () => getApiUrl();

export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${base()}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as const;
}

export function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function authFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  return fetch(`${base()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });
}

export async function fetchUsers(token: string) {
  const res = await authFetch(token, "/api/users");
  if (!res.ok) return [] as import("@/types").User[];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchConversations(token: string, userId: string) {
  const res = await authFetch(token, `/api/conversations/${userId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchGroups(token: string, userId: string) {
  const res = await authFetch(token, `/api/groups/${userId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchCalls(token: string, userId: string) {
  const res = await authFetch(token, `/api/calls/${userId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchStatuses(token: string) {
  const res = await authFetch(token, "/api/status");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchSettings(token: string) {
  const res = await authFetch(token, "/api/settings");
  if (!res.ok) return null;
  return res.json();
}

export async function updateSettingsSection(
  token: string,
  section: string,
  data: Record<string, unknown>,
) {
  const res = await authFetch(token, "/api/settings/update", {
    method: "POST",
    body: JSON.stringify({ section, data }),
  });
  return res;
}

export async function fetchDmMessages(
  token: string,
  u1: string,
  u2: string,
  beforeId?: number | string,
) {
  const qs = `?limit=10${beforeId ? `&before=${beforeId}` : ""}`;
  const res = await authFetch(token, `/api/messages/${u1}/${u2}${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { messages: [] as Message[], hasMore: false };
  const msgs = data.messages ?? data;
  return {
    messages: Array.isArray(msgs) ? msgs : [],
    hasMore: !!data.hasMore,
  };
}

export async function fetchGroupMessages(
  token: string,
  groupId: string,
  beforeId?: number | string,
) {
  const qs = `?limit=10${beforeId ? `&before=${beforeId}` : ""}`;
  const res = await authFetch(token, `/api/group-messages/${groupId}${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { messages: [] as Message[], hasMore: false };
  const msgs = data.messages ?? data;
  return {
    messages: Array.isArray(msgs) ? msgs : [],
    hasMore: !!data.hasMore,
  };
}

export async function fetchGroupMembers(token: string, groupId: string) {
  const res = await authFetch(token, `/api/group-members/${groupId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createGroupApi(
  token: string,
  body: { name: string; members: string[]; createdBy: string },
) {
  const res = await authFetch(token, "/api/groups", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as const;
}

export async function updateProfileApi(
  token: string,
  body: { id: string; username: string; avatar: string; about: string },
) {
  const res = await authFetch(token, "/api/users/update", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res;
}

export async function postStatusApi(
  token: string,
  body: {
    text: string;
    mediaUrl?: string;
    mediaType?: string;
    bgColor?: string;
    fontStyle?: string;
  },
) {
  return authFetch(token, "/api/status", {
    method: "POST",
    body: JSON.stringify({
      text: body.text || "",
      mediaUrl: body.mediaUrl || "",
      mediaType: body.mediaType || "",
      bgColor: body.bgColor || "",
      fontStyle: body.fontStyle || "",
    }),
  });
}

export async function deleteStatusApi(token: string, statusId: string) {
  return authFetch(token, `/api/status/${statusId}`, { method: "DELETE" });
}

export async function uploadFile(token: string, uri: string, name: string, type: string) {
  const form = new FormData();
  // React Native FormData file part
  form.append("file", { uri, name, type } as unknown as never);
  return fetch(`${base()}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function fetchBlocked(token: string) {
  const res = await authFetch(token, "/api/settings/blocked");
  if (!res.ok) return [] as string[];
  return res.json() as Promise<string[]>;
}

export async function addBlocked(token: string, userId: string) {
  return authFetch(token, "/api/settings/blocked", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function removeBlocked(token: string, userId: string) {
  return authFetch(token, `/api/settings/blocked/${userId}`, { method: "DELETE" });
}

export async function fetchAdminUsers(token: string, page = 1) {
  const res = await authFetch(token, `/api/admin/users?page=${page}&limit=50`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data } as const;
}

export async function adminCreateUser(
  token: string,
  body: { email: string; password: string; name: string },
) {
  const res = await authFetch(token, "/api/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as const;
}
