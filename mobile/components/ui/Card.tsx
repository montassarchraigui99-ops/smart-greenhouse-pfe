import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, title, style }) => {
    return (
        <View style={[styles.card, style]}>
            {title && (
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                </View>
            )}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    header: {
        marginBottom: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
});
