/**
 * Rôle : Lead Systems Architect & Principal React Native Performance Engineer
 * Fichier : components/AnalyticsView.tsx
 * Système : CyberCortex ERP (Tableau de bord Analytique & Télémétrie Multi-Flux)
 * Objectif : Mise à l'échelle pour 4 flux (Température, Humidité, Photopériode, Consommation d'eau)
 *            avec chargement parallèle Promise.all, composant de carte mémoïsé et défilement fluide.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { fetchTelemetry, TelemetryData, Timeframe } from '../services/api';
import CyberControlPanel from './CyberControlPanel';
import { useTranslation } from '../i18n';

// Options du sélecteur temporel
export const TIMEFRAME_OPTIONS: { id: Timeframe; label: string }[] = [
    { id: 'live', label: 'En direct' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7 Jours' },
    { id: '30d', label: '30 Jours' },
];

// Structure de données enrichie pour react-native-gifted-charts
export interface ChartDataPoint {
    value: number;
    label: string;
    rawDate: Date;
    y: number;
    x: string;
}

// ============================================================================
// SOUS-COMPOSANT MÉMOÏSÉ : TelemetryChartCard
// Évite les re-renders inutiles sur l'UI Thread mobile lors des flux temps réel
// ============================================================================
interface TelemetryChartCardProps {
    title: string;
    unit: string;
    data: ChartDataPoint[];
    latestValue: number | null | undefined;
    lineColor: string;
    startFillColor: string;
    endFillColor?: string;
    pointerColor: string;
    chartWidth: number;
    timeframe: Timeframe;
    emptyText?: string;
    renderTooltip: (items: any, unit: string) => React.ReactNode;
}

const TelemetryChartCard = React.memo(function TelemetryChartCard({
    title,
    unit,
    data,
    latestValue,
    lineColor,
    startFillColor,
    endFillColor,
    pointerColor,
    chartWidth,
    timeframe,
    emptyText = 'Aucune télémétrie reçue',
    renderTooltip,
}: TelemetryChartCardProps) {
    const pointerConfig = useMemo(() => ({
        pointerStripColor: pointerColor,
        pointerStripWidth: 2,
        radius: 6,
        pointerColor: pointerColor,
        pointerStripUptoDataPoint: true,
        pointerLabelWidth: 96,
        pointerLabelHeight: 54,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        shiftPointerLabelX: -36,
        shiftPointerLabelY: -8,
        pointerLabelComponent: (items: any) => renderTooltip(items, unit),
    }), [pointerColor, renderTooltip, unit]);

    const displayVal = latestValue !== null && latestValue !== undefined
        ? (typeof latestValue === 'number' ? latestValue.toFixed(1) : latestValue)
        : '--';

    return (
        <View style={styles.chartContainer}>
            {/* Header de la carte : Titre + Indicateur + Live Value */}
            <View style={styles.cardHeaderRow}>
                <View>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <View style={styles.streamIndicator}>
                        <View style={[styles.liveDot, { backgroundColor: lineColor }]} />
                        <Text style={styles.streamLabel}>
                            {timeframe === 'live' ? 'Flux continu 3s' : `Période ${timeframe.toUpperCase()} (Agrégé)`}
                        </Text>
                    </View>
                </View>

                {/* Valeur instantanée Live Header */}
                <View style={styles.liveValueContainer}>
                    <Text style={[styles.liveValueBig, { color: lineColor }]}>
                        {displayVal}
                    </Text>
                    <Text style={[styles.liveUnitBig, { color: lineColor }]}> {unit}</Text>
                </View>
            </View>

            {/* État vide ou Graphique Gifted Charts */}
            {data.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>{emptyText}</Text>
                </View>
            ) : (
                <View style={styles.graphWrapper}>
                    <LineChart
                        data={data}
                        width={chartWidth}
                        height={170}
                        isAnimated={Platform.OS !== 'web'}
                        animateOnDataChange={Platform.OS !== 'web'}
                        animationDuration={Platform.OS !== 'web' ? 500 : 0}
                        curved={Platform.OS !== 'web'}
                        thickness={3}
                        color={lineColor}
                        startFillColor={startFillColor}
                        endFillColor={endFillColor || lineColor}
                        startOpacity={0.35}
                        endOpacity={0.03}
                        areaChart
                        pointerConfig={pointerConfig}
                        hideRules={false}
                        rulesColor="#f0f4f2"
                        rulesType="dashed"
                        yAxisColor="#dcdde1"
                        xAxisColor="#dcdde1"
                        yAxisTextStyle={styles.axisText}
                        xAxisLabelTextStyle={styles.axisText}
                        initialSpacing={12}
                        endSpacing={12}
                        spacing={Math.max(18, Math.floor(chartWidth / (data.length || 1)))}
                    />
                </View>
            )}
        </View>
    );
});

