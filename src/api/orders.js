import { apiFetch } from "./client";

export function fetchOrdersByRange({ from, to, status }) {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (status && status !== "ALL") qs.set("status", status);

    const query = qs.toString();
    return apiFetch(`/orders${query ? `?${query}` : ""}`);
}

export function fetchOrderById(id) {
    return apiFetch(`/orders/${id}`);
}
