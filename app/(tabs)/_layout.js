import { Tabs } from "expo-router";
<<<<<<< HEAD
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
=======
import { View, Text, Pressable, Platform } from "react-native";
>>>>>>> bb733d7 (pulling)
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
            style={{
                position: "absolute",
                left: 14,
                right: 14,
                bottom,
            }}
        >
            {/* Outer shell for shadow */}
            <View
                style={{
                    borderRadius: 26,
                    shadowColor: "#000",
                    shadowOpacity: 0.16,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 14 },
                    elevation: 18,
                    overflow: "hidden",
                }}
            >
                {/* Native iOS blur */}
                <BlurView
                    intensity={Platform.OS === "ios" ? 35 : 20}
                    tint="light"
                    style={{
                        padding: 10,
                        borderRadius: 26,
                    }}
                >
                    {/* Frost overlay to get the “liquid glass” milky look */}
                    <View
                        pointerEvents="none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.35)",
                        }}
                    />

                    {/* Glass border */}
                    <View
                        pointerEvents="none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.55)",
                        }}
                    />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {state.routes.map((route, index) => {
                            const { options } = descriptors[route.key];
                            const label = options.tabBarLabel ?? options.title ?? route.name;
                            const isFocused = state.index === index;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: "tabPress",
                                    target: route.key,
                                    canPreventDefault: true,
                                });
                                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
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
                                            height: 48,
                                            borderRadius: 18,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transform: [{ scale: pressed ? 0.985 : 1 }],
                                            overflow: "hidden",
                                        },
                                        isFocused
                                            ? {
                                                backgroundColor: "rgba(229,22,54,0.14)",
                                                borderWidth: 1,
                                                borderColor: "rgba(229,22,54,0.22)",
                                            }
                                            : {
                                                backgroundColor: "rgba(255,255,255,0.06)",
                                                borderWidth: 1,
                                                borderColor: "rgba(255,255,255,0.22)",
                                            },
                                    ]}
                                >
                                    {/* Subtle inner highlight to enhance “liquid” */}
                                    <View
                                        pointerEvents="none"
                                        style={{
                                            position: "absolute",
                                            top: -22,
                                            left: 0,
                                            right: 0,
                                            height: 40,
                                            backgroundColor: "rgba(255,255,255,0.35)",
                                            opacity: isFocused ? 0.35 : 0.22,
                                        }}
                                    />

                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: isFocused ? "900" : "800",
                                            letterSpacing: 0.2,
                                            color: isFocused ? "#0F172A" : "rgba(15,23,42,0.62)",
                                        }}
                                    >
                                        {String(label)}
                                    </Text>

                                    {/* iOS-ish active indicator */}
                                    <View
                                        style={{
                                            position: "absolute",
                                            bottom: 7,
                                            height: 3,
                                            width: 22,
                                            borderRadius: 999,
                                            backgroundColor: isFocused ? CFA_RED : "transparent",
                                            opacity: isFocused ? 1 : 0,
                                        }}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                </BlurView>
            </View>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

import { StyleSheet } from "react-native";

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
            <Tabs.Screen name="today" options={{ title: "Today", tabBarLabel: "Today" }} />
            <Tabs.Screen name="week" options={{ title: "Week", tabBarLabel: "Week" }} />
            <Tabs.Screen name="prep" options={{ title: "Prep List", tabBarLabel: "Prep" }} />
        </Tabs>
    );
}
