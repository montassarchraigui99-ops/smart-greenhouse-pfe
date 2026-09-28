import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../../constants/theme';
import { StatusBadge, StatusType } from './StatusBadge';

export interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    status?: StatusType;
    statusLabel?: string;
    subtext?: string;
    progress?: number; // 0 to 100
    accentColor?: string;
    style?: ViewStyle;
    onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    unit,
    icon,
    status,
    statusLabel,
    subtext,
    progress,
    accentColor,
    style,
    onPress,
}) => {
    const cardContent = (
        <View style={[styles.card, style]}>
            {/* Top Label & Status Header */}
            <View style={styles.header}>
                <View style={styles.labelRow}>
                    {icon && (
                        <View style={[styles.iconBox, { backgroundColor: accentColor ? `${accentColor}12` : `${Colors.primary}12` }]}>
                            <Ionicons name={icon} size={15} color={accentColor || Colors.primary} />
                        </View>
                    )}
                    <Text style={styles.label}>{label.toUpperCase()}</Text>
                </View>
                {status && <StatusBadge status={status} label={statusLabel} />}
            </View>

            {/* Large Prominent Primary Value */}
            <View style={styles.valueRow}>
                <Text style={styles.value}>
                    {value}
                    {unit ? <Text style={styles.unit}> {unit}</Text> : null}
                </Text>
            </View>

            {/* Optional Progress or Subtext (Minimal, no inner boxes) */}
            {(progress !== undefined || subtext) && (
                <View style={styles.footer}>
                    {progress !== undefined && (
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min(100, Math.max(0, progress))}%`,
                                        backgroundColor: accentColor || Colors.secondary,
                                    },
                                ]}
                            />
                        </View>
                    )}
                    {subtext && <Text style={styles.subtext}>{subtext}</Text>}
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [pressed && styles.pressedState]}
                accessibilityRole="button"
            >
                {cardContent}
            </Pressable>
        );
    }

    return cardContent;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg, // 16px
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg, // 20px
        ...Shadows.diffuse,
    },
    pressedState: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs + 2,
    },
    iconBox: {
        width: 26,
        height: 26,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
        color: Colors.textMuted,
        letterSpacing: 0.6,
    },
    valueRow: {
        marginVertical: Spacing.xs,
    },
    value: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.monoFont,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
    },
    unit: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    footer: {
        marginTop: Spacing.sm,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.round,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: BorderRadius.round,
    },
    subtext: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: Spacing.xs,
    },
});

export default MetricCard;
