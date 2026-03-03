import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  AppState,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

type Status = "loading" | "up" | "down";

export default function ServiceStatusPill({
  intervalMs = 30000,
  tickMs = 1000,

  // header mode: no absolute positioning
  absolute = false,
  top = 14,
  right = 16,
}: {
  intervalMs?: number;
  tickMs?: number;

  absolute?: boolean;
  top?: number;
  right?: number;
}) {
  const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

  const [status, setStatus] = useState<Status>("loading");
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlight = useRef(false);
  const appState = useRef(AppState.currentState);

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

  const stopPoll = () => {
    if (pollTimeout.current) clearTimeout(pollTimeout.current);
    pollTimeout.current = null;
  };

  const scheduleNext = () => {
    stopPoll();
    pollTimeout.current = setTimeout(() => {
      void checkHealth({ showLoading: false, scheduleNextAfter: true });
    }, intervalMs);
  };

  const checkHealth = async ({
    showLoading = false,
    scheduleNextAfter = false,
  }: {
    showLoading?: boolean;
    scheduleNextAfter?: boolean;
  } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      if (!API_BASE) throw new Error("Missing EXPO_PUBLIC_API_BASE");

      // only show loading on first mount / manual press
      if (showLoading && status !== "loading") setStatus("loading");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      // cache buster
      const url = `${API_BASE}/health?t=${Date.now()}`;

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Health not ok: ${res.status}`);

      const ts = Date.now();
      setStatus("up");
      setLastOkAt(ts);
      setNow(ts);
    } catch (e) {
      setStatus("down");
      setNow(Date.now());
    } finally {
      inFlight.current = false;
      if (scheduleNextAfter) scheduleNext();
    }
  };

  // Poll loop + resume on foreground
  useEffect(() => {
    void checkHealth({ showLoading: true, scheduleNextAfter: true });

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;

      if (prev.match(/inactive|background/) && next === "active") {
        void checkHealth({ showLoading: false, scheduleNextAfter: true });
      }

      if (next.match(/inactive|background/)) {
        stopPoll();
      }
    });

    return () => {
      stopPoll();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, intervalMs]);

  // UI ticker for the seconds (forces re-render even if parent doesn't)
  useEffect(() => {
    if (tickInterval.current) clearInterval(tickInterval.current);
    tickInterval.current = null;

    if (status === "up" && lastOkAt) {
      tickInterval.current = setInterval(() => setNow(Date.now()), tickMs);
    }

    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
      tickInterval.current = null;
    };
  }, [status, lastOkAt, tickMs]);

  const secondsSinceOk =
    status === "up" && lastOkAt
      ? Math.max(0, Math.floor((now - lastOkAt) / 1000))
      : null;

  return (
    <View
      style={[
        absolute ? styles.wrapAbs : styles.wrapInline,
        absolute ? { top, right } : null,
      ]}
    >
      <Pressable
        onPress={() =>
          void checkHealth({ showLoading: true, scheduleNextAfter: true })
        }
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
                <Ionicons name={icon} size={16} color={color} />
              )}

              <Text style={[styles.text, { color }]}>{label}</Text>

              {secondsSinceOk !== null ? (
                <Text style={styles.subText}>{secondsSinceOk}s</Text>
              ) : null}
            </View>
          </BlurView>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ header-friendly: no absolute positioning
  wrapInline: {
    zIndex: 10,
    alignSelf: "center",
  },

  // optional if you ever want it floating again
  wrapAbs: {
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
