"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronRight,
  User,
  Shield,
  Lock,
  MessageCircle,
  Bell,
  Wifi,
  HelpCircle,
  UserPlus,
  Eye,
  Key,
  Trash2,
  Download,
  Image,
  Archive,
  FileText,
  Mail,
  Smartphone,
} from "lucide-react";
import { User as UserType, UserSettings } from "@/types";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "@/components/ui/Toast";

type SettingsPage =
  | "main"
  | "account"
  | "privacy"
  | "security"
  | "chats"
  | "notifications"
  | "storage"
  | "help"
  | "invite"
  | "blocked";

interface Props {
  currentUser: UserType;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onBack: () => void;
  onOpenEditProfile: () => void;
}

const defaultSettings: UserSettings = {
  privacy: {
    last_seen: "everyone",
    profile_photo: "everyone",
    about: "everyone",
    read_receipts: true,
    live_location: false,
  },
  security: { two_step_enabled: false },
  chats: {
    last_backup_at: null,
    enter_to_send: false,
    media_visibility: true,
    wallpaper: "default",
  },
  notifications: {
    messages_enabled: true,
    message_tone: "default",
    message_vibrate: true,
    message_popup: true,
    group_enabled: true,
    group_tone: "default",
    group_vibrate: true,
    call_ringtone: "default",
    call_vibrate: true,
  },
  storage: {
    auto_download_photos: true,
    auto_download_videos: false,
    auto_download_documents: false,
  },
};

