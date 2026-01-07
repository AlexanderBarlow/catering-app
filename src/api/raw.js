const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:4000";

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
