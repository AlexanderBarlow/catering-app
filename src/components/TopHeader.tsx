import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ServiceStatusPill from "./ServiceStatusPill";

const INK = "#0F172A";

export default function TopHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 10 }]}>
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>

        {/* No absolute positioning now — it lives in the header */}
        <ServiceStatusPill intervalMs={30000} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.2,
    color: INK,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(15,23,42,0.55)",
  },
});
