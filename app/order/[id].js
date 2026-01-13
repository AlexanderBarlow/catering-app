// app/order/[id].js
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "../../src/api/orders";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    getPriorityKey,
    isSauceLike,
    priorityLabel,
} from "../../src/utils/kitchenItems";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function getTimeLabel(order) {
    const raw =
        order.pickupTime ||
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.eventDate ||
        order.createdAt;

    if (!raw) return null;

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return String(raw);

    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getCustomer(order) {
    return (
        order.customerName ||
        order.customer ||
        order.name ||
        order.contactName ||
        order.companyName ||
        "—"
    );
}

function normalizeItems(order) {
    const items = Array.isArray(order.items)
        ? order.items
        : Array.isArray(order.lineItems)
            ? order.lineItems
            : [];

    return items
        .map((it) => {
            const name = (it.name || it.title || it.itemName || it.productName || "Item")
                .toString()
                .trim();
            const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1) || 1;
            return { name, qty };
        })
        .filter((x) => x.name);
}

function StatusChip({ status }) {
    const s = (status || "UNKNOWN").toString();
    const isDone = s === "COMPLETED";
    const isProg = s === "IN_PROGRESS";
    const isPend = s === "PENDING";

    const bg = isDone
        ? "rgba(16,185,129,0.12)"
        : isProg
            ? "rgba(59,130,246,0.12)"
            : isPend
                ? "rgba(234,179,8,0.14)"
                : "rgba(11,18,32,0.08)";

    const border = isDone
        ? "rgba(16,185,129,0.22)"
        : isProg
            ? "rgba(59,130,246,0.20)"
            : isPend
                ? "rgba(234,179,8,0.22)"
                : "rgba(11,18,32,0.12)";

    const label = s.replaceAll("_", " ");

    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
            }}
            accessibilityRole="text"
            accessibilityLabel={`Status ${label}`}
        >
            <Text style={{ fontWeight: "900", fontSize: 12, color: INK, opacity: 0.9 }}>
                {label}
            </Text>
        </View>
    );
}

function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function mergeSame(items) {
    const map = new Map();

    for (const it of items) {
        const key = norm(it.name);
        const cur = map.get(key);
        if (!cur) map.set(key, { ...it });
        else cur.qty += it.qty;
    }

    return Array.from(map.values());
}

function groupOrderItems(order) {
    const base = normalizeItems(order); // [{name, qty}]

    const priority = [];
    const food = [];
    const sauces = [];

    for (const it of base) {
        if (isSauceLike(it.name)) {
            sauces.push(it);
            continue;
        }

        const pKey = getPriorityKey(it.name);
        if (pKey) priority.push({ ...it, pKey });
        else food.push(it);
    }

    const mergedPriority = mergeSame(priority);
    const mergedFood = mergeSame(food);
    const mergedSauces = mergeSame(sauces);

    const rank = (x) => {
        const key = x.pKey;
        if (key === "TRAY") return 1; // ✅ any tray = top
        if (key === "HOT_NUGGET_TRAY") return 2;
        if (key === "HOT_STRIP_TRAY") return 3;
        if (key === "SANDWICH") return 4;
        if (key === "GRILLED_BUNDLE") return 5;
        return 99;
    };

    mergedPriority.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (b.qty !== a.qty) return b.qty - a.qty;
        return a.name.localeCompare(b.name);
    });

    mergedFood.sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        return a.name.localeCompare(b.name);
    });

    mergedSauces.sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        return a.name.localeCompare(b.name);
    });

    return { priority: mergedPriority, food: mergedFood, sauces: mergedSauces };
}

function SectionTitle({ title, count }) {
    return (
        <View style={{ marginTop: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontWeight: "950", color: INK, fontSize: 12, letterSpacing: 0.2 }}>
                    {title}
                </Text>
                {typeof count === "number" ? (
                    <View
                        style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: "rgba(11,18,32,0.06)",
                            borderWidth: 1,
                            borderColor: "rgba(11,18,32,0.10)",
                        }}
                        accessibilityElementsHidden
                    >
                        <Text style={{ fontWeight: "900", fontSize: 11, color: INK, opacity: 0.85 }}>
                            {count}
                        </Text>
                    </View>
                ) : null}
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(11,18,32,0.10)" }} />
            </View>
        </View>
    );
}

