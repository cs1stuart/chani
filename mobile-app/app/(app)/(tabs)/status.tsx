import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useSocketChat } from "@/context/SocketChatContext";
import { postStatusApi, deleteStatusApi } from "@/api/client";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
import type { StatusItem } from "@/types";

export default function StatusTab() {
  const { user, token } = useAuth();
  const { statuses, refreshAll } = useSocketChat();
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const base = getApiUrl();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const postTextStatus = async () => {
    if (!token || !text.trim()) return;
    setPosting(true);
    try {
      const res = await postStatusApi(token, { text: text.trim() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Error", (err as { error?: string }).error || "Failed");
        return;
      }
      setText("");
      await refreshAll();
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.compose}>
        <TextInput
          style={styles.input}
          placeholder="Share a text status…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable
          style={[styles.postBtn, (!text.trim() || posting) && { opacity: 0.5 }]}
          disabled={!text.trim() || posting}
          onPress={postTextStatus}
        >
          <Text style={styles.postBtnText}>{posting ? "Posting…" : "Post status"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={statuses}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No statuses yet.</Text>}
        renderItem={({ item }: { item: StatusItem }) => {
          const mine = user?.id === item.user_id;
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/(app)/status-view",
                  params: { id: item.id },
                })
              }
            >
              <Image
                source={{ uri: mediaUrl(item.avatar, base) }}
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={styles.body}>
                <Text style={styles.name}>{item.username}</Text>
                <Text numberOfLines={2} style={styles.caption}>
                  {item.text || (item.media_url ? "Media status" : "")}
                </Text>
              </View>
              {mine ? (
                <Pressable
                  onPress={async () => {
                    if (!token) return;
                    Alert.alert("Delete status?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          await deleteStatusApi(token, item.id);
                          await refreshAll();
                        },
                      },
                    ]);
                  }}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  compose: {
    backgroundColor: colors.surface,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    textAlignVertical: "top",
    color: colors.text,
  },
  postBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postBtnText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: colors.border },
  body: { flex: 1, minWidth: 0 },
  name: { fontWeight: "600", color: colors.text },
  caption: { color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
