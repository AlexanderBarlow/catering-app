import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { fetchOrdersByRange } from "../../src/api/orders";
import { weekDays, yyyyMmDd, pretty } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";

export default function Week() {
    const router = useRouter();
    const days = useMemo(() => weekDays(new Date()), []);
    const [selected, setSelected] = useState(days[0]);

    const from = yyyyMmDd(days[0]);
    const to = yyyyMmDd(days[6]);

    const { data, refetch, isFetching, error } = useQuery({
        queryKey: ["orders", "week", from, to],
        queryFn: async () => {
            const res = await fetchOrdersByRange({ from, to });
            return Array.isArray(res) ? res : (res?.data || []);
        },
    });

    const all = data || [];
    const selectedStr = yyyyMmDd(selected);

    const filtered = all.filter((o) => {
        // assumes order has eventDate OR pickupAt
        const d = o.eventDate
            ? String(o.eventDate).slice(0, 10)
            : o.pickupAt
                ? new Date(o.pickupAt).toISOString().slice(0, 10)
                : null;

        return d === selectedStr;
    });

    return (
        <View style={{ flex: 1, padding: 14, backgroundColor: "#F6F7FB" }}>
            <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: "900" }}>Week</Text>
                <Text style={{ opacity: 0.65, marginTop: 4 }}>
                    {from} → {to}
                </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <FlatList
                    horizontal
                    data={days}
                    keyExtractor={(d) => yyyyMmDd(d)}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const active = yyyyMmDd(item) === selectedStr;
                        return (
                            <Pressable
                                onPress={() => setSelected(item)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    backgroundColor: active ? "black" : "white",
                                    borderWidth: 1,
                                    borderColor: "rgba(0,0,0,0.08)",
                                    marginRight: 8,
                                }}
                            >
                                <Text style={{ color: active ? "white" : "black", fontWeight: "900", fontSize: 12 }}>
                                    {pretty(item)}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {error ? (
                <View style={{ padding: 12, backgroundColor: "white", borderRadius: 14, marginBottom: 12 }}>
                    <Text style={{ fontWeight: "800" }}>Couldn’t load week</Text>
                    <Text style={{ opacity: 0.7, marginTop: 4 }}>{String(error.message || error)}</Text>
                </View>
            ) : null}

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{ paddingBottom: 22 }}
                ListEmptyComponent={
                    <View style={{ padding: 18, backgroundColor: "white", borderRadius: 16 }}>
                        <Text style={{ fontWeight: "900", fontSize: 16 }}>No orders for {selectedStr}</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        onPress={() => router.push(`/order/${item.id}`)}
                    />
                )}
            />
        </View>
    );
}
