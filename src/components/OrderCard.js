import { Pressable, Text, View } from "react-native";
import StatusPill from "./StatusPill";

function getTimeLabel(order) {
    const raw =
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.eventDate ||
        order.createdAt;

    if (!raw) return "—";

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return String(raw);

    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getDateKey(order) {
    const raw =
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.eventDate ||
        order.createdAt;

    if (!raw) return null;

    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return null;

    return d.toISOString().slice(0, 10);
}

function getCustomerName(order) {
    return (
        order.customerName ||
        order.customer ||
        order.name ||
        order.contactName ||
        order.companyName ||
        "Unnamed"
    );
}

function getItems(order) {
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

function compactItemLabel(name) {
    // Keep lines readable on mobile (no crazy truncation, just gentle)
    if (!name) return "Item";
    return name.length > 34 ? `${name.slice(0, 33)}…` : name;
}

function ItemRow({ name, qty }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 7,
            }}
        >
            <View
                style={{
                    width: 26,
                    height: 26,
                    borderRadius: 10,
                    backgroundColor: "rgba(15, 23, 42, 0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(15, 23, 42, 0.08)",
                }}
            >
                <Text style={{ fontWeight: "900", fontSize: 12, opacity: 0.85 }}>
                    {qty}
                </Text>
            </View>

            <Text
                style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: "700",
                    opacity: 0.86,
                }}
                numberOfLines={1}
            >
                {compactItemLabel(name)}
            </Text>
        </View>
    );
}

export default function OrderCard({
    order,
    onPress,
    showStatus = false, // for Today quick view
}) {
    const timeLabel = getTimeLabel(order);
    const customer = getCustomerName(order);
    const items = getItems(order);

    // Readability rules: show 3 items max, then "+ more"
    const preview = items.slice(0, 3);
    const remaining = items.length - preview.length;

    const hasItems = preview.length > 0;
    const dateKey = getDateKey(order);

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                {
                    backgroundColor: "white",
                    borderRadius: 18,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "rgba(15, 23, 42, 0.08)",
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                },
            ]}
        >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                {/* Time badge */}
                <View
                    style={{
                        minWidth: 78,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 14,
                        backgroundColor: "rgba(0, 0, 0, 0.92)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                        {timeLabel}
                    </Text>
                    {dateKey ? (
                        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>
                            {dateKey.slice(5)}
                        </Text>
                    ) : null}
                </View>

                {/* Name + meta */}
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
                        {customer}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <View
                            style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 999,
                                backgroundColor: "rgba(15, 23, 42, 0.06)",
                                borderWidth: 1,
                                borderColor: "rgba(15, 23, 42, 0.08)",
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "800", opacity: 0.75 }}>
                                {items.length} item{items.length === 1 ? "" : "s"}
                            </Text>
                        </View>

                        {showStatus ? <StatusPill status={order.status} /> : null}
                    </View>
                </View>
            </View>

            {/* Divider */}
            <View
                style={{
                    height: 1,
                    backgroundColor: "rgba(15, 23, 42, 0.08)",
                    marginTop: 12,
                    marginBottom: 10,
                }}
            />

            {/* Items */}
            {!hasItems ? (
                <Text style={{ fontSize: 13, opacity: 0.65 }}>
                    No items listed
                </Text>
            ) : (
                <View style={{ gap: 2 }}>
                    {preview.map((it, idx) => (
                        <ItemRow key={`${it.name}-${idx}`} name={it.name} qty={it.qty} />
                    ))}

                    {remaining > 0 ? (
                        <View style={{ marginTop: 6 }}>
                            <Text style={{ fontSize: 12, opacity: 0.65, fontWeight: "800" }}>
                                + {remaining} more
                            </Text>
                        </View>
                    ) : null}
                </View>
            )}
        </Pressable>
    );
}