export default function SettingsPanel({
  currentUser,
  authFetch,
  onBack,
  onOpenEditProfile,
}: Props) {
  const { showToast } = useToast();
  const [page, setPage] = useState<SettingsPage>("main");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const fetchSettings = async () => {
    try {
      const res = await authFetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...defaultSettings, ...data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocked = async () => {
    try {
      const res = await authFetch("/api/settings/blocked");
      if (res.ok) {
        const ids = await res.json();
        setBlockedIds(Array.isArray(ids) ? ids : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (page === "blocked") fetchBlocked();
  }, [page]);

  const updateSection = async (section: string, data: Record<string, unknown>) => {
    try {
      const res = await authFetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      if (res.ok) {
        const next = await res.json();
        setSettings((prev) => ({ ...prev, ...next }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setBackupNow = async () => {
    try {
      const res = await authFetch("/api/settings/backup", { method: "POST" });
      if (res.ok) await fetchSettings();
    } catch (e) {
      console.error(e);
    }
  };

  const Row = ({
    icon: Icon,
    label,
    onClick,
    right,
  }: {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    right?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#f0f2f5] text-left"
    >
      <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
      <span className="flex-1 text-gray-900">{label}</span>
      {right ?? (onClick && <ChevronRight className="w-5 h-5 text-gray-400" />)}
    </button>
  );

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#00a884]" : "bg-gray-300"}`}
    >
      <span
        className={`block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"}`}
      />
    </button>
  );

  const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div className="flex items-center gap-3 px-3 py-3 bg-[#f0f2f5] border-b border-gray-200">
      <button type="button" onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/80">
        <ArrowLeft className="w-5 h-5 text-[#00a884]" />
      </button>
      <span className="font-medium text-gray-900">{title}</span>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="py-2">
      <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="bg-white rounded-lg overflow-hidden">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden">
      <AnimatePresence mode="wait">
        {page === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="p-4 bg-[#00a884] flex items-center justify-between">
              <button type="button" onClick={onBack} className="p-1.5 rounded-full hover:bg-white/20">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <span className="font-semibold text-white">Settings</span>
              <div className="w-8" />
            </div>

            <button
              type="button"
              onClick={onOpenEditProfile}
              className="w-full flex items-center gap-4 p-4 bg-white mt-2 hover:bg-gray-50"
            >
              <img
                src={currentUser.avatar}
                alt=""
                className="w-16 h-16 rounded-full bg-gray-200 object-cover"
              />
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">{currentUser.username}</p>
                <p className="text-sm text-gray-500 truncate">{currentUser.about || "Hey there! I am using WorkChat."}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="p-4 space-y-1">
              <Section title="Account">
                <Row icon={Shield} label="Account" onClick={() => setPage("account")} />
              </Section>
              <Section title="Chats">
                <Row icon={MessageCircle} label="Chats" onClick={() => setPage("chats")} />
              </Section>
              <Section title="Notifications">
                <Row icon={Bell} label="Notifications" onClick={() => setPage("notifications")} />
              </Section>
              <Section title="Data and storage">
                <Row icon={Wifi} label="Data and storage usage" onClick={() => setPage("storage")} />
              </Section>
              <Section title="Support">
                <Row icon={HelpCircle} label="Help" onClick={() => setPage("help")} />
              </Section>
              <Section title="Invite">
                <Row icon={UserPlus} label="Invite a friend" onClick={() => setPage("invite")} />
              </Section>
            </div>
          </motion.div>
        )}

        {page === "account" && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Account" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Privacy">
                <Row icon={Eye} label="Privacy" onClick={() => setPage("privacy")} />
              </Section>
              <Section title="Security">
                <Row icon={Key} label="Security" onClick={() => setPage("security")} />
              </Section>
              <Section title="Change number">
                <Row icon={Smartphone} label="Change number" onClick={() => showToast("Migrate account to a new number. Contact support.", "info")} />
              </Section>
              <Section title="Support">
                <Row icon={FileText} label="Request account info" onClick={() => showToast("Request sent. We will email your data export.", "success")} />
                <Row icon={Trash2} label="Delete my account" onClick={() => window.confirm("Permanently delete your account? This cannot be undone.") && showToast("Contact support to delete account.", "warning")} />
              </Section>
            </div>
          </motion.div>
        )}

        {page === "privacy" && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Privacy" onBack={() => setPage("account")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Last seen">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Last seen</span>
                  <select
                    value={settings.privacy?.last_seen ?? "everyone"}
                    onChange={(e) => updateSection("privacy", { last_seen: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </Section>
              <Section title="Profile photo">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Profile photo</span>
                  <select
                    value={settings.privacy?.profile_photo ?? "everyone"}
                    onChange={(e) => updateSection("privacy", { profile_photo: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </Section>
              <Section title="About">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">About</span>
                  <select
                    value={settings.privacy?.about ?? "everyone"}
                    onChange={(e) => updateSection("privacy", { about: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </Section>
              <Section title="Read receipts">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Read receipts</span>
                  <Toggle
                    checked={settings.privacy?.read_receipts ?? true}
                    onChange={(v) => updateSection("privacy", { read_receipts: v })}
                  />
                </div>
              </Section>
              <Section title="Blocked">
                <Row icon={User} label="Blocked contacts" onClick={() => setPage("blocked")} />
              </Section>
              <Section title="Location">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Live location</span>
                  <Toggle
                    checked={settings.privacy?.live_location ?? false}
                    onChange={(v) => updateSection("privacy", { live_location: v })}
                  />
                </div>
              </Section>
            </div>
          </motion.div>
        )}

        {page === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Security" onBack={() => setPage("account")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Two-step verification">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Two-step verification</span>
                  <Toggle
                    checked={settings.security?.two_step_enabled ?? false}
                    onChange={(v) => updateSection("security", { two_step_enabled: v })}
                  />
                </div>
              </Section>
              <Section title="Password">
                <Row icon={Lock} label="Change password" onClick={() => showToast("Use profile or login page to change password.", "info")} />
              </Section>
            </div>
          </motion.div>
        )}

        {page === "chats" && (
          <motion.div
            key="chats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Chats" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Chat backup">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Last backup</span>
                  <span className="text-sm text-gray-500">
                    {settings.chats?.last_backup_at
                      ? new Date(settings.chats.last_backup_at).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <Row icon={Download} label="Back up now" onClick={setBackupNow} />
              </Section>
              <Section title="Chat history">
                <Row icon={FileText} label="Export chat" onClick={() => showToast("Export from chat menu.", "info")} />
                <Row icon={Archive} label="Archive all chats" onClick={() => showToast("Archive from chat list.", "info")} />
                <Row icon={Trash2} label="Clear all chats" onClick={() => showToast("Clear from chat list.", "info")} />
              </Section>
              <Section title="Default chat settings">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Enter to send</span>
                  <Toggle
                    checked={settings.chats?.enter_to_send ?? false}
                    onChange={(v) => updateSection("chats", { enter_to_send: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Media visibility</span>
                  <Toggle
                    checked={settings.chats?.media_visibility ?? true}
                    onChange={(v) => updateSection("chats", { media_visibility: v })}
                  />
                </div>
              </Section>
              <Section title="Wallpaper">
                <Row icon={Image} label="Wallpaper" onClick={() => showToast("Choose wallpaper from chat screen.", "info")} />
              </Section>
            </div>
          </motion.div>
        )}

        {page === "notifications" && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Notifications" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Message notifications">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Notifications</span>
                  <Toggle
                    checked={settings.notifications?.messages_enabled ?? true}
                    onChange={(v) => updateSection("notifications", { messages_enabled: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Tone</span>
                  <select
                    value={settings.notifications?.message_tone ?? "default"}
                    onChange={(e) => updateSection("notifications", { message_tone: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="default">Default</option>
                  </select>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Vibrate</span>
                  <Toggle
                    checked={settings.notifications?.message_vibrate ?? true}
                    onChange={(v) => updateSection("notifications", { message_vibrate: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Popup</span>
                  <Toggle
                    checked={settings.notifications?.message_popup ?? true}
                    onChange={(v) => updateSection("notifications", { message_popup: v })}
                  />
                </div>
              </Section>
              <Section title="Group notifications">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Group notifications</span>
                  <Toggle
                    checked={settings.notifications?.group_enabled ?? true}
                    onChange={(v) => updateSection("notifications", { group_enabled: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Group tone</span>
                  <select
                    value={settings.notifications?.group_tone ?? "default"}
                    onChange={(e) => updateSection("notifications", { group_tone: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="default">Default</option>
                  </select>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Vibrate</span>
                  <Toggle
                    checked={settings.notifications?.group_vibrate ?? true}
                    onChange={(v) => updateSection("notifications", { group_vibrate: v })}
                  />
                </div>
              </Section>
              <Section title="Call notifications">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Ringtone</span>
                  <select
                    value={settings.notifications?.call_ringtone ?? "default"}
                    onChange={(e) => updateSection("notifications", { call_ringtone: e.target.value })}
                    className="text-sm border rounded px-2 py-1 text-[#00a884] border-[#00a884] bg-white"
                  >
                    <option value="default">Default</option>
                  </select>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Vibrate</span>
                  <Toggle
                    checked={settings.notifications?.call_vibrate ?? true}
                    onChange={(v) => updateSection("notifications", { call_vibrate: v })}
                  />
                </div>
              </Section>
            </div>
          </motion.div>
        )}

        {page === "storage" && (
          <motion.div
            key="storage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Data and storage usage" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="Network usage">
                <div className="px-4 py-3 text-gray-600 text-sm">Messages, media, and calls data usage (approximate)</div>
              </Section>
              <Section title="Media auto-download">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Photos</span>
                  <Toggle
                    checked={settings.storage?.auto_download_photos ?? true}
                    onChange={(v) => updateSection("storage", { auto_download_photos: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Videos</span>
                  <Toggle
                    checked={settings.storage?.auto_download_videos ?? false}
                    onChange={(v) => updateSection("storage", { auto_download_videos: v })}
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900">Documents</span>
                  <Toggle
                    checked={settings.storage?.auto_download_documents ?? false}
                    onChange={(v) => updateSection("storage", { auto_download_documents: v })}
                  />
                </div>
              </Section>
              <Section title="Storage">
                <div className="px-4 py-3 text-gray-600 text-sm">Chats using most storage (per chat)</div>
              </Section>
            </div>
          </motion.div>
        )}

        {page === "help" && (
          <motion.div
            key="help"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Help" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Section title="FAQ">
                <Row icon={HelpCircle} label="Frequently asked questions" onClick={() => showToast("Open FAQ page.", "info")} />
              </Section>
              <Section title="Contact">
                <Row icon={Mail} label="Contact support" onClick={() => window.location.href = "mailto:support@workchat.example.com"} />
              </Section>
              <Section title="Legal">
                <Row icon={FileText} label="Terms of Service" onClick={() => showToast("Terms of Service.", "info")} />
                <Row icon={FileText} label="Privacy Policy" onClick={() => showToast("Privacy Policy.", "info")} />
              </Section>
            </div>
          </motion.div>
        )}

        {page === "invite" && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Invite a friend" onBack={() => setPage("main")} />
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-gray-600 text-sm mb-4">Share your invite link so friends can join WorkChat.</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}?invite=${currentUser.id}` : ""}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}?invite=${currentUser.id}` : "";
                    navigator.clipboard?.writeText(url);
                    showToast("Link copied!", "success");
                  }}
                  className="px-4 py-2 bg-[#00a884] text-white rounded-lg text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm">
                  <MessageCircle className="w-4 h-4 text-[#25d366]" /> Share via WhatsApp
                </button>
                <button type="button" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm">
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {page === "blocked" && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <SubHeader title="Blocked contacts" onBack={() => setPage("privacy")} />
            <div className="flex-1 overflow-y-auto p-4">
              {blockedIds.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No blocked contacts.</p>
              ) : (
                <ul className="bg-white rounded-lg overflow-hidden">
                  {blockedIds.map((id) => (
                    <li key={id} className="px-4 py-3 flex items-center justify-between border-b border-gray-100 last:border-0">
                      <span className="text-gray-900">{id}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await authFetch(`/api/settings/blocked/${id}`, { method: "DELETE" });
                          fetchBlocked();
                        }}
                        className="text-sm text-[#00a884] font-medium"
                      >
                        Unblock
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
