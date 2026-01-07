import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "catering_access_token";
const REFRESH_KEY = "catering_refresh_token";

export async function getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function setAccessToken(token) {
    if (!token) return SecureStore.deleteItemAsync(ACCESS_KEY);
    return SecureStore.setItemAsync(ACCESS_KEY, token);
}

export async function getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token) {
    if (!token) return SecureStore.deleteItemAsync(REFRESH_KEY);
    return SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearAuth() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
}
