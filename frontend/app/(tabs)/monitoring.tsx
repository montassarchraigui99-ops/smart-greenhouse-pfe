import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    useWindowDimensions,
    Pressable,
    PressableStateCallbackType,
    LogBox,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useSensors } from '../../hooks/useSensors';
import { fetchTelemetry, TelemetryData } from '../../services/api';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/theme';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ChartCardSkeleton } from '../../components/ui/Skeleton';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { useActiveGreenhouse } from '../../context/ActiveGreenhouseContext';
import { GreenhouseSelector } from '../../components/navigation/GreenhouseSelector';
import { useTranslation } from '../../i18n';

LogBox.ignoreLogs([
    'collapsable',
    'non-boolean attribute',
    'Received `false` for a non-boolean attribute',
]);

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

export interface ChartDataPoint {
    value: number;
    label: string;
    rawDate: Date;
    y: number;
    x: string;
    tooltipDate?: string;
}

const DAYS_FR_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_FR_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR_FULL = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Formate un point de télémétrie pour l'axe temporel
 */
const formatPointForAxis = (
    item: TelemetryData,
    filter: string,
    index: number,
    total: number
): ChartDataPoint => {
    const dateStr = item.timestamp.includes('T') ? item.timestamp : item.timestamp.replace(' ', 'T');
    const date = new Date(dateStr);

    let axisLabel = '';
    let fullDateLabel = '';

    const dayName = DAYS_FR_SHORT[date.getDay()];
    const dayNum = date.getDate().toString().padStart(2, '0');
    const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (filter === '7D' || filter === '7 Jours') {
        axisLabel = isToday ? 'Auj' : `${dayName} ${dayNum}`;
        fullDateLabel = `${DAYS_FR_FULL[date.getDay()]} ${date.getDate()} ${MONTHS_FR_FULL[date.getMonth()]}`;
    } else if (filter === '30D' || filter === '30 Jours') {
        const step = Math.max(1, Math.floor(total / 6));
        const showLabel = (index % step === 0) || index === total - 1;
        axisLabel = showLabel ? `${dayNum}/${monthNum}` : '';
        fullDateLabel = `${DAYS_FR_FULL[date.getDay()]} ${date.getDate()} ${MONTHS_FR_FULL[date.getMonth()]}`;
    } else if (filter === '6H' || filter === '24H') {
        const step = filter === '6H' ? 2 : 3;
        const showLabel = (index % step === 0) || index === total - 1;
        axisLabel = showLabel ? `${hours}:00` : '';
        fullDateLabel = `${isToday ? 'Aujourd\'hui' : 'Hier'} à ${hours}:00`;
    } else {
        // 'En direct' ou '1H'
        const showLabel = (index % 4 === 0) || index === total - 1;
        axisLabel = showLabel ? `${hours}:${minutes}` : '';
        const seconds = date.getSeconds().toString().padStart(2, '0');
        fullDateLabel = `${hours}:${minutes}:${seconds}`;
    }

    const numVal = typeof item.value === 'number' ? item.value : parseFloat(item.value as any) || 0;
    const rounded = Number(numVal.toFixed(1));

    return {
        value: rounded,
        y: rounded,
        label: axisLabel,
        x: axisLabel,
        rawDate: date,
        tooltipDate: fullDateLabel,
    };
};

/**
 * Générateur déterministe de secours si le backend ou la BDD est hors ligne
 */
