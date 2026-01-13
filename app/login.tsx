import { useMemo, useRef, useState } from "react";
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
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { login } from "../src/api/auth";
import { setAccessToken, setRefreshToken } from "../src/state/auth";
import { haptic } from "../src/utils/haptics";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";
const FIELD_BG = "rgba(229,22,54,0.06)";
const FIELD_BORDER = "rgba(229,22,54,0.18)";

// Glass rules (keeps things from looking “layer-y” / muddy)
const GLASS = {
  bgBlur: Platform.OS === "ios" ? 18 : 10,
  cardBlur: Platform.OS === "ios" ? 16 : 10, // stronger + cleaner
  badgeBlur: Platform.OS === "ios" ? 20 : 12,
  sheenTop: Platform.OS === "ios" ? 0.22 : 0.16, // Android sheen toned down
  cardTint:
    Platform.OS === "ios" ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.88)",
  cardSheen:
    Platform.OS === "ios" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)",
};

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 28,
  },

  // Background
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: BG },
  blob1: {
    position: "absolute",
    top: -90,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(229,22,54,0.13)",
  },
  blob2: {
    position: "absolute",
    top: 120,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(11,18,32,0.05)",
  },
  blob3: {
    position: "absolute",
    bottom: -120,
    left: 30,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: "rgba(229,22,54,0.09)",
  },
  // keep this subtle to avoid “dirty layers”
  sheenTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: `rgba(255,255,255,${GLASS.sheenTop})`,
  },

  // Header
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 30, fontWeight: "900", color: INK, letterSpacing: -0.2 },
  subtitle: { marginTop: 3, color: MUTED, fontWeight: "700" },

  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(229,22,54,0.18)",
    backgroundColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  badgeInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  badgeText: {
    color: CFA_RED,
    fontWeight: "950",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  badgeSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  infoBar: {
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255,255,255,0.58)"
        : "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    overflow: "hidden",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(229,22,54,0.10)",
    borderWidth: 1,
    borderColor: "rgba(229,22,54,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontWeight: "900", color: INK },
  infoSub: { marginTop: 2, fontWeight: "700", color: MUTED, fontSize: 12 },

  // Card
  cardWrap: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardPad: { padding: 16 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLASS.cardTint,
  },
  cardSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: GLASS.cardSheen,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: INK },
  cardDesc: { marginTop: 4, color: MUTED, fontWeight: "700" },

  // Fields
  fieldBlock: { marginTop: 14 },
  fieldLabel: { fontWeight: "900", color: INK, marginBottom: 8 },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    overflow: "hidden",
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  leftIconPad: { paddingLeft: 12, paddingRight: 6 },
  leftIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.40)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: INK,
    fontWeight: "800",
    fontSize: 15,
  },
  rightPad: { paddingRight: 10, paddingLeft: 6 },

  atPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.10)",
  },
  atText: { color: "rgba(11,18,32,0.70)", fontWeight: "900", fontSize: 12 },

  showBtnBase: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11,18,32,0.12)",
    backgroundColor: "rgba(255,255,255,0.40)",
  },
  showText: { color: "rgba(11,18,32,0.82)", fontWeight: "900", fontSize: 12 },

  // CTA
  cta: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  ctaSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ctaText: { color: "white", fontWeight: "950", fontSize: 15 },
  loadingText: { color: "white", fontWeight: "950" },

  helper: { marginTop: 12, fontSize: 12, color: MUTED, fontWeight: "700" },

  footer: { marginTop: 14, alignItems: "center" },
  footerText: { opacity: 0.7, fontSize: 12, color: "rgba(11,18,32,0.72)" },
});

function GlassBG() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={s.bg} />
      <View style={s.blob1} />
      <View style={s.blob2} />
      <View style={s.blob3} />
      <BlurView
        intensity={GLASS.bgBlur}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View style={s.sheenTop} />
    </View>
  );
}

