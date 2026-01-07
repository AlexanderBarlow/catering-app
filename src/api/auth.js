import { apiFetchRaw } from "./raw";

export async function login({ email, password }) {
    return apiFetchRaw("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function refreshAccessToken(refreshToken) {
    const res = await apiFetchRaw("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
    });

    if (!res?.accessToken) throw new Error("Refresh response missing accessToken.");
    return res.accessToken;
}
