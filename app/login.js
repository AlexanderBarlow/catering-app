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
} from "react-native";
import { useRouter } from "expo-router";
import { login } from "../src/api/auth";
import { setAccessToken, setRefreshToken } from "../src/state/auth";

const CFA_RED = "#E51636";
const BG = "#FFF6F2";        // warm CFA cream
const CARD = "#FFFFFF";
const INK = "#0B1220";
const MUTED = "rgba(11,18,32,0.62)";
const BORDER = "rgba(11,18,32,0.10)";
const FIELD_BG = "rgba(229,22,54,0.06)";
const FIELD_BORDER = "rgba(229,22,54,0.18)";

function InputShell({ children }) {
    return (
        <View
            style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: FIELD_BORDER,
                backgroundColor: FIELD_BG,
                overflow: "hidden",
            }}
        >
            {children}
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
}) {
    return (
        <View style={{ marginTop: 14 }}>
            <Text style={{ fontWeight: "900", color: INK, marginBottom: 8 }}>
                {label}
            </Text>

            <InputShell>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                        style={{
                            flex: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 13,
                            color: INK,
                            fontWeight: "800",
                            fontSize: 15,
                        }}
                    />

                    {rightAdornment ? (
                        <View style={{ paddingRight: 10, paddingLeft: 6 }}>
                            {rightAdornment}
                        </View>
                    ) : null}
                </View>
            </InputShell>
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

    const canSubmit = useMemo(() => {
        return email.trim().length > 0 && password.length > 0 && !loading;
    }, [email, password, loading]);

    async function handleLogin() {
        const cleanEmail = email.trim();

        if (!cleanEmail || !password) {
            Alert.alert("Missing info", "Enter your email and password.");
            return;
        }

        setLoading(true);
        try {
            const res = await login({ email: cleanEmail, password });
            await setAccessToken(res.accessToken);
            await setRefreshToken(res.refreshToken);
            router.replace("/(tabs)/today");
        } catch (e) {
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
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 18,
                    paddingTop: 24,
                    paddingBottom: 28,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ flex: 1, justifyContent: "center" }}>
                    {/* Minimal modern brand */}
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 18,
                                    backgroundColor: CFA_RED,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    shadowColor: "#000",
                                    shadowOpacity: 0.12,
                                    shadowRadius: 18,
                                    shadowOffset: { width: 0, height: 12 },
                                    elevation: 10,
                                }}
                                accessibilityRole="image"
                                accessibilityLabel="Catering Ops badge"
                            >
                                <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>
                                    CFA
                                </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 30, fontWeight: "900", color: INK }}>
                                    Catering Ops
                                </Text>
                                <Text style={{ marginTop: 2, color: MUTED, fontWeight: "700" }}>
                                    Log in to view today’s catering lineup.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Card */}
                    <View
                        style={{
                            backgroundColor: CARD,
                            borderRadius: 24,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: BORDER,
                            shadowColor: "#000",
                            shadowOpacity: 0.08,
                            shadowRadius: 18,
                            shadowOffset: { width: 0, height: 10 },
                            elevation: 10,
                        }}
                        accessibilityLabel="Login form"
                    >
                        <Text style={{ fontSize: 16, fontWeight: "900", color: INK }}>
                            Team Sign-In
                        </Text>
                        <Text style={{ marginTop: 4, color: MUTED, fontWeight: "700" }}>
                            Secure access for managers & catering leads.
                        </Text>

                        <Field
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="admin@catering.local"
                            keyboardType="email-address"
                            autoComplete="email"
                            textContentType="username"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus?.()}
                            editable={!loading}
                            accessibilityLabel="Email"
                            accessibilityHint="Enter your email address"
                            rightAdornment={
                                <View
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        borderRadius: 14,
                                        backgroundColor: "rgba(11,18,32,0.06)",
                                        borderWidth: 1,
                                        borderColor: "rgba(11,18,32,0.10)",
                                    }}
                                    accessibilityElementsHidden
                                >
                                    <Text style={{ color: "rgba(11,18,32,0.70)", fontWeight: "900", fontSize: 12 }}>
                                        @
                                    </Text>
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
                            rightAdornment={
                                <Pressable
                                    onPress={() => setShowPass((s) => !s)}
                                    disabled={loading}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPass ? "Hide password" : "Show password"}
                                    accessibilityHint="Toggles password visibility"
                                    hitSlop={10}
                                    style={({ pressed }) => [
                                        {
                                            paddingHorizontal: 12,
                                            paddingVertical: 9,
                                            borderRadius: 14,
                                            backgroundColor: pressed ? "rgba(11,18,32,0.10)" : "rgba(11,18,32,0.06)",
                                            borderWidth: 1,
                                            borderColor: "rgba(11,18,32,0.12)",
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                            opacity: loading ? 0.7 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={{ color: "rgba(11,18,32,0.82)", fontWeight: "900", fontSize: 12 }}>
                                        {showPass ? "HIDE" : "SHOW"}
                                    </Text>
                                </Pressable>
                            }
                        />

                        {/* Button */}
                        <Pressable
                            onPress={handleLogin}
                            disabled={!canSubmit}
                            accessibilityRole="button"
                            accessibilityLabel="Sign in"
                            accessibilityHint="Signs you in to Catering Ops"
                            style={({ pressed }) => [
                                {
                                    marginTop: 16,
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: canSubmit ? CFA_RED : "rgba(229,22,54,0.35)",
                                    borderWidth: 1,
                                    borderColor: canSubmit ? "rgba(229,22,54,0.38)" : "transparent",
                                    transform: [{ scale: pressed && canSubmit ? 0.985 : 1 }],
                                },
                                canSubmit
                                    ? {
                                        shadowColor: "#000",
                                        shadowOpacity: pressed ? 0.06 : 0.12,
                                        shadowRadius: 18,
                                        shadowOffset: { width: 0, height: 12 },
                                        elevation: pressed ? 8 : 12,
                                    }
                                    : null,
                            ]}
                        >
                            {loading ? (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <ActivityIndicator color="white" />
                                    <Text style={{ color: "white", fontWeight: "900" }}>Signing in…</Text>
                                </View>
                            ) : (
                                <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                                    Sign In
                                </Text>
                            )}
                        </Pressable>

                        <Text style={{ marginTop: 12, fontSize: 12, color: MUTED, fontWeight: "700" }}>
                            Session is stored securely on this device.
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={{ marginTop: 14, alignItems: "center" }}>
                        <Text style={{ opacity: 0.7, fontSize: 12, color: "rgba(11,18,32,0.72)" }}>
                            API: {process.env.EXPO_PUBLIC_API_BASE}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
