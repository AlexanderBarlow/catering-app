// app/(tabs)/prep.js
import { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";

// ✅ use shared priority + sauce filtering
import {
    pickKitchenPriorityItems,
    priorityLabel,
} from "../../src/utils/kitchenItems";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00"); // local midday avoids timezone weirdness
    if (!Number.isFinite(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/**
 * ✅ Day key in America/New_York WITHOUT luxon (prevents day bleed from UTC storage)
 * Accepts:
 *  - "2026-01-13"
 *  - ISO datetime ("2026-01-14T16:30:00.000Z")
 *  - Date
 */
function yyyyMmDdLocalFromRaw(raw) {
    if (!raw) return null;

    const s = String(raw);

    // already date-only
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;

    // DST-aware ET offset calc (no Intl tz dependency)
    const year = d.getUTCFullYear();
    const jan = new Date(Date.UTC(year, 0, 1));
    const jul = new Date(Date.UTC(year, 6, 1));
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    const isDst = d.getTimezoneOffset() < stdOffset;

    // ET: -5 hours (EST) or -4 hours (EDT)
    const etOffsetMinutes = isDst ? -240 : -300;

    const etMs = d.getTime() + etOffsetMinutes * 60 * 1000;
    const et = new Date(etMs);

    const y = et.getFullYear();
    const m = String(et.getMonth() + 1).padStart(2, "0");
    const day = String(et.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getOrderDayKey(order) {
    const raw =
        order.eventDate ||
        order.pickupTime ||
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.createdAt;

    return yyyyMmDdLocalFromRaw(raw);
}

function normKey(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Aggregate item quantities across orders (raw list) */
function aggregateItems(orders) {
    const map = new Map();

    for (const o of orders) {
        const items = Array.isArray(o.items)
            ? o.items
            : Array.isArray(o.lineItems)
                ? o.lineItems
                : [];

        for (const it of items) {
            const rawName =
                it.name || it.title || it.itemName || it.productName || "Unnamed Item";
            const name = String(rawName).trim();
            if (!name) continue;

            const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1) || 1;

            const key = normKey(name);
            const cur = map.get(key);

            map.set(key, {
                name: cur?.name || name,
                qty: (cur?.qty || 0) + qty,
            });
        }
    }

    return Array.from(map.values());
}

function QtyPill({ qty }) {
    return (
        <View
            style={{
                minWidth: 56,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(229,22,54,0.10)",
                borderWidth: 1,
                borderColor: "rgba(229,22,54,0.20)",
                alignItems: "center",
            }}
            accessibilityRole="text"
            accessibilityLabel={`Quantity ${qty}`}
        >
            <Text style={{ fontWeight: "900", color: CFA_RED, fontSize: 14 }}>
                {qty}
            </Text>
        </View>
    );
}

function PriorityTag({ label }) {
    if (!label) return null;

    return (
        <View
            style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(229,22,54,0.08)",
                borderWidth: 1,
                borderColor: "rgba(229,22,54,0.16)",
                marginTop: 10,
            }}
        >
            <Text style={{ fontSize: 11, fontWeight: "950", color: CFA_RED, letterSpacing: 0.2 }}>
                {label.toUpperCase()}
            </Text>
        </View>
    );
}

function SectionDivider({ title }) {
    return (
        <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontWeight: "950", color: INK, fontSize: 12, letterSpacing: 0.2 }}>
                    {title}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(11,18,32,0.10)" }} />
            </View>
        </View>
    );
}

export default function Prep() {
    const insets = useSafeAreaInsets();
    const [dateStr] = useState(yyyyMmDd(new Date())); // today only
    const tomorrowStr = useMemo(() => yyyyMmDd(addDays(new Date(), 1)), []);

    const { data, refetch, isFetching, error } = useQuery({
        queryKey: ["orders", "prep", dateStr, tomorrowStr],
        queryFn: async () => {
            const res = await fetchOrdersByRange({ from: dateStr, to: tomorrowStr });
            return Array.isArray(res) ? res : res?.data || [];
        },
    });

    const all = data || [];

    // only include orders whose business day is dateStr (ET)
    const todaysOrders = useMemo(
        () => all.filter((o) => getOrderDayKey(o) === dateStr),
        [all, dateStr]
    );

    // raw aggregated list
    const aggregated = useMemo(() => aggregateItems(todaysOrders), [todaysOrders]);

    // ✅ util decides: removes sauces + splits priority/others (and “any tray” is priority)
    const { priority, others } = useMemo(
        () => pickKitchenPriorityItems(aggregated),
        [aggregated]
    );

    // Sort within each bucket
    const prioritySorted = useMemo(() => {
        return [...priority].sort((a, b) => {
            // util already sorts by rank, but keep qty secondary
            const aq = Number(a.qty || 0);
            const bq = Number(b.qty || 0);
            if (bq !== aq) return bq - aq;
            return String(a.name).localeCompare(String(b.name));
        });
    }, [priority]);

    const othersSorted = useMemo(() => {
        return [...others].sort((a, b) => {
            const aq = Number(a.qty || 0);
            const bq = Number(b.qty || 0);
            if (bq !== aq) return bq - aq;
            return String(a.name).localeCompare(String(b.name));
        });
    }, [others]);

    const prepTotal = prioritySorted.length + othersSorted.length;

    // inject divider rows
    const listData = useMemo(() => {
        const out = [];

        if (prioritySorted.length) {
            out.push({ _type: "divider", id: "div-priority", title: "PRIORITY FIRST" });
            for (const p of prioritySorted) {
                out.push({
                    _type: "item",
                    id: `p:${normKey(p.name)}`,
                    name: p.name,
                    qty: p.qty,
                    priorityKey: p.key, // from util
                });
            }
        }

        out.push({
            _type: "divider",
            id: "div-all",
            title: prioritySorted.length ? "EVERYTHING ELSE" : "PREP LIST",
        });

        for (const n of othersSorted) {
            out.push({
                _type: "item",
                id: `n:${normKey(n.name)}`,
                name: n.name,
                qty: n.qty,
                priorityKey: null,
            });
        }

        return out;
    }, [prioritySorted, othersSorted]);

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <FlatList
                data={listData}
                keyExtractor={(row) => row.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top, 10),
                    paddingBottom: Math.max(insets.bottom, 12) + 86, // space above floating tabs
                }}
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                        <View
                            style={{
                                backgroundColor: "white",
                                borderRadius: 22,
                                padding: 14,
                                borderWidth: 1,
                                borderColor: BORDER,
                            }}
                        >
                            <Text style={{ fontSize: 22, fontWeight: "950", color: INK }}>Prep</Text>
                            <Text style={{ marginTop: 4, color: MUTED, fontWeight: "800" }}>
                                {formatDate(dateStr)} • {prepTotal} item{prepTotal === 1 ? "" : "s"}
                                {prioritySorted.length ? ` • ${prioritySorted.length} priority` : ""}
                            </Text>

                            <Text
                                style={{
                                    marginTop: 6,
                                    color: "rgba(11,18,32,0.50)",
                                    fontWeight: "800",
                                    fontSize: 12,
                                }}
                            >
                                Kitchen-first: sauces removed. Trays float to the top. Pull down to refresh.
                            </Text>

                            {error ? (
                                <View
                                    style={{
                                        marginTop: 12,
                                        padding: 12,
                                        backgroundColor: "rgba(229,22,54,0.06)",
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: "rgba(229,22,54,0.16)",
                                    }}
                                >
                                    <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load prep list</Text>
                                    <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                                        {String(error.message || error)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={{ paddingHorizontal: 14 }}>
                        <View
                            style={{
                                padding: 18,
                                backgroundColor: "white",
                                borderRadius: 22,
                                borderWidth: 1,
                                borderColor: BORDER,
                            }}
                        >
                            <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>
                                {isFetching ? "Loading…" : "No items to prep"}
                            </Text>
                            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                                This aggregates item quantities across today’s orders (excluding sauces).
                            </Text>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => {
                    if (item._type === "divider") return <SectionDivider title={item.title} />;

                    const isPriority = !!item.priorityKey;
                    const tag = isPriority ? priorityLabel(item.priorityKey) : null;

                    return (
                        <View style={{ paddingHorizontal: 14, marginBottom: 10 }}>
                            <View
                                style={{
                                    backgroundColor: "white",
                                    padding: 14,
                                    borderRadius: 22,
                                    borderWidth: 1,
                                    borderColor: isPriority ? "rgba(229,22,54,0.18)" : BORDER,
                                    shadowColor: "#000",
                                    shadowOpacity: isPriority ? 0.10 : 0.06,
                                    shadowRadius: 16,
                                    shadowOffset: { width: 0, height: 10 },
                                    elevation: isPriority ? 9 : 6,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 12,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={{
                                                fontSize: 15,
                                                fontWeight: isPriority ? "950" : "900",
                                                color: INK,
                                            }}
                                            numberOfLines={2}
                                        >
                                            {item.name}
                                        </Text>

                                        <View
                                            style={{
                                                marginTop: 8,
                                                height: 3,
                                                width: isPriority ? 54 : 36,
                                                borderRadius: 999,
                                                backgroundColor: isPriority
                                                    ? "rgba(229,22,54,0.90)"
                                                    : index % 2 === 0
                                                        ? "rgba(229,22,54,0.70)"
                                                        : "rgba(11,18,32,0.18)",
                                            }}
                                            accessibilityElementsHidden
                                        />

                                        <PriorityTag label={tag} />
                                    </View>

                                    <QtyPill qty={item.qty} />
                                </View>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}