function ItemRow({ name, qty, tag, dot, dim }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: "rgba(11,18,32,0.08)",
                opacity: dim ? 0.78 : 1,
            }}
        >
            <View
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 12,
                    backgroundColor: "rgba(11,18,32,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(11,18,32,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                accessibilityElementsHidden
            >
                <Text style={{ fontWeight: "900", color: INK, fontSize: 12 }}>{qty}</Text>
            </View>

            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {dot ? (
                        <View
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: CFA_RED,
                                opacity: 0.9,
                                marginTop: 5,
                            }}
                            accessibilityElementsHidden
                        />
                    ) : null}

                    <Text style={{ flex: 1, fontWeight: "900", color: INK }} numberOfLines={2}>
                        {name}
                    </Text>
                </View>

                {tag ? (
                    <View
                        style={{
                            marginTop: 8,
                            alignSelf: "flex-start",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: "rgba(229,22,54,0.08)",
                            borderWidth: 1,
                            borderColor: "rgba(229,22,54,0.16)",
                        }}
                    >
                        <Text style={{ fontSize: 11, fontWeight: "950", color: CFA_RED, letterSpacing: 0.2 }}>
                            {tag}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

export default function OrderDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data, isFetching, error } = useQuery({
        queryKey: ["order", id],
        queryFn: async () => {
            const res = await fetchOrderById(id);
            return res?.data || res;
        },
        enabled: !!id,
    });

    const customer = data ? getCustomer(data) : "—";
    const timeLabel = data ? getTimeLabel(data) : null;

    const grouped = data ? groupOrderItems(data) : { priority: [], food: [], sauces: [] };
    const totalCount =
        grouped.priority.length + grouped.food.length + grouped.sauces.length;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: Math.max(insets.bottom, 14) + 16,
                paddingTop: Math.max(insets.top, 14) + 6,
            }}
        >
            {/* Back */}
            <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [
                    {
                        alignSelf: "flex-start",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: "white",
                        borderWidth: 1,
                        borderColor: BORDER,
                        marginBottom: 12,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                ]}
            >
                <Text style={{ fontWeight: "900", color: INK }}>← Back</Text>
            </Pressable>

            {/* Header */}
            <View style={{ marginBottom: 12 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: INK }} numberOfLines={1}>
                            {customer}
                        </Text>
                        <Text style={{ marginTop: 4, color: MUTED, fontWeight: "700" }}>
                            {timeLabel ? `Pickup • ${timeLabel}` : "Order details"}
                        </Text>
                    </View>

                    {data ? <StatusChip status={data.status} /> : null}
                </View>

                <View
                    style={{
                        height: 3,
                        width: 44,
                        borderRadius: 999,
                        backgroundColor: CFA_RED,
                        marginTop: 10,
                        opacity: 0.9,
                    }}
                />
            </View>

            {error ? (
                <View
                    style={{
                        padding: 14,
                        backgroundColor: "white",
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "rgba(229,22,54,0.20)",
                    }}
                >
                    <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load order</Text>
                    <Text style={{ opacity: 0.75, marginTop: 6, color: INK }}>
                        {String(error.message || error)}
                    </Text>
                </View>
            ) : null}

            {!data ? (
                <View
                    style={{
                        padding: 18,
                        backgroundColor: "white",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: BORDER,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: INK }}>
                        {isFetching ? "Loading…" : "No data"}
                    </Text>
                    <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                        Pull down to refresh from the previous screen.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Items (Grouped) */}
                    <View
                        style={{
                            marginTop: 12,
                            backgroundColor: "white",
                            padding: 16,
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: BORDER,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>Items</Text>
                            <View
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 7,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(229,22,54,0.10)",
                                    borderWidth: 1,
                                    borderColor: "rgba(229,22,54,0.18)",
                                }}
                                accessibilityElementsHidden
                            >
                                <Text style={{ color: CFA_RED, fontWeight: "900", fontSize: 12 }}>
                                    {totalCount} total
                                </Text>
                            </View>
                        </View>

                        {totalCount === 0 ? (
                            <Text style={{ color: MUTED, fontWeight: "700", marginTop: 10 }}>
                                No items listed.
                            </Text>
                        ) : (
                            <>
                                {grouped.priority.length ? (
                                    <>
                                        <SectionTitle title="HIGH PRIORITY" count={grouped.priority.length} />
                                        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                            {grouped.priority.map((it, idx) => (
                                                <View key={`pri-${it.name}-${idx}`} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                                    <ItemRow
                                                        name={it.name}
                                                        qty={it.qty}
                                                        dot
                                                        tag={it.pKey ? priorityLabel(it.pKey) : null}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                ) : null}

                                {grouped.food.length ? (
                                    <>
                                        <SectionTitle title="FOOD" count={grouped.food.length} />
                                        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                            {grouped.food.map((it, idx) => (
                                                <View key={`food-${it.name}-${idx}`} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                                    <ItemRow name={it.name} qty={it.qty} />
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                ) : null}

                                {grouped.sauces.length ? (
                                    <>
                                        <SectionTitle title="SAUCES / EXTRAS" count={grouped.sauces.length} />
                                        <View style={{ borderTopWidth: 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                            {grouped.sauces.map((it, idx) => (
                                                <View key={`sauce-${it.name}-${idx}`} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: "rgba(11,18,32,0.08)" }}>
                                                    <ItemRow name={it.name} qty={it.qty} dim />
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                ) : null}
                            </>
                        )}
                    </View>
                </>
            )}
        </ScrollView>
    );
}
