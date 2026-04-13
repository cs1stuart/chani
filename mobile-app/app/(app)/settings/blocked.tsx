import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { useSocketChat } from "@/context/SocketChatContext";
import { fetchBlocked, removeBlocked } from "@/api/client";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
export default function BlockedScreen() {
  const { token } = useAuth();
  const { users, refreshAll } = useSocketChat();
  const [ids, setIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const base = getApiUrl();

  const load = useCallback(async () => {
    if (!token) return;
    const list = await fetchBlocked(token);
    setIds(Array.isArray(list) ? list : []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const blockedRows = ids.map((id) => {
    const u = users.find((x) => x.id === id);
    return u ? { kind: "user" as const, id, user: u } : { kind: "id" as const, id };
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshAll()]);
    setRefreshing(false);
  };

  return (
    <FlatList
      data={blockedRows}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No blocked contacts.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.kind === "user" ? (
            <Image
              source={{ uri: mediaUrl(item.user.avatar, base) }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.name}>
            {item.kind === "user" ? item.user.username : `User ID: ${item.id}`}
          </Text>
          <Pressable
            onPress={() => {
              if (!token) return;
              const label = item.kind === "user" ? item.user.username : item.id;
              Alert.alert("Unblock?", label, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Unblock",
                  onPress: async () => {
                    await removeBlocked(token, item.id);
                    await load();
                  },
                },
              ]);
            }}
          >
            <Text style={styles.unblock}>Unblock</Text>
          </Pressable>
        </View>
      )}
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
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  avatarPlaceholder: { borderWidth: 1, borderColor: colors.border },
  name: { flex: 1, fontSize: 16, color: colors.text },
  unblock: { color: colors.primary, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
});
