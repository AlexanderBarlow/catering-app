import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const CFA_RED = "#E51636";

type Status = "loading" | "up" | "down";

export default function ServiceStatusPill({
  top = 14,
  right = 16,
  intervalMs = 30000,
}: {
  top?: number;
  right?: number;
  intervalMs?: number;
}) {
  const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
  const [status, setStatus] = useState<Status>("loading");
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const label = useMemo(() => {
    if (status === "loading") return "Checking";
    if (status === "up") return "Live";
    return "Offline";
  }, [status]);

  const color = useMemo(() => {
    if (status === "loading") return "rgba(138,162,255,1)";
    if (status === "up") return "rgba(34,197,94,1)";
    return "rgba(239,68,68,1)";
  }, [status]);

  const icon = useMemo(() => {
    if (status === "loading") return "pulse";
    if (status === "up") return "checkmark-circle";
    return "alert-circle";
  }, [status]);

  const checkHealth = async () => {
    try {
      setStatus("loading");

      if (!API_BASE) throw new Error("Missing EXPO_PUBLIC_API_BASE");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`${API_BASE}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Health not ok: ${res.status}`);

      setStatus("up");
      setLastOkAt(Date.now());
    } catch (e) {
      setStatus("down");
    }
  };

  useEffect(() => {
    checkHealth();
    timer.current = setInterval(checkHealth, intervalMs);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, intervalMs]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top, right }]}>
      <Pressable
        onPress={checkHealth}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={styles.shell}>
          <BlurView
            intensity={Platform.OS === "ios" ? 18 : 22}
            tint="light"
            style={styles.blur}
          >
            <View style={styles.frost} />

            <View style={styles.row}>
              {status === "loading" ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <Ionicons name={icon as any} size={16} color={color} />
              )}

              <Text style={[styles.text, { color }]}>{label}</Text>

              {status === "up" && lastOkAt ? (
                <Text style={styles.subText}>
                  {Math.max(0, Math.floor((Date.now() - lastOkAt) / 1000))}s
                </Text>
              ) : null}
            </View>
          </BlurView>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 9999,
  },
  shell: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  blur: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subText: {
    marginLeft: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(15,23,42,0.55)",
  },
});
