import { Tabs } from "expo-router";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const CFA_RED = "#E51636";
const INK = "#0F172A";

function LiquidTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10) + 10;

  return (
    <View
      pointerEvents="box-none"
      // narrower + more “dock-like”
      style={{ position: "absolute", left: 28, right: 28, bottom }}
    >
      {/* Outer shadow (defined, but not bulky) */}
      <View
        style={{
          borderRadius: 32, // rounder shell
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 14 },
          elevation: 20,
        }}
      >
        {/* Glass border wrapper */}
        <View
          style={{
            borderRadius: 32,
            borderWidth: 1.25,
            borderColor: "rgba(255,255,255,0.72)",
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 42 : 22}
            tint="light"
            style={{
              padding: 6, // tighter (less wide/airy)
              borderRadius: 32,
            }}
          >
            {/* Inner stroke (crisp definition) */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: "rgba(15,23,42,0.10)",
                },
              ]}
            />

            {/* Top highlight band */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -18,
                left: 0,
                right: 0,
                height: 44,
                backgroundColor: "rgba(255,255,255,0.60)",
                opacity: 0.32,
              }}
            />

            {/* Base tint (helps it separate from BG) */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: 32,
                  backgroundColor:
                    Platform.OS === "ios"
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(255,255,255,0.24)",
                },
              ]}
            />

            {/* tighter spacing between tabs */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                  options.tabBarLabel ?? options.title ?? route.name;
                const isFocused = state.index === index;

                const onPress = () => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented)
                    navigation.navigate(route.name);
                };

                const onLongPress = () =>
                  navigation.emit({ type: "tabLongPress", target: route.key });

                return (
                  <Pressable
                    key={route.key}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 46, // slightly shorter (more iOS dock)
                        borderRadius: 22, // rounder per-tab pill
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        paddingHorizontal: 6, // tighter label feel
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                      },
                      isFocused
                        ? {
                            backgroundColor: "rgba(229,22,54,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(229,22,54,0.24)",
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.08)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.24)",
                          },
                    ]}
                  >
                    {/* subtle per-tab highlight */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: -18,
                        left: 0,
                        right: 0,
                        height: 38,
                        backgroundColor: "rgba(255,255,255,0.55)",
                        opacity: isFocused ? 0.26 : 0.16,
                      }}
                    />

                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isFocused ? "900" : "800",
                        letterSpacing: 0.15, // reduced (less spaced words)
                        color: isFocused ? INK : "rgba(15,23,42,0.68)",
                      }}
                      numberOfLines={1}
                    >
                      {String(label)}
                    </Text>

                    {/* SINGLE active indicator (with glow via shadow) */}
                    {isFocused ? (
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          bottom: 6,
                          height: 3.5,
                          width: 26,
                          borderRadius: 999,
                          backgroundColor: CFA_RED,

                          // glow (no second pill)
                          shadowColor: CFA_RED,
                          shadowOpacity: 0.35,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 0 },
                          elevation: 6,
                        }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        tabBarStyle: { display: "none" },
        headerTitleStyle: { fontWeight: "900" },
        headerStyle: { backgroundColor: "#F6F7FB" },
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
  );
}
