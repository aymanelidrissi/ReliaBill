import { getBase, getToken } from "./store";

function join(base: string, path: string) {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const base = getBase() || "/rb";
    const token =
        getToken() || (typeof window !== "undefined" ? localStorage.getItem("rb.token") : null);

    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(join(base, path), { ...init, headers, cache: "no-store" });

    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("rb.token");
            document.cookie = "rb.token=; Path=/; Max-Age=0";
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
        }
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        try {
            const j = JSON.parse(text);
            const msg = j?.message || j?.error || `HTTP ${res.status}`;
            throw new Error(msg);
        } catch {
            throw new Error(text || `HTTP ${res.status}`);
        }
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (res as unknown) as T;
}

export async function download(path: string, filename: string) {
    const base = getBase() || "/rb";
    const token =
        getToken() || (typeof window !== "undefined" ? localStorage.getItem("rb.token") : null);

    const res = await fetch(join(base, path), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Download failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}