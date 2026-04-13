import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { updateProfileApi, uploadFile } from "@/api/client";
import { colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";
import { mediaUrl } from "@/lib/utils";

export default function ProfileScreen() {
  const { user, token, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const base = getApiUrl();

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setAbout(user.about || "");
      setAvatar(user.avatar);
    }
  }, [user]);

  const pickAvatar = async () => {
    if (!token) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to change avatar.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const name = asset.fileName || "avatar.jpg";
    const type = asset.mimeType || "image/jpeg";
    setSaving(true);
    try {
      const up = await uploadFile(token, asset.uri, name, type);
      if (!up.ok) {
        Alert.alert("Upload failed");
        return;
      }
      const data = await up.json();
      const url = (data.url as string) || "";
      setAvatar(url.startsWith("http") ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!token || !user) return;
    setSaving(true);
    try {
      const res = await updateProfileApi(token, {
        id: user.id,
        username: username.trim(),
        avatar,
        about: about.trim(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Error", (err as { error?: string }).error || "Update failed");
        return;
      }
      setUser({ ...user, username: username.trim(), avatar, about: about.trim() });
      Alert.alert("Saved", "Profile updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable onPress={pickAvatar} style={styles.avatarBtn}>
        <Image
          source={{ uri: mediaUrl(avatar, base) }}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text style={styles.changePhoto}>Change photo</Text>
      </Pressable>
      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} />
      <Text style={styles.label}>About</Text>
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        value={about}
        onChangeText={setAbout}
        multiline
      />
      <Pressable style={[styles.save, saving && { opacity: 0.6 }]} disabled={saving} onPress={save}>
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save profile"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  avatarBtn: { alignSelf: "center", marginBottom: 24, alignItems: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border },
  changePhoto: { marginTop: 8, color: colors.primary, fontWeight: "600" },
  label: { fontWeight: "600", marginBottom: 6, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
  },
  save: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
