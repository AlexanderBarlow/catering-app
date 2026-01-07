import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchOrdersByRange } from "../../src/api/orders";
import { weekDays, yyyyMmDd, pretty } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

function yyyyMmDdLocalFromRaw(raw) {
  if (!raw) return null;
  const s = String(raw);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) return match[1];

  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getOrderDayKey(order) {
  const raw =
    order.eventDate ||
    order.pickupAt ||
    order.scheduledFor ||
    order.readyAt ||
    order.createdAt;
  return yyyyMmDdLocalFromRaw(raw);
}

function getOrderSortTime(order) {
  const raw =
    order.pickupAt ||
    order.scheduledFor ||
    order.readyAt ||
    order.createdAt ||
    order.eventDate;
  if (!raw) return 0;

  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  }

  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function sumItems(order) {
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.lineItems)
    ? order.lineItems
    : [];

  let total = 0;
  for (const it of items)
    total += Number(it.qty ?? it.quantity ?? it.count ?? 1) || 1;
  return total;
}

function formatRange(from, to) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()))
    return `${from} → ${to}`;
  const left = a.toLocaleDateString([], { month: "short", day: "numeric" });
  const right = b.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${left} – ${right}`;
}

/** Modern, compact, “calendar-like” day tile */
function DayTile({ label, count, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select ${label}`}
      style={({ pressed }) => [
        {
          width: 98,
          paddingVertical: 10,
          paddingHorizontal: 10,
          borderRadius: 18,
          backgroundColor: active ? "rgba(229,22,54,0.12)" : "white",
          borderWidth: 1,
          borderColor: active ? "rgba(229,22,54,0.22)" : BORDER,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <Text
        style={{ fontWeight: "900", color: INK, fontSize: 12 }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <View
        style={{
          marginTop: 10,
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <Text
          style={{
            fontWeight: "900",
            color: active ? CFA_RED : INK,
            fontSize: 18,
          }}
        >
          {count}
        </Text>
        <Text style={{ fontWeight: "800", color: MUTED, fontSize: 12 }}>
          order{count === 1 ? "" : "s"}
        </Text>
      </View>

      <View
        style={{
          marginTop: 10,
          height: 3,
          width: 26,
          borderRadius: 999,
          backgroundColor: active ? CFA_RED : "rgba(11,18,32,0.12)",
          opacity: active ? 0.9 : 1,
        }}
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

export default function Week() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const days = useMemo(() => weekDays(new Date()), []);
  const dayKeys = useMemo(() => days.map((d) => yyyyMmDd(d)), [days]);

  const from = yyyyMmDd(days[0]);
  const to = yyyyMmDd(days[6]);

  const todayKey = yyyyMmDd(new Date());
  const initialSelected = dayKeys.includes(todayKey) ? todayKey : dayKeys[0];
  const [selectedKey, setSelectedKey] = useState(initialSelected);

  const { data, refetch, isFetching, error } = useQuery({
    queryKey: ["orders", "week", from, to],
    queryFn: async () => {
      const res = await fetchOrdersByRange({ from, to });
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const all = data || [];

  const buckets = useMemo(() => {
    const map = new Map();
    for (const k of dayKeys) map.set(k, []);

    for (const o of all) {
      const k = getOrderDayKey(o);
      if (k && map.has(k)) map.get(k).push(o);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => getOrderSortTime(a) - getOrderSortTime(b));
    }

    return map;
  }, [all, dayKeys]);

  const counts = useMemo(() => {
    const map = new Map();
    for (const k of dayKeys) map.set(k, 0);
    for (const o of all) {
      const k = getOrderDayKey(o);
      if (k && map.has(k)) map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }, [all, dayKeys]);

  const selectedOrders = buckets.get(selectedKey) || [];

  const selectedSummary = useMemo(() => {
    const count = selectedOrders.length;
    let itemsTotal = 0;
    for (const o of selectedOrders) itemsTotal += sumItems(o);

    if (count === 0) return "No orders";
    return `${count} order${count === 1 ? "" : "s"} • ${itemsTotal} item${
      itemsTotal === 1 ? "" : "s"
    }`;
  }, [selectedOrders]);

  const selectedLabel = useMemo(() => {
    const d = new Date(selectedKey + "T12:00:00");
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : selectedKey;
  }, [selectedKey]);

  const jump = useCallback(
    (dir) => {
      const i = dayKeys.indexOf(selectedKey);
      if (i < 0) return;
      const next = Math.min(Math.max(i + dir, 0), dayKeys.length - 1);
      setSelectedKey(dayKeys[next]);
    },
    [dayKeys, selectedKey]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 8), // less top padding
        paddingBottom: Math.max(insets.bottom, 12) + 90, // space for floating tabs
      }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top header */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 22,
            padding: 12, // tighter
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              {/* Removed "Week" text */}
              <Text style={{ color: MUTED, fontWeight: "800", fontSize: 13 }}>
                {formatRange(from, to)}
              </Text>
            </View>

            <Pressable
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Refresh week"
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 9, // slightly smaller
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? "rgba(229,22,54,0.14)"
                    : "rgba(229,22,54,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(229,22,54,0.18)",
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <Text style={{ color: CFA_RED, fontWeight: "900", fontSize: 12 }}>
                Refresh
              </Text>
            </Pressable>
          </View>

          {error ? (
            <View
              style={{
                marginTop: 10,
                padding: 12,
                backgroundColor: "rgba(229,22,54,0.06)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(229,22,54,0.16)",
              }}
            >
              <Text style={{ fontWeight: "900", color: INK }}>
                Couldn’t load week
              </Text>
              <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
                {String(error.message || error)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Day chooser (horizontal stays) */}
        <View style={{ marginTop: 10 }}>
          <FlatList
            horizontal
            data={days}
            keyExtractor={(d) => yyyyMmDd(d)}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
            renderItem={({ item }) => {
              const key = yyyyMmDd(item);
              return (
                <DayTile
                  label={pretty(item)}
                  count={counts.get(key) || 0}
                  active={key === selectedKey}
                  onPress={() => setSelectedKey(key)}
                />
              );
            }}
          />
        </View>

        {/* Selected-day summary bar */}
        <View
          style={{
            marginTop: 10,
            backgroundColor: "white",
            borderRadius: 20,
            padding: 12,
            borderWidth: 1,
            borderColor: BORDER,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Pressable
            onPress={() => jump(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? "rgba(11,18,32,0.06)"
                  : "rgba(11,18,32,0.04)",
                borderWidth: 1,
                borderColor: "rgba(11,18,32,0.08)",
                opacity: dayKeys.indexOf(selectedKey) === 0 ? 0.45 : 1,
              },
            ]}
            disabled={dayKeys.indexOf(selectedKey) === 0}
          >
            <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>
              ‹
            </Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", color: INK }} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Text
              style={{ marginTop: 4, color: MUTED, fontWeight: "700" }}
              numberOfLines={1}
            >
              {selectedSummary}
            </Text>
          </View>

          <Pressable
            onPress={() => jump(1)}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed
                  ? "rgba(11,18,32,0.06)"
                  : "rgba(11,18,32,0.04)",
                borderWidth: 1,
                borderColor: "rgba(11,18,32,0.08)",
                opacity:
                  dayKeys.indexOf(selectedKey) === dayKeys.length - 1
                    ? 0.45
                    : 1,
              },
            ]}
            disabled={dayKeys.indexOf(selectedKey) === dayKeys.length - 1}
          >
            <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>
              ›
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Orders for selected day (no list scrolling; page scrolls) */}
      <View style={{ paddingHorizontal: 14 }}>
        {selectedOrders.length === 0 ? (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>
              No orders today
            </Text>
            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>
              Select another day above to see its orders.
            </Text>
          </View>
        ) : (
          selectedOrders.map((item) => (
            <View key={item.id} style={{ marginBottom: 12 }}>
              <OrderCard
                order={item}
                onPress={() => router.push(`/order/${item.id}`)}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
