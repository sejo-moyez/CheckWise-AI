import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, csrfToken, refreshSession, setAccess } from "./api";
import type { Config, User } from "./types";

interface Session {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}
const Auth = createContext<Session>(null!);
const Toast = createContext<(message: string) => void>(() => {});
export const useAuth = () => useContext(Auth);
export const useToast = () => useContext(Toast);
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => (await api.get<Config>("config/")).data,
    staleTime: 60000,
  });
}
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  async function reload() {
    setUser((await api.get<User>("auth/me/")).data);
  }
  useEffect(() => {
    refreshSession()
      .then(reload)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  async function login(email: string, password: string) {
    const { data } = await api.post<{ access: string; user: User }>(
      "auth/login/",
      { email, password },
      { headers: { "X-CSRFToken": await csrfToken() } },
    );
    setAccess(data.access);
    setUser(data.user);
  }
  async function logout() {
    await api.post(
      "auth/logout/",
      {},
      { headers: { "X-CSRFToken": await csrfToken() } },
    );
    setAccess("");
    setUser(null);
  }
  return (
    <Auth.Provider value={{ user, loading, login, logout, reload }}>
      <Toast.Provider value={setMessage}>
        {children}
        {message && (
          <div role="status" className="toast">
            {message}
            <button
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}
      </Toast.Provider>
    </Auth.Provider>
  );
}
