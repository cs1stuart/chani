import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Same backend as the Next.js frontend (`NEXT_PUBLIC_API_URL`).
 *
 * - **Chrome on your PC:** open `http://localhost:3002` — not `10.0.2.2` (that address only exists
 *   inside the Android emulator and maps to the host there; Windows Chrome cannot use it).
 * - **Android emulator (Expo app):** default dev URL is `10.0.2.2` so traffic reaches the host.
 * - **Physical phone:** set `EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3002` in `.env`.
 */
export function getApiUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, "");
  const env = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (env) return env;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:3002";
    }
    return "http://localhost:3002";
  }

  return "http://localhost:3002";
}

export const PAGE_SIZE = 10;
