import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { login } from "../src/api/auth";
import { setAccessToken, setRefreshToken } from "../src/state/auth";

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert("Missing info", "Enter your email and password.");
            return;
        }

        setLoading(true);
        try {
            const res = await login({ email: email.trim(), password });

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
        <View style={{ flex: 1, padding: 18, justifyContent: "center", gap: 12, backgroundColor: "#F6F7FB" }}>
            <Text style={{ fontSize: 28, fontWeight: "900" }}>Catering Ops</Text>
            <Text style={{ opacity: 0.7, marginBottom: 10 }}>
                Sign in to manage today’s and this week’s catering.
            </Text>

            <View style={{ gap: 10 }}>
                <View>
                    <Text style={{ fontWeight: "800", marginBottom: 6 }}>Email</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="admin@catering.local"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        style={{
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.15)",
                            borderRadius: 14,
                            backgroundColor: "white",
                        }}
                    />
                </View>

                <View>
                    <Text style={{ fontWeight: "800", marginBottom: 6 }}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        style={{
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.15)",
                            borderRadius: 14,
                            backgroundColor: "white",
                        }}
                    />
                </View>
            </View>

            <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={{
                    backgroundColor: "black",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    marginTop: 6,
                    opacity: loading ? 0.75 : 1,
                }}
            >
                {loading ? <ActivityIndicator /> : <Text style={{ color: "white", fontWeight: "900" }}>Sign In</Text>}
            </Pressable>

            <Text style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
                API: {process.env.EXPO_PUBLIC_API_BASE}
            </Text>
        </View>
    );
}
