import { getAccessToken, getRefreshToken, setAccessToken, clearAuth } from "../state/auth";
import { refreshAccessToken } from "./raw";
import { router } from "expo-router";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:4000";

// raw fetch (no auth refresh logic) — used by auth endpoints
export async function apiFetchRaw(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = text || null;
    }

    if (!res.ok) {
        const msg =
            (json && (json.error || json.message)) ||
            `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.payload = json;
        throw err;
    }

    return json;
}

// main fetch used by the app — includes Authorization + refresh-on-401
export async function apiFetch(path, options = {}) {
    const attempt = options.__attempt ?? 0;

    const accessToken = await getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    // If unauthorized, try refresh once
    if (res.status === 401 && attempt === 0) {
        const rt = await getRefreshToken();

        if (!rt) {
            await clearAuth();
            router.replace("/login");
            throw new Error("Session expired. Please log in again.");
        }

        try {
            const newAccess = await refreshAccessToken(rt);
            await setAccessToken(newAccess);

            // retry original request once with new token
            return apiFetch(path, { ...options, __attempt: 1 });
        } catch (e) {
            await clearAuth();
            router.replace("/login");
            throw new Error("Session expired. Please log in again.");
        }
    }

    const text = await res.text();
    let json = null;

    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = text || null;
    }

    if (!res.ok) {
        const msg =
            (json && (json.error || json.message)) ||
            `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.payload = json;
        throw err;
    }

    return json;
}
