import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

export function GlassHeaderBackground() {
    return (
        <View style={StyleSheet.absoluteFill}>
            <BlurView
                intensity={Platform.OS === "ios" ? 24 : 16}
                tint="light"
                style={StyleSheet.absoluteFill}
            />

            <View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor:
                            Platform.OS === "ios"
                                ? "rgba(255,255,255,0.72)"
                                : "rgba(255,255,255,0.88)",
                    },
                ]}
            />

            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: -20,
                    left: 0,
                    right: 0,
                    height: 40,
                    backgroundColor: "rgba(255,255,255,0.55)",
                    opacity: 0.35,
                }}
            />

            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: "rgba(15,23,42,0.12)",
                }}
            />
        </View>
    );
}
