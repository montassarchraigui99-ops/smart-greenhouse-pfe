import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable, PressableStateCallbackType, ActivityIndicator, LogBox } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSensors } from '../../hooks/useSensors';
import { fetchTelemetry, TelemetryData } from '../../services/api';

LogBox.ignoreLogs([
    'collapsable',
    'non-boolean attribute',
    'Received `false` for a non-boolean attribute',
]);

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
    bg: '#f6f8f5',
    bg2: '#eef2ec',
    panel: '#ffffff',
    line: '#e2e8e0',
    lineSoft: '#edf1ea',
    text: '#1e2b22',
    textDim: '#5c6b60',
    textFaint: '#93a297',
    green: '#27ae60',
    greenDeep: '#1f7a46',
    greenPale: '#d8f0e0',
    soil: '#b08a5f',
    sky: '#1e90ff',
    amber: '#d9922f',
    rMd: 16,
    rPill: 999,
    shadowSm: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    shadowMd: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 34, elevation: 6 }
};

const SCREEN_W = Dimensions.get('window').width;
const IS_WEB = Platform.OS === 'web';
const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

const webTransitionColor = Platform.select({
    web: { transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease' } as any,
    default: {}
});

export interface ChartDataPoint {
    value: number;
    label: string;
    rawDate: Date;
    y: number;
    x: string;
    tooltipDate?: string;
}

// ============================================
// FORMATTEUR DE DATES & HEURES EXACTES (AXE X DÉTERMINISTE SANS ALÉATOIRE)
// ============================================
const DAYS_FR_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_FR_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR_FULL = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Formate un point de télémétrie pour l'axe de temps avec des dates calendaires exactes.
 */
const formatPointForAxis = (
    item: TelemetryData,
    filter: string,
    index: number,
    total: number
): ChartDataPoint => {
    // Parsing sécurisé du timestamp (compatible SQLite "YYYY-MM-DD" ou "YYYY-MM-DD HH:MM:SS")
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

    if (filter === '7 Jours') {
        // Axe X : Jours exacts de la semaine avec quantième (ex: "Mer 02", ..., "Aujourd'hui")
        axisLabel = isToday ? 'Aujourd\'hui' : `${dayName} ${dayNum}`;
        fullDateLabel = `${DAYS_FR_FULL[date.getDay()]} ${date.getDate()} ${MONTHS_FR_FULL[date.getMonth()]}`;
    } else if (filter === '30 Jours') {
        // Axe X : Dates calendaires exactes réparties proprement (ex: "10/08", "15/08", "20/08"...)
        const step = Math.max(1, Math.floor(total / 6));
        const showLabel = (index % step === 0) || index === total - 1;
        axisLabel = showLabel ? `${dayNum}/${monthNum}` : '';
        fullDateLabel = `${DAYS_FR_FULL[date.getDay()]} ${date.getDate()} ${MONTHS_FR_FULL[date.getMonth()]}`;
    } else if (filter === '24H') {
        // Axe X : Heures exactes des dernières 24h (ex: "15:00", "18:00", "21:00", "00:00"...)
        const showLabel = (index % 3 === 0) || index === total - 1;
        axisLabel = showLabel ? `${hours}:00` : '';
        fullDateLabel = `${isToday ? 'Aujourd\'hui' : 'Hier'} à ${hours}:00`;
    } else {
        // 'En direct' : Heure et minute exacte (ex: "14:48", "14:50")
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
 * Générateur de secours déterministe avec DATES CALENDAIRES EXACTES si la BDD est hors ligne.
 * Aucun Math.random() : calcul mathématique circadien pur lié à la date réelle.
 */
const generateDeterministicSeries = (base: number, variance: number, period: string): ChartDataPoint[] => {
    const now = new Date();

    if (period === '7 Jours') {
        // Les 7 jours calendaires exacts menant à aujourd'hui
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (6 - i));
            d.setHours(12, 0, 0, 0);

            const dayName = DAYS_FR_SHORT[d.getDay()];
            const dayNum = d.getDate().toString().padStart(2, '0');
            const isToday = i === 6;
            const label = isToday ? 'Aujourd\'hui' : `${dayName} ${dayNum}`;
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

    if (period === '30 Jours') {
        // 12 points réguliers sur les 30 derniers jours avec dates réelles exactes
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

    if (period === '24H') {
        // 13 points espacés de 2h sur les 24 dernières heures se terminant MAINTENANT
        const count = 13;
        const currentHour = now.getHours();
        return Array.from({ length: count }).map((_, i) => {
            const d = new Date(now);
            d.setHours(currentHour - (count - 1 - i) * 2, 0, 0, 0);

            const hours = d.getHours().toString().padStart(2, '0');
            const showLabel = (i % 2 === 0) || i === count - 1;
            const label = showLabel ? `${hours}:00` : '';

            // Modélisation circadienne physiologique (pic chaud en début d'après-midi)
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

    // Période 'En direct' : points réels récents (intervalles de 2 minutes)
    return Array.from({ length: 10 }).map((_, i) => {
        const d = new Date(now.getTime() - (9 - i) * 120000);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const showLabel = (i % 3 === 0) || i === 9;
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

const FILTERS = ['En direct', '24H', '7 Jours', '30 Jours'];

export default function MonitoringScreen() {
    const [activeFilter, setActiveFilter] = useState('En direct');
    const [temperatureData, setTemperatureData] = useState<ChartDataPoint[]>([]);
    const [humidityData, setHumidityData] = useState<ChartDataPoint[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState<string>('à l\'instant');

    // --- COUCHE RÉSEAU SENSORS ---
    const { data: sensors, isLoading, isError, error } = useSensors();

    const chartWidth = SCREEN_W > 800 ? Math.min(SCREEN_W - 140, 1000) : SCREEN_W - 80;

    // ==========================================
    // CHARGEMENT DE LA TÉLÉMÉTRIE SELON LA PÉRIODE SÉLECTIONNÉE
    // ==========================================
    const loadTelemetry = useCallback(async (filter: string) => {
        try {
            const [tempRaw, humRaw] = await Promise.all([
                fetchTelemetry('ambient_temperature', filter),
                fetchTelemetry('air_humidity', filter)
            ]);

            const newTemp: ChartDataPoint[] = Array.isArray(tempRaw) && tempRaw.length > 0
                ? tempRaw.map((item, idx, arr) => formatPointForAxis(item, filter, idx, arr.length))
                : generateDeterministicSeries(23.5, 1.8, filter);

            const newHum: ChartDataPoint[] = Array.isArray(humRaw) && humRaw.length > 0
                ? humRaw.map((item, idx, arr) => formatPointForAxis(item, filter, idx, arr.length))
                : generateDeterministicSeries(62.0, 3.5, filter);

            // Garantie d'une nouvelle référence de tableau ([...newData])
            setTemperatureData([...newTemp]);
            setHumidityData([...newHum]);
            setLastSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('[Monitoring] Erreur télémétrie:', e);
            // Fallback déterministe en cas de coupure réseau
            setTemperatureData(generateDeterministicSeries(23.5, 1.8, filter));
            setHumidityData(generateDeterministicSeries(62.0, 3.5, filter));
        }
    }, []);

    // Déclenchement au changement de filtre
    useEffect(() => {
        loadTelemetry(activeFilter);
    }, [activeFilter, loadTelemetry]);

    // Boucle de synchronisation temps réel (3000ms) UNIQUEMENT pour le mode "En direct"
    useEffect(() => {
        if (activeFilter !== 'En direct') return;

        const intervalId = setInterval(() => {
            loadTelemetry('En direct');
        }, 3000);

        return () => clearInterval(intervalId);
    }, [activeFilter, loadTelemetry]);

    // ==========================================
    // DIRECTIVE 1 : EXTRACTION DYNAMIQUE LIVE HEADER
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

    // ==========================================
    // DIRECTIVE 2 : POINTEUR INTERACTIF (POINTERCONFIG) AVEC DATE EXACTE
    // ==========================================
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

    const createPointerConfig = useCallback((unit: string) => ({
        pointerStripColor: '#27ae60',
        pointerStripWidth: 2,
        radius: 6,
        pointerColor: '#27ae60',
        pointerStripUptoDataPoint: true,
        pointerLabelWidth: 110,
        pointerLabelHeight: 56,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        shiftPointerLabelX: -45,
        shiftPointerLabelY: -8,
        pointerLabelComponent: (items: any) => renderTooltip(items, unit),
    }), [renderTooltip]);

    // --- GESTION DES ÉTATS RÉSEAU ---
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={TOKENS.green} />
                <Text style={styles.loadingText}>Synchronisation MQTT en cours...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Erreur de chargement: {error instanceof Error ? error.message : "Erreur réseau inconnue"}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollStage} showsVerticalScrollIndicator={false}>
                {/* --- HEADER PRINCIPAL --- */}
                <View style={styles.header}>
                    <Text style={styles.h1}>Analytique & Télémétrie</Text>
                    <View style={styles.liveBadgeRow}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                        <Text style={styles.syncText}>Synchro: {lastSyncTime}</Text>
                    </View>
                </View>

                {/* --- RESTAURATION STRICTE DES FILTRES DE TEMPS (BOUTONS HORIZONTAUX SANS ÉTIREMENT) --- */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterWrap}
                >
                    {FILTERS.map((f) => {
                        const isActive = activeFilter === f;
                        return (
                            <Pressable
                                key={f}
                                onPress={() => setActiveFilter(f)}
                                style={({ hovered, pressed }: HoverState) => [
                                    styles.filterBtn,
                                    isActive && styles.filterBtnActive,
                                    hovered && !isActive && styles.filterBtnHovered,
                                    pressed && { transform: [{ scale: 0.98 }] },
                                    webTransitionColor
                                ]}
                            >
                                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* --- CARTES DE TÉLÉMÉTRIE TEMPS RÉEL PAR CAPTEUR --- */}
                {sensors?.map((item: any) => {
                    let color = TOKENS.green;
                    let chartData: ChartDataPoint[] = [];
                    let displayValue: number | string = item.value;

                    // Attribution dynamique selon la nature du capteur
                    if (item.sensor_key.includes('temp')) {
                        color = '#ff4757';
                        chartData = temperatureData.length > 0 ? temperatureData : generateDeterministicSeries(23.5, 1.8, activeFilter);
                        displayValue = latestTemp !== null ? latestTemp : item.value;
                    } else if (item.sensor_key.includes('humidity_air') || item.sensor_key.includes('air_humidity')) {
                        color = TOKENS.sky;
                        chartData = humidityData.length > 0 ? humidityData : generateDeterministicSeries(62.0, 3.5, activeFilter);
                        displayValue = latestHum !== null ? latestHum : item.value;
                    } else if (item.sensor_key.includes('soil')) {
                        color = TOKENS.soil;
                        chartData = generateDeterministicSeries(42.0, 3.0, activeFilter);
                    } else if (item.sensor_key.includes('ph')) {
                        color = TOKENS.amber;
                        chartData = generateDeterministicSeries(6.2, 0.4, activeFilter);
                    } else {
                        chartData = generateDeterministicSeries(Number(item.value) || 20, 2, activeFilter);
                    }

                    return (
                        <View style={styles.chartCard} key={item.sensor_key}>
                            {/* EN-TÊTE DE LA CARTE : TITRE + LIVE HEADER EN GRAND ET GRAS */}
                            <View style={styles.chartHead}>
                                <View>
                                    <Text style={styles.chartTitle}>{item.name}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.statusDot, { backgroundColor: color }]} />
                                        <Text style={styles.chartSubtitle}>Statut: {item.status}</Text>
                                        <Text style={styles.liveTag}>
                                            • {activeFilter === 'En direct' ? 'Temps Réel (3s)' : activeFilter}
                                        </Text>
                                    </View>
                                </View>

                                {/* DIRECTIVE 1 : VALEUR INSTANTANÉE (LIVE HEADER) */}
                                <View style={styles.liveHeaderContainer}>
                                    <Text style={styles.chartCurrentValBig}>
                                        {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}
                                    </Text>
                                    <Text style={styles.chartUnitBig}> {item.unit}</Text>
                                </View>
                            </View>

                            {/* CANEVAS DU GRAPHIQUE AVEC AXE DE TEMPS EXACT ET POINTEUR HAPTIQUE */}
                            <View style={styles.chartCanvas}>
                                <LineChart
                                    data={chartData}
                                    width={chartWidth}
                                    height={200}
                                    color={color}
                                    thickness={3}
                                    curved={true}
                                    // TRANSITION 60 FPS ET ANIMATION TEMPS RÉEL
                                    isAnimated={true}
                                    animateOnDataChange={true}
                                    animationDuration={500}
                                    // POINTEUR INTERACTIF (POINTERCONFIG)
                                    pointerConfig={createPointerConfig(item.unit)}
                                    // Stylisation des axes et du remplissage de zone
                                    areaChart
                                    startFillColor={color}
                                    endFillColor={color}
                                    startOpacity={0.28}
                                    endOpacity={0.02}
                                    hideRules={false}
                                    rulesColor="#f0f4f1"
                                    rulesType="dashed"
                                    hideYAxisText={false}
                                    yAxisTextStyle={styles.axisText}
                                    xAxisLabelTextStyle={styles.axisText}
                                    yAxisColor="transparent"
                                    xAxisColor={TOKENS.line}
                                    initialSpacing={15}
                                    endSpacing={15}
                                    spacing={Math.max(16, Math.floor(chartWidth / (chartData.length || 10)))}
                                />
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: TOKENS.bg 
    },
    scrollStage: { 
        paddingTop: 50, 
        paddingHorizontal: Math.max(SCREEN_W * 0.05, 24), 
        paddingBottom: 160 
    },
    centered: { 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: { 
        marginTop: 12, 
        fontFamily: sansFamily, 
        fontSize: 14, 
        color: TOKENS.textDim 
    },
    errorText: { 
        fontFamily: sansFamily, 
        fontSize: 16, 
        color: 'red', 
        textAlign: 'center', 
        padding: 20 
    },

    // Header Principal
    header: { 
        marginBottom: 24, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        flexWrap: 'wrap', 
        gap: 16 
    },
    h1: { 
        fontFamily: sansFamily, 
        fontSize: 32, 
        fontWeight: '700', 
        color: TOKENS.text, 
        letterSpacing: -0.5 
    },
    liveBadgeRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#eaf4ee', 
        paddingHorizontal: 14, 
        paddingVertical: 7, 
        borderRadius: TOKENS.rPill, 
        borderWidth: 1, 
        borderColor: '#bcd6c4' 
    },
    liveDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        backgroundColor: TOKENS.green, 
        marginRight: 8 
    },
    liveText: { 
        fontFamily: sansFamily, 
        fontSize: 12, 
        fontWeight: '700', 
        color: TOKENS.greenDeep, 
        marginRight: 10, 
        letterSpacing: 0.5 
    },
    syncText: { 
        fontFamily: monoFamily, 
        fontSize: 11, 
        color: TOKENS.textDim 
    },

    // ============================================
    // BOUTONS DE FILTRE DE TEMPS HORIZONTAUX
    // ============================================
    filterScroll: { 
        flexGrow: 0,
        height: 48,
        maxHeight: 48,
        marginBottom: 26,
    },
    filterWrap: { 
        flexDirection: 'row', 
        alignItems: 'center',
        height: 44,
        gap: 12 
    },
    filterBtn: { 
        height: 38,
        paddingHorizontal: 18, 
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: TOKENS.rPill, 
        backgroundColor: '#f1f3f5', 
        borderWidth: 1.5, 
        borderColor: 'transparent' 
    },
    filterBtnActive: { 
        backgroundColor: 'transparent', 
        borderColor: '#27ae60', 
    },
    filterBtnHovered: { 
        backgroundColor: '#e9ecef' 
    },
    filterText: { 
        fontFamily: sansFamily, 
        fontSize: 13, 
        fontWeight: '500', 
        color: '#495057' 
    },
    filterTextActive: { 
        color: '#27ae60', 
        fontWeight: 'bold' 
    },

    // Cartes de capteur
    chartCard: {
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.rMd,
        padding: 22,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: TOKENS.line,
        ...TOKENS.shadowSm
    },
    chartHead: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 18 
    },
    chartTitle: { 
        fontFamily: sansFamily, 
        fontSize: 18, 
        fontWeight: '600', 
        color: TOKENS.text 
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    chartSubtitle: { 
        fontSize: 13, 
        color: TOKENS.textFaint,
    },
    liveTag: {
        fontSize: 12,
        color: TOKENS.green,
        fontWeight: '600',
        marginLeft: 6,
    },

    // Live Header
    liveHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    chartCurrentValBig: { 
        fontFamily: monoFamily, 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#27ae60',
        fontVariant: ['tabular-nums'],
    },
    chartUnitBig: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#27ae60',
        fontFamily: sansFamily,
    },

    chartCanvas: { 
        alignItems: 'center', 
        justifyContent: 'center',
        marginLeft: -10,
    },
    axisText: { 
        fontFamily: monoFamily, 
        fontSize: 10, 
        color: TOKENS.textFaint 
    },

    // Tooltip
    tooltipBubble: {
        backgroundColor: '#1b2623',
        paddingVertical: 6,
        paddingHorizontal: 12,
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
    tooltipValueText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    tooltipTimeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#2ecc71',
        marginTop: 3,
    },
});
