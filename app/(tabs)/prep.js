import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchOrdersByRange } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";

function aggregatePrep(orders) {
    const map = new Map();

    for (const o of orders) {
        const items = Array.isArray(o.items) ? o.items : [];
        for (const it of items) {
            const name = (it.name || it.title || it.itemName || "Unnamed Item").trim();
            const qty = Number(it.qty ?? it.quantity ?? 1) || 1;

            const prev = map.get(name) || 0;
            map.set(name, prev + qty);
        }
    }

    return Array.from(map.entries())
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty);
}

export default function Prep() {
    const [dateStr, setDateStr] = useState(yyyyMmDd(new Date()));

    const { data, refetch, isFetching, error } = useQuery({
        queryKey: ["orders", "prep", dateStr],
        queryFn: async () => {
            const res = await fetchOrdersByRange({ from: dateStr, to: dateStr });
            return Array.isArray(res) ? res : (res?.data || []);
        },
    });

    const orders = data || [];
    const prep = useMemo(() => aggregatePrep(orders), [orders]);

    return (
        <View style={{ flex: 1, padding: 14, backgroundColor: "#F6F7FB" }}>
            <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: "900" }}>Prep List</Text>
                <Text style={{ opacity: 0.65, marginTop: 4 }}>{dateStr}</Text>
            </View>

            {/* Simple date controls (today / -1 / +1) */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <Pressable
                    onPress={() => {
                        const d = new Date(dateStr + "T00:00:00");
                        d.setDate(d.getDate() - 1);
                        setDateStr(yyyyMmDd(d));
                    }}
                    style={{ padding: 10, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
                >
                    <Text style={{ fontWeight: "900" }}>-1</Text>
                </Pressable>

                <Pressable
                    onPress={() => setDateStr(yyyyMmDd(new Date()))}
                    style={{ padding: 10, backgroundColor: "black", borderRadius: 14 }}
                >
                    <Text style={{ color: "white", fontWeight: "900" }}>Today</Text>
                </Pressable>

                <Pressable
                    onPress={() => {
                        const d = new Date(dateStr + "T00:00:00");
                        d.setDate(d.getDate() + 1);
                        setDateStr(yyyyMmDd(d));
                    }}
                    style={{ padding: 10, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
                >
                    <Text style={{ fontWeight: "900" }}>+1</Text>
                </Pressable>
            </View>

            {error ? (
                <View style={{ padding: 12, backgroundColor: "white", borderRadius: 14, marginBottom: 12 }}>
                    <Text style={{ fontWeight: "800" }}>Couldn’t load prep list</Text>
                    <Text style={{ opacity: 0.7, marginTop: 4 }}>{String(error.message || error)}</Text>
                </View>
            ) : null}

            <FlatList
                data={prep}
                keyExtractor={(item) => item.name}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                contentContainerStyle={{ paddingBottom: 22 }}
                ListEmptyComponent={
                    <View style={{ padding: 18, backgroundColor: "white", borderRadius: 16 }}>
                        <Text style={{ fontWeight: "900", fontSize: 16 }}>
                            {isFetching ? "Loading..." : "No items to prep"}
                        </Text>
                        <Text style={{ opacity: 0.65, marginTop: 6 }}>
                            This screen aggregates items across all orders for the day.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View
                        style={{
                            backgroundColor: "white",
                            padding: 14,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: "rgba(15,23,42,0.08)",
                            marginBottom: 10,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ fontSize: 15, fontWeight: "800", flex: 1, paddingRight: 12 }}>
                            {item.name}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: "900" }}>{item.qty}</Text>
                    </View>
                )}
            />
        </View>
    );
}
