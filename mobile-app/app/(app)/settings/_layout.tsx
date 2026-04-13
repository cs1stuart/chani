import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
      <Stack.Screen name="security" options={{ title: "Security" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="chats" options={{ title: "Chats" }} />
      <Stack.Screen name="storage" options={{ title: "Storage" }} />
      <Stack.Screen name="blocked" options={{ title: "Blocked contacts" }} />
    </Stack>
  );
}
