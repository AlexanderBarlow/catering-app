import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export function HealthCheckCard() {
    const [status, setStatus] = useState < "loading" | "up" | "down" > ("loading");

    const checkHealth = async () => {
        try {
            setStatus("loading");
            const res = await fetch(`${API_BASE}/health`, { timeout: 5000 });
            if (!res.ok) throw new Error("Bad response");
            setStatus("up");
        } catch {
            setStatus("down");
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const config = {
        loading: {
            label: "Checking service…",
            color: "#8AA2FF",
            icon: "pulse",
        },
        up: {
            label: "Service Live",
            color: "#4ADE80",
            icon: "checkmark-circle",
        },
        down: {
            label: "Service Offline",
            color: "#EF4444",
            icon: "alert-circle",
        },
    }[status];

    return (
        <Pressable onPress={checkHealth} style={styles.card}>
            <View style={styles.row}>
                {status === "loading" ? (
                    <ActivityIndicator size="small" color={config.color} />
                ) : (
                    <Ionicons name={config.icon as any} size={22} color={config.color} />
                )}

                <Text style={[styles.label, { color: config.color }]}>
                    {config.label}
                </Text>
            </View>

            <Text style={styles.hint}>Tap to refresh</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
    },
    hint: {
        marginTop: 6,
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
    },
});
