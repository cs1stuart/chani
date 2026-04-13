import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { adminCreateUser, fetchAdminUsers } from "@/api/client";
import { colors } from "@/constants/theme";

type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "employee";
  name_set_by_admin: string;
  current_display_name: string;
  created_at: string;
};

export default function AdminScreen() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { ok, status, data } = await fetchAdminUsers(token);
    if (status === 403) {
      setForbidden(true);
      return;
    }
    if (!ok) {
      setRows([]);
      return;
    }
    const list = (data as { items?: AdminUser[] }).items;
    setRows(Array.isArray(list) ? list : []);
    setForbidden(false);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (user?.role !== "admin") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Admin dashboard is only for admin accounts.</Text>
      </View>
    );
  }

  if (forbidden) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You do not have access to /api/admin/users.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(u) => u.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.formTitle}>Create user (same API as web admin)</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={[styles.btn, creating && { opacity: 0.6 }]}
            disabled={creating}
            onPress={async () => {
              if (!token) return;
              setCreating(true);
              try {
                const { ok, data } = await adminCreateUser(token, {
                  email: email.trim(),
                  password,
                  name: name.trim(),
                });
                if (!ok) {
                  Alert.alert("Error", (data as { error?: string }).error || "Failed");
                  return;
                }
                setEmail("");
                setPassword("");
                setName("");
                await load();
                Alert.alert("User created");
              } finally {
                setCreating(false);
              }
            }}
          >
            <Text style={styles.btnText}>{creating ? "Creating…" : "Create user"}</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{item.current_display_name}</Text>
          <Text style={styles.rowSub}>{item.email}</Text>
          <Text style={styles.rowSub2}>Admin name: {item.name_set_by_admin}</Text>
          <Text style={styles.badge}>{item.role}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  muted: { textAlign: "center", color: colors.textMuted, lineHeight: 22 },
  form: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  formTitle: { fontWeight: "700", marginBottom: 12, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  row: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  rowSub: { color: colors.textMuted, marginTop: 4 },
  rowSub2: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  badge: { marginTop: 6, color: colors.primary, fontWeight: "600", textTransform: "capitalize" },
});
