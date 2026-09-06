/**
 * Rôle : Lead UX/UI React Native Developer
 * Fichier : components/AnalyticsView.tsx
 * Objectif : Tableau de bord de télémétrie fluide et interactif (Design Cyber-Agricole).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, ScrollView, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { fetchTelemetry, TelemetryData } from '../services/api';
import CyberControlPanel from './CyberControlPanel';

const { width } = Dimensions.get('window');

// Format adapté spécifiquement pour react-native-gifted-charts
interface ChartDataPoint {
    value: number;
    label: string;
    rawDate: Date; // Gardé en mémoire pour le Tooltip interactif
}

export default function AnalyticsView() {
    const [temperatureData, setTemperatureData] = useState<ChartDataPoint[]>([]);
    const [humidityData, setHumidityData] = useState<ChartDataPoint[]>([]);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const loadSensorData = async () => {
        try {
            const [tempRaw, humRaw] = await Promise.all([
                fetchTelemetry('ambient_temperature'),
                fetchTelemetry('air_humidity')
            ]);

            const formatToChart = (item: TelemetryData): ChartDataPoint => {
                const date = new Date(item.timestamp);
                // Label formaté (ex: 14:05) pour l'axe X
                const timeLabel = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                return {
                    value: item.value,
                    label: timeLabel,
                    rawDate: date,
                };
            };

            setTemperatureData(tempRaw.map(formatToChart));
            setHumidityData(humRaw.map(formatToChart));
            setLastSync(new Date());
        } catch (error) {
            console.error('[Analytics] Erreur UX de chargement des capteurs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSensorData();
        const intervalId = setInterval(loadSensorData, 10000);
        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0cc25b" />
                <Text style={styles.loadingText}>Synchronisation CyberCortex...</Text>
            </View>
        );
    }

    // Configuration commune pour le Pointeur Interactif (Tooltip)
    const renderTooltip = (item: any, color: string, unit: string) => {
        if (!item || !item[0]) return null;
        return (
            <View style={[styles.tooltipContainer, { borderColor: color }]}>
                <Text style={styles.tooltipValue}>{item[0].value} {unit}</Text>
                <Text style={styles.tooltipTime}>{item[0].label}</Text>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.header}>CyberCortex <Text style={{ color: '#0cc25b' }}>LIVE</Text></Text>
            <Text style={styles.syncText}>
                Dernière Sync: {lastSync ? lastSync.toLocaleTimeString() : 'N/A'}
            </Text>

            {/* ==========================================
          MISSION 1, 2 & 3 : PANNEAU DE CONTRÔLE GAMIFIÉ
          ========================================== */}
            <CyberControlPanel />

            {/* ==========================================
          GRAPHIQUE TEMPÉRATURE (Dégradé Chaud)
          ========================================== */}
            <View style={styles.chartContainer}>
                <Text style={styles.title}>Température Globale (°C)</Text>

                {temperatureData.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Aucune donnée disponible</Text>
                    </View>
                ) : (
                    <View style={styles.graphWrapper}>
                        <LineChart
                            data={temperatureData}
                            width={width - 70}
                            height={160}
                            // Design fluide
                            curved={true}
                            isAnimated={true}
                            animationDuration={1200}
                            thickness={3}
                            // Stylisation : Tons chauds
                            color="#ff4757"
                            startFillColor="#ff6b81"
                            endFillColor="#ff4757"
                            startOpacity={0.4}
                            endOpacity={0.05}
                            hideDataPoints={Platform.OS === 'web'}
                            // Curseurs interactifs
                            pointerConfig={Platform.OS === 'web' ? undefined : {
                                pointerStripUptoDataPoint: true,
                                pointerStripColor: 'rgba(255, 71, 87, 0.5)',
                                pointerStripWidth: 2,
                                strokeDashArray: [2, 5],
                                pointerColor: '#ff4757',
                                radius: 6,
                                pointerLabelWidth: 80,
                                pointerLabelHeight: 60,
                                activatePointersOnLongPress: true,
                                autoAdjustPointerLabelPosition: true,
                                pointerLabelComponent: (items: any) => renderTooltip(items, '#ff4757', '°C'),
                            }}
                            // Axes visuels
                            hideRules={true}
                            yAxisColor="#34495e"
                            xAxisColor="#34495e"
                            yAxisTextStyle={{ color: '#7f8c8d', fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: '#7f8c8d', fontSize: 10, width: 40 }}
                            initialSpacing={10}
                        />
                    </View>
                )}
            </View>

            {/* ==========================================
          GRAPHIQUE HUMIDITÉ (Dégradé Froid)
          ========================================== */}
            <View style={styles.chartContainer}>
                <Text style={styles.title}>Humidité Air (%)</Text>

                {humidityData.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Aucune donnée disponible</Text>
                    </View>
                ) : (
                    <View style={styles.graphWrapper}>
                        <LineChart
                            data={humidityData}
                            width={width - 70}
                            height={160}
                            // Design fluide
                            curved={true}
                            isAnimated={true}
                            animationDuration={1200}
                            thickness={3}
                            // Stylisation : Tons froids
                            color="#1e90ff"
                            startFillColor="#70a1ff"
                            endFillColor="#1e90ff"
                            startOpacity={0.4}
                            endOpacity={0.05}
                            hideDataPoints={Platform.OS === 'web'}
                            // Curseurs interactifs
                            pointerConfig={Platform.OS === 'web' ? undefined : {
                                pointerStripUptoDataPoint: true,
                                pointerStripColor: 'rgba(30, 144, 255, 0.5)',
                                pointerStripWidth: 2,
                                strokeDashArray: [2, 5],
                                pointerColor: '#1e90ff',
                                radius: 6,
                                pointerLabelWidth: 80,
                                pointerLabelHeight: 60,
                                activatePointersOnLongPress: true,
                                autoAdjustPointerLabelPosition: true,
                                pointerLabelComponent: (items: any) => renderTooltip(items, '#1e90ff', '%'),
                            }}
                            // Axes visuels
                            hideRules={true}
                            yAxisColor="#34495e"
                            xAxisColor="#34495e"
                            yAxisTextStyle={{ color: '#7f8c8d', fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: '#7f8c8d', fontSize: 10, width: 40 }}
                            initialSpacing={10}
                        />
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f4f7f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#333', fontWeight: '500' },
    header: { fontSize: 24, fontWeight: '900', marginBottom: 2, color: '#1a1a1a' },
    syncText: { fontSize: 13, color: '#95a5a6', marginBottom: 25 },

    chartContainer: {
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 16,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }
    },
    title: { fontSize: 17, fontWeight: '700', color: '#2d3436', marginBottom: 15 },

    graphWrapper: { marginLeft: -10 },

    emptyState: { height: 160, justifyContent: 'center', alignItems: 'center' },
    emptyStateText: { color: '#bdc3c7', fontStyle: 'italic' },

    tooltipContainer: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5,
    },
    tooltipValue: { fontSize: 16, fontWeight: 'bold', color: '#2d3436' },
    tooltipTime: { fontSize: 11, color: '#7f8c8d', marginTop: 2 }
});
