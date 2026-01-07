import { View, Text } from "react-native";

const map = {
    PENDING: { bg: "rgba(255,193,7,0.22)", fg: "#B7791F", label: "Pending" },
    IN_PROGRESS: { bg: "rgba(59,130,246,0.22)", fg: "#1D4ED8", label: "In Progress" },
    COMPLETED: { bg: "rgba(34,197,94,0.22)", fg: "#15803D", label: "Completed" },
    CANCELLED: { bg: "rgba(239,68,68,0.18)", fg: "#B91C1C", label: "Cancelled" },
};

export default function StatusPill({ status }) {
    const s = map[status] || { bg: "rgba(148,163,184,0.22)", fg: "#334155", label: status || "Unknown" };

    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: s.bg,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.08)",
            }}
        >
            <Text style={{ color: s.fg, fontWeight: "700", fontSize: 12 }}>
                {s.label}
            </Text>
        </View>
    );
}
