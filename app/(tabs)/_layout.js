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
            style={{
                position: "absolute",
                left: 28, // narrower (more iOS dock)
                right: 28,
                bottom,
            }}
        >
            {/* Outer shell for shadow */}
            <View
                style={{
                    borderRadius: 32, // rounder shell
                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowRadius: 26,
                    shadowOffset: { width: 0, height: 14 },
                    elevation: 20,
                    overflow: "hidden",
                }}
            >
                {/* Native iOS blur */}
                <BlurView
                    intensity={Platform.OS === "ios" ? 42 : 22}
                    tint="light"
                    style={{
                        padding: 6, // tighter padding (less wide/airy)
                        borderRadius: 32,
                    }}
                >
                    {/* Frost overlay to get the “liquid glass” milky look */}
                    <View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                backgroundColor:
                                    Platform.OS === "ios"
                                        ? "rgba(255,255,255,0.16)"
                                        : "rgba(255,255,255,0.28)",
                            },
                        ]}
                    />

                    {/* Glass border */}
                    <View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                borderRadius: 32,
                                borderWidth: 1.15,
                                borderColor: "rgba(255,255,255,0.68)",
                            },
                        ]}
                    />

                    {/* Inner stroke for definition */}
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

                    {/* Top highlight band (more iOS “glass”) */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: -18,
                            left: 0,
                            right: 0,
                            height: 44,
                            backgroundColor: "rgba(255,255,255,0.60)",
                            opacity: 0.30,
                        }}
                    />

                    <View style={{ flexDirection: "row", gap: 6 }}>
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
                                            height: 46, // slightly shorter
                                            borderRadius: 22, // more pill-like
                                            alignItems: "center",
                                            justifyContent: "center",
                                            paddingHorizontal: 6, // tighter label feel
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
                                            opacity: isFocused ? 0.30 : 0.18,
                                        }}
                                    />

                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: isFocused ? "900" : "800",
                                            letterSpacing: 0.12, // less spaced
                                            color: isFocused ? INK : "rgba(15,23,42,0.62)",
                                        }}
                                        numberOfLines={1}
                                    >
                                        {String(label)}
                                    </Text>

                                    {/* SINGLE active indicator (glow via shadow, no duplicate pills) */}
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
            <Tabs.Screen name="today" options={{ title: "Today", tabBarLabel: "Today" }} />
            <Tabs.Screen name="week" options={{ title: "Week", tabBarLabel: "Week" }} />
            <Tabs.Screen name="prep" options={{ title: "Prep List", tabBarLabel: "Prep" }} />
        </Tabs>
    );
}
