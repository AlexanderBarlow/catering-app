import { Pressable, Text, View } from "react-native";
import StatusPill from "./StatusPill";
import { pickKitchenPriorityItems } from "../../src/utils/kitchenItems";
// adjust path to match your structure


const CFA_RED = "#E51636";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function parseLocalDateOnly(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
}

function isCompletedStatus(status) {
    const s = String(status || "").toUpperCase();
    return s === "COMPLETED" || s === "CANCELED";
}

function isOverdue(order) {
    const status = order?.status;
    if (isCompletedStatus(status)) return false;

    const raw = order?.pickupTime || order?.pickupAt || order?.scheduledFor;
    if (!raw) return false;

    const t = new Date(raw);
    if (!Number.isFinite(t.getTime())) return false;

    return Date.now() > t.getTime();
}

function getStatusMeta(status) {
    const s = String(status || "PENDING_REVIEW").toUpperCase();

    // Tuned for quick scanning + “CFA red” for urgency
    if (s === "COMPLETED") {
        return {
            label: "Completed",
            icon: "✓",
            bg: "rgba(34,197,94,0.10)",
            border: "rgba(34,197,94,0.22)",
            fg: "rgba(14,116,55,0.95)",
            rail: "rgba(34,197,94,0.70)",
        };
    }
    if (s === "CANCELED") {
        return {
            label: "Canceled",
            icon: "✕",
            bg: "rgba(148,163,184,0.18)",
            border: "rgba(148,163,184,0.28)",
            fg: "rgba(51,65,85,0.90)",
            rail: "rgba(100,116,139,0.65)",
        };
    }
    if (s === "READY") {
        return {
            label: "Ready",
            icon: "•",
            bg: "rgba(59,130,246,0.10)",
            border: "rgba(59,130,246,0.20)",
            fg: "rgba(30,64,175,0.95)",
            rail: "rgba(59,130,246,0.70)",
        };
    }
    if (s === "IN_PROGRESS") {
        return {
            label: "In Progress",
            icon: "↻",
            bg: "rgba(245,158,11,0.12)",
            border: "rgba(245,158,11,0.22)",
            fg: "rgba(146,64,14,0.95)",
            rail: "rgba(245,158,11,0.72)",
        };
    }
    if (s === "ACCEPTED") {
        return {
            label: "Accepted",
            icon: "✓",
            bg: "rgba(16,185,129,0.10)",
            border: "rgba(16,185,129,0.20)",
            fg: "rgba(6,95,70,0.95)",
            rail: "rgba(16,185,129,0.70)",
        };
    }
    if (s === "RECEIVED") {
        return {
            label: "Received",
            icon: "↓",
            bg: "rgba(99,102,241,0.10)",
            border: "rgba(99,102,241,0.22)",
            fg: "rgba(49,46,129,0.95)",
            rail: "rgba(99,102,241,0.70)",
        };
    }

    // default = PENDING_REVIEW / unknown
    return {
        label: "Needs Review",
        icon: "!",
        bg: "rgba(229,22,54,0.08)",
        border: "rgba(229,22,54,0.18)",
        fg: CFA_RED,
        rail: "rgba(229,22,54,0.75)",
    };
}

