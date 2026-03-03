// src/utils/dates.js
import { format, startOfWeek, addDays } from "date-fns";
import { parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * Set this to your store timezone.
 * If you have multiple stores, pass tz per call instead of using a constant.
 */
export const DEFAULT_TZ = "America/New_York";

/**
 * Robustly coerce various inputs into a Date (instant in time).
 * Accepts: Date | number (ms) | ISO string | other date-ish strings.
 * Returns null if invalid.
 */
export function toDate(raw) {
    if (!raw) return null;

    if (raw instanceof Date) {
        return Number.isFinite(raw.getTime()) ? raw : null;
    }

    // If it's a numeric timestamp (or numeric string), treat as ms since epoch.
    if (typeof raw === "number") {
        const d = new Date(raw);
        return Number.isFinite(d.getTime()) ? d : null;
    }
    if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
        const d = new Date(Number(raw.trim()));
        return Number.isFinite(d.getTime()) ? d : null;
    }

    const s = String(raw).trim();

    // Special case: date-only "YYYY-MM-DD"
    // Create a Date that represents midnight *in the store timezone*.
    // We do this by interpreting it as midnight UTC, then formatting in TZ for keying,
    // but for Date object usage we keep it as a stable instant.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        // Interpret as midnight in the store timezone by building an ISO string with time.
        // NOTE: parseISO treats "YYYY-MM-DDTHH:mm:ss" as local time, so we avoid that.
        // We'll keep this as a "floating" date; for keying, use yyyyMmDdKey().
        const d = new Date(`${s}T00:00:00.000Z`);
        return Number.isFinite(d.getTime()) ? d : null;
    }

    // Prefer ISO parsing when possible
    try {
        const d = parseISO(s);
        if (Number.isFinite(d.getTime())) return d;
    } catch {
        // fall through
    }

    // Fallback to Date parsing
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Produce a stable "YYYY-MM-DD" date key in a given timezone.
 * This is the function you should use for grouping/bucketing orders by day.
 */
export function yyyyMmDdKey(raw, tz = DEFAULT_TZ) {
    if (!raw) return null;

    const s = String(raw).trim();

    // If it begins with YYYY-MM-DD, treat that as authoritative date (no tz shift).
    // This handles ISO strings like "2026-02-10T23:45:00Z" too (we still key by tz below),
    // BUT for raw *date-only* strings, we keep it exactly.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const d = toDate(raw);
    if (!d) return null;

    // Key by store timezone, preventing late-night rollovers.
    return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

/**
 * Pretty label in a timezone (e.g., "Tue, Feb 10")
 */
export function pretty(raw, tz = DEFAULT_TZ) {
    const d = toDate(raw);
    if (!d) return "";
    return formatInTimeZone(d, tz, "EEE, MMM d");
}

/**
 * Convert an instant to a Date object "as seen in" a timezone.
 * Useful if you want to show local components (hours/minutes) consistently.
 */
export function zonedDate(raw, tz = DEFAULT_TZ) {
    const d = toDate(raw);
    if (!d) return null;
    return toZonedTime(d, tz);
}

/**
 * Week days (Mon..Sun) computed in a timezone, returned as Date objects
 * representing midnight in that timezone.
 *
 * NOTE: We return Date objects as instants; for labels/keys use pretty()/yyyyMmDdKey().
 */
export function weekDays(reference = new Date(), tz = DEFAULT_TZ) {
    // Anchor the reference in the timezone and then compute startOfWeek off that.
    const refZoned = zonedDate(reference, tz) || new Date();
    const start = startOfWeek(refZoned, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
}

/**
 * For compatibility with your previous API (Date -> "YYYY-MM-DD")
 * Use this only when you truly have a Date object and want a TZ-key.
 */
export function yyyyMmDd(date, tz = DEFAULT_TZ) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
    return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Your order date key getter: pick the first defined date field and key it in tz.
 */
export function getOrderDateKey(o, tz = DEFAULT_TZ) {
    const raw =
        o?.pickupAt ||
        o?.scheduledFor ||
        o?.readyAt ||
        o?.eventDate ||
        o?.createdAt;

    return yyyyMmDdKey(raw, tz);
}
