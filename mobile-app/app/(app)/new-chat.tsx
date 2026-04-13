import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSocketChat } from "@/context/SocketChatContext";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
import type { User } from "@/types";

export default function NewChatScreen() {
  const { users } = useSocketChat();
  const [q, setQ] = useState("");
  const base = getApiUrl();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => u.username.toLowerCase().includes(s));
  }, [users, q]);

  const open = (u: User) => {
    router.replace({
      pathname: "/(app)/conversation",
      params: { chatType: "user", id: u.id, title: u.username },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TextInput
        style={styles.search}
        placeholder="Search colleagues…"
        placeholderTextColor={colors.textMuted}
        value={q}
        onChangeText={setQ}
      />
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => open(item)}>
            <Image
              source={{ uri: mediaUrl(item.avatar, base) }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View>
              <Text style={styles.name}>{item.username}</Text>
              <Text style={styles.status}>{item.status === "online" ? "Online" : "Offline"}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  status: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
