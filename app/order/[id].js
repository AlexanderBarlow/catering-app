import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "../../src/api/orders";

export default function OrderDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const { data, isFetching, error } = useQuery({
        queryKey: ["order", id],
        queryFn: async () => {
            const res = await fetchOrderById(id);
            return res?.data || res;
        },
        enabled: !!id,
    });

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#F6F7FB" }} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "900" }}>← Back</Text>
            </Pressable>

            <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 10 }}>Order</Text>

            {error ? (
                <View style={{ padding: 12, backgroundColor: "white", borderRadius: 14 }}>
                    <Text style={{ fontWeight: "800" }}>Couldn’t load order</Text>
                    <Text style={{ opacity: 0.7, marginTop: 4 }}>{String(error.message || error)}</Text>
                </View>
            ) : null}

            {!data ? (
                <View style={{ padding: 18, backgroundColor: "white", borderRadius: 16 }}>
                    <Text style={{ fontWeight: "900" }}>{isFetching ? "Loading..." : "No data"}</Text>
                </View>
            ) : (
                <View style={{ backgroundColor: "white", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(15,23,42,0.08)" }}>
                    <Text style={{ fontWeight: "900" }}>ID</Text>
                    <Text style={{ opacity: 0.8, marginBottom: 10 }}>{data.id}</Text>

                    <Text style={{ fontWeight: "900" }}>Status</Text>
                    <Text style={{ opacity: 0.8, marginBottom: 10 }}>{data.status || "—"}</Text>

                    <Text style={{ fontWeight: "900" }}>Customer</Text>
                    <Text style={{ opacity: 0.8, marginBottom: 10 }}>{data.customerName || data.customer || "—"}</Text>

                    <Text style={{ fontWeight: "900" }}>Items</Text>
                    {(data.items || []).map((it, idx) => (
                        <Text key={idx} style={{ opacity: 0.85 }}>
                            • {it.name || it.title || "Item"} x {it.qty ?? it.quantity ?? 1}
                        </Text>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
