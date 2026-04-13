import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useSocketChat } from "@/context/SocketChatContext";
import { fetchDmMessages, fetchGroupMessages } from "@/api/client";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
import type { Message } from "@/types";

export default function ConversationScreen() {
  const { chatType, id, title } = useLocalSearchParams<{
    chatType: string;
    id: string;
    title?: string;
  }>();
  const { user, token } = useAuth();
  const { socket, emitSendMessage, emitMarkRead, emitMarkGroupRead, users, groups, refreshAll } =
    useSocketChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const base = getApiUrl();

  const isGroup = chatType === "group";
  const partnerId = String(id || "");

  const load = useCallback(
    async (before?: number | string) => {
      if (!token || !user?.id || !partnerId) return;
      if (isGroup) {
        const { messages: m, hasMore: hm } = await fetchGroupMessages(token, partnerId, before);
        if (before) setMessages((prev) => [...m, ...prev]);
        else setMessages(m);
        setHasMore(hm);
      } else {
        const { messages: m, hasMore: hm } = await fetchDmMessages(token, user.id, partnerId, before);
        if (before) setMessages((prev) => [...m, ...prev]);
        else setMessages(m);
        setHasMore(hm);
      }
    },
    [token, user?.id, partnerId, isGroup],
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !partnerId) return;
      if (isGroup) {
        emitMarkGroupRead(partnerId, user.id);
      } else {
        emitMarkRead(user.id, partnerId);
      }
      refreshAll();
    }, [user, partnerId, isGroup, emitMarkGroupRead, emitMarkRead, refreshAll]),
  );

  useEffect(() => {
    if (!socket) return;
    const onNew = (message: Message) => {
      const openDm =
        !isGroup &&
        ((message.sender_id === user?.id && message.receiver_id === partnerId) ||
          (message.sender_id === partnerId && message.receiver_id === user?.id));
      const openGroup = isGroup && String(message.group_id) === partnerId;
      if (!openDm && !openGroup) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.sender_id !== user?.id) {
        if (isGroup) emitMarkGroupRead(partnerId, user!.id);
        else emitMarkRead(user!.id, message.sender_id);
      }
    };
    socket.on("new_message", onNew);
    return () => {
      socket.off("new_message", onNew);
    };
  }, [socket, isGroup, partnerId, user?.id, emitMarkGroupRead, emitMarkRead]);

  const send = () => {
    if (!input.trim() || !user) return;
    const payload: Parameters<typeof emitSendMessage>[0] = {
      senderId: user.id,
      content: input.trim(),
      type: "text",
    };
    if (isGroup) payload.groupId = partnerId;
    else payload.receiverId = partnerId;
    emitSendMessage(payload);
    setInput("");
  };

  const headerTitle =
    title ||
    (isGroup
      ? groups.find((g) => g.id === partnerId)?.name || "Group"
      : users.find((u) => u.id === partnerId)?.username || "Chat");

  if (!user || !partnerId) {
    return (
      <View style={styles.centered}>
        <Text>Invalid chat</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Pressable onPress={() => router.push("/(app)/chat-info")} hitSlop={12}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user.id;
            const bubbleStyle = mine ? styles.bubbleMine : styles.bubbleOther;
            if (item.type === "image") {
              const uri = mediaUrl(item.content, base);
              return (
                <View style={[styles.row, mine && styles.rowMine]}>
                  <Image source={{ uri }} style={styles.img} contentFit="cover" />
                </View>
              );
            }
            return (
              <View style={[styles.row, mine && styles.rowMine]}>
                <View style={[styles.bubble, bubbleStyle]}>
                  {!mine && isGroup ? (
                    <Text style={styles.senderName}>{item.sender_name || "User"}</Text>
                  ) : null}
                  <Text style={styles.msgText}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={send} disabled={!input.trim()}>
          <MaterialCommunityIcons name="send" size={22} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 10,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.text },
  row: { marginVertical: 4, alignItems: "flex-start" },
  rowMine: { alignItems: "flex-end" },
  bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bubbleMine: { backgroundColor: colors.bubbleMine },
  bubbleOther: { backgroundColor: colors.bubbleOther },
  senderName: { fontSize: 12, color: colors.primary, marginBottom: 4, fontWeight: "600" },
  msgText: { fontSize: 16, color: colors.text },
  img: { width: 220, height: 220, borderRadius: 12, backgroundColor: colors.border },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
