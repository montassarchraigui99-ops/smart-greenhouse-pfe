import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SensorReading, SensorType } from '../../types/sensor';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ProgressBar } from '../ui/ProgressBar';
import { formatTimestamp, formatSensorValue } from '../../utils/formatters';

const sensorIcons: Record<SensorType, any> = {
    temperature: 'thermometer',
    humidity: 'water',
    soil_moisture: 'leaf',
    light: 'sunny',
    ph: 'flask',
    ec: 'flash',
    water_level: 'water',
};

interface SensorCardProps {
    reading: SensorReading;
}

export const SensorCard: React.FC<SensorCardProps> = ({ reading }) => {
    let progress = 0;
    if (reading.type === 'temperature') progress = (reading.value / 50) * 100;
    else if (reading.type === 'humidity' || reading.type === 'soil_moisture') progress = reading.value;
    else if (reading.type === 'light') progress = (reading.value / 100000) * 100;
    else if (reading.type === 'ph') progress = (reading.value / 14) * 100;
    else if (reading.type === 'ec') progress = (reading.value / 5) * 100;

    const isCritical = reading.status === 'critical';
    const isWarning = reading.status === 'warning';

    // Status visual indicator
    let statusColor = Colors.success;
    if (isCritical) statusColor = Colors.critical;
    if (isWarning) statusColor = Colors.warning;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Ionicons name={sensorIcons[reading.type] || 'hardware-chip'} size={16} color={Colors.textSecondary} />
                    <Text style={styles.typeLabel}>
                        {reading.type.replace('_', ' ').toUpperCase()}
                    </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>

            <View style={styles.valueContainer}>
                <Text style={styles.value}>
                    {formatSensorValue(reading.value, reading.unit)}
                </Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.progressContainer}>
                    <ProgressBar
                        progress={progress}
                        color={statusColor}
                        backgroundColor={Colors.background}
                        height={4}
                    />
                </View>
                <Text style={styles.timeLabel}>{formatTimestamp(reading.timestamp)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, // Squared, professional corners
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginLeft: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    valueContainer: {
        marginBottom: Spacing.md,
    },
    value: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
    },
    footer: {
        justifyContent: 'flex-start',
    },
    progressContainer: {
        marginBottom: Spacing.sm,
    },
    timeLabel: {
        fontSize: 9,
        color: Colors.textSecondary,
        textAlign: 'right',
    },
});
