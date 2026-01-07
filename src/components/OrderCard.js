import { Pressable, Text, View } from "react-native";
import StatusPill from "./StatusPill";

const CFA_RED = "#E51636";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function parseLocalDateOnly(dateStr) {
    // dateStr = "YYYY-MM-DD"
    // Use midday local time to avoid timezone/DST rollbacks shifting the day.
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
}

function getWhen(order) {
    // TIME: real timestamp (local time display)
    const timeRaw = order.pickupAt || order.scheduledFor || order.readyAt || order.createdAt;

    let time = "—";
    if (timeRaw) {
        const td = new Date(timeRaw);
        time = Number.isFinite(td.getTime())
            ? td.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : String(timeRaw);
    }

    // DATE: prefer business day if we can get a YYYY-MM-DD from it
    const businessRaw = order.eventDate || order.pickupAt || order.scheduledFor || order.readyAt || order.createdAt;

    let dateShort = null;

    if (businessRaw) {
        const s = String(businessRaw);

        // If string contains a YYYY-MM-DD anywhere at the start, grab it
        // Works for "2026-01-06", "2026-01-06T00:00:00.000Z", etc.
        const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
        const ymd = match?.[1];

        if (ymd) {
            // Treat as LOCAL date (avoid UTC shift)
            const dd = parseLocalDateOnly(ymd);
            if (dd) dateShort = dd.toLocaleDateString([], { month: "short", day: "numeric" });
        } else {
            // If no ymd, fall back to parsing normally
            const dd = new Date(businessRaw);
            if (Number.isFinite(dd.getTime())) {
                dateShort = dd.toLocaleDateString([], { month: "short", day: "numeric" });
            }
        }
    }

    return { time, dateShort };
}




function getServiceType(order) {
    const raw =
        order.serviceType ||
        order.fulfillmentType ||
        order.orderType ||
        order.type ||
        order.deliveryType;

    const str = raw ? String(raw).toUpperCase() : "";

    if (str.includes("DELIV")) return "DELIVERY";
    if (str.includes("PICK")) return "PICKUP";

    const hasAddress =
        !!order.deliveryAddress ||
        !!order.address ||
        !!order.dropoffAddress ||
        !!order.destination;

    if (hasAddress) return "DELIVERY";
    return "PICKUP";
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
    if (!name) return "Item";
    return name.length > 38 ? `${name.slice(0, 37)}…` : name;
}

function ServicePill({ type }) {
    const isDelivery = type === "DELIVERY";
    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: isDelivery ? "rgba(229,22,54,0.10)" : "rgba(11,18,32,0.06)",
                borderWidth: 1,
                borderColor: isDelivery ? "rgba(229,22,54,0.22)" : "rgba(11,18,32,0.10)",
            }}
            accessibilityRole="text"
            accessibilityLabel={isDelivery ? "Delivery" : "Pickup"}
        >
            <Text
                style={{
                    fontSize: 12,
                    fontWeight: "900",
                    color: isDelivery ? CFA_RED : INK,
                    opacity: isDelivery ? 1 : 0.85,
                    letterSpacing: 0.2,
                }}
            >
                {isDelivery ? "DELIVERY" : "PICKUP"}
            </Text>
        </View>
    );
}

function MiniRow({ left, right }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "rgba(11,18,32,0.70)" }} numberOfLines={1}>
                {left}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "900", color: INK }}>
                {right}
            </Text>
        </View>
    );
}

function ItemLine({ name, qty, idx }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingTop: idx === 0 ? 10 : 8,
            }}
        >
            <View
                style={{
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 7,
                    borderRadius: 999,
                    backgroundColor: "rgba(11,18,32,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(11,18,32,0.10)",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                accessibilityElementsHidden
            >
                <Text style={{ fontWeight: "900", fontSize: 12, color: INK, opacity: 0.9 }}>
                    {qty}
                </Text>
            </View>

            <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: INK, opacity: 0.88 }} numberOfLines={1}>
                {compactItemLabel(name)}
            </Text>
        </View>
    );
}

export default function OrderCard({ order, onPress, showStatus = false }) {
    const customer = getCustomerName(order);
    const items = getItems(order);

    const preview = items.slice(0, 3);
    const remaining = items.length - preview.length;

    const { time, dateShort } = getWhen(order);
    const serviceType = getServiceType(order);

    const isDelivery = serviceType === "DELIVERY";

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Open order for ${customer}`}
            style={({ pressed }) => [
                {
                    backgroundColor: "white",
                    borderRadius: 22,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: pressed ? "rgba(229,22,54,0.28)" : BORDER,
                    shadowColor: "#000",
                    shadowOpacity: pressed ? 0.06 : 0.10,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: pressed ? 6 : 10,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                },
            ]}
        >
            {/* Sleek accent rail */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    top: 12,
                    bottom: 12,
                    width: 4,
                    borderTopRightRadius: 999,
                    borderBottomRightRadius: 999,
                    backgroundColor: isDelivery ? CFA_RED : "rgba(11,18,32,0.55)",
                    opacity: 0.95,
                }}
                accessibilityElementsHidden
            />

            {/* Top row */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, paddingLeft: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: INK }} numberOfLines={1}>
                        {customer}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <ServicePill type={serviceType} />
                        {showStatus ? <StatusPill status={order.status} /> : null}
                        <View
                            style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 999,
                                backgroundColor: "rgba(229,22,54,0.06)",
                                borderWidth: 1,
                                borderColor: "rgba(229,22,54,0.14)",
                            }}
                            accessibilityRole="text"
                            accessibilityLabel={`${items.length} items`}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "rgba(11,18,32,0.80)" }}>
                                {items.length} item{items.length === 1 ? "" : "s"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Right meta (clean, no bubble) */}
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: INK }}>{time}</Text>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: "rgba(11,18,32,0.45)" }}>
                            →
                        </Text>
                    </View>

                    {dateShort ? (
                        <Text style={{ fontSize: 12, fontWeight: "800", color: MUTED }}>
                            {dateShort}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Items preview */}
            <View
                style={{
                    marginTop: 12,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(11,18,32,0.08)",
                    paddingLeft: 6,
                }}
            >
                {preview.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED, fontWeight: "700" }}>
                        No items listed
                    </Text>
                ) : (
                    <>
                        {preview.map((it, idx) => (
                            <ItemLine key={`${it.name}-${idx}`} name={it.name} qty={it.qty} idx={idx} />
                        ))}

                        {remaining > 0 ? (
                            <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "900", color: MUTED }}>
                                + {remaining} more
                            </Text>
                        ) : null}
                    </>
                )}
            </View>

            {/* Bottom affordance */}
            <View style={{ marginTop: 12, paddingLeft: 6 }}>
                <MiniRow left="Tap to open details" right="Details" />
            </View>
        </Pressable>
    );
}
