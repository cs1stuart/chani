import { Tabs, router } from "expo-router";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-text-outline" color={color} size={size} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(app)/settings")}
              style={{ marginRight: 12, padding: 4 }}
            >
              <MaterialCommunityIcons name="cog-outline" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="phone-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: "Status",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="circle-slice-8" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" color={color} size={size} />
          ),
          headerRight: () => (
            <Pressable onPress={() => logout()} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="logout" size={22} color={colors.danger} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
