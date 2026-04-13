import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { fetchSettings, updateSettingsSection } from "@/api/client";
import { colors } from "@/constants/theme";

type Opt = "everyone" | "contacts" | "nobody";

export default function PrivacySettings() {
  const { token } = useAuth();
  const [lastSeen, setLastSeen] = useState<Opt>("everyone");
  const [readReceipts, setReadReceipts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const s = await fetchSettings(token);
      const p = s?.privacy as { last_seen?: Opt; read_receipts?: boolean } | undefined;
      if (p?.last_seen) setLastSeen(p.last_seen);
      if (typeof p?.read_receipts === "boolean") setReadReceipts(p.read_receipts);
      setLoading(false);
    })();
  }, [token]);

  const save = async (patch: Record<string, unknown>) => {
    if (!token) return;
    const res = await updateSettingsSection(token, "privacy", patch);
    if (!res.ok) Alert.alert("Could not save settings");
    else Alert.alert("Saved");
  };

  const cycle = (current: Opt): Opt =>
    current === "everyone" ? "contacts" : current === "contacts" ? "nobody" : "everyone";

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.section}>Last seen</Text>
      <Pressable style={styles.row} onPress={() => {
        const n = cycle(lastSeen);
        setLastSeen(n);
        save({ last_seen: n, read_receipts: readReceipts });
      }}>
        <Text style={styles.rowLabel}>Who can see my last seen</Text>
        <Text style={styles.rowVal}>{lastSeen}</Text>
      </Pressable>

      <Text style={styles.section}>Read receipts</Text>
      <Pressable
        style={styles.row}
        onPress={() => {
          const n = !readReceipts;
          setReadReceipts(n);
          save({ last_seen: lastSeen, read_receipts: n });
        }}
      >
        <Text style={styles.rowLabel}>Send read receipts</Text>
        <Text style={styles.rowVal}>{readReceipts ? "On" : "Off"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: colors.textMuted },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 16, color: colors.text, flex: 1, paddingRight: 12 },
  rowVal: { fontSize: 15, color: colors.primary, fontWeight: "600", textTransform: "capitalize" },
});
