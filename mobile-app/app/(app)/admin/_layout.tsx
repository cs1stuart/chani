import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin" }} />
    </Stack>
  );
}
