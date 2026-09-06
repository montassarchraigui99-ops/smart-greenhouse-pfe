export const Colors = {
    // Brand Core: Dark Agricultural Green
    primary: '#1B5E20', // Dark Green
    primaryLight: '#4CAF50',
    primaryDark: '#0A3D14',

    // UI Elements (Neutral & Clean)
    background: '#F9FAFB', // Gray 50 - Very clean, neutral off-white
    surface: '#FFFFFF',    // Clean White

    // Clean Borders
    glassBackground: 'transparent',
    glassBorder: '#E5E7EB',

    // Highly Legible Typography
    text: '#111827', // Gray 900
    textSecondary: '#6B7280', // Gray 500
    textInverse: '#FFFFFF',
    border: '#E5E7EB', // Gray 200

    // Enhanced Semantic Colors (Professional tones)
    success: '#059669',
    successBg: '#ECFDF5',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    critical: '#DC2626',
    criticalBg: '#FEF2F2',
    info: '#2563EB',
    infoBg: '#EFF6FF',

    // Specific Sensor Accents (Subtle and readable)
    temperature: '#E11D48',
    humidity: '#0284C7',
    soilMoisture: '#92400E',
    light: '#CA8A04',
    ph: '#7C3AED',
    ec: '#0D9488',
    waterLevel: '#2563EB',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 12, // Reduced for a more structured, enterprise look
    xl: 16,
    round: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
};
