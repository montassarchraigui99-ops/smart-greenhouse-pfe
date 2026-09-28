import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';

export type StatusType = 'healthy' | 'attention' | 'critical' | 'info' | 'normal' | 'warning';

interface StatusBadgeProps {
    status?: StatusType;
    label?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
    bgColor?: string;
    size?: 'small' | 'medium' | 'large';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status = 'healthy',
    label,
    icon,
    color: customColor,
    bgColor: customBgColor,
    size = 'medium',
}) => {
    // Determine tone, icon, and fallback label based on Living Intelligence specs
    let resolvedColor = Colors.secondary;
    let resolvedBg = Colors.successBg;
    let resolvedIcon: keyof typeof Ionicons.glyphMap = 'checkmark-circle';
    let defaultLabel = 'Healthy';

    if (status === 'attention' || status === 'warning') {
        resolvedColor = Colors.warning;
        resolvedBg = Colors.warningBg;
        resolvedIcon = 'alert-circle';
        defaultLabel = 'Attention';
    } else if (status === 'critical') {
        resolvedColor = Colors.danger;
        resolvedBg = Colors.criticalBg;
        resolvedIcon = 'close-circle';
        defaultLabel = 'Critical';
    } else if (status === 'info') {
        resolvedColor = Colors.info;
        resolvedBg = Colors.infoBg;
        resolvedIcon = 'information-circle';
        defaultLabel = 'Info';
    }

    const finalColor = customColor || resolvedColor;
    const finalBg = customBgColor || resolvedBg;
    const finalIcon = icon || resolvedIcon;
    const displayText = label || defaultLabel;

    const iconSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;
    const isSmall = size === 'small';
    const isLarge = size === 'large';

    return (
        <View
            style={[
                styles.badge,
                isSmall && styles.badgeSmall,
                isLarge && styles.badgeLarge,
                { backgroundColor: finalBg, borderColor: `${finalColor}30` },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${displayText} status`}
        >
            <Ionicons name={finalIcon} size={iconSize} color={finalColor} style={styles.icon} />
            <Text
                style={[
                    styles.text,
                    isSmall && styles.textSmall,
                    isLarge && styles.textLarge,
                    { color: finalColor },
                ]}
            >
                {displayText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeLarge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    icon: {
        marginEnd: Spacing.xs + 2,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
        letterSpacing: 0.2,
    },
    textSmall: {
        fontSize: 10.5,
    },
    textLarge: {
        fontSize: 13.5,
    },
});

export default StatusBadge;
