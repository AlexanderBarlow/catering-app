import React, { useEffect, useRef, useState } from "react";
import { Tabs } from "expo-router";
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-gesture-handler";
import ServiceStatusPill from "../../src/components/ServiceStatusPill";


import { haptic } from "../../src/utils/haptics";

const CFA_RED = "#E51636";
const INK = "#0F172A";

function iconForRoute(routeName, focused) {
  switch (routeName) {
    case "today":
      return focused ? "sparkles" : "sparkles-outline";
    case "week":
      return focused ? "calendar" : "calendar-outline";
    case "prep":
      return focused ? "clipboard" : "clipboard-outline";
    default:
      return focused ? "grid" : "grid-outline";
  }
}

function IOS26LiquidTabBar(props) {
  const insets = useSafeAreaInsets();
  const { state, descriptors, navigation } = props;

  const bottom = Math.max(insets.bottom, 10) + 10;

  // Dock sizing
  const [barWidth, setBarWidth] = useState(0);
  const H_PAD = 10;
  const PILL_SIDE_INSET = 8;

  const itemCount = Math.max(1, state.routes.length);
  const trackW = Math.max(0, barWidth - H_PAD * 2);
  const slotW = itemCount > 0 ? trackW / itemCount : 0;
  const pillW = Math.max(0, slotW - PILL_SIDE_INSET * 2);

  const activeIndex = typeof state.index === "number" ? state.index : 0;

  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!barWidth || !slotW) return;

    const targetX = H_PAD + activeIndex * slotW + (slotW - pillW) / 2;

    Animated.spring(x, {
      toValue: targetX,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [barWidth, slotW, pillW, activeIndex, x]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 24,
        right: 24,
        bottom,
        alignItems: "center",
      }}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          width: 340,
          maxWidth: "92%",
          height: 78,
          borderRadius: 38,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 14 },
          elevation: 18,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
        }}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 14 : 18}
          tint="light"
          style={{ flex: 1 }}
        >
          {/* Frost */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor:
                  Platform.OS === "ios"
                    ? "rgba(255,255,255,0.84)"
                    : "rgba(255,255,255,0.90)",
              },
            ]}
          />

          {/* Top sheen */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 18,
              backgroundColor: "rgba(255,255,255,0.38)",
            }}
          />

          {/* Sliding active pill */}
          {barWidth > 0 && slotW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 8,
                left: 0,
                width: pillW,
                height: 62,
                transform: [{ translateX: x }],
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 28,
                  overflow: "hidden",
                  backgroundColor: "rgba(229,22,54,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(229,22,54,0.18)",
                  shadowColor: CFA_RED,
                  shadowOpacity: 0.14,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 10,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 18,
                    backgroundColor: "rgba(255,255,255,0.26)",
                  }}
                />
              </View>
            </Animated.View>
          ) : null}

          {/* Buttons */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: H_PAD,
              paddingVertical: 8,
            }}
          >
            {state.routes.map((route, index) => {
              const options =
                (descriptors[route.key] && descriptors[route.key].options) ||
                {};
              const label =
                (options.tabBarLabel && String(options.tabBarLabel)) ||
                (options.title && String(options.title)) ||
                route.name;

              const isFocused = state.index === index;
              const iconName = iconForRoute(route.name, isFocused);

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  haptic.selection();
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                haptic.light();
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={({ pressed }) => ({
                    width: slotW || undefined, // avoid 0-width before layout
                    flex: slotW ? undefined : 1, // fallback until layout happens
                    height: 62,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${String(label)}`}
                >
                  <Ionicons
                    name={iconName}
                    size={28}
                    color={isFocused ? CFA_RED : "rgba(15,23,42,0.70)"}
                    style={
                      isFocused
                        ? {
                            textShadowColor: "rgba(229,22,54,0.22)",
                            textShadowRadius: 6,
                          }
                        : undefined
                    }
                  />

                  {isFocused ? (
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: "900",
                        color: CFA_RED,
                        letterSpacing: 0.12,
                      }}
                      numberOfLines={1}
                    >
                      {route.name === "today" ? "Today" : String(label)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ServiceStatusPill top={14} right={18} intervalMs={30000} />
      <Tabs
        tabBar={(props) => <IOS26LiquidTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{ title: "Today", tabBarLabel: "Today" }}
        />
        <Tabs.Screen
          name="week"
          options={{ title: "Week", tabBarLabel: "Week" }}
        />
        <Tabs.Screen
          name="prep"
          options={{ title: "Prep List", tabBarLabel: "Prep" }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
