import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

export default function Index() {
  const { user, token, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user || !token) {
    return <Redirect href="/login" />;
  }
  return <Redirect href="/(app)/(tabs)/chats" />;
}
