import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

const FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"];

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
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
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.createdAt;

    return yyyyMmDdLocalFromRaw(raw);
}

function getOrderSortTime(order) {
    const raw = order.pickupAt || order.scheduledFor || order.readyAt || order.createdAt || order.eventDate;
    if (!raw) return 0;

    const s = String(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(`${s}T12:00:00`);
        return Number.isFinite(d.getTime()) ? d.getTime() : 0;
    }

    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

export default function Today() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [status, setStatus] = useState("ALL");

    const today = useMemo(() => new Date(), []);
    const todayKey = useMemo(() => yyyyMmDd(today), [today]);
    const tomorrowKey = useMemo(() => yyyyMmDd(addDays(today, 1)), [today]);

    // IMPORTANT: query tomorrow as end boundary to avoid empty same-day ranges
    const queryKey = ["orders", "today", todayKey, tomorrowKey, status];

    const { data, isLoading, refetch, isFetching, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await fetchOrdersByRange({
                from: todayKey,
                to: tomorrowKey, // end-exclusive friendly
                status,
            });
            return Array.isArray(res) ? res : (res?.data || []);
        },
    });

    const all = data || [];

    // Filter down to "today" by business-date key (consistent with week view)
    const todayOrders = useMemo(() => {
        const filtered = all.filter((o) => getOrderDayKey(o) === todayKey);
        return filtered.sort((a, b) => getOrderSortTime(a) - getOrderSortTime(b));
    }, [all, todayKey]);

    return (
        <View style={{ flex: 1, backgroundColor: BG, paddingTop: Math.max(insets.top, 12) }}>
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <View
                    style={{
                        backgroundColor: "white",
                        borderRadius: 24,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: BORDER,
                    }}
                >
                    <Text style={{ fontSize: 22, fontWeight: "900", color: INK }}>Today</Text>
                    <Text style={{ marginTop: 4, color: MUTED, fontWeight: "700" }}>
                        {todayKey} • {todayOrders.length} order{todayOrders.length === 1 ? "" : "s"}
                    </Text>

                    {/* Filters */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {FILTERS.map((f) => {
                            const active = f === status;
                            return (
                                <Pressable
                                    key={f}
                                    onPress={() => setStatus(f)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filter ${f}`}
                                    style={({ pressed }) => [
                                        {
                                            paddingHorizontal: 12,
                                            paddingVertical: 9,
                                            borderRadius: 999,
                                            backgroundColor: active ? "rgba(229,22,54,0.12)" : "white",
                                            borderWidth: 1,
                                            borderColor: active ? "rgba(229,22,54,0.22)" : BORDER,
                                            transform: [{ scale: pressed ? 0.99 : 1 }],
                                        },
                                    ]}
                                >
                                    <Text style={{ color: INK, fontWeight: "900", fontSize: 12, opacity: active ? 1 : 0.75 }}>
                                        {f === "ALL" ? "All" : f.replace("_", " ")}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

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
                            <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load orders</Text>
                            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                                {String(error.message || error)}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <FlatList
                data={todayOrders}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingBottom: Math.max(insets.bottom, 12) + 70,
                }}
                ListEmptyComponent={
                    <View
                        style={{
                            backgroundColor: "white",
                            borderRadius: 24,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: BORDER,
                        }}
                    >
                        <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>
                            {isLoading ? "Loading..." : "No orders for today"}
                        </Text>
                        <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                            Pull down to refresh.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        showStatus={false}
                        onPress={() => router.push(`/order/${item.id}`)}
                    />
                )}
            />
        </View>
    );
}
