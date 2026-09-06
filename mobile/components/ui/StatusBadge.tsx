import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, Spacing } from '../../constants/theme';

interface StatusBadgeProps {
    label: string;
    color: string;
    bgColor?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, color, bgColor }) => (
    <View style={[styles.badge, { backgroundColor: bgColor || `${color}18` }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.round,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: Spacing.xs,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
