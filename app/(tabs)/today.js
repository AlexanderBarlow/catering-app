// app/(tabs)/today.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  interpolate,
  Extrapolate,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { fetchOrdersByRange, updateOrderStatus } from "../../src/api/orders";
import { yyyyMmDd } from "../../src/utils/dates";
import OrderCard from "../../src/components/OrderCard";
import { haptic } from "../../src/utils/haptics";
import TopHeader from "../../src/components/TopHeader";

const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";
const FILTERS = ["ACTIVE", "PENDING", "IN_PROGRESS", "COMPLETED", "ALL"];

const ACTION_W = 104;
const SPRING = { damping: 18, stiffness: 260, mass: 0.9 };

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function yyyyMmDdLocalFromRaw(raw) {
  if (!raw) return null;
  const s = String(raw);

  // If it begins with YYYY-MM-DD, keep that (covers ISO timestamps too)
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
    order.pickupTime ||
    order.pickupAt ||
    order.scheduledFor ||
    order.readyAt ||
    order.createdAt;
  return yyyyMmDdLocalFromRaw(raw);
}

function getOrderSortTime(order) {
  const raw =
    order.pickupTime ||
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

function prettyDayTitle(date) {
  return date.toLocaleDateString([], { weekday: "long" });
}

function normalizeStatus(s) {
  return String(s || "").toUpperCase();
}
function isPendingLikeStatus(status) {
  const s = normalizeStatus(status);
  return s === "PENDING_REVIEW" || s === "RECEIVED" || s === "ACCEPTED" || s === "PENDING";
}
function isInProgressLikeStatus(status) {
  const s = normalizeStatus(status);
  return s === "IN_PROGRESS" || s === "READY";
}
function isCompletedLikeStatus(status) {
  const s = normalizeStatus(status);
  return s === "COMPLETED" || s === "CANCELED";
}

function filterForPortrait(order, filter) {
  const s = normalizeStatus(order?.status);
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return isPendingLikeStatus(s) || isInProgressLikeStatus(s);
  if (filter === "PENDING") return isPendingLikeStatus(s);
  if (filter === "IN_PROGRESS") return isInProgressLikeStatus(s);
  if (filter === "COMPLETED") return isCompletedLikeStatus(s);
  return true;
}

function shouldAutoProgress(order, nowMs) {
  const pickupRaw = order.pickupTime || order.pickupAt || order.scheduledFor;
  if (!pickupRaw) return false;

  const pickup = new Date(pickupRaw);
  if (!Number.isFinite(pickup.getTime())) return false;
  if (!isPendingLikeStatus(order.status)) return false;

  const diffMs = pickup.getTime() - nowMs;
  return diffMs <= 15 * 60 * 1000;
}

function filterLabel(f) {
  if (f === "ACTIVE") return "Active";
  if (f === "ALL") return "All";
  return f.replace("_", " ");
}

function customerNameFromOrder(o) {
  return o?.customerName || o?.customer || o?.name || o?.contactName || o?.companyName || "Unnamed";
}

function humanStatus(s) {
  const v = normalizeStatus(s);
  if (!v) return "Unknown";
  return v.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Undo banner */
function UndoBanner({ visible, text, onAction, onDismiss, bottomOffset = 0 }) {
  if (!visible) return null;

  return (
    <View
      style={{ position: "absolute", left: 14, right: 14, bottom: bottomOffset, zIndex: 999 }}
      pointerEvents="box-none"
    >
      <View
        style={{
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.92)",
          borderWidth: 1,
          borderColor: "rgba(11,18,32,0.10)",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
          elevation: 18,
        }}
      >
        <View style={{ height: 4, backgroundColor: "rgba(229,22,54,0.60)" }} />

        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(229,22,54,0.10)",
              borderWidth: 1,
              borderColor: "rgba(229,22,54,0.16)",
            }}
            accessibilityElementsHidden
          >
            <Ionicons name="arrow-undo" size={16} color="#E51636" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: INK, fontWeight: "950", fontSize: 13 }} numberOfLines={2}>
              {text}
            </Text>
            <Text style={{ marginTop: 2, color: MUTED, fontWeight: "800", fontSize: 12 }}>
              Tap undo to revert.
            </Text>
          </View>

          <Pressable
            onPress={onAction}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: pressed ? "rgba(229,22,54,0.14)" : "rgba(229,22,54,0.10)",
              borderWidth: 1,
              borderColor: "rgba(229,22,54,0.18)",
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <Text style={{ color: "#E51636", fontWeight: "950", letterSpacing: 0.2, fontSize: 12 }}>
              UNDO
            </Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "rgba(11,18,32,0.06)" : "rgba(11,18,32,0.03)",
              borderWidth: 1,
              borderColor: "rgba(11,18,32,0.08)",
            })}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={16} color="rgba(11,18,32,0.60)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ActionChip({ side, progress, dragX, icon, label, color }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value ?? 0;

    const slide =
      side === "left"
        ? interpolate(dragX.value ?? 0, [0, ACTION_W], [-10, 0], Extrapolate.CLAMP)
        : interpolate(dragX.value ?? 0, [-ACTION_W, 0], [0, 10], Extrapolate.CLAMP);

    return {
      opacity: interpolate(p, [0, 1], [0.15, 1], Extrapolate.CLAMP),
      transform: [
        { translateX: withSpring(slide, SPRING) },
        { scale: withSpring(interpolate(p, [0, 1], [0.98, 1], Extrapolate.CLAMP), SPRING) },
      ],
    };
  });

  return (
    <View style={{ width: ACTION_W, height: "100%", justifyContent: "center" }}>
      <Animated.View
        style={[
          style,
          {
            alignSelf: side === "left" ? "flex-start" : "flex-end",
            marginHorizontal: 12,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: color,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color="white" />
        <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

function SwipeRow({ item, listRef, openRowRef, closeOpenRow, onToggle, onPress }) {
  const rowRef = useRef(null);

  const status = normalizeStatus(item?.status);
  const canSwipe = !isCompletedLikeStatus(status);

  const nextStatus = isPendingLikeStatus(status)
    ? "IN_PROGRESS"
    : isInProgressLikeStatus(status)
      ? "COMPLETED"
      : null;

  const label = !canSwipe ? "Locked" : nextStatus === "IN_PROGRESS" ? "Start" : nextStatus === "COMPLETED" ? "Complete" : "Locked";
  const icon = !canSwipe ? "lock-closed" : nextStatus === "IN_PROGRESS" ? "play" : nextStatus === "COMPLETED" ? "checkmark" : "lock-closed";
  const color = !canSwipe ? "rgba(11,18,32,0.45)" : nextStatus === "IN_PROGRESS" ? "rgba(11,18,32,0.92)" : "rgba(34,197,94,0.92)";

  const forceClose = useCallback(() => {
    try { rowRef.current?.close(); } catch { }
    setTimeout(() => { try { rowRef.current?.close(); } catch { } }, 0);
  }, []);

  return (
    <View style={{ marginBottom: 12 }}>
      <ReanimatedSwipeable
        ref={rowRef}
        simultaneousHandlers={listRef}
        enableTrackpadTwoFingerGesture
        friction={1.1}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={ACTION_W * 0.35}
        rightThreshold={9999}
        onSwipeableWillOpen={() => {
          if (openRowRef.current && openRowRef.current !== rowRef.current) {
            try { openRowRef.current.close(); } catch { }
          }
          openRowRef.current = rowRef.current;
        }}
        onSwipeableWillClose={() => {
          if (openRowRef.current === rowRef.current) openRowRef.current = null;
        }}
        onSwipeableOpen={(direction) => {
          forceClose();
          if (direction !== "right") return;
          if (!canSwipe) return;
          if (!nextStatus) return;

          const prevStatus = normalizeStatus(item?.status);
          const name = customerNameFromOrder(item);

          haptic?.selection?.();
          onToggle(item.id, nextStatus, prevStatus, name);
        }}
        renderLeftActions={(progress, dragX) => (
          <ActionChip side="left" progress={progress} dragX={dragX} icon={icon} label={label} color={color} />
        )}
        renderRightActions={() => null}
        enabled={canSwipe}
      >
        <OrderCard
          order={item}
          showStatus={true}
          onPress={() => {
            if (openRowRef.current) return closeOpenRow();
            onPress();
          }}
        />
      </ReanimatedSwipeable>
    </View>
  );
}

function BoardColumn({
  title,
  icon,
  accent,
  count,
  hint,
  listRef,
  closeOpenRow,
  data,
  refreshing,
  onRefresh,
  renderItem,
  emptyLabel,
  padBottom,
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 22,
          padding: 12,
          borderWidth: 1,
          borderColor: BORDER,
          flex: 1,
          minHeight: 0,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accent,
              borderWidth: 1,
              borderColor: "rgba(11,18,32,0.08)",
            }}
          >
            <Ionicons name={icon} size={16} color={INK} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: INK, fontWeight: "950", fontSize: 13 }} numberOfLines={1}>
              {title}
              <Text style={{ color: "rgba(11,18,32,0.55)", fontWeight: "900" }}> · {count}</Text>
            </Text>
            {hint ? (
              <Text style={{ marginTop: 2, color: MUTED, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
                {hint}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ height: 10 }} />

        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeOpenRow}
          contentContainerStyle={{ paddingBottom: padBottom }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: "rgba(11,18,32,0.03)",
                borderWidth: 1,
                borderColor: "rgba(11,18,32,0.08)",
              }}
            >
              <Text style={{ color: INK, fontWeight: "950", fontSize: 13 }}>{emptyLabel}</Text>
              <Text style={{ marginTop: 4, color: MUTED, fontWeight: "800", fontSize: 12 }}>
                Pull down to refresh.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

export default function Today() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isWide = width >= 700;
  const useBoard = isLandscape && isWide;

  const [status, setStatus] = useState("ACTIVE");
  const [undoState, setUndoState] = useState(null);

  // ✅ pull-to-refresh should NOT be driven by react-query isFetching
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const undoTimerRef = useRef(null);

  const listRef = useRef(null);
  const openRowRef = useRef(null);

  // declare these always (no hook mismatch)
  const pendingListRef = useRef(null);
  const inProgressListRef = useRef(null);
  const completedListRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const showUndo = useCallback((payload) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState(payload);
    undoTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setUndoState(null);
      undoTimerRef.current = null;
    }, 6000);
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => yyyyMmDd(today), [today]);
  const tomorrowKey = useMemo(() => yyyyMmDd(addDays(today, 1)), [today]);
  const dayTitle = useMemo(() => prettyDayTitle(today), [today]);

  const queryKey = ["orders", "today", todayKey, tomorrowKey];

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchOrdersByRange({ from: todayKey, to: tomorrowKey, status: "ALL" });
      return Array.isArray(res) ? res : res?.data || [];
    },
    // Optional: makes swaps feel less “spinny”
    staleTime: 10_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  // keep your periodic refresh, but it won’t drive the spinner anymore
  useEffect(() => {
    const id = setInterval(() => refetch(), 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  const onRefresh = useCallback(async () => {
    // ensures the spinner ALWAYS stops, even if tab switch happens mid-refresh
    try {
      setIsRefreshing(true);
      // cancelRefetch false lets it run even if another fetch is in-flight
      await refetch({ cancelRefetch: false });
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, [refetch]);

  const all = data || [];
  const todayOrdersAll = useMemo(() => {
    const filtered = all.filter((o) => getOrderDayKey(o) === todayKey);
    return filtered.sort((a, b) => getOrderSortTime(a) - getOrderSortTime(b));
  }, [all, todayKey]);

  const todayOrders = useMemo(() => {
    const filtered = todayOrdersAll.filter((o) => filterForPortrait(o, status));
    return filtered.sort((a, b) => getOrderSortTime(a) - getOrderSortTime(b));
  }, [todayOrdersAll, status]);

  const closeOpenRow = useCallback(() => {
    if (openRowRef.current) {
      try { openRowRef.current.close(); } catch { }
      openRowRef.current = null;
    }
  }, []);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }) => updateOrderStatus(orderId, nextStatus),
    onMutate: async ({ orderId, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        const arr = Array.isArray(old) ? old : old?.data || [];
        return arr.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
      });

      return { prev };
    },
    onError: (err, _vars, ctx) => {
      console.log("updateOrderStatus failed:", err);
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      haptic?.light?.();
    },
    onSuccess: () => haptic?.success?.(),
    onSettled: () => refetch(),
  });

  const onToggle = useCallback(
    (orderId, nextStatus, prevStatus, customerName) => {
      updateStatusMutation.mutate({ orderId, nextStatus });
      showUndo({ orderId, prevStatus, nextStatus, customerName });
    },
    [updateStatusMutation, showUndo]
  );

  const undoLast = useCallback(() => {
    if (!undoState) return;
    haptic?.selection?.();
    updateStatusMutation.mutate({ orderId: undoState.orderId, nextStatus: undoState.prevStatus });

    setUndoState(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, [undoState, updateStatusMutation]);

  useEffect(() => {
    if (!todayOrdersAll.length) return;
    if (!(status === "ACTIVE" || status === "PENDING" || status === "ALL")) return;

    const nowMs = Date.now();
    const eligible = todayOrdersAll.filter((o) => shouldAutoProgress(o, nowMs));
    if (!eligible.length) return;

    for (const o of eligible) {
      updateStatusMutation.mutate({ orderId: o.id, nextStatus: "IN_PROGRESS" });
    }
  }, [todayOrdersAll, status, updateStatusMutation]);

  // landscape board always uses ALL
  const boardOrders = useMemo(() => (useBoard ? todayOrdersAll : []), [useBoard, todayOrdersAll]);
  const pending = useMemo(() => (useBoard ? boardOrders.filter((o) => isPendingLikeStatus(o?.status)) : []), [useBoard, boardOrders]);
  const inProgress = useMemo(() => (useBoard ? boardOrders.filter((o) => isInProgressLikeStatus(o?.status)) : []), [useBoard, boardOrders]);
  const completed = useMemo(() => (useBoard ? boardOrders.filter((o) => isCompletedLikeStatus(o?.status)) : []), [useBoard, boardOrders]);

  const pendingSoonCount = useMemo(() => {
    if (!useBoard) return 0;
    const nowMs = Date.now();

    return pending.filter((o) => {
      const raw = o.pickupTime || o.pickupAt || o.scheduledFor;
      if (!raw) return false;
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t)) return false;
      const diff = t - nowMs;
      return diff <= 15 * 60 * 1000 && diff >= -10 * 60 * 1000;
    }).length;
  }, [useBoard, pending]);

  const TAB_BAR_H = 86;
  const bannerBottom = Math.max(insets.bottom, 10) + TAB_BAR_H + 10;

  const subtitle = `${dayTitle} • ${todayKey} • ${todayOrdersAll.length} order${todayOrdersAll.length === 1 ? "" : "s"}`;

  // ---- PORTRAIT ----
  if (!useBoard) {
    const ControlsCard = (
      <View style={{ backgroundColor: "white", borderRadius: 24, padding: 14, borderWidth: 1, borderColor: BORDER }}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const active = f === status;
            return (
              <Pressable
                key={f}
                onPress={() => {
                  closeOpenRow();
                  setStatus(f);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: active ? "rgba(229,22,54,0.12)" : "white",
                  borderWidth: 1,
                  borderColor: active ? "rgba(229,22,54,0.22)" : BORDER,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <Text style={{ color: INK, fontWeight: "900", fontSize: 12, opacity: active ? 1 : 0.75 }}>
                  {filterLabel(f)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(229,22,54,0.06)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(229,22,54,0.16)" }}>
            <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load orders</Text>
            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>{String(error.message || error)}</Text>
          </View>
        ) : null}

        {/* Optional: tiny indicator that background fetching is happening */}
        {isFetching && !isRefreshing ? (
          <Text style={{ marginTop: 10, color: MUTED, fontWeight: "800", fontSize: 12 }}>
            Updating…
          </Text>
        ) : null}
      </View>
    );

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <TopHeader title="Today" subtitle={subtitle} />

        <FlatList
          ref={listRef}
          style={{ flex: 1, backgroundColor: BG }}
          data={todayOrders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={closeOpenRow}
          contentContainerStyle={{
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_H,
            paddingHorizontal: 14,
          }}
          ListHeaderComponent={
            <View style={{ paddingBottom: 12 }}>
              {ControlsCard}
              <View style={{ height: 12 }} />
            </View>
          }
          ListEmptyComponent={
            <View style={{ backgroundColor: "white", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>
                {isLoading ? "Loading..." : status === "ACTIVE" ? "No active orders" : "No orders"}
              </Text>
              <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>Pull down to refresh.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SwipeRow
              item={item}
              listRef={listRef}
              openRowRef={openRowRef}
              closeOpenRow={closeOpenRow}
              onToggle={onToggle}
              onPress={() => router.push(`/order/${item.id}`)}
            />
          )}
        />

        <UndoBanner
          visible={!!undoState}
          text={undoState ? `Moved ${undoState.customerName} to ${humanStatus(undoState.nextStatus)}` : ""}
          onAction={undoLast}
          onDismiss={() => setUndoState(null)}
          bottomOffset={bannerBottom}
        />
      </View>
    );
  }

  // ---- LANDSCAPE BOARD ----
  const screenPad = 14;
  const colGap = 12;

  const renderSwipeItem =
    (listRefForCol) =>
      ({ item }) => (
        <SwipeRow
          item={item}
          listRef={listRefForCol}
          openRowRef={openRowRef}
          closeOpenRow={closeOpenRow}
          onToggle={onToggle}
          onPress={() => router.push(`/order/${item.id}`)}
        />
      );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Top bar */}
      <View style={{ paddingTop: Math.max(insets.top, 10), paddingHorizontal: screenPad }}>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 12,
            borderWidth: 1,
            borderColor: BORDER,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: INK, fontWeight: "950", fontSize: 16 }} numberOfLines={1}>
              Today Board
            </Text>
            <Text style={{ marginTop: 2, color: MUTED, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "rgba(11,18,32,0.06)" : "rgba(11,18,32,0.03)",
              borderWidth: 1,
              borderColor: "rgba(11,18,32,0.08)",
              transform: [{ scale: pressed ? 0.99 : 1 }],
              opacity: isRefreshing ? 0.7 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh" size={18} color="rgba(11,18,32,0.72)" />
          </Pressable>
        </View>

        {error ? (
          <View style={{ marginTop: 10, padding: 12, backgroundColor: "rgba(229,22,54,0.06)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(229,22,54,0.16)" }}>
            <Text style={{ fontWeight: "900", color: INK }}>Couldn’t load orders</Text>
            <Text style={{ marginTop: 6, color: MUTED, fontWeight: "700" }}>{String(error.message || error)}</Text>
          </View>
        ) : null}
      </View>

      {/* Columns */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          gap: colGap,
          paddingHorizontal: screenPad,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_H,
          minHeight: 0,
        }}
      >
        <BoardColumn
          title="Pending"
          icon="time-outline"
          accent="rgba(229,22,54,0.10)"
          count={pending.length}
          hint={pendingSoonCount ? `${pendingSoonCount} due soon` : "Swipe to start"}
          listRef={pendingListRef}
          closeOpenRow={closeOpenRow}
          data={pending}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          padBottom={80}
          emptyLabel={isLoading ? "Loading..." : "Nothing pending"}
          renderItem={renderSwipeItem(pendingListRef)}
        />

        <BoardColumn
          title="In Progress"
          icon="flame-outline"
          accent="rgba(11,18,32,0.06)"
          count={inProgress.length}
          hint="Swipe to complete"
          listRef={inProgressListRef}
          closeOpenRow={closeOpenRow}
          data={inProgress}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          padBottom={80}
          emptyLabel={isLoading ? "Loading..." : "Nothing in progress"}
          renderItem={renderSwipeItem(inProgressListRef)}
        />

        <BoardColumn
          title="Completed"
          icon="checkmark-circle-outline"
          accent="rgba(34,197,94,0.10)"
          count={completed.length}
          hint="Tap to view"
          listRef={completedListRef}
          closeOpenRow={closeOpenRow}
          data={completed}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          padBottom={80}
          emptyLabel={isLoading ? "Loading..." : "Nothing completed"}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12 }}>
              <OrderCard order={item} showStatus={true} onPress={() => router.push(`/order/${item.id}`)} />
            </View>
          )}
        />
      </View>

      <UndoBanner
        visible={!!undoState}
        text={undoState ? `Moved ${undoState.customerName} to ${humanStatus(undoState.nextStatus)}` : ""}
        onAction={undoLast}
        onDismiss={() => setUndoState(null)}
        bottomOffset={bannerBottom}
      />
    </View>
  );
}
