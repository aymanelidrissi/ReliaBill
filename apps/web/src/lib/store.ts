export const keys = {
  base: "rb.base",
  token: "rb.token",
};

export function getBase() {
  if (typeof window === "undefined") return "/rb";
  return localStorage.getItem(keys.base) || "/rb";
}

export function setBase(v: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keys.base, v || "/rb");
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(keys.token) || "";
}

export function setToken(v: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keys.token, v || "");
}
