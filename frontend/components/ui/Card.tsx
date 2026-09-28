import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, headerRight, style }) => {
    return (
        <View style={[styles.card, style]}>
            {(title || headerRight) && (
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        {title && <Text style={styles.title}>{title}</Text>}
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
                </View>
            )}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg, // 16px medium rounded corners
        padding: Spacing.xl, // 24px generous internal padding
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse, // Light diffused shadow
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    headerRight: {
        marginStart: Spacing.sm,
    },
});

export default Card;
