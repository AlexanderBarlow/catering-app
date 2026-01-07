import { format, startOfWeek, addDays } from "date-fns";

export function yyyyMmDd(date) {
    return format(date, "yyyy-MM-dd");
}

export function weekDays(date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
}

export function pretty(date) {
    return format(date, "EEE, MMM d");
}

function yyyyMmDdLocalFromRaw(raw) {
    if (!raw) return null;

    // If it's already "YYYY-MM-DD..." just take the date part (no TZ shift)
    const s = String(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // LOCAL date key
}

function getOrderDateKeyLocal(o) {
    const raw = o.pickupAt || o.scheduledFor || o.readyAt || o.eventDate || o.createdAt;
    return yyyyMmDdLocalFromRaw(raw);
}