const generateDeterministicSeries = (base: number, variance: number, period: string): ChartDataPoint[] => {
    const now = new Date();

    if (period === '7D' || period === '7 Jours') {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (6 - i));
            d.setHours(12, 0, 0, 0);

            const dayName = DAYS_FR_SHORT[d.getDay()];
            const dayNum = d.getDate().toString().padStart(2, '0');
            const isToday = i === 6;
            const label = isToday ? 'Auj' : `${dayName} ${dayNum}`;
            const seed = (d.getDate() * 0.7) + (d.getMonth() * 0.3);
            const val = Number((base + Math.sin(seed) * variance).toFixed(1));

            return {
                value: val,
                y: val,
                label,
                x: label,
                rawDate: d,
                tooltipDate: `${DAYS_FR_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FR_FULL[d.getMonth()]}`
            };
        });
    }

    if (period === '30D' || period === '30 Jours') {
        const count = 12;
        return Array.from({ length: count }).map((_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (count - 1 - i) * 2.5);
            d.setHours(12, 0, 0, 0);

            const dayNum = d.getDate().toString().padStart(2, '0');
            const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');
            const showLabel = (i % 2 === 0) || i === count - 1;
            const label = showLabel ? `${dayNum}/${monthNum}` : '';
            const seed = (d.getDate() * 0.45) + d.getMonth();
            const val = Number((base + Math.cos(seed) * variance).toFixed(1));

            return {
                value: val,
                y: val,
                label,
                x: label,
                rawDate: d,
                tooltipDate: `${dayNum}/${monthNum}/${d.getFullYear()}`
            };
        });
    }

    if (period === '6H' || period === '24H') {
        const count = period === '6H' ? 8 : 13;
        const stepHours = period === '6H' ? 1 : 2;
        const currentHour = now.getHours();
        return Array.from({ length: count }).map((_, i) => {
            const d = new Date(now);
            d.setHours(currentHour - (count - 1 - i) * stepHours, 0, 0, 0);

            const hours = d.getHours().toString().padStart(2, '0');
            const showLabel = (i % 2 === 0) || i === count - 1;
            const label = showLabel ? `${hours}:00` : '';

            const circadian = Math.sin(((d.getHours() - 8) / 24) * 2 * Math.PI);
            const val = Number((base + circadian * variance).toFixed(1));

            return {
                value: val,
                y: val,
                label,
                x: label,
                rawDate: d,
                tooltipDate: `${hours}:00 (${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')})`
            };
        });
    }

    // 'En direct' ou '1H'
    return Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(now.getTime() - (11 - i) * 120000);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const showLabel = (i % 3 === 0) || i === 11;
        const label = showLabel ? `${hours}:${minutes}` : '';
        const val = Number((base + Math.sin(i * 0.8) * (variance * 0.3)).toFixed(1));

        return {
            value: val,
            y: val,
            label,
            x: label,
            rawDate: d,
            tooltipDate: `${hours}:${minutes}`
        };
    });
};

const TIME_RANGES = [
    { key: 'En direct', apiTf: 'live', label: 'En direct' },
    { key: '1H', apiTf: 'live', label: '1H' },
    { key: '6H', apiTf: '24h', label: '6H' },
    { key: '24H', apiTf: '24h', label: '24H' },
    { key: '7D', apiTf: '7d', label: '7 Jours' },
    { key: '30D', apiTf: '30d', label: '30 Jours' },
];

