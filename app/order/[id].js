import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "../../src/api/orders";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function getTimeLabel(order) {
    const raw =
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

    const label = s.replace("_", " ");

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

function Row({ label, value }) {
    return (
        <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: MUTED }}>
                {label}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "900", color: INK, marginTop: 4 }}>
                {value || "—"}
            </Text>
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
    const items = data ? normalizeItems(data) : [];

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
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
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
                   

                    {/* Items */}
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
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
                                    {items.length} total
                                </Text>
                            </View>
                        </View>

                        <View style={{ marginTop: 10 }}>
                            {items.length === 0 ? (
                                <Text style={{ color: MUTED, fontWeight: "700" }}>No items listed.</Text>
                            ) : (
                                items.map((it, idx) => (
                                    <View
                                        key={`${it.name}-${idx}`}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 10,
                                            paddingVertical: 10,
                                            borderTopWidth: idx === 0 ? 0 : 1,
                                            borderTopColor: "rgba(11,18,32,0.08)",
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
                                            <Text style={{ fontWeight: "900", color: INK, fontSize: 12 }}>
                                                {it.qty}
                                            </Text>
                                        </View>

                                        <Text style={{ flex: 1, fontWeight: "900", color: INK }} numberOfLines={2}>
                                            {it.name}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </>
            )}
        </ScrollView>
    );
}
