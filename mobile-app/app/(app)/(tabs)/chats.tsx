import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useSocketChat } from "@/context/SocketChatContext";
import { colors } from "@/constants/theme";
import { formatMessagePreview, mediaUrl } from "@/lib/utils";
import { getApiUrl } from "@/lib/config";
import type { Group, User } from "@/types";

type Row =
  | { kind: "user"; user: User; preview: string; time: string; unread: number }
  | { kind: "group"; group: Group; preview: string; time: string; unread: number };

export default function ChatsTab() {
  const { user } = useAuth();
  const {
    users,
    groups,
    conversations,
    groupConversations,
    connected,
    refreshAll,
  } = useSocketChat();
  const [refreshing, setRefreshing] = useState(false);
  const base = getApiUrl();

  const rows: Row[] = useMemo(() => {
    if (!user) return [];
    const out: Row[] = [];
    for (const u of users) {
      const c = conversations[u.id];
      out.push({
        kind: "user",
        user: u,
        preview: c?.last_message
          ? formatMessagePreview({ type: "text", content: c.last_message })
          : "Tap to start chatting",
        time: c?.last_message_time || "",
        unread: c?.unread_count || 0,
      });
    }
    for (const g of groups) {
      const gc = groupConversations[g.id];
      out.push({
        kind: "group",
        group: g,
        preview: gc?.last_message
          ? formatMessagePreview({ type: "text", content: gc.last_message })
          : "Group",
        time: gc?.last_message_time || g.created_at || "",
        unread: gc?.unread_count || 0,
      });
    }
    out.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return tb - ta;
    });
    return out;
  }, [user, users, groups, conversations, groupConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => router.push("/(app)/new-chat")}>
          <MaterialCommunityIcons name="message-plus-outline" size={22} color={colors.primary} />
          <Text style={styles.toolLabel}>New chat</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => router.push("/(app)/create-group")}>
          <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />
          <Text style={styles.toolLabel}>New group</Text>
        </Pressable>
      </View>

      <View style={styles.connRow}>
        <View style={[styles.dot, { backgroundColor: connected ? colors.primary : colors.textMuted }]} />
        <Text style={styles.connText}>{connected ? "Connected" : "Connecting…"}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) =>
          item.kind === "user" ? `u-${item.user.id}` : `g-${item.group.id}`
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations yet. Start a new chat.</Text>
        }
        renderItem={({ item }) => {
          const title = item.kind === "user" ? item.user.username : item.group.name;
          const avatar = item.kind === "user" ? item.user.avatar : item.group.avatar;
          const uri = mediaUrl(avatar, base);
          const statusDot =
            item.kind === "user" && item.user.status === "online" ? (
              <View style={styles.onlineDot} />
            ) : null;
          return (
            <Pressable
              style={styles.row}
              onPress={() => {
                if (item.kind === "user") {
                  router.push({
                    pathname: "/(app)/conversation",
                    params: { chatType: "user", id: item.user.id, title: item.user.username },
                  });
                } else {
                  router.push({
                    pathname: "/(app)/conversation",
                    params: { chatType: "group", id: item.group.id, title: item.group.name },
                  });
                }
              }}
            >
              <View style={styles.avatarWrap}>
                <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
                {statusDot}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.preview}
                </Text>
              </View>
              {item.unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  toolLabel: { color: colors.primary, fontWeight: "600" },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connText: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarWrap: { position: "relative", marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  preview: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
});
