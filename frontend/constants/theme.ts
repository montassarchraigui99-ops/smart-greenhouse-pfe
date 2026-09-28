/**
 * "Living Intelligence" Design System
 * Smart Agri Greenhouse (CyberCortex ERP)
 */

import { Platform } from 'react-native';

export const Colors = {
    // 1. Mandatory Living Intelligence Color System
    primary: '#1F7A46',      // Deep Botanical Green - Active states, primary actions
    secondary: '#4CAF73',    // Fresh Green - Healthy states
    background: '#F7F9F6',   // Warm Off-White - Main app background
    surface: '#FFFFFF',      // Pure White - Cards, modals, floating elements
    textDark: '#17221B',     // Primary typography
    textMuted: '#66736A',    // Secondary labels, empty states
    border: '#E3E9E4',       // Subtle dividers
    warning: '#D99A32',      // Attention states
    danger: '#D95C5C',       // Critical alerts
    info: '#4D86C7',         // Informational, AI insights

    // Aliases for seamless backward compatibility
    text: '#17221B',
    textSecondary: '#66736A',
    textInverse: '#FFFFFF',
    success: '#4CAF73',
    successBg: '#EAF6EE',
    warningBg: '#FDF6EA',
    critical: '#D95C5C',
    criticalBg: '#FDEEEE',
    infoBg: '#EDF3F9',
    glassBackground: 'rgba(255, 255, 255, 0.88)',
    glassBorder: '#E3E9E4',

    // Specific Sensor & Domain Tones (Subtle, organic)
    temperature: '#E06D53',
    humidity: '#4D86C7',
    soilMoisture: '#8A6A48',
    light: '#D99A32',
    ph: '#7C3AED',
    ec: '#0D9488',
    waterLevel: '#4D86C7',
};

const primaryFontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}) as string;

const monoFontFamily = Platform.select({
    ios: 'Courier',
    android: 'monospace',
    web: '"JetBrains Mono", "Fira Code", monospace'
}) as string;

export const Typography = {
    primaryFont: primaryFontFamily,
    monoFont: monoFontFamily,
    sans: primaryFontFamily,
    mono: monoFontFamily,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 9999,
    pill: 9999,
};

export const Shadows = {
    // Extremely light, diffused shadows avoiding harsh drop shadows
    subtle: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    diffuse: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    float: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    // Backward compatibility aliases
    sm: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    md: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 14,
        elevation: 2,
    },
    lg: {
        shadowColor: '#17221B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 22,
        elevation: 4,
    },
};

export const LivingTheme = {
    colors: Colors,
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
};

export default LivingTheme;