// ============================================================================
// COMPOSANT PRINCIPAL : AnalyticsView
// ============================================================================
export default function AnalyticsView() {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState<Timeframe>('live');

    // 1. ÉTATS DES 4 FLUX DE TÉLÉMÉTRIE
    const [temperatureData, setTemperatureData] = useState<ChartDataPoint[]>([]);
    const [humidityData, setHumidityData] = useState<ChartDataPoint[]>([]);
    const [photoperiodData, setPhotoperiodData] = useState<ChartDataPoint[]>([]);
    const [waterConsumptionData, setWaterConsumptionData] = useState<ChartDataPoint[]>([]);

    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = Math.max(280, Math.min(screenWidth - 68, 860));

    // ==========================================
    // CHARGEMENT PARALLÈLE DES 4 FLUX (PROMISE.ALL)
    // ==========================================
    const loadSensorData = useCallback(async (currentTf: Timeframe, isInitial = false) => {
        try {
            // Exécution strictement parallèle des 4 requêtes réseau
            const [tempRaw, humRaw, photoRaw, waterRaw] = await Promise.all([
                fetchTelemetry('ambient_temperature', currentTf),
                fetchTelemetry('air_humidity', currentTf),
                fetchTelemetry('photoperiod', currentTf),
                fetchTelemetry('water_consumption', currentTf)
            ]);

            // Formatteur universel de points avec axe X dynamique selon la période
            const formatToChart = (item: TelemetryData): ChartDataPoint => {
                const dateStr = item.timestamp.includes('T') ? item.timestamp : item.timestamp.replace(' ', 'T');
                const date = new Date(dateStr);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');

                // HH:mm pour Live/24H, et DD/MM pour 7/30 Jours
                const timeLabel = (currentTf === '7d' || currentTf === '30d')
                    ? `${day}/${month}`
                    : `${hours}:${minutes}`;

                const numVal = typeof item.value === 'number' ? item.value : parseFloat(item.value as any) || 0;
                const roundedVal = Number(numVal.toFixed(1));

                return {
                    value: roundedVal,
                    y: roundedVal,
                    label: timeLabel,
                    x: timeLabel,
                    rawDate: date,
                };
            };

            // Mappage sécurisé avec gestion gracieuse des tableaux vides
            setTemperatureData(Array.isArray(tempRaw) && tempRaw.length > 0 ? tempRaw.map(formatToChart) : []);
            setHumidityData(Array.isArray(humRaw) && humRaw.length > 0 ? humRaw.map(formatToChart) : []);
            setPhotoperiodData(Array.isArray(photoRaw) && photoRaw.length > 0 ? photoRaw.map(formatToChart) : []);
            setWaterConsumptionData(Array.isArray(waterRaw) && waterRaw.length > 0 ? waterRaw.map(formatToChart) : []);

            setLastSync(new Date());
        } catch (error) {
            console.error('[Analytics] Erreur de synchronisation multi-flux des capteurs:', error);
        } finally {
            if (isInitial) {
                setLoading(false);
            }
        }
    }, []);

    // ==========================================
    // CYCLE DE VIE & OPTIMISATION DU POLLING
    // ==========================================
    useEffect(() => {
        // 1. Fetch initial immédiat lors de la sélection
        loadSensorData(timeframe, true);

        // 2. Règle d'or : Polling agressif (3s) UNIQUEMENT si timeframe === 'live'
        // Si 24h, 7d, ou 30d, coupe le setInterval (fetch unique)
        if (timeframe !== 'live') {
            return;
        }

        const intervalId = setInterval(() => {
            loadSensorData('live', false);
        }, 3000);

        // 3. Nettoyage strict pour prévenir les fuites mémoire
        return () => clearInterval(intervalId);
    }, [timeframe, loadSensorData]);

    // ==========================================
    // EXTRACTION DYNAMIQUE DES DERNIÈRES VALEURS CONNUES
    // ==========================================
    const latestTemp = useMemo(() => {
        if (temperatureData.length === 0) return null;
        const last = temperatureData[temperatureData.length - 1];
        return last.y ?? last.value;
    }, [temperatureData]);

    const latestHum = useMemo(() => {
        if (humidityData.length === 0) return null;
        const last = humidityData[humidityData.length - 1];
        return last.y ?? last.value;
    }, [humidityData]);

    const latestPhoto = useMemo(() => {
        if (photoperiodData.length === 0) return null;
        const last = photoperiodData[photoperiodData.length - 1];
        return last.y ?? last.value;
    }, [photoperiodData]);

    const latestWater = useMemo(() => {
        if (waterConsumptionData.length === 0) return null;
        const last = waterConsumptionData[waterConsumptionData.length - 1];
        return last.y ?? last.value;
    }, [waterConsumptionData]);

    // ==========================================
    // TOOLTIP DU POINTEUR INTERACTIF
    // ==========================================
    const renderTooltip = useCallback((items: any, unit: string) => {
        if (!items || !items[0]) return null;
        const item = items[0];
        const rawVal = item.y !== undefined ? item.y : item.value;
        const displayVal = typeof rawVal === 'number' ? rawVal.toFixed(1) : (rawVal ?? '--');
        const timeLabel = item.x || item.label || (item.rawDate instanceof Date 
            ? `${item.rawDate.getHours().toString().padStart(2, '0')}:${item.rawDate.getMinutes().toString().padStart(2, '0')}` 
            : '');

        return (
            <View style={styles.tooltipBubble}>
                <Text style={styles.tooltipValue}>{displayVal} {unit}</Text>
                {timeLabel ? <Text style={styles.tooltipTime}>{timeLabel}</Text> : null}
            </View>
        );
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#27ae60" />
                <Text style={styles.loadingText}>Synchronisation CyberCortex {timeframe.toUpperCase()}...</Text>
            </View>
        );
    }

    return (
        // DIRECTIVE 2 : ScrollView fluide avec paddingBottom 100 pour ne pas masquer les cartes
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Header Principal Télémétrie */}
            <View style={styles.topHeader}>
                <View>
                    <Text style={styles.systemTitle}>CyberCortex <Text style={{ color: '#27ae60' }}>{timeframe === 'live' ? 'LIVE' : timeframe.toUpperCase()}</Text></Text>
                    <Text style={styles.subtitle}>Tableau de bord Analytique & Télémétrie Multi-Flux</Text>
                </View>
                <View style={styles.syncBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.syncText}>
                        Sync: {lastSync ? lastSync.toLocaleTimeString() : 'En cours'}
                    </Text>
                </View>
            </View>

            {/* Panneau de contrôle des actionneurs IoT */}
            <CyberControlPanel />

            {/* SÉLECTEUR DE PLAGE TEMPORELLE INTERACTIF */}
            <View style={styles.timeframeContainer}>
                <View style={styles.timeframeRow}>
                    {TIMEFRAME_OPTIONS.map((item) => {
                        const isActive = timeframe === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => setTimeframe(item.id)}
                                activeOpacity={0.7}
                                style={[
                                    styles.timeframeBtn,
                                    isActive ? styles.timeframeBtnActive : styles.timeframeBtnInactive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.timeframeBtnText,
                                        isActive ? styles.timeframeBtnTextActive : styles.timeframeBtnTextInactive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ==========================================
                COURBE 1 : TEMPÉRATURE GLOBALE (°C)
                ========================================== */}
            <TelemetryChartCard
                title={t('sensor.ambient_temp')}
                unit="°C"
                data={temperatureData}
                latestValue={latestTemp}
                lineColor="#ff4757"
                startFillColor="#ff6b81"
                endFillColor="#ff4757"
                pointerColor="#ff4757"
                chartWidth={chartWidth}
                timeframe={timeframe}
                emptyText="Aucune télémétrie thermique reçue"
                renderTooltip={renderTooltip}
            />

            {/* ==========================================
                COURBE 2 : HUMIDITÉ DE L'AIR (%)
                ========================================== */}
            <TelemetryChartCard
                title={t('sensor.air_humidity')}
                unit="%"
                data={humidityData}
                latestValue={latestHum}
                lineColor="#1e90ff"
                startFillColor="#70a1ff"
                endFillColor="#1e90ff"
                pointerColor="#1e90ff"
                chartWidth={chartWidth}
                timeframe={timeframe}
                emptyText="Aucune télémétrie hygrométrique reçue"
                renderTooltip={renderTooltip}
            />

            {/* ==========================================
                COURBE 3 : PHOTOPÉRIODE (h) - Tons solaires / ambrés
                ========================================== */}
            <TelemetryChartCard
                title={t('sensor.photoperiod')}
                unit="h"
                data={photoperiodData}
                latestValue={latestPhoto}
                lineColor="#f39c12"
                startFillColor="#f1c40f"
                endFillColor="#f39c12"
                pointerColor="#e67e22"
                chartWidth={chartWidth}
                timeframe={timeframe}
                emptyText="Aucune mesure de photopériode reçue"
                renderTooltip={renderTooltip}
            />

            {/* ==========================================
                COURBE 4 : CONSOMMATION D'EAU (L) - Tons aquatiques profonds
                ========================================== */}
            <TelemetryChartCard
                title={t('sensor.water_consumption')}
                unit="L"
                data={waterConsumptionData}
                latestValue={latestWater}
                lineColor="#2980b9"
                startFillColor="#3498db"
                endFillColor="#2980b9"
                pointerColor="#2c3e50"
                chartWidth={chartWidth}
                timeframe={timeframe}
                emptyText="Aucune mesure de consommation d'eau reçue"
                renderTooltip={renderTooltip}
            />
        </ScrollView>
    );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f6',
    },
    // DIRECTIVE 2 : paddingBottom 100 pour défilement fluide sans bloquer la nav
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7f6',
    },
    loadingText: {
        marginTop: 12,
        color: '#2d3436',
        fontSize: 14,
        fontWeight: '600',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 10,
    },
    systemTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: '#718096',
        marginTop: 2,
    },
    syncBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eafaf1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#a3e635',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#27ae60',
        marginEnd: 6,
    },
    syncText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1e7e43',
    },

    // Sélecteur temporel
    timeframeContainer: {
        marginBottom: 20,
    },
    timeframeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    timeframeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeframeBtnInactive: {
        backgroundColor: '#f1f3f5',
        borderColor: 'transparent',
    },
    timeframeBtnActive: {
        backgroundColor: 'transparent',
        borderColor: '#27ae60',
    },
    timeframeBtnText: {
        fontSize: 13,
        letterSpacing: 0.2,
    },
    timeframeBtnTextInactive: {
        color: '#495057',
        fontWeight: '500',
    },
    timeframeBtnTextActive: {
        color: '#27ae60',
        fontWeight: 'bold',
    },

    // Cartes de télémétrie
    chartContainer: {
        backgroundColor: '#ffffff',
        padding: 18,
        borderRadius: 20,
        marginBottom: 22,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        borderColor: '#e8edf0',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2d3436',
    },
    streamIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginEnd: 6,
    },
    streamLabel: {
        fontSize: 11,
        color: '#a0aec0',
        fontWeight: '600',
    },

    // Live Header Value
    liveValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    liveValueBig: {
        fontSize: 28,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    liveUnitBig: {
        fontSize: 18,
        fontWeight: 'bold',
        marginStart: 4,
    },

    graphWrapper: {
        marginStart: -10,
        alignItems: 'center',
    },
    axisText: {
        color: '#8395a7',
        fontSize: 10,
        fontWeight: '500',
    },

    emptyState: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#b2bec3',
        fontStyle: 'italic',
        fontSize: 13,
    },

    // Tooltip Pointeur
    tooltipBubble: {
        backgroundColor: '#1b2623',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#27ae60',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
    },
    tooltipValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    tooltipTime: {
        fontSize: 10,
        fontWeight: '600',
        color: '#2ecc71',
        marginTop: 2,
    },
});
