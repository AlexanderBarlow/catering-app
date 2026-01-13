import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function yyyyMmDdLocalFromRaw(raw) {
    if (!raw) return null;

    const s = String(raw);
    const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match?.[1]) return match[1];

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getOrderDayKey(order) {
    // Prefer business day if present
    const raw =
        order.eventDate ||
        order.pickupTime || // ✅ prefer schema field
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.createdAt;

    return yyyyMmDdLocalFromRaw(raw);
}

/** ---------------------------
 *  Kitchen filtering (no sauces)
 *  --------------------------- */
function normName(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function isSauceLike(rawName) {
    const n = normName(rawName);

    // catches "8oz Chick-fil-A Sauce", "Polynesian Sauce", "Dressing", "Packets", etc.
    const sauceKeywords = [
        "sauce",
        "dressing",
        "packet",
        "packets",
        "utensil",
        "utensils",
        "napkin",
        "napkins",
        "plate",
        "plates",
        "cup",
        "cups",
        "ice",
        "ketchup",
        "mustard",
        "mayo",
        "mayonnaise",
        "pickle",
        "bbq",
        "barbeque",
        "polynesian",
        "ranch",
        "honey",
        "buffalo",
        "sriracha",
        "vinaigrette",
    ];

    // quick allow-list so we don't accidentally hide real food with “sauce” in name
    // (adjust if needed)
    const allowKeywords = ["sauce pan", "saucepot"]; // basically none for catering

    if (allowKeywords.some((k) => n.includes(k))) return false;
    return sauceKeywords.some((k) => n.includes(k));
}

/** High-priority kitchen items (these float to top) */
function priorityRank(rawName) {
    const n = normName(rawName);

    const has = (...keys) => keys.every((k) => n.includes(k));

    // Sandwiches (includes spicy/deluxe/grilled/club)
    if (n.includes("sandwich")) return 1;

    // Hot nugget tray
    if (has("hot", "nugget") && n.includes("tray")) return 2;

    // Hot strip tray
    if (has("hot", "strip") && n.includes("tray")) return 3;

    // Grilled bundles
    if (n.includes("grilled") && n.includes("bundle")) return 4;

    return 999;
}

function aggregatePrep(orders) {
    const map = new Map();

    for (const o of orders) {
        const items = Array.isArray(o.items)
            ? o.items
            : Array.isArray(o.lineItems)
                ? o.lineItems
                : [];

        for (const it of items) {
            const rawName = it.name || it.title || it.itemName || it.productName || "Unnamed Item";
            const name = String(rawName).trim();
            if (!name) continue;

            // ✅ remove sauces/non-prep
            if (isSauceLike(name)) continue;

            const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1) || 1;

            // normalize key so same item merges reliably
            const key = normName(name);
            const cur = map.get(key);

            map.set(key, {
                name: cur?.name || name, // keep first original casing we see
                qty: (cur?.qty || 0) + qty,
                rank: Math.min(cur?.rank ?? 999, priorityRank(name)),
            });
        }
    }

    return Array.from(map.values()).sort((a, b) => {
        // ✅ priority items first, then by qty
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.qty - a.qty;
    });
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
            <Text style={{ fontWeight: "900", color: CFA_RED, fontSize: 14 }}>{qty}</Text>
        </View>
    );
}

function PriorityTag({ rank }) {
    if (rank === 999) return null;

    const label =
        rank === 1 ? "SANDWICH" :
            rank === 2 ? "HOT NUGGET TRAY" :
                rank === 3 ? "HOT STRIP TRAY" :
                    rank === 4 ? "GRILLED BUNDLE" :
                        "PRIORITY";

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
                {label}
            </Text>
        </View>
    );
}

export default function Prep() {
    const insets = useSafeAreaInsets();
    const [dateStr] = useState(yyyyMmDd(new Date())); // daily view only (today)

    const tomorrowStr = useMemo(() => yyyyMmDd(addDays(new Date(), 1)), []);

    const { data, refetch, isFetching, error } = useQuery({
        queryKey: ["orders", "prep", dateStr, tomorrowStr],
        queryFn: async () => {
            // end-exclusive safe range
            const res = await fetchOrdersByRange({ from: dateStr, to: tomorrowStr });
            return Array.isArray(res) ? res : (res?.data || []);
        },
    });

    const all = data || [];

    // only include orders whose business day is dateStr
    const todaysOrders = useMemo(() => all.filter((o) => getOrderDayKey(o) === dateStr), [all, dateStr]);

    // ✅ sauces removed + priority items floated to top
    const prep = useMemo(() => aggregatePrep(todaysOrders), [todaysOrders]);

    return (
        <View style={{ flex: 1, backgroundColor: BG, paddingTop: Math.max(insets.top, 12) }}>
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 22,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: BORDER,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 22, fontWeight: "900", color: INK }}>Prep List</Text>
                            <Text style={{ marginTop: 4, color: MUTED, fontWeight: "700" }}>
                                {formatDate(dateStr)} • {prep.length} item{prep.length === 1 ? "" : "s"}
                            </Text>
                            <Text style={{ marginTop: 6, color: "rgba(11,18,32,0.50)", fontWeight: "800", fontSize: 12 }}>
                                Kitchen-first: sauces removed. Priority items float to the top.
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => refetch()}
                            accessibilityRole="button"
                            accessibilityLabel="Refresh prep list"
                            style={({ pressed }) => [
                                {
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    backgroundColor: pressed ? "rgba(229,22,54,0.14)" : "rgba(229,22,54,0.10)",
                                    borderWidth: 1,
                                    borderColor: "rgba(229,22,54,0.18)",
                                    transform: [{ scale: pressed ? 0.985 : 1 }],
                                },
                            ]}
                        >
                            <Text style={{ color: CFA_RED, fontWeight: "900", fontSize: 12 }}>Refresh</Text>
                        </Pressable>
                    </View>

                    {error ? (
                        <View
                            style={{
                                marginTop: 12,
                                padding: 14,
                                backgroundColor: "rgba(229,22,54,0.06)",
                                borderRadius: 18,
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

            <FlatList
                data={prep}
                keyExtractor={(item) => item.name}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingBottom: Math.max(insets.bottom, 12) + 70,
                }}
                ListEmptyComponent={
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
                }
                renderItem={({ item, index }) => {
                    const isPriority = item.rank !== 999;
                    return (
                        <View
                            style={{
                                backgroundColor: "white",
                                padding: 14,
                                borderRadius: 22,
                                borderWidth: 1,
                                borderColor: isPriority ? "rgba(229,22,54,0.18)" : BORDER,
                                marginBottom: 10,
                                shadowColor: "#000",
                                shadowOpacity: isPriority ? 0.10 : 0.06,
                                shadowRadius: 16,
                                shadowOffset: { width: 0, height: 10 },
                                elevation: isPriority ? 9 : 6,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
                                            backgroundColor: isPriority ? "rgba(229,22,54,0.90)" : (index % 2 === 0 ? "rgba(229,22,54,0.70)" : "rgba(11,18,32,0.18)"),
                                        }}
                                        accessibilityElementsHidden
                                    />
                                    <PriorityTag rank={item.rank} />
                                </View>

                                <QtyPill qty={item.qty} />
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}
