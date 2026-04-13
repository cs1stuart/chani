import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loginRequest } from "@/api/client";
import type { User } from "@/types";

const TOKEN_KEY = "workchat_token";
const USER_KEY = "workchat_user";

type AuthContextValue = {
  user: User | null;
  token: string;
  ready: boolean;
  login: (email: string, password: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
  setToken: (t: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t) setTokenState(t);
        if (u) {
          try {
            const parsed = JSON.parse(u) as User;
            setUser({
              ...parsed,
              role: parsed.role === "admin" ? "admin" : "employee",
            });
          } catch {
            /* ignore */
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setToken = useCallback(async (t: string) => {
    setTokenState(t);
    if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  const setUserPersist = useCallback(async (u: User | null) => {
    setUser(u);
    if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    else await AsyncStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data } = await loginRequest(email, password);
    if (!ok) {
      return typeof data.error === "string" ? data.error : "Login failed";
    }
    const { token: newToken, ...rest } = data as {
      token: string;
      id: string;
      username: string;
      avatar: string;
      about?: string;
      role?: string;
    };
    const userData: User = {
      ...rest,
      role: rest.role === "admin" ? "admin" : "employee",
    };
    await setToken(newToken);
    await setUserPersist(userData);
    return undefined;
  }, [setToken, setUserPersist]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setTokenState("");
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      logout,
      setUser: setUserPersist,
      setToken,
    }),
    [user, token, ready, login, logout, setUserPersist, setToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
