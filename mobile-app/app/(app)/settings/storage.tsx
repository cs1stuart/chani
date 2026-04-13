import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { authFetch, fetchSettings, updateSettingsSection } from "@/api/client";
import { colors } from "@/constants/theme";

export default function StorageSettingsScreen() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const s = await fetchSettings(token);
      const st = s?.storage as { auto_download_photos?: boolean };
      if (typeof st?.auto_download_photos === "boolean") setPhotos(st.auto_download_photos);
      setLoading(false);
    })();
  }, [token]);

  const backup = async () => {
    if (!token) return;
    const res = await authFetch(token, "/api/settings/backup", { method: "POST" });
    if (!res.ok) Alert.alert("Backup timestamp could not be updated");
    else Alert.alert("Backup time recorded on server");
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
        onPress={async () => {
          const n = !photos;
          setPhotos(n);
          if (!token) return;
          const res = await updateSettingsSection(token, "storage", { auto_download_photos: n });
          if (!res.ok) Alert.alert("Could not save");
          else Alert.alert("Saved");
        }}
      >
        <Text style={styles.label}>Auto-download photos</Text>
        <Text style={styles.val}>{photos ? "On" : "Off"}</Text>
      </Pressable>
      <Pressable style={[styles.row, { marginTop: 12 }]} onPress={backup}>
        <Text style={styles.label}>Record chat backup (server)</Text>
        <Text style={styles.val}>Run</Text>
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
  label: { fontSize: 16, color: colors.text, flex: 1 },
  val: { fontWeight: "700", color: colors.primary },
});
