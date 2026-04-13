import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { fetchSettings, updateSettingsSection } from "@/api/client";
import { colors } from "@/constants/theme";

export default function SecuritySettings() {
  const { token } = useAuth();
  const [pin, setPin] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const s = await fetchSettings(token);
      const sec = s?.security as { two_step_enabled?: boolean; two_step_pin?: string } | undefined;
      setEnabled(!!sec?.two_step_enabled);
      setPin(sec?.two_step_pin || "");
      setLoading(false);
    })();
  }, [token]);

  const save = async () => {
    if (!token) return;
    const res = await updateSettingsSection(token, "security", {
      two_step_enabled: enabled,
      two_step_pin: pin,
    });
    if (!res.ok) Alert.alert("Could not save");
    else Alert.alert("Saved");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.row}
        onPress={() => {
          setEnabled(!enabled);
        }}
      >
        <Text style={styles.label}>Two-step verification</Text>
        <Text style={styles.val}>{enabled ? "On" : "Off"}</Text>
      </Pressable>
      <Text style={styles.hint}>PIN (stored via same API as web settings)</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="PIN"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        secureTextEntry
      />
      <Pressable style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: { fontSize: 16, color: colors.text },
  val: { fontWeight: "700", color: colors.primary },
  hint: { color: colors.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
