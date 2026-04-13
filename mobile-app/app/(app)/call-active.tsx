import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

/**
 * Placeholder: web uses simple-peer + socket events (`incoming_call`, `call_accepted`, …).
 * React Native needs `react-native-webrtc` (native build) for full parity.
 */
export default function CallActivePlaceholder() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Voice / video calls</Text>
      <Text style={styles.body}>
        The backend and Socket.IO signaling are the same as the website. A production mobile build
        would register WebRTC here (e.g. react-native-webrtc) using the same events as{" "}
        <Text style={{ fontWeight: "700" }}>ChatApp.tsx</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
});
