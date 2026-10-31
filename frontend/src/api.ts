import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api/v1/",
  withCredentials: true,
  timeout: 45000,
});
let access = "";
let refreshing: Promise<string> | null = null;
export function setAccess(value: string) {
  access = value;
}
export async function csrfToken() {
  // Django admin rotates the CSRF cookie on login; obtain its current token.
  return (await api.get<{ csrf: string }>("auth/csrf/")).data.csrf;
}
export async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const token = await csrfToken();
      const { data } = await api.post<{ access: string }>(
        "auth/refresh/",
        {},
        { headers: { "X-CSRFToken": token } },
      );
      access = data.access;
      return access;
    })().finally(() => {
      refreshing = null;
    });
  return refreshing;
}
api.interceptors.request.use((config) => {
  if (access) config.headers.Authorization = "Bearer " + access;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & {
      retried?: boolean;
    };
    if (
      error.response?.status === 401 &&
      original &&
      !original.retried &&
      !original.url?.startsWith("auth/")
    ) {
      original.retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        access = "";
        window.dispatchEvent(new Event("session-expired"));
      }
    }
    return Promise.reject(error);
  },
);
export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string")
      return error.response?.status === 403
        ? "Access denied. Please sign in again."
        : "The service could not complete your request.";
    if (data) return Object.values(data).flat().map(String).join(" ");
    return "Could not connect. Check your connection and try again.";
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export async function download(path: string, name: string) {
  const { data } = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
