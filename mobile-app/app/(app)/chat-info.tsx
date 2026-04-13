import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

/** Placeholder: web `ChatInfoPanel` (mute, members, media, encryption notice). */
export default function ChatInfoPlaceholder() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Chat info</Text>
      <Text style={styles.body}>
        Open a chat first, then this panel can show the same metadata as the desktop app (group
        members from <Text style={{ fontWeight: "700" }}>/api/group-members/:id</Text>, etc.).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
