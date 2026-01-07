import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";

const FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"];

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

    return (
        <View style={{ flex: 1, padding: 14, backgroundColor: "#F6F7FB" }}>
            <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: "900" }}>Today</Text>
                <Text style={{ opacity: 0.65, marginTop: 4 }}>{todayStr}</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {FILTERS.map((f) => {
                    const active = f === status;
                    return (
                        <Pressable
                            key={f}
                            onPress={() => setStatus(f)}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 999,
                                backgroundColor: active ? "black" : "white",
                                borderWidth: 1,
                                borderColor: "rgba(0,0,0,0.08)",
                            }}
                        >
                            <Text style={{ color: active ? "white" : "black", fontWeight: "800", fontSize: 12 }}>
                                {f === "ALL" ? "All" : f.replace("_", " ")}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {error ? (
                <View style={{ padding: 12, backgroundColor: "white", borderRadius: 14, marginBottom: 12 }}>
                    <Text style={{ fontWeight: "800" }}>Couldn’t load orders</Text>
                    <Text style={{ opacity: 0.7, marginTop: 4 }}>{String(error.message || error)}</Text>
                </View>
            ) : null}

            <FlatList
                data={sortedOrders}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{ paddingBottom: 22 }}
                ListEmptyComponent={
                    <View style={{ padding: 18, backgroundColor: "white", borderRadius: 16 }}>
                        <Text style={{ fontWeight: "900", fontSize: 16 }}>
                            {isLoading ? "Loading..." : "No orders for today"}
                        </Text>
                        <Text style={{ opacity: 0.65, marginTop: 6 }}>
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
