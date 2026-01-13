import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";

// Keep splash visible until we say otherwise
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [queryClient] = useState(() => new QueryClient());
    const [appReady, setAppReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // ⏳ Put any startup work here later if needed:
                // - restore auth tokens
                // - load fonts
                // - warm API
                // await loadFonts();
            } finally {
                setAppReady(true);
                await SplashScreen.hideAsync();
            }
        }

        prepare();
    }, []);

    // Important: render nothing while splash is visible
    if (!appReady) return null;

    return (
        <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
    );
}
