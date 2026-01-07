import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const BORDER = "rgba(11,18,32,0.10)";
const MUTED = "rgba(11,18,32,0.60)";

const FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"];

function prettyStatusLabel(s) {
    if (s === "ALL") return "All";
    return s.replace("_", " ").toLowerCase().replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

export default function Today() {
    const router = useRouter();
    const [status, setStatus] = useState("ALL");

    const todayStr = useMemo(() => yyyyMmDd(new Date()), []);
    const queryKey = ["orders", "day", todayStr, status];

    const { data, isLoading, refetch, isFetching, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await fetchOrdersByRange({ from: todayStr, to: todayStr, status });
            return Array.isArray(res) ? res : (res?.data || []);
        },
    });

    const orders = data || [];

    // Sort orders by scheduled time (best-effort)
    const sortedOrders = useMemo(() => {
        const getTime = (o) => {
            const raw = o.pickupAt || o.scheduledFor || o.readyAt || o.eventDate || o.createdAt;
            const t = raw ? new Date(raw).getTime() : 0;
            return Number.isFinite(t) ? t : 0;
        };
        return [...orders].sort((a, b) => getTime(a) - getTime(b));
    }, [orders]);

    const count = sortedOrders.length;

    return (
        <View style={{ flex: 1, padding: 14, backgroundColor: BG }}>
            {/* Top strip (no duplicate "Today" — header already says it) */}
            <View
                style={{
                    backgroundColor: "white",
                    borderRadius: 18,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: BORDER,
                    marginBottom: 12,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: INK, fontSize: 13 }}>
                            {todayStr}
                        </Text>
                        <Text style={{ marginTop: 2, color: MUTED, fontWeight: "700", fontSize: 12 }}>
                            {isLoading ? "Loading catering list…" : `${count} order${count === 1 ? "" : "s"} scheduled`}
                        </Text>
                    </View>

                    <View
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: "rgba(229,22,54,0.10)",
                            borderWidth: 1,
                            borderColor: "rgba(229,22,54,0.18)",
                        }}
                        accessibilityElementsHidden
                    >
                        <Text style={{ color: CFA_RED, fontWeight: "900", fontSize: 12 }}>
                            Catering
                        </Text>
                    </View>
                </View>
            </View>

            {/* Filters */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {FILTERS.map((f) => {
                    const active = f === status;
                    return (
                        <Pressable
                            key={f}
                            onPress={() => setStatus(f)}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter ${prettyStatusLabel(f)}`}
                            style={({ pressed }) => [
                                {
                                    paddingHorizontal: 12,
                                    paddingVertical: 9,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: active ? "rgba(229,22,54,0.28)" : BORDER,
                                    backgroundColor: active ? "rgba(229,22,54,0.12)" : "white",
                                    transform: [{ scale: pressed ? 0.985 : 1 }],
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    color: active ? INK : "rgba(11,18,32,0.70)",
                                    fontWeight: active ? "900" : "800",
                                    fontSize: 12,
                                }}
                            >
                                {prettyStatusLabel(f)}
                            </Text>

                            {/* subtle underline dot */}
                            {active ? (
                                <View
                                    style={{
                                        marginTop: 6,
                                        alignSelf: "center",
                                        height: 3,
                                        width: 18,
                                        borderRadius: 999,
                                        backgroundColor: CFA_RED,
                                        opacity: 0.9,
                                    }}
                                />
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>

            {error ? (
                <View
                    style={{
                        padding: 12,
                        backgroundColor: "white",
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "rgba(229,22,54,0.22)",
                        marginBottom: 12,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load orders</Text>
                    <Text style={{ opacity: 0.75, marginTop: 4, color: INK }}>
                        {String(error.message || error)}
                    </Text>
                </View>
            ) : null}

            <FlatList
                data={sortedOrders}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{ paddingBottom: 28 }}
                ListEmptyComponent={
                    <View
                        style={{
                            padding: 18,
                            backgroundColor: "white",
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: BORDER,
                        }}
                    >
                        <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>
                            {isLoading ? "Loading…" : "No orders scheduled"}
                        </Text>
                        <Text style={{ opacity: 0.65, marginTop: 6, color: INK }}>
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
