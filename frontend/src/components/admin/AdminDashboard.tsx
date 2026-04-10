"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, LayoutDashboard, UserPlus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export interface AdminUserRow {
  id: string;
  email: string;
  role: "admin" | "employee";
  name_set_by_admin: string;
  current_display_name: string;
  created_at: string;
}

interface ListResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onBack: () => void;
  currentUserId: string;
}

const PAGE_SIZE = 10;

export default function AdminDashboard({ authFetch, onBack, currentUserId }: Props) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  /** Matches last response (server limit or PAGE_SIZE) for footer range text */
  const [listLimit, setListLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await authFetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Failed to load users", "error");
        return;
      }
      const raw = (await res.json()) as ListResponse | AdminUserRow[];
      const isLegacyArray = Array.isArray(raw);
      const allItems = isLegacyArray
        ? raw
        : Array.isArray(raw.items)
          ? raw.items
          : [];
      const q = debouncedSearch.trim().toLowerCase();
      const legacyFiltered =
        isLegacyArray && q
          ? allItems.filter((r) => {
              const blob = `${r.name_set_by_admin} ${r.current_display_name} ${r.email}`.toLowerCase();
              return q.split(/\s+/).filter(Boolean).every((t) => blob.includes(t));
            })
          : allItems;
      const pool = isLegacyArray ? legacyFiltered : allItems;
      const totalCount = isLegacyArray
        ? pool.length
        : typeof raw.total === "number"
          ? raw.total
          : pool.length;
      const serverLimit =
        !isLegacyArray &&
        raw &&
        typeof raw === "object" &&
        typeof raw.limit === "number" &&
        raw.limit > 0
          ? raw.limit
          : PAGE_SIZE;
      const limitUsed = Math.min(100, Math.max(1, Math.floor(serverLimit)));
      // True when backend already applied skip/limit (subset of rows).
      const serverPaginated =
        !isLegacyArray && (allItems.length < totalCount || totalCount <= limitUsed);
      const displayItems =
        isLegacyArray || !serverPaginated
          ? pool.slice((page - 1) * limitUsed, page * limitUsed)
          : pool;
      const pages = Math.max(1, Math.ceil(totalCount / limitUsed));
      setRows(displayItems);
      setTotal(totalCount);
      setTotalPages(pages);
      setListLimit(limitUsed);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast, page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (r: AdminUserRow) => {
    setEditing(r);
    setEditName(r.name_set_by_admin);
    setEditEmail(r.email);
    setEditRole(r.role);
    setEditPassword("");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditPassword("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast("Name and email are required", "warning");
      return;
    }
    setSavingEdit(true);
    try {
      const body: Record<string, string> = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      };
      if (editPassword.trim()) body.password = editPassword.trim();
      const res = await authFetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Could not update user", "error");
        return;
      }
      showToast("User updated", "success");
      closeEdit();
      await load();
    } catch {
      showToast("Could not update user", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (r: AdminUserRow) => {
    if (r.id === currentUserId) {
      showToast("You cannot delete your own account", "warning");
      return;
    }
    if (!window.confirm(`Remove user ${r.email}? They will not be able to sign in.`)) return;
    try {
      const res = await authFetch(`/api/admin/users/${r.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Could not delete user", "error");
        return;
      }
      showToast("User removed", "success");
      if (rows.length <= 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch {
      showToast("Could not delete user", "error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast("Name, email and password are required", "warning");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Could not create user", "error");
        return;
      }
      showToast("User created. They can sign in with email and password.", "success");
      setName("");
      setEmail("");
      setPassword("");
      setPage(1);
      setSearchInput("");
      setDebouncedSearch("");
      await load();
    } catch {
      showToast("Could not create user", "error");
    } finally {
      setCreating(false);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * listLimit + 1;
  const to = Math.min(page * listLimit, total);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full bg-[#f0f2f5] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 text-[#00a884]"
          title="Back to chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <LayoutDashboard className="w-6 h-6 text-[#00a884]" />
        <div>
          <h1 className="font-semibold text-gray-900">Admin dashboard</h1>
          <p className="text-xs text-gray-500">Users · search · edit · remove</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-gray-800 font-medium">
            <UserPlus className="w-5 h-5 text-[#00a884]" />
            New user
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name (shown as admin-set name)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmed Khan"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-lg bg-[#00a884] text-white text-sm font-medium hover:bg-[#008f70] disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create employee"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-full">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">All users · add employees</h2>
              <p className="text-xs text-gray-500 sm:text-right">Search, pagination, edit &amp; remove below</p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-stretch w-full min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                const t = searchInput.trim();
                setDebouncedSearch(t);
                setPage(1);
              }}
            >
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Type name or email, press Enter"
                  enterKeyHint="search"
                  className="w-full min-w-0 pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none bg-white"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 px-4 py-2 rounded-lg bg-[#00a884] text-white text-sm font-medium hover:bg-[#008f70]"
              >
                Search
              </button>
            </form>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No users match your search.</div>
          ) : (
            <div className="overflow-x-auto w-full max-w-full border-t border-gray-100">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Name (admin)</th>
                    <th className="px-4 py-3 font-medium">Current name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap w-[7.5rem]">Edit / delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="px-4 py-3 text-gray-900">{r.name_set_by_admin}</td>
                      <td className="px-4 py-3 text-gray-700">{r.current_display_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            r.role === "admin"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#00a884] bg-[#00a884]/10 hover:bg-[#00a884]/20"
                            title="Edit user"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            disabled={r.id === currentUserId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:pointer-events-none"
                            title={r.id === currentUserId ? "Cannot delete yourself" : "Remove user"}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 bg-gray-50/80">
              <span>
                Showing {from}–{to} of {total || rows.length}
                {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-gray-700 min-w-[5rem] text-center">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Edit user</h3>
              <button type="button" onClick={closeEdit} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name (shown as admin-set name)</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#00a884]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#00a884]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "admin" | "employee")}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#00a884] border-[#00a884] bg-white"
                >
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New password (optional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#00a884]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2 rounded-lg bg-[#00a884] text-white text-sm font-medium hover:bg-[#008f70] disabled:opacity-50"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
