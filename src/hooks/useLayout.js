// src/hooks/useLayout.js
import { useWindowDimensions } from "react-native";

export function useLayout() {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    // tweak these as you like
    const isTablet = Math.min(width, height) >= 768;

    // layout tiers (simple + practical)
    const density = isTablet ? "comfortable" : "compact";
    const columns = isLandscape ? (isTablet ? 3 : 2) : 1;

    return { width, height, isLandscape, isTablet, density, columns };
}
