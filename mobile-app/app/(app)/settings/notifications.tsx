import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { fetchSettings, updateSettingsSection } from "@/api/client";
import { colors } from "@/constants/theme";

export default function NotificationsSettings() {
  const { token } = useAuth();
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [groupEnabled, setGroupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const s = await fetchSettings(token);
      const n = s?.notifications as {
        messages_enabled?: boolean;
        group_enabled?: boolean;
      };
      if (typeof n?.messages_enabled === "boolean") setMessagesEnabled(n.messages_enabled);
      if (typeof n?.group_enabled === "boolean") setGroupEnabled(n.group_enabled);
      setLoading(false);
    })();
  }, [token]);

  const persist = async (next: { messages_enabled: boolean; group_enabled: boolean }) => {
    if (!token) return;
    const res = await updateSettingsSection(token, "notifications", next);
    if (!res.ok) Alert.alert("Could not save");
    else Alert.alert("Saved");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable
        style={styles.row}
        onPress={() => {
          const n = !messagesEnabled;
          setMessagesEnabled(n);
          persist({ messages_enabled: n, group_enabled: groupEnabled });
        }}
      >
        <Text style={styles.label}>Message notifications</Text>
        <Text style={styles.val}>{messagesEnabled ? "On" : "Off"}</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => {
          const n = !groupEnabled;
          setGroupEnabled(n);
          persist({ messages_enabled: messagesEnabled, group_enabled: n });
        }}
      >
        <Text style={styles.label}>Group notifications</Text>
        <Text style={styles.val}>{groupEnabled ? "On" : "Off"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 16, color: colors.text },
  val: { fontWeight: "700", color: colors.primary },
});
