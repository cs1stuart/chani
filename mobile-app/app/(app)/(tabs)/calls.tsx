import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSocketChat } from "@/context/SocketChatContext";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
import type { CallLogItem } from "@/types";

export default function CallsTab() {
  const { callLogs, refreshAll } = useSocketChat();
  const [refreshing, setRefreshing] = useState(false);
  const base = getApiUrl();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  return (
    <FlatList
      data={callLogs}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ backgroundColor: colors.bg, flexGrow: 1 }}
      ListEmptyComponent={
        <Text style={styles.empty}>No call history yet.</Text>
      }
      renderItem={({ item }: { item: CallLogItem }) => {
        const title = item.group_id ? item.group_name || "Group" : item.other_user_name;
        const avatar = item.group_id
          ? item.group_avatar || item.other_user_avatar
          : item.other_user_avatar;
        const icon = item.type === "video" ? "video" : "phone";
        return (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (item.group_id) {
                router.push({
                  pathname: "/(app)/conversation",
                  params: {
                    chatType: "group",
                    id: item.group_id,
                    title: item.group_name || "Group",
                  },
                });
              } else {
                router.push({
                  pathname: "/(app)/conversation",
                  params: {
                    chatType: "user",
                    id: item.other_user_id,
                    title: item.other_user_name,
                  },
                });
              }
            }}
          >
            <Image
              source={{ uri: mediaUrl(avatar, base) }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.sub}>
                {item.is_outgoing ? "Outgoing" : "Incoming"} · {item.status} ·{" "}
                {item.duration ? `${item.duration}s` : "—"}
              </Text>
            </View>
            <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: colors.border },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 48 },
});