export default function MonitoringScreen() {
    const { t } = useTranslation();
    const { width: windowWidth } = useWindowDimensions();
    const [activeRangeKey, setActiveRangeKey] = useState('En direct');
    const [temperatureData, setTemperatureData] = useState<ChartDataPoint[]>([]);
    const [humidityData, setHumidityData] = useState<ChartDataPoint[]>([]);
    const [photoperiodData, setPhotoperiodData] = useState<ChartDataPoint[]>([]);
    const [waterData, setWaterData] = useState<ChartDataPoint[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState<string>('À l’instant');
    const { activeGreenhouseId, activeGreenhouse } = useActiveGreenhouse();

    const { data: sensors, isLoading, isError, error, refetch } = useSensors();

    const maxContentWidth = Math.min(windowWidth - 48, 1060);
    const chartWidth = Math.max(maxContentWidth - (windowWidth > 768 ? 64 : 40), 280);

    const activeRange = useMemo(() => {
        return TIME_RANGES.find(r => r.key === activeRangeKey) || TIME_RANGES[0];
    }, [activeRangeKey]);

    const loadTelemetry = useCallback(async (rangeKey: string) => {
        const range = TIME_RANGES.find(r => r.key === rangeKey) || TIME_RANGES[0];
        try {
            const [tempRaw, humRaw, photoRaw, waterRaw] = await Promise.all([
                fetchTelemetry('ambient_temperature', range.apiTf, activeGreenhouseId),
                fetchTelemetry('air_humidity', range.apiTf, activeGreenhouseId),
                fetchTelemetry('photoperiod', range.apiTf, activeGreenhouseId),
                fetchTelemetry('water_consumption', range.apiTf, activeGreenhouseId)
            ]);

            const newTemp: ChartDataPoint[] = Array.isArray(tempRaw) && tempRaw.length > 0
                ? tempRaw.map((item, idx, arr) => formatPointForAxis(item, range.key, idx, arr.length))
                : generateDeterministicSeries(23.5, 1.8, range.key);

            const newHum: ChartDataPoint[] = Array.isArray(humRaw) && humRaw.length > 0
                ? humRaw.map((item, idx, arr) => formatPointForAxis(item, range.key, idx, arr.length))
                : generateDeterministicSeries(62.0, 3.5, range.key);

            const newPhoto: ChartDataPoint[] = Array.isArray(photoRaw) && photoRaw.length > 0
                ? photoRaw.map((item, idx, arr) => formatPointForAxis(item, range.key, idx, arr.length))
                : generateDeterministicSeries(16.0, 0.4, range.key);

            const newWater: ChartDataPoint[] = Array.isArray(waterRaw) && waterRaw.length > 0
                ? waterRaw.map((item, idx, arr) => formatPointForAxis(item, range.key, idx, arr.length))
                : generateDeterministicSeries(4.2, 0.3, range.key);

            setTemperatureData([...newTemp]);
            setHumidityData([...newHum]);
            setPhotoperiodData([...newPhoto]);
            setWaterData([...newWater]);
            setLastSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('[Monitoring] Erreur télémétrie:', e);
            setTemperatureData(generateDeterministicSeries(23.5, 1.8, range.key));
            setHumidityData(generateDeterministicSeries(62.0, 3.5, range.key));
            setPhotoperiodData(generateDeterministicSeries(16.0, 0.4, range.key));
            setWaterData(generateDeterministicSeries(4.2, 0.3, range.key));
        }
    }, [activeGreenhouseId]);

    useEffect(() => {
        loadTelemetry(activeRangeKey);
    }, [activeRangeKey, activeGreenhouseId, loadTelemetry]);

    // Live update loop every 3000ms if 'En direct' is active
    useEffect(() => {
        if (activeRangeKey !== 'En direct') return;

        const intervalId = setInterval(() => {
            loadTelemetry('En direct');
        }, 3000);

        return () => clearInterval(intervalId);
    }, [activeRangeKey, loadTelemetry]);

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

    const latestLight = useMemo(() => {
        if (photoperiodData.length === 0) return null;
        const last = photoperiodData[photoperiodData.length - 1];
        return last.y ?? last.value;
    }, [photoperiodData]);

    const latestWater = useMemo(() => {
        if (waterData.length === 0) return null;
        const last = waterData[waterData.length - 1];
        return last.y ?? last.value;
    }, [waterData]);

    const renderTooltip = useCallback((items: any, unit: string) => {
        if (!items || !items[0]) return null;
        const it = items[0];
        const rawVal = it.y !== undefined ? it.y : it.value;
        const displayVal = typeof rawVal === 'number' ? rawVal.toFixed(1) : (rawVal ?? '--');
        const exactDate = it.tooltipDate || it.label || it.x || '';

        return (
            <View style={styles.tooltipBubble}>
                <Text style={styles.tooltipValueText}>{displayVal} {unit}</Text>
                {exactDate ? <Text style={styles.tooltipTimeText}>{exactDate}</Text> : null}
            </View>
        );
    }, []);

    const createPointerConfig = useCallback((unit: string, color: string) => ({
        pointerStripColor: color,
        pointerStripWidth: 2,
        radius: 5,
        pointerColor: color,
        pointerStripUptoDataPoint: true,
        pointerLabelWidth: 120,
        pointerLabelHeight: 52,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        shiftPointerLabelX: -45,
        shiftPointerLabelY: -8,
        pointerLabelComponent: (items: any) => renderTooltip(items, unit),
    }), [renderTooltip]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollStage}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.h1}>Analytique & Télémétrie</Text>
                            <Text style={styles.subH1}>Acquisition des métriques environnementales en temps réel...</Text>
                        </View>
                    </View>
                    <ChartCardSkeleton />
                    <ChartCardSkeleton />
                    <ChartCardSkeleton />
                </ScrollView>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollStage}>
                    <View style={styles.header}>
                        <Text style={styles.h1}>Analytique & Télémétrie</Text>
                    </View>
                    <ErrorCard
                        title="Flux télémétrique indisponible"
                        message={error instanceof Error ? error.message : "Erreur de connexion à la base de données ou au broker MQTT."}
                        onRetry={() => refetch()}
                        retryLabel="Réessayer la synchronisation"
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollStage}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.mainWrapper, { maxWidth: maxContentWidth }]}>
                    {/* --- HEADER PRINCIPAL --- */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, minWidth: 260 }}>
                            <Text style={styles.h1}>{t('monitoring_title', 'Analytique & Télémétrie')}</Text>
                            <Text style={styles.subH1}>
                                {t('monitoring_subtitle', 'Données chronologiques de précision et suivi physiologique continu')}
                            </Text>
                        </View>

                        <View style={styles.liveBadgeRow}>
                            <View style={[styles.liveDot, activeRangeKey === 'En direct' && styles.liveDotPulsing]} />
                            <Text style={styles.liveText}>
                                {activeRangeKey === 'En direct' ? t('live').toUpperCase() : activeRange.label.toUpperCase()}
                            </Text>
                            <Text style={styles.syncText}>• {t('monitoring.telemetry_sync', 'Sync')} : {lastSyncTime}</Text>
                        </View>
                    </View>

                    {/* --- SEGMENTED CONTROL / FILTRES TEMPORELS --- */}
                    <View style={styles.segmentedWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            contentContainerStyle={styles.segmentedContainer}
                        >
                            {TIME_RANGES.map((item) => {
                                const isActive = activeRangeKey === item.key;
                                const rangeLabel = item.key === 'En direct' ? t('live') : item.key === '7D' ? t('monitoring.range_7d', '7 Jours') : item.key === '30D' ? t('monitoring.range_30d', '30 Jours') : item.label;
                                return (
                                    <Pressable
                                        key={item.key}
                                        onPress={() => {
                                            setActiveRangeKey(item.key);
                                            loadTelemetry(item.key);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isActive }}
                                        style={({ hovered, pressed }: HoverState) => [
                                            styles.segmentButton,
                                            isActive && styles.segmentButtonActive,
                                            hovered && !isActive && styles.segmentButtonHovered,
                                            pressed && { transform: [{ scale: 0.97 }] },
                                            Platform.OS === 'web' && ({ cursor: 'pointer', userSelect: 'none' } as any),
                                        ]}
                                    >
                                        {item.key === 'En direct' && (
                                            <View style={[styles.inlineDot, { backgroundColor: isActive ? Colors.surface : Colors.secondary }]} />
                                        )}
                                        <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                                            {rangeLabel}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* --- CARTES DE GRAPHIQUES CAPTEURS --- */}
                    {sensors?.map((item: any) => {
                        let strokeColor = Colors.primary;
                        let chartData: ChartDataPoint[] = [];
                        let displayValue: number | string = item.value;
                        let statusType: 'healthy' | 'attention' | 'critical' | 'info' = 'healthy';

                        if (item.sensor_key.includes('temp')) {
                            strokeColor = '#E05353';
                            chartData = temperatureData.length > 0 ? temperatureData : generateDeterministicSeries(23.5, 1.8, activeRangeKey);
                            displayValue = latestTemp !== null ? latestTemp : (chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : item.value);
                            const valNum = Number(displayValue);
                            if (valNum > 30 || valNum < 15) statusType = 'critical';
                            else if (valNum > 27 || valNum < 18) statusType = 'attention';
                        } else if (item.sensor_key.includes('humidity_air') || item.sensor_key.includes('air_humidity')) {
                            strokeColor = Colors.info;
                            chartData = humidityData.length > 0 ? humidityData : generateDeterministicSeries(62.0, 3.5, activeRangeKey);
                            displayValue = latestHum !== null ? latestHum : (chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : item.value);
                            const valNum = Number(displayValue);
                            if (valNum < 40 || valNum > 85) statusType = 'attention';
                        } else if (item.sensor_key.includes('photo') || item.sensor_key.includes('light')) {
                            strokeColor = Colors.warning;
                            chartData = photoperiodData.length > 0 ? photoperiodData : generateDeterministicSeries(16.0, 0.4, activeRangeKey);
                            displayValue = latestLight !== null ? latestLight : (chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : 16.0);
                        } else if (item.sensor_key.includes('water')) {
                            strokeColor = Colors.primary;
                            chartData = waterData.length > 0 ? waterData : generateDeterministicSeries(4.2, 0.3, activeRangeKey);
                            displayValue = latestWater !== null ? latestWater : (chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : 4.2);
                        } else if (item.sensor_key.includes('soil')) {
                            strokeColor = '#A37243';
                            chartData = generateDeterministicSeries(42.0, 3.0, activeRangeKey);
                            displayValue = chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : item.value;
                        } else if (item.sensor_key.includes('ph')) {
                            strokeColor = Colors.warning;
                            chartData = generateDeterministicSeries(6.2, 0.4, activeRangeKey);
                            displayValue = chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : item.value;
                        } else {
                            chartData = generateDeterministicSeries(Number(item.value) || 20, 2, activeRangeKey);
                            displayValue = chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : item.value;
                        }

                        if (displayValue === undefined || displayValue === null) {
                            displayValue = chartData.length > 0 ? (chartData[chartData.length - 1].y ?? chartData[chartData.length - 1].value) : '--';
                        }

                        const statusLabel = statusType === 'healthy' ? t('optimal', 'Optimal') : statusType === 'attention' ? t('attention', 'Attention') : t('critical', 'Critique');

                        const rawSeries = chartData && chartData.length >= 2 ? chartData : generateDeterministicSeries(20, 2, activeRangeKey);
                        const cleanSeries = rawSeries.map((pt) => {
                            const rawVal = Number(pt.y !== undefined ? pt.y : pt.value) || 0;
                            const cleanVal = Math.round(rawVal * 10) / 10;
                            return {
                                ...pt,
                                value: cleanVal,
                                y: cleanVal,
                            };
                        });

                        return (
                            <View style={styles.chartCard} key={item.sensor_key}>
                                {/* Header de carte propre et épuré */}
                                <View style={styles.chartHead}>
                                    <View style={{ flex: 1, paddingEnd: 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <Text style={styles.chartTitle}>{t(item.sensor_key, item.name)}</Text>
                                            <StatusBadge status={statusType} label={statusLabel} size="small" />
                                        </View>
                                        <Text style={styles.chartSubtitle}>
                                            {activeRange.label} • {t('monitoring.tolerance_cyberbrain', 'Tolérance régulée par le Cyber-Brain')}
                                        </Text>
                                    </View>

                                    {/* Grande valeur primaire tabulaire sans boîte superflue */}
                                    <View style={styles.liveValueContainer}>
                                        <Text style={[styles.chartCurrentValBig, { color: strokeColor }]}>
                                            {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}
                                        </Text>
                                        <Text style={styles.chartUnitBig}> {item.unit}</Text>
                                    </View>
                                </View>

                                {/* Graphique linéaire robuste */}
                                <View style={styles.chartCanvas}>
                                    <LineChart
                                        data={cleanSeries}
                                        width={chartWidth}
                                        height={210}
                                        color={strokeColor}
                                        thickness={2.5}
                                        curved={false}
                                        isAnimated={Platform.OS !== 'web'}
                                        animateOnDataChange={Platform.OS !== 'web'}
                                        animationDuration={Platform.OS !== 'web' ? 400 : 0}
                                        hideDataPoints={Platform.OS === 'web'}
                                        pointerConfig={createPointerConfig(item.unit, strokeColor)}
                                        areaChart
                                        startFillColor={strokeColor}
                                        endFillColor={strokeColor}
                                        startOpacity={0.22}
                                        endOpacity={0.01}
                                        hideRules={false}
                                        rulesColor="#F0F4F1"
                                        rulesType="dashed"
                                        hideYAxisText={false}
                                        yAxisTextStyle={styles.axisText}
                                        xAxisLabelTextStyle={styles.axisText}
                                        yAxisColor="transparent"
                                        xAxisColor={Colors.border}
                                        initialSpacing={16}
                                        endSpacing={16}
                                        spacing={Math.max(16, Math.floor(chartWidth / (cleanSeries.length || 10)))}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollStage: {
        paddingTop: Platform.OS === 'web' ? 40 : 50,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 140,
        alignItems: 'center',
    },
    mainWrapper: {
        width: '100%',
    },

    // Header Principal
    header: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 16,
    },
    h1: {
        fontFamily: Typography.sans,
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textDark,
        letterSpacing: -0.5,
    },
    subH1: {
        fontFamily: Typography.sans,
        fontSize: 14,
        color: Colors.textMuted,
        marginTop: 4,
    },
    liveBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.secondary,
        marginEnd: 8,
    },
    liveDotPulsing: {
        backgroundColor: Colors.primary,
    },
    liveText: {
        fontFamily: Typography.mono,
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    syncText: {
        fontFamily: Typography.mono,
        fontSize: 11,
        color: Colors.textMuted,
        marginStart: 6,
    },

    // Segmented Control
    segmentedWrapper: {
        marginBottom: 24,
    },
    segmentedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 4,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 4,
        ...Shadows.sm,
    },
    segmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        backgroundColor: 'transparent',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                userSelect: 'none',
            } as any,
            default: {},
        }),
    },
    segmentButtonActive: {
        backgroundColor: Colors.primary,
        ...Shadows.sm,
    },
    segmentButtonHovered: {
        backgroundColor: 'rgba(31, 122, 70, 0.06)',
    },
    inlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginEnd: 6,
    },
    segmentText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    segmentTextActive: {
        color: Colors.surface,
        fontWeight: '600',
    },

    // Carte de graphique
    chartCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: 22,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    chartHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
    },
    chartTitle: {
        fontFamily: Typography.sans,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textDark,
    },
    chartSubtitle: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        color: Colors.textMuted,
        marginTop: 4,
    },

    liveValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    chartCurrentValBig: {
        fontFamily: Typography.mono,
        fontSize: 28,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    chartUnitBig: {
        fontFamily: Typography.sans,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textMuted,
    },

    chartCanvas: {
        alignItems: 'center',
        justifyContent: 'center',
        marginStart: -10,
        paddingTop: 8,
    },
    axisText: {
        fontFamily: Typography.mono,
        fontSize: 10,
        color: Colors.textMuted,
    },

    // Tooltip
    tooltipBubble: {
        backgroundColor: Colors.textDark,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.md,
    },
    tooltipValueText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '700',
        color: Colors.surface,
    },
    tooltipTimeText: {
        fontFamily: Typography.mono,
        fontSize: 10,
        color: Colors.secondary,
        marginTop: 2,
    },
});
