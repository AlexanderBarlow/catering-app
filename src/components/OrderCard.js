import React, { useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { pickKitchenPriorityItems } from "../../src/utils/kitchenItems";

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

// Data-driven status map
const STATUS_META = {
    COMPLETED: {
        label: "Completed",
        icon: "✓",
        bg: "rgba(34,197,94,0.10)",
        border: "rgba(34,197,94,0.22)",
        fg: "rgba(14,116,55,0.95)",
        rail: "rgba(34,197,94,0.70)",
    },
    CANCELED: {
        label: "Canceled",
        icon: "✕",
        bg: "rgba(148,163,184,0.18)",
        border: "rgba(148,163,184,0.28)",
        fg: "rgba(51,65,85,0.90)",
        rail: "rgba(100,116,139,0.65)",
    },
    READY: {
        label: "Ready",
        icon: "•",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.20)",
        fg: "rgba(30,64,175,0.95)",
        rail: "rgba(59,130,246,0.70)",
    },
    IN_PROGRESS: {
        label: "In Progress",
        icon: "↻",
        bg: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.22)",
        fg: "rgba(146,64,14,0.95)",
        rail: "rgba(245,158,11,0.72)",
    },
    ACCEPTED: {
        label: "Accepted",
        icon: "✓",
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.20)",
        fg: "rgba(6,95,70,0.95)",
        rail: "rgba(16,185,129,0.70)",
    },
    RECEIVED: {
        label: "Received",
        icon: "↓",
        bg: "rgba(99,102,241,0.10)",
        border: "rgba(99,102,241,0.22)",
        fg: "rgba(49,46,129,0.95)",
        rail: "rgba(99,102,241,0.70)",
    },
};

const DEFAULT_STATUS = {
    label: "Needs Review",
    icon: "!",
    bg: "rgba(229,22,54,0.08)",
    border: "rgba(229,22,54,0.18)",
    fg: CFA_RED,
    rail: "rgba(229,22,54,0.75)",
};

function getStatusMeta(status) {
    const s = String(status || "PENDING_REVIEW").toUpperCase();
    return STATUS_META[s] || DEFAULT_STATUS;
}

