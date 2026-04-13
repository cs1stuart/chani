import Constants from "expo-constants";

/**
 * Same backend as the Next.js frontend (`NEXT_PUBLIC_API_URL`).
 * On a physical device, set EXPO_PUBLIC_API_URL to your PC's LAN IP, e.g. http://192.168.1.5:3002
 */
export function getApiUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra.replace(/\/$/, "");
  const env =
    process.env.EXPO_PUBLIC_API_URL ||
    (typeof __DEV__ !== "undefined" && __DEV__
      ? "http://localhost:3002"
      : "http://localhost:3002");
  return env.replace(/\/$/, "");
}

export const PAGE_SIZE = 10;
