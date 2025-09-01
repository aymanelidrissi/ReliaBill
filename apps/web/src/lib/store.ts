const KEY_BASE = "rb.base";
const KEY_TOKEN = "rb.token";
const KEY_EMAIL = "rb.email";

export function getBase() {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3333";
  return window.localStorage.getItem(KEY_BASE) || "/rb";
}
export function setBase(v: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY_BASE, v);
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_TOKEN) || "";
}
export function setToken(t: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY_TOKEN, t);
}
export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY_TOKEN);
}

export function getEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_EMAIL) || "";
}
export function setEmail(e: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY_EMAIL, e);
}
