import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useSocketChat } from "@/context/SocketChatContext";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";

export default function StatusViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { statuses } = useSocketChat();
  const base = getApiUrl();

  const item = useMemo(() => statuses.find((s) => s.id === id), [statuses, id]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Status not found. Pull to refresh on the Status tab.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Image
          source={{ uri: mediaUrl(item.avatar, base) }}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text style={styles.name}>{item.username}</Text>
      </View>
      {item.media_url ? (
        <Image
          source={{ uri: mediaUrl(item.media_url, base) }}
          style={styles.media}
          contentFit="contain"
        />
      ) : null}
      {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: 24 },
  muted: { textAlign: "center", color: colors.textMuted },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  media: { width: "100%", height: 320, borderRadius: 12, backgroundColor: "#000" },
  text: { marginTop: 16, fontSize: 16, color: colors.text, lineHeight: 24 },
});
