import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useSocketChat } from "@/context/SocketChatContext";
import { createGroupApi } from "@/api/client";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";
import type { User } from "@/types";

export default function CreateGroupScreen() {
  const { user, token } = useAuth();
  const { users, refreshAll } = useSocketChat();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const base = getApiUrl();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const submit = async () => {
    if (!token || !user || !name.trim() || selected.size === 0) {
      Alert.alert("Add a name and at least one member.");
      return;
    }
    setSaving(true);
    try {
      const members = Array.from(selected);
      const { ok, data } = await createGroupApi(token, {
        name: name.trim(),
        members,
        createdBy: user.id,
      });
      if (!ok) {
        Alert.alert("Error", (data as { error?: string }).error || "Failed");
        return;
      }
      await refreshAll();
      const g = data as { id: string; name: string };
      router.replace({
        pathname: "/(app)/conversation",
        params: { chatType: "group", id: g.id, title: g.name },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TextInput
        style={styles.input}
        placeholder="Group name"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.hint}>Select members ({selected.size})</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        extraData={selected}
        renderItem={({ item }: { item: User }) => {
          const on = selected.has(item.id);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item.id)}>
              <Image
                source={{ uri: mediaUrl(item.avatar, base) }}
                style={styles.avatar}
                contentFit="cover"
              />
              <Text style={styles.name}>{item.username}</Text>
              <View style={[styles.check, on && styles.checkOn]} />
            </Pressable>
          );
        }}
      />
      <Pressable
        style={[styles.btn, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={submit}
      >
        <Text style={styles.btnText}>{saving ? "Creating…" : "Create group"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  hint: { paddingHorizontal: 16, color: colors.textMuted, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  name: { flex: 1, fontSize: 16, color: colors.text },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  btn: {
    margin: 16,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
