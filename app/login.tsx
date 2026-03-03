// app/login.js (or wherever your LoginScreen lives)
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { login } from "../src/api/auth";
import { setAccessToken, setRefreshToken } from "../src/state/auth";
import { haptic } from "../src/utils/haptics";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const maxWidth = isLandscape ? 560 : 520;

  const passwordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  const toggleShowPassword = () => {
    haptic?.selection?.();
    setShowPass((v) => !v);
  };

  async function handleLogin() {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      haptic?.warning?.();
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      haptic?.medium?.();
      const res = await login({ email: cleanEmail, password });
      await setAccessToken(res.accessToken);
      await setRefreshToken(res.refreshToken);
      haptic?.success?.();
      router.replace("/(tabs)/today");
    } catch (e) {
      haptic?.error?.();
      Alert.alert("Login failed", e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Minimal background: one soft glow + subtle top sheen */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />
          <View style={s.glow} />
          <View style={s.topSheen} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            minHeight: height,
            paddingTop: Math.max(insets.top, 18),
            paddingBottom: Math.max(insets.bottom, 18),
            paddingHorizontal: 18,
            justifyContent: "center",
          }}
        >
          <View style={{ alignSelf: "center", width: "100%", maxWidth }}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.badge}>
                <Text style={s.badgeText}>CFA</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Catering Ops</Text>
                <Text style={s.subtitle}>
                  Sign in to view today’s catering lineup.
                </Text>
              </View>
            </View>

            {/* Card */}
            <View style={s.card}>
              {Platform.OS === "ios" ? (
                <BlurView
                  intensity={18}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View pointerEvents="none" style={s.cardBorder} />

              <Text style={s.cardTitle}>Team Sign-In</Text>
              <Text style={s.cardDesc}>Managers & catering leads only.</Text>

              {/* Email */}
              <Text style={s.label}>Email</Text>
              <View style={s.inputShell}>
                <View style={s.iconBox}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color="rgba(11,18,32,0.70)"
                  />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@email.com"
                  placeholderTextColor="rgba(11,18,32,0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                  editable={!loading}
                  onSubmitEditing={() => passwordRef.current?.focus?.()}
                  style={s.input}
                />
              </View>

              {/* Password */}
              <Text style={[s.label, { marginTop: 12 }]}>Password</Text>
              <View style={s.inputShell}>
                <View style={s.iconBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="rgba(11,18,32,0.70)"
                  />
                </View>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(11,18,32,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  secureTextEntry={!showPass}
                  returnKeyType="go"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  style={s.input}
                />
                <Pressable
                  onPress={toggleShowPassword}
                  disabled={loading}
                  hitSlop={10}
                  style={({ pressed }) => [
                    s.showBtn,
                    {
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: loading ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={s.showText}>{showPass ? "HIDE" : "SHOW"}</Text>
                </Pressable>
              </View>

              {/* CTA */}
              <Pressable
                onPress={() => {
                  if (!canSubmit) {
                    haptic?.warning?.();
                    return;
                  }
                  handleLogin();
                }}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  s.cta,
                  {
                    backgroundColor: canSubmit
                      ? CFA_RED
                      : "rgba(229,22,54,0.35)",
                    transform: [{ scale: pressed && canSubmit ? 0.985 : 1 }],
                    opacity: pressed && canSubmit ? 0.96 : 1,
                  },
                ]}
              >
                {loading ? (
                  <View style={s.ctaRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={s.ctaText}>Signing in…</Text>
                  </View>
                ) : (
                  <View style={s.ctaRow}>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={s.ctaText}>Sign In</Text>
                  </View>
                )}
              </Pressable>

              <Text style={s.helper}>
                Your session is stored on this device.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  glow: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(229,22,54,0.14)",
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(229,22,54,0.18)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  badgeText: { color: CFA_RED, fontWeight: "950", letterSpacing: 0.3 },

  title: { fontSize: 30, fontWeight: "950", color: INK, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, color: MUTED, fontWeight: "800", lineHeight: 18 },

  card: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255,255,255,0.62)"
        : "rgba(255,255,255,0.92)",
    borderWidth: Platform.OS === "ios" ? 0 : 1,
    borderColor: BORDER,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 26,
  },

  cardTitle: { fontSize: 16, fontWeight: "950", color: INK },
  cardDesc: { marginTop: 4, color: MUTED, fontWeight: "800" },

  label: { marginTop: 14, marginBottom: 8, fontWeight: "950", color: INK },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(229,22,54,0.18)",
    backgroundColor: "rgba(229,22,54,0.06)",
    paddingLeft: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 10,
    color: INK,
    fontWeight: "850",
    fontSize: 15,
  },

  showBtn: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.12)",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  showText: { color: "rgba(11,18,32,0.82)", fontWeight: "950", fontSize: 12 },

  cta: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(229,22,54,0.38)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 11,
  },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ctaText: { color: "white", fontWeight: "950", fontSize: 15 },

  helper: { marginTop: 12, fontSize: 12, color: MUTED, fontWeight: "800" },
});