function StatusBadge({ status, overdue }) {
    const meta = getStatusMeta(status);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: meta.bg,
                borderWidth: 1,
                borderColor: meta.border,
            }}
            accessibilityRole="text"
            accessibilityLabel={`Status ${meta.label}${overdue ? ", overdue" : ""}`}
        >
            <Text style={{ fontSize: 12, fontWeight: "900", color: meta.fg, marginTop: -0.5 }}>
                {meta.icon}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "900", color: meta.fg }}>
                {meta.label}
            </Text>

            {overdue ? (
                <View
                    style={{
                        marginLeft: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: "rgba(229,22,54,0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(229,22,54,0.22)",
                    }}
                >
                    <Text style={{ fontSize: 11, fontWeight: "950", color: CFA_RED, letterSpacing: 0.2 }}>
                        OVERDUE
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

function getWhen(order) {
    const timeRaw =
        order.pickupTime ||
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.createdAt;

    let time = "—";
    if (timeRaw) {
        const td = new Date(timeRaw);
        time = Number.isFinite(td.getTime())
            ? td.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : String(timeRaw);
    }

    const businessRaw =
        order.eventDate ||
        order.pickupTime ||
        order.pickupAt ||
        order.scheduledFor ||
        order.readyAt ||
        order.createdAt;

    let dateShort = null;

    if (businessRaw) {
        const s = String(businessRaw);
        const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
        const ymd = match?.[1];

        if (ymd) {
            const dd = parseLocalDateOnly(ymd);
            if (dd) dateShort = dd.toLocaleDateString([], { month: "short", day: "numeric" });
        } else {
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

function ItemLine({ name, qty, idx, isPriority }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: idx === 0 ? 10 : 8 }}>
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
            >
                <Text style={{ fontWeight: "900", fontSize: 12, color: INK, opacity: 0.9 }}>{qty}</Text>
            </View>

            {isPriority ? (
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#E51636",
                        opacity: 0.9,
                    }}
                />
            ) : null}

            <Text
                style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: isPriority ? "950" : "800",
                    color: INK,
                    opacity: isPriority ? 0.95 : 0.88,
                }}
                numberOfLines={1}
            >
                {compactItemLabel(name)}
            </Text>
        </View>
    );
}


export default function OrderCard({ order, onPress, showStatus = true }) {
    const customer = getCustomerName(order);
    const items = getItems(order);
    const { priority, others } = pickKitchenPriorityItems(items);

    // show up to 3 priority items; if none, fall back to normal items
    const previewBase = priority.length ? priority : items;
    const preview = previewBase.slice(0, 3);

    // remaining count should reflect “base list” you’re previewing
    const remaining = Math.max(0, previewBase.length - preview.length);


    const { time, dateShort } = getWhen(order);
    const serviceType = getServiceType(order);
    const overdue = isOverdue(order);

    const isDelivery = serviceType === "DELIVERY";
    const statusMeta = getStatusMeta(order.status);

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
            {/* Top status strip (subtle premium “scan” affordance) */}
            <View
                style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    top: 10,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: overdue ? "rgba(229,22,54,0.22)" : "rgba(11,18,32,0.06)",
                    overflow: "hidden",
                }}
                accessibilityElementsHidden
            >
                <View
                    style={{
                        height: "100%",
                        width: overdue ? "100%" : "60%",
                        borderRadius: 999,
                        backgroundColor: overdue ? "rgba(229,22,54,0.72)" : statusMeta.rail,
                    }}
                />
            </View>

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
                    backgroundColor: overdue ? CFA_RED : (isDelivery ? CFA_RED : "rgba(11,18,32,0.55)"),
                    opacity: 0.95,
                }}
                accessibilityElementsHidden
            />

            {/* Top row */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
                <View style={{ flex: 1, paddingLeft: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: INK }} numberOfLines={1}>
                        {customer}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <ServicePill type={serviceType} />

                        {/* New “good looking” status badge */}
                        {showStatus ? <StatusBadge status={order.status} overdue={overdue} /> : null}

                        {/* Keep your item count pill */}
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

                {/* Right meta */}
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: overdue ? CFA_RED : INK }}>
                            {time}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: "rgba(11,18,32,0.45)" }}>
                            →
                        </Text>
                    </View>

                    {dateShort ? (
                        <Text style={{ fontSize: 12, fontWeight: "800", color: overdue ? "rgba(229,22,54,0.70)" : MUTED }}>
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
                <MiniRow left={overdue ? "Past pickup time — tap to manage" : "Tap to open details"} right="Details" />
            </View>
        </Pressable>
    );
}
