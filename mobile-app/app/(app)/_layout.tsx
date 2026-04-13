import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { SocketChatProvider } from "@/context/SocketChatContext";
import { colors } from "@/constants/theme";

export default function AppGroupLayout() {
  const { user, token, ready } = useAuth();

  if (!ready) return null;
  if (!user || !token) {
    return <Redirect href="/login" />;
  }

  return (
    <SocketChatProvider token={token} userId={user.id}>
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.surface },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="conversation" options={{ headerShown: false }} />
        <Stack.Screen name="new-chat" options={{ title: "New chat", headerShown: true }} />
        <Stack.Screen name="create-group" options={{ title: "New group", headerShown: true }} />
        <Stack.Screen name="profile" options={{ title: "Profile", headerShown: true }} />
        <Stack.Screen name="chat-info" options={{ title: "Chat info", headerShown: true }} />
        <Stack.Screen name="forward" options={{ title: "Forward", headerShown: true }} />
        <Stack.Screen name="call-active" options={{ title: "Call", headerShown: true }} />
        <Stack.Screen name="status-view" options={{ title: "Status", headerShown: true }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </SocketChatProvider>
  );
}
