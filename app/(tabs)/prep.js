// app/(tabs)/prep.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import {
    pickKitchenPriorityItems,
    priorityLabel,
} from "../../src/utils/kitchenItems";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";
const TAB_BAR_H = 86;

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    if (!Number.isFinite(d.getTime())) return dateStr;
    return d.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
}

function normKey(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function yyyyMmDdLocalFromRaw(raw) {
    if (!raw) return null;
    const s = String(raw);

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m?.[1]) return m[1];

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;

    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
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

function scheduledDate(order) {
    // Prefer explicit scheduled times
    const raw =
        order.pickupTime ||
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.eventDate;

    if (!raw) return null;
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
}

function serviceType(order) {
    const t = String(order?.serviceType || order?.fulfillmentType || "").toLowerCase();
    const subj = String(order?.subject || "").toLowerCase();

    if (t.includes("deliver")) return "Delivery";
    if (t.includes("pickup")) return "Pickup";

    // fallback heuristics
    if (subj.includes("deliver")) return "Delivery";
    return "Pickup";
}

function scheduledLabel(order) {
    const d = scheduledDate(order);
    if (!d) return "Unscheduled";
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${serviceType(order)} · ${time}`;
}

function timeBucketForOrder(order) {
    const d = scheduledDate(order);
    if (!d) return "UNSCHEDULED";
    const h = d.getHours();

    // Removed "LATE" per request
    if (h >= 5 && h < 11) return "MORNING";
    if (h >= 11 && h < 14) return "LUNCH";
    if (h >= 14 && h < 17) return "AFTERNOON";
    return "DINNER"; // everything after 5pm goes here (including late night)
}

const BUCKET_META = [
    { key: "MORNING", title: "Morning", hint: "5am–11am", icon: "sunny-outline" },
    { key: "LUNCH", title: "Lunch", hint: "11am–2pm", icon: "restaurant-outline" },
    { key: "AFTERNOON", title: "Afternoon", hint: "2pm–5pm", icon: "partly-sunny-outline" },
    { key: "DINNER", title: "Dinner", hint: "5pm+", icon: "moon-outline" },
    { key: "UNSCHEDULED", title: "Unscheduled", hint: "No time", icon: "help-circle-outline" },
];

function aggregateItemsFromOrders(orders) {
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
            const name = String(rawName || "").trim();
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

function sortPrepItems(items) {
    const { priority, others } = pickKitchenPriorityItems(items); // sauces removed here

    const prioritySorted = [...priority].sort((a, b) => {
        const aq = Number(a.qty || 0);
        const bq = Number(b.qty || 0);
        if (bq !== aq) return bq - aq;
        return String(a.name).localeCompare(String(b.name));
    });

    const othersSorted = [...others].sort((a, b) => {
        const aq = Number(a.qty || 0);
        const bq = Number(b.qty || 0);
        if (bq !== aq) return bq - aq;
        return String(a.name).localeCompare(String(b.name));
    });

    return { prioritySorted, othersSorted };
}

function sumQty(list) {
    let t = 0;
    for (const it of list) t += Number(it.qty || 0) || 0;
    return t;
}

function ChipToggle({ leftLabel, rightLabel, value, onChange }) {
    const leftActive = value === "TIMELINE";
    return (
        <View
            style={{
                flexDirection: "row",
                backgroundColor: "rgba(11,18,32,0.03)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(11,18,32,0.08)",
                padding: 4,
                gap: 6,
            }}
        >
            <Pressable
                onPress={() => onChange("TIMELINE")}
                style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: leftActive ? "white" : "transparent",
                    borderWidth: leftActive ? 1 : 0,
                    borderColor: leftActive ? "rgba(11,18,32,0.10)" : "transparent",
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
            >
                <Text
                    style={{
                        fontWeight: "950",
                        fontSize: 12,
                        color: leftActive ? INK : "rgba(11,18,32,0.55)",
                    }}
                >
                    {leftLabel}
                </Text>
            </Pressable>

            <Pressable
                onPress={() => onChange("ALL")}
                style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: !leftActive ? "white" : "transparent",
                    borderWidth: !leftActive ? 1 : 0,
                    borderColor: !leftActive ? "rgba(11,18,32,0.10)" : "transparent",
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
            >
                <Text
                    style={{
                        fontWeight: "950",
                        fontSize: 12,
                        color: !leftActive ? INK : "rgba(11,18,32,0.55)",
                    }}
                >
                    {rightLabel}
                </Text>
            </Pressable>
        </View>
    );
}

function QtyPill({ qty }) {
    return (
        <View
            style={{
                minWidth: 54,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(229,22,54,0.10)",
                borderWidth: 1,
                borderColor: "rgba(229,22,54,0.18)",
                alignItems: "center",
            }}
        >
            <Text style={{ fontWeight: "950", color: CFA_RED }}>{qty}</Text>
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
            <Text
                style={{
                    fontSize: 11,
                    fontWeight: "950",
                    color: CFA_RED,
                    letterSpacing: 0.2,
                }}
            >
                {label.toUpperCase()}
            </Text>
        </View>
    );
}

function BucketTimesPills({ orders }) {
    if (!orders?.length) return null;

    const times = orders
        .map((o) => ({ id: o.id, label: scheduledLabel(o) }))
        .filter((x) => x.label && x.label !== "Unscheduled");

    if (!times.length) return null;

    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {times.slice(0, 10).map((t) => (
                <View
                    key={t.id}
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: "rgba(11,18,32,0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(11,18,32,0.08)",
                    }}
                >
                    <Text style={{ color: "rgba(11,18,32,0.70)", fontWeight: "900", fontSize: 12 }}>
                        {t.label}
                    </Text>
                </View>
            ))}

            {times.length > 10 ? (
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: "rgba(11,18,32,0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(11,18,32,0.08)",
                    }}
                >
                    <Text style={{ color: "rgba(11,18,32,0.70)", fontWeight: "900", fontSize: 12 }}>
                        +{times.length - 10} more
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

export default function Prep() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState("TIMELINE"); // TIMELINE | ALL
    const [expanded, setExpanded] = useState(() => new Set(["LUNCH"]));

    const todayStr = useMemo(() => yyyyMmDd(new Date()), []);
    const tomorrowStr = useMemo(() => yyyyMmDd(addDays(new Date(), 1)), []);

    const toggleExpanded = useCallback((key) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const { data, refetch, isFetching, isLoading, error } = useQuery({
        queryKey: ["orders", "prep", todayStr, tomorrowStr],
        queryFn: async () => {
            const res = await fetchOrdersByRange({
                from: todayStr,
                to: tomorrowStr,
                status: "ALL",
            });
            return Array.isArray(res) ? res : res?.data || [];
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnReconnect: true,
        refetchInterval: 60_000,
    });

    const all = data || [];

    const todaysOrders = useMemo(() => {
        return all.filter((o) => getOrderDayKey(o) === todayStr);
    }, [all, todayStr]);

    const dailyPrep = useMemo(() => {
        const aggregated = aggregateItemsFromOrders(todaysOrders);
        const { prioritySorted, othersSorted } = sortPrepItems(aggregated);
        const dailyTotal = sumQty(prioritySorted) + sumQty(othersSorted);
        const dailyPriority = sumQty(prioritySorted);
        return { prioritySorted, othersSorted, dailyTotal, dailyPriority };
    }, [todaysOrders]);

    const timelineBuckets = useMemo(() => {
        const bucketOrdersMap = new Map();
        for (const b of BUCKET_META) bucketOrdersMap.set(b.key, []);

        for (const o of todaysOrders) {
            const k = timeBucketForOrder(o);
            if (!bucketOrdersMap.has(k)) bucketOrdersMap.set(k, []);
            bucketOrdersMap.get(k).push(o);
        }

        // sort by scheduled time
        for (const [k, arr] of bucketOrdersMap.entries()) {
            arr.sort((a, b) => {
                const ta = scheduledDate(a)?.getTime() ?? 9e15;
                const tb = scheduledDate(b)?.getTime() ?? 9e15;
                return ta - tb;
            });
            bucketOrdersMap.set(k, arr);
        }

        const buckets = BUCKET_META.map((meta) => {
            const orders = bucketOrdersMap.get(meta.key) || [];
            const aggregated = aggregateItemsFromOrders(orders);
            const { prioritySorted, othersSorted } = sortPrepItems(aggregated);

            const totalItems = sumQty(prioritySorted) + sumQty(othersSorted);
            const priorityItems = sumQty(prioritySorted);

            const merged = [
                ...prioritySorted.map((x) => ({ ...x, _p: true, _k: x.key })),
                ...othersSorted.map((x) => ({ ...x, _p: false, _k: null })),
            ];

            return {
                ...meta,
                orders,
                totalItems,
                priorityItems,
                itemsPriority: prioritySorted,
                itemsOther: othersSorted,
                preview: merged.slice(0, 4),
            };
        });

        return buckets;
    }, [todaysOrders]);

    const listData = useMemo(() => {
        if (mode === "ALL") {
            const out = [];
            if (dailyPrep.prioritySorted.length) {
                out.push({ _type: "divider", id: "div-pri", title: "PRIORITY FIRST" });
                for (const p of dailyPrep.prioritySorted) {
                    out.push({
                        _type: "item",
                        id: `p:${normKey(p.name)}`,
                        name: p.name,
                        qty: p.qty,
                        priorityKey: p.key,
                    });
                }
            }
            out.push({
                _type: "divider",
                id: "div-all",
                title: dailyPrep.prioritySorted.length ? "EVERYTHING ELSE" : "PREP LIST",
            });
            for (const n of dailyPrep.othersSorted) {
                out.push({
                    _type: "item",
                    id: `n:${normKey(n.name)}`,
                    name: n.name,
                    qty: n.qty,
                    priorityKey: null,
                });
            }
            return out;
        }

        return timelineBuckets.map((b) => ({
            _type: "bucket",
            id: `bucket:${b.key}`,
            bucket: b,
        }));
    }, [mode, dailyPrep, timelineBuckets]);

    const headerSubtitle = useMemo(() => {
        return `${formatDate(todayStr)} • ${todaysOrders.length} order${todaysOrders.length === 1 ? "" : "s"} • ${dailyPrep.dailyTotal} prep item${dailyPrep.dailyTotal === 1 ? "" : "s"}${dailyPrep.dailyPriority ? ` • ${dailyPrep.dailyPriority} priority` : ""
            }`;
    }, [todayStr, todaysOrders.length, dailyPrep.dailyTotal, dailyPrep.dailyPriority]);

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <FlatList
                data={listData}
                keyExtractor={(row) => row.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top, 10),
                    paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_H,
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
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={{ fontSize: 22, fontWeight: "950", color: INK }}>Prep</Text>
                                    <Text style={{ marginTop: 4, color: MUTED, fontWeight: "800" }} numberOfLines={2}>
                                        {headerSubtitle}
                                    </Text>
                                </View>

                                <Pressable
                                    onPress={() => refetch()}
                                    style={({ pressed }) => ({
                                        width: 42,
                                        height: 42,
                                        borderRadius: 999,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: pressed ? "rgba(11,18,32,0.06)" : "rgba(11,18,32,0.03)",
                                        borderWidth: 1,
                                        borderColor: "rgba(11,18,32,0.08)",
                                        transform: [{ scale: pressed ? 0.99 : 1 }],
                                    })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Refresh"
                                >
                                    <Ionicons name="refresh" size={18} color="rgba(11,18,32,0.72)" />
                                </Pressable>
                            </View>

                            <View style={{ height: 12 }} />
                            <ChipToggle
                                leftLabel="Timeline"
                                rightLabel="All items"
                                value={mode === "TIMELINE" ? "TIMELINE" : "ALL"}
                                onChange={setMode}
                            />

                            <Text style={{ marginTop: 10, color: "rgba(11,18,32,0.55)", fontWeight: "800", fontSize: 12 }}>
                                {mode === "TIMELINE"
                                    ? "Tap a time block to expand. Shows pickup/delivery times for quick manager glance."
                                    : "Full list of today’s prep totals (sauces removed)."}
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
                                {isLoading ? "Loading…" : "No prep items for today"}
                            </Text>
                            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                                Pull down to refresh.
                            </Text>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => {
                    if (item._type === "bucket") {
                        const b = item.bucket;
                        const isOpen = expanded.has(b.key);

                        return (
                            <View style={{ paddingHorizontal: 14, marginBottom: 10 }}>
                                <Pressable
                                    onPress={() => toggleExpanded(b.key)}
                                    style={({ pressed }) => ({
                                        backgroundColor: "white",
                                        borderRadius: 22,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor: BORDER,
                                        transform: [{ scale: pressed ? 0.995 : 1 }],
                                    })}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                        <View
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 999,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: "rgba(229,22,54,0.10)",
                                                borderWidth: 1,
                                                borderColor: "rgba(229,22,54,0.16)",
                                            }}
                                        >
                                            <Ionicons name={b.icon} size={18} color={CFA_RED} />
                                        </View>

                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={{ fontWeight: "950", color: INK }} numberOfLines={1}>
                                                {b.title}
                                                <Text style={{ color: "rgba(11,18,32,0.55)", fontWeight: "900" }}>
                                                    {" "}
                                                    · {b.hint}
                                                </Text>
                                            </Text>
                                            <Text
                                                style={{
                                                    marginTop: 4,
                                                    color: MUTED,
                                                    fontWeight: "800",
                                                    fontSize: 12,
                                                }}
                                                numberOfLines={1}
                                            >
                                                {b.orders.length} order{b.orders.length === 1 ? "" : "s"} • {b.totalItems} prep item
                                                {b.totalItems === 1 ? "" : "s"}
                                                {b.priorityItems ? ` • ${b.priorityItems} priority` : ""}
                                            </Text>
                                        </View>

                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                            <QtyPill qty={b.totalItems} />
                                            <Ionicons
                                                name={isOpen ? "chevron-up" : "chevron-down"}
                                                size={18}
                                                color="rgba(11,18,32,0.55)"
                                            />
                                        </View>
                                    </View>

                                    {!isOpen ? (
                                        <View style={{ marginTop: 12 }}>
                                            {b.totalItems === 0 ? (
                                                <Text style={{ color: MUTED, fontWeight: "800", fontSize: 12 }}>
                                                    Nothing in this block.
                                                </Text>
                                            ) : (
                                                b.preview.map((p, i) => (
                                                    <View
                                                        key={`${b.key}:prev:${i}`}
                                                        style={{
                                                            marginTop: i === 0 ? 0 : 8,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: 12,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                flex: 1,
                                                                color: INK,
                                                                fontWeight: p._p ? "950" : "900",
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {p.name}
                                                        </Text>
                                                        <Text style={{ color: MUTED, fontWeight: "950" }}>{p.qty}</Text>
                                                    </View>
                                                ))
                                            )}

                                            {/* quick glance times even when collapsed */}
                                            <BucketTimesPills orders={b.orders} />
                                        </View>
                                    ) : (
                                        <View style={{ marginTop: 12 }}>
                                            {b.totalItems === 0 ? (
                                                <Text style={{ color: MUTED, fontWeight: "800", fontSize: 12 }}>
                                                    Nothing in this block.
                                                </Text>
                                            ) : (
                                                <>
                                                    {b.itemsPriority.length ? (
                                                        <>
                                                            <Text
                                                                style={{
                                                                    color: CFA_RED,
                                                                    fontWeight: "950",
                                                                    fontSize: 12,
                                                                    marginBottom: 8,
                                                                }}
                                                            >
                                                                PRIORITY
                                                            </Text>
                                                            {b.itemsPriority.map((p) => (
                                                                <View key={`bp:${b.key}:${normKey(p.name)}`} style={{ marginBottom: 10 }}>
                                                                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                                                                        <View style={{ flex: 1 }}>
                                                                            <Text style={{ fontWeight: "950", color: INK }} numberOfLines={2}>
                                                                                {p.name}
                                                                            </Text>
                                                                            <PriorityTag label={priorityLabel(p.key)} />
                                                                        </View>
                                                                        <QtyPill qty={p.qty} />
                                                                    </View>
                                                                </View>
                                                            ))}
                                                        </>
                                                    ) : null}

                                                    {b.itemsOther.length ? (
                                                        <>
                                                            <Text
                                                                style={{
                                                                    color: "rgba(11,18,32,0.60)",
                                                                    fontWeight: "950",
                                                                    fontSize: 12,
                                                                    marginTop: b.itemsPriority.length ? 6 : 0,
                                                                    marginBottom: 8,
                                                                }}
                                                            >
                                                                OTHER
                                                            </Text>
                                                            {b.itemsOther.map((n) => (
                                                                <View key={`bo:${b.key}:${normKey(n.name)}`} style={{ marginBottom: 10 }}>
                                                                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                                                                        <Text style={{ flex: 1, fontWeight: "900", color: INK }} numberOfLines={2}>
                                                                            {n.name}
                                                                        </Text>
                                                                        <QtyPill qty={n.qty} />
                                                                    </View>
                                                                </View>
                                                            ))}
                                                        </>
                                                    ) : null}

                                                    <BucketTimesPills orders={b.orders} />
                                                </>
                                            )}
                                        </View>
                                    )}
                                </Pressable>
                            </View>
                        );
                    }

                    if (item._type === "divider") {
                        return (
                            <View style={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <Text style={{ fontWeight: "950", color: INK, fontSize: 12, letterSpacing: 0.2 }}>
                                        {item.title}
                                    </Text>
                                    <View style={{ flex: 1, height: 1, backgroundColor: "rgba(11,18,32,0.10)" }} />
                                </View>
                            </View>
                        );
                    }

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
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
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
