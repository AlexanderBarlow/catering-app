import { Tabs } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CFA_RED = "#E51636";

function FloatingTabBar({ state, descriptors, navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                position: "absolute",
                left: 14,
                right: 14,
                bottom: Math.max(insets.bottom, 10) + 10,
                padding: 8,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.92)",
                borderWidth: 1,
                borderColor: "rgba(15,23,42,0.08)",
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 14,
            }}
        >
            <View style={{ flexDirection: "row", gap: 8 }}>
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

                    const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={({ pressed }) => [
                                {
                                    flex: 1,
                                    height: 46,
                                    borderRadius: 16,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transform: [{ scale: pressed ? 0.98 : 1 }],
                                },
                                isFocused
                                    ? {
                                        backgroundColor: "rgba(229,22,54,0.10)",
                                        borderWidth: 1,
                                        borderColor: "rgba(229,22,54,0.18)",
                                    }
                                    : { backgroundColor: "transparent" },
                            ]}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: isFocused ? "900" : "800",
                                    letterSpacing: 0.2,
                                    color: isFocused ? "#0F172A" : "rgba(15,23,42,0.55)",
                                }}
                            >
                                {String(label)}
                            </Text>

                            {/* Bottom underline indicator (clean, modern) */}
                            <View
                                style={{
                                    position: "absolute",
                                    bottom: 7,
                                    height: 3,
                                    width: 22,
                                    borderRadius: 999,
                                    backgroundColor: isFocused ? CFA_RED : "transparent",
                                }}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <FloatingTabBar {...props} />}
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