function StatusBadge({ status, overdue }) {
    const meta = getStatusMeta(status);

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: meta.bg, borderColor: meta.border },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Status ${meta.label}${overdue ? ", overdue" : ""}`}
        >
            <Text style={[styles.badgeIcon, { color: meta.fg }]}>{meta.icon}</Text>
            <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>

            {overdue ? (
                <View style={styles.overdueChip}>
                    <Text style={styles.overdueText}>OVERDUE</Text>
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

    return hasAddress ? "DELIVERY" : "PICKUP";
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
        <View style={[styles.pill, isDelivery ? styles.pillDelivery : styles.pillPickup]}>
            <Text style={[styles.pillText, isDelivery ? styles.pillTextDelivery : styles.pillTextPickup]}>
                {isDelivery ? "DELIVERY" : "PICKUP"}
            </Text>
        </View>
    );
}

function ItemLine({ name, qty, idx }) {
    return (
        <View style={[styles.itemLine, { paddingTop: idx === 0 ? 10 : 8 }]}>
            <View style={styles.qtyChip}>
                <Text style={styles.qtyText}>{qty}</Text>
            </View>

            <Text style={styles.itemText} numberOfLines={1}>
                {compactItemLabel(name)}
            </Text>
        </View>
    );
}

export default function OrderCard({ order, onPress, showStatus = true }) {
    const customer = useMemo(() => getCustomerName(order), [order]);
    const items = useMemo(() => getItems(order), [order]);

    const { priority } = useMemo(() => pickKitchenPriorityItems(items), [items]);
    const previewBase = priority.length ? priority : items;
    const preview = useMemo(() => previewBase.slice(0, 3), [previewBase]);
    const remaining = Math.max(0, previewBase.length - preview.length);

    const { time, dateShort } = useMemo(() => getWhen(order), [order]);
    const serviceType = useMemo(() => getServiceType(order), [order]);
    const overdue = useMemo(() => isOverdue(order), [order]);
    const statusMeta = useMemo(() => getStatusMeta(order?.status), [order?.status]);

    const accent = overdue ? CFA_RED : serviceType === "DELIVERY" ? CFA_RED : "rgba(11,18,32,0.45)";

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Open order for ${customer}`}
            style={({ pressed }) => [styles.cardClean, pressed ? styles.cardCleanPressed : null]}
        >
            {/* Single accent rail */}
            <View style={[styles.rail, { backgroundColor: accent }]} accessibilityElementsHidden />

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.customer} numberOfLines={1}>
                        {customer}
                    </Text>

                    <View style={styles.pillsRow}>
                        <ServicePill type={serviceType} />
                        {showStatus ? <StatusBadge status={order?.status} overdue={overdue} /> : null}

                        <View style={styles.itemsPill}>
                            <Text style={styles.itemsPillText}>
                                {items.length} item{items.length === 1 ? "" : "s"}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.when}>
                    <Text style={[styles.time, overdue ? styles.timeOverdue : null]}>{time}</Text>
                    {dateShort ? (
                        <Text style={[styles.date, overdue ? styles.dateOverdue : null]}>{dateShort}</Text>
                    ) : (
                        <Text style={styles.dateMuted}> </Text>
                    )}
                </View>
            </View>

            {/* Items */}
            <View style={styles.itemsWrap}>
                {preview.length === 0 ? (
                    <Text style={styles.emptyItems}>No items listed</Text>
                ) : (
                    <>
                        {preview.map((it, idx) => (
                            <ItemLine key={`${it.name}-${idx}`} name={it.name} qty={it.qty} idx={idx} />
                        ))}

                        {remaining > 0 ? <Text style={styles.moreText}>+ {remaining} more</Text> : null}
                    </>
                )}
            </View>

            {/* Footer */}
            <Text style={styles.footerHint} numberOfLines={1}>
                {overdue ? "Past pickup time — tap to manage" : "Tap to open details"}
            </Text>

            {/* Subtle sheen */}
            <View pointerEvents="none" style={styles.sheen} />

            {/* Optional: keep this if you want the rail color to also reflect status */}
            {/* <View pointerEvents="none" style={[styles.railGlow, { backgroundColor: statusMeta.rail }]} /> */}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardClean: {
        backgroundColor: "white",
        borderRadius: 22,
        padding: 14,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.10,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
        overflow: "hidden",
    },
    cardCleanPressed: {
        borderColor: "rgba(229,22,54,0.22)",
        shadowOpacity: 0.06,
        elevation: 6,
        transform: [{ scale: 0.992 }],
    },

    rail: {
        position: "absolute",
        left: 0,
        top: 12,
        bottom: 12,
        width: 3,
        borderTopRightRadius: 999,
        borderBottomRightRadius: 999,
        opacity: 0.95,
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        paddingLeft: 6,
    },
    customer: {
        fontSize: 16,
        fontWeight: "900",
        color: INK,
        letterSpacing: -0.2,
    },
    pillsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        flexWrap: "wrap",
    },

    when: {
        alignItems: "flex-end",
        paddingTop: 1,
    },
    time: {
        fontSize: 18,
        fontWeight: "900",
        color: INK,
        letterSpacing: -0.2,
    },
    timeOverdue: { color: CFA_RED },
    date: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: "800",
        color: MUTED,
    },
    dateOverdue: { color: "rgba(229,22,54,0.70)" },
    dateMuted: { marginTop: 4, fontSize: 12 },

    itemsWrap: {
        marginTop: 12,
        paddingTop: 8,
        paddingLeft: 6,
    },
    emptyItems: {
        fontSize: 13,
        color: MUTED,
        fontWeight: "700",
    },
    moreText: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: "900",
        color: MUTED,
    },

    footerHint: {
        marginTop: 12,
        paddingLeft: 6,
        fontSize: 12,
        fontWeight: "800",
        color: "rgba(11,18,32,0.62)",
    },

    pill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    pillDelivery: {
        backgroundColor: "rgba(229,22,54,0.10)",
        borderColor: "rgba(229,22,54,0.22)",
    },
    pillPickup: {
        backgroundColor: "rgba(11,18,32,0.06)",
        borderColor: "rgba(11,18,32,0.10)",
    },
    pillText: {
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
    pillTextDelivery: { color: CFA_RED },
    pillTextPickup: { color: INK, opacity: 0.85 },

    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeIcon: { fontSize: 12, fontWeight: "900", marginTop: -0.5 },
    badgeText: { fontSize: 12, fontWeight: "900" },
    overdueChip: {
        marginLeft: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "rgba(229,22,54,0.12)",
        borderWidth: 1,
        borderColor: "rgba(229,22,54,0.22)",
    },
    overdueText: {
        fontSize: 11,
        fontWeight: "950",
        color: CFA_RED,
        letterSpacing: 0.2,
    },

    itemsPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(11,18,32,0.04)",
        borderWidth: 1,
        borderColor: "rgba(11,18,32,0.08)",
    },
    itemsPillText: {
        fontSize: 12,
        fontWeight: "900",
        color: "rgba(11,18,32,0.82)",
    },

    itemLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    qtyChip: {
        minWidth: 22,
        height: 22,
        paddingHorizontal: 7,
        borderRadius: 999,
        backgroundColor: "rgba(11,18,32,0.06)",
        borderWidth: 1,
        borderColor: "rgba(11,18,32,0.10)",
        alignItems: "center",
        justifyContent: "center",
    },
    qtyText: { fontWeight: "900", fontSize: 12, color: INK, opacity: 0.9 },
    itemText: { flex: 1, fontSize: 13, fontWeight: "800", color: INK, opacity: 0.9 },

    sheen: {
        position: "absolute",
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.55)",
        opacity: 0.18,
    },
});