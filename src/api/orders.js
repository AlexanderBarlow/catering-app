import { apiFetch } from "./client";

/**
 * Fetch orders within a date range
 */
export function fetchOrdersByRange({ from, to, status }) {
    const qs = new URLSearchParams();

    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (status && status !== "ALL") qs.set("status", status);

    const query = qs.toString();
    return apiFetch(`/orders${query ? `?${query}` : ""}`);
}

/**
 * Fetch a single order by ID
 */
export function fetchOrderById(id) {
    return apiFetch(`/orders/${id}`);
}

/**
 * Fetch all orders for a specific day (YYYY-MM-DD)
 */
export function fetchOrdersForDay(date, status) {
    return fetchOrdersByRange({
        from: date,
        to: date,
        status,
    });
}

/**
 * Fetch today's orders
 */
export function fetchTodayOrders(status) {
    const today = new Date().toISOString().slice(0, 10);
    return fetchOrdersForDay(today, status);
}

/**
 * Update an order's status
 */
export function updateOrderStatus(orderId, status) {
    return apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}
