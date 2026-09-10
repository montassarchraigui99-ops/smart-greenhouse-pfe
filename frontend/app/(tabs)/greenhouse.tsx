import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SensorCard } from '../../components/sensors/SensorCard';
import { useGreenhouse } from '../../hooks/useSensors';

export default function GreenhouseScreen() {
    const router = useRouter();
    const { data: greenhouse } = useGreenhouse();

    if (!greenhouse) return null;

    const infoItems = [
        { icon: 'location', label: 'Location', value: 'Zone A, North Wing' },
        { icon: 'resize', label: 'Area', value: '250 m²' },
        { icon: 'leaf', label: 'Crop', value: 'Tomatoes (Cherry)' },
        { icon: 'calendar', label: 'Growth Stage', value: 'Fruiting (Week 8)' },
        { icon: 'hardware-chip', label: 'Controller', value: 'ESP32-S3' },
        { icon: 'wifi', label: 'Connectivity', value: 'MQTT / Wi-Fi' },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Greenhouse Card */}
            <View style={styles.mainCard}>
                <View style={styles.mainHeader}>
                    <View style={styles.greenhouseIcon}>
                        <Ionicons name="leaf" size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.mainInfo}>
                        <Text style={styles.mainTitle}>{greenhouse.name}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: greenhouse.isOnline ? Colors.success : Colors.critical }]} />
                            <Text style={styles.statusText}>
                                {greenhouse.isOnline ? 'Online — Connected' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.healthSection}>
                    <View style={styles.healthRow}>
                        <Text style={styles.healthLabel}>Plant Health</Text>
                        <Text style={[styles.healthValue, { color: Colors.primary }]}>{greenhouse.plantHealth}%</Text>
                    </View>
                    <ProgressBar progress={greenhouse.plantHealth} color={Colors.primary} height={8} />
                </View>
            </View>

            {/* Info Grid */}
            <Text style={styles.sectionTitle}>Greenhouse Details</Text>
            <View style={styles.infoGrid}>
                {infoItems.map((item, index) => (
                    <View key={index} style={styles.infoCard}>
                        <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
                        <Text style={styles.infoLabel}>{item.label}</Text>
                        <Text style={styles.infoValue}>{item.value}</Text>
                    </View>
                ))}
            </View>

            {/* Digital Twin Link */}
            <TouchableOpacity
                style={styles.twinButton}
                onPress={() => router.push('/digital-twin')}
            >
                <Ionicons name="cube" size={24} color={Colors.primary} />
                <View style={styles.twinButtonText}>
                    <Text style={styles.twinTitle}>3D Digital Twin</Text>
                    <Text style={styles.twinSubtext}>View the greenhouse in 3D</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Sensor Readings */}
            <Text style={styles.sectionTitle}>Current Readings</Text>
            <View style={styles.sensorGrid}>
                {greenhouse.sensors.map((sensor: any) => (
                    <SensorCard key={sensor.id} reading={sensor} />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    mainCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    mainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    greenhouseIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.lg,
    },
    mainInfo: {
        flex: 1,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    healthSection: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    healthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    healthLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    healthValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    infoCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '600',
        marginTop: 2,
    },
    twinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    twinButtonText: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    twinTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    twinSubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    sensorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
});