function GlassCard({ children }) {
  // Key change: BlurView is the background layer; overlay tint sits ABOVE blur,
  // and we avoid stacking multiple random tints inside.
  return (
    <View style={s.cardWrap}>
      <BlurView
        intensity={GLASS.cardBlur}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={s.cardOverlay} />
      <View pointerEvents="none" style={s.cardSheen} />
      <View style={s.cardPad}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  secureTextEntry,
  rightAdornment,
  editable = true,
  accessibilityLabel,
  accessibilityHint,
  leftIcon,
}) {
  return (
    <View style={s.fieldBlock}>
      <Text style={s.fieldLabel}>{label}</Text>

      <View style={s.inputShell}>
        <View style={s.inputRow}>
          {leftIcon ? (
            <View style={s.leftIconPad}>
              <View style={s.leftIconBox}>
                <Ionicons
                  name={leftIcon}
                  size={16}
                  color="rgba(11,18,32,0.70)"
                />
              </View>
            </View>
          ) : null}

          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(11,18,32,0.35)"
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            editable={editable}
            autoComplete={autoComplete}
            textContentType={textContentType}
            secureTextEntry={secureTextEntry}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            style={s.input}
          />

          {rightAdornment ? (
            <View style={s.rightPad}>{rightAdornment}</View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
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

  const handleSubmitPress = () => {
    if (!canSubmit) {
      haptic?.warning?.();
      return;
    }
    handleLogin();
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.screen}>
        <GlassBG />

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: "center" }}>
            {/* Header */}
            <View style={{ marginBottom: 16 }}>
              <View style={s.headerRow}>
                <View
                  style={s.badge}
                  accessibilityRole="image"
                  accessibilityLabel="Catering Ops badge"
                >
                  <BlurView
                    intensity={GLASS.badgeBlur}
                    tint="light"
                    style={s.badgeInner}
                  >
                    <Text style={s.badgeText}>CFA</Text>
                  </BlurView>
                  <View pointerEvents="none" style={s.badgeSheen} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.title}>Catering Ops</Text>
                  <Text style={s.subtitle}>
                    Log in to view today’s catering lineup.
                  </Text>
                </View>
              </View>

              <View style={s.infoBar}>
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}>
                    <Ionicons name="sparkles" size={16} color={CFA_RED} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoTitle}>
                      Faster shifts, cleaner handoffs
                    </Text>
                    <Text style={s.infoSub}>
                      Prep, lineup, and ops tracking in one place.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Card */}
            <GlassCard>
              <Text style={s.cardTitle}>Team Sign-In</Text>
              <Text style={s.cardDesc}>
                Secure access for managers & catering leads.
              </Text>

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => {
                  haptic?.selection?.();
                  passwordRef.current?.focus?.();
                }}
                editable={!loading}
                accessibilityLabel="Email"
                accessibilityHint="Enter your email address"
                leftIcon="mail-outline"
                rightAdornment={
                  <View style={s.atPill} accessibilityElementsHidden>
                    <Text style={s.atText}>@</Text>
                  </View>
                }
              />

              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                inputRef={passwordRef}
                secureTextEntry={!showPass}
                editable={!loading}
                accessibilityLabel="Password"
                accessibilityHint="Enter your password"
                leftIcon="lock-closed-outline"
                rightAdornment={
                  <Pressable
                    onPress={toggleShowPassword}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPass ? "Hide password" : "Show password"
                    }
                    accessibilityHint="Toggles password visibility"
                    hitSlop={10}
                    style={({ pressed }) => [
                      s.showBtnBase,
                      {
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: loading ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={s.showText}>{showPass ? "HIDE" : "SHOW"}</Text>
                  </Pressable>
                }
              />

              <Pressable
                onPress={handleSubmitPress}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityHint="Signs you in to Catering Ops"
                style={({ pressed }) => [
                  s.cta,
                  {
                    backgroundColor: canSubmit
                      ? CFA_RED
                      : "rgba(229,22,54,0.35)",
                    borderColor: canSubmit
                      ? "rgba(229,22,54,0.38)"
                      : "transparent",
                    transform: [{ scale: pressed && canSubmit ? 0.985 : 1 }],
                  },
                  canSubmit
                    ? {
                        shadowColor: "#000",
                        shadowOpacity: pressed ? 0.08 : 0.12,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 12 },
                        elevation: pressed ? 8 : 11,
                      }
                    : null,
                ]}
              >
                <View pointerEvents="none" style={s.ctaSheen} />
                {loading ? (
                  <View style={s.ctaRow}>
                    <ActivityIndicator color="white" />
                    <Text style={s.loadingText}>Signing in…</Text>
                  </View>
                ) : (
                  <View style={s.ctaRow}>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={s.ctaText}>Sign In</Text>
                  </View>
                )}
              </Pressable>

              <Text style={s.helper}>
                Session is stored securely on this device.
              </Text>
            </GlassCard>

            <View style={s.footer}>
              <Text style={s.footerText}>
                API: {process.env.EXPO_PUBLIC_API_BASE}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
