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
