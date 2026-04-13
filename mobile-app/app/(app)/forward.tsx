import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

/** Placeholder: web `ForwardModal` + multi-select targets — same backend via socket when wired. */
export default function ForwardPlaceholder() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Forward messages</Text>
      <Text style={styles.body}>
        This screen maps to the website&apos;s forward flow. On web, selected messages are forwarded
        over the same Socket.IO connection and REST APIs you already use.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
