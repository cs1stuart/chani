import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={24} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

export default function MoreTab() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <View style={styles.root}>
      <Text style={styles.section}>Account & modules</Text>
      <Row icon="account-outline" label="Profile" onPress={() => router.push("/(app)/profile")} />
      <Row icon="cog-outline" label="Settings" onPress={() => router.push("/(app)/settings")} />
      <Row icon="information-outline" label="Chat info (from chat)" onPress={() => router.push("/(app)/chat-info")} />
      <Row icon="share-outline" label="Forward messages" onPress={() => router.push("/(app)/forward")} />
      <Row icon="phone-in-talk" label="Active call (WebRTC)" onPress={() => router.push("/(app)/call-active")} />
      {isAdmin ? (
        <Row icon="shield-account-outline" label="Admin dashboard" onPress={() => router.push("/(app)/admin")} />
      ) : null}
      <View style={{ height: 24 }} />
      <Row icon="logout" label="Log out" danger onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
});
