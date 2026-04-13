import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { fetchSettings, updateSettingsSection } from "@/api/client";
import { colors } from "@/constants/theme";

export default function ChatsSettingsScreen() {
  const { token } = useAuth();
  const [enterToSend, setEnterToSend] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const s = await fetchSettings(token);
      const c = s?.chats as { enter_to_send?: boolean };
      if (typeof c?.enter_to_send === "boolean") setEnterToSend(c.enter_to_send);
      setLoading(false);
    })();
  }, [token]);

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
        onPress={async () => {
          const n = !enterToSend;
          setEnterToSend(n);
          if (!token) return;
          const res = await updateSettingsSection(token, "chats", { enter_to_send: n });
          if (!res.ok) Alert.alert("Could not save");
          else Alert.alert("Saved");
        }}
      >
        <Text style={styles.label}>Enter key to send (desktop habit)</Text>
        <Text style={styles.val}>{enterToSend ? "On" : "Off"}</Text>
      </Pressable>
      <Text style={styles.note}>Wallpaper and media visibility match web `/api/settings` chats section.</Text>
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
  label: { fontSize: 16, color: colors.text, flex: 1, paddingRight: 12 },
  val: { fontWeight: "700", color: colors.primary },
  note: { padding: 20, color: colors.textMuted, lineHeight: 20 },
});
