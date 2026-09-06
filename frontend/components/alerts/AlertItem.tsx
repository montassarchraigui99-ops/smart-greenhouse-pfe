import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { Alert, AlertSeverity } from '../../types/alert';
import { formatTimestamp, getSeverityColor, getSeverityBgColor } from '../../utils/formatters';

const severityIcons: Record<AlertSeverity, string> = {
    critical: 'alert-circle',
    warning: 'warning',
    info: 'information-circle',
};

interface AlertItemProps {
    alert: Alert;
}

export const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
    const color = getSeverityColor(alert.severity);
    const bgColor = getSeverityBgColor(alert.severity);

    return (
        <View style={[styles.container, { borderLeftColor: color }, !alert.read && styles.unread]}>
            <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                <Ionicons name={severityIcons[alert.severity] as any} size={20} color={color} />
            </View>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>{alert.title}</Text>
                    {!alert.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
                </View>
                <Text style={styles.message} numberOfLines={2}>
                    {alert.message}
                </Text>
                <Text style={styles.time}>{formatTimestamp(alert.timestamp)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    unread: {
        backgroundColor: '#FAFBFF',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: Spacing.sm,
    },
    message: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 6,
    },
    time: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
});
