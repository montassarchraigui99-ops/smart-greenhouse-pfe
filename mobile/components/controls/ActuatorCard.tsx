import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Actuator } from '../../types/control';
import { formatTimestamp } from '../../utils/formatters';

interface ActuatorCardProps {
    actuator: Actuator;
    onToggle: (id: string) => void;
    isLoading?: boolean;
}

export const ActuatorCard: React.FC<ActuatorCardProps> = ({ actuator, onToggle, isLoading }) => {
    const iconMap: Record<string, string> = {
        water: 'water',
        cog: 'cog',
        fan: 'leaf',
        bulb: 'bulb',
    };

    return (
        <View style={[styles.card, actuator.isActive && styles.cardActive]}>
            <View style={styles.topRow}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: actuator.isActive ? `${Colors.primary}15` : Colors.background },
                    ]}
                >
                    <Ionicons
                        name={(iconMap[actuator.icon] || 'ellipse') as any}
                        size={24}
                        color={actuator.isActive ? Colors.primary : Colors.textSecondary}
                    />
                </View>
                <Switch
                    value={actuator.isActive}
                    onValueChange={() => onToggle(actuator.id)}
                    trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
                    thumbColor={actuator.isActive ? Colors.primary : '#f4f3f4'}
                    disabled={isLoading}
                />
            </View>

            <Text style={styles.name}>{actuator.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
                {actuator.description}
            </Text>

            <View style={styles.footer}>
                <View style={styles.modeContainer}>
                    <Ionicons
                        name={actuator.mode === 'auto' ? 'sync' : 'hand-left'}
                        size={12}
                        color={Colors.textSecondary}
                    />
                    <Text style={styles.modeText}>
                        {actuator.mode === 'auto' ? 'Automatic' : 'Manual'}
                    </Text>
                </View>
                <Text style={styles.timeText}>{formatTimestamp(actuator.lastUpdated)}</Text>
            </View>

            {actuator.isActive && <View style={styles.activeIndicator} />}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        width: '48%',
    },
    cardActive: {
        borderLeftColor: Colors.primary,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 16,
        marginBottom: Spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    modeText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    timeText: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    activeIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.success,
    },
});
