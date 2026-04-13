import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

function Row({
  icon,
  label,
  href,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  href: string;
}) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(href as never)}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SettingsIndex() {
  return (
    <View style={styles.root}>
      <Text style={styles.note}>
        Same backend as the website: GET/POST <Text style={{ fontWeight: "700" }}>/api/settings</Text>.
      </Text>
      <Row icon="lock-outline" label="Privacy" href="/(app)/settings/privacy" />
      <Row icon="shield-key-outline" label="Security" href="/(app)/settings/security" />
      <Row icon="bell-outline" label="Notifications" href="/(app)/settings/notifications" />
      <Row icon="message-processing-outline" label="Chats" href="/(app)/settings/chats" />
      <Row icon="harddisk" label="Storage and data" href="/(app)/settings/storage" />
      <Row icon="account-cancel-outline" label="Blocked contacts" href="/(app)/settings/blocked" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  note: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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
  label: { flex: 1, fontSize: 16, color: colors.text },
});
