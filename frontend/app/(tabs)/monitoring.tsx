import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable, PressableStateCallbackType, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSensors } from '../../hooks/useSensors';

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
    green: '#2f9e5b',
    greenDeep: '#1f7a46',
    greenPale: '#d8f0e0',
    soil: '#b08a5f',
    sky: '#6fa9c9',
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

// ============================================
// MOCK DATA FOR CHARTS TILL HISTORICAL API IS READY
// ============================================
const generateData = (base: number, variance: number, pts: number) => {
    return Array.from({ length: pts }).map((_, i) => ({
        value: base + (Math.sin(i * 0.5) * variance) + (Math.random() * variance * 0.5),
        label: `${i}:00`
    }));
};

const dataTemp = generateData(24, 2, 24);
const dataAir = generateData(60, 5, 24);
const dataSoil = generateData(42, 3, 24);

const FILTERS = ['En direct', '24H', '7 Jours', '30 Jours'];

export default function MonitoringScreen() {
    const [activeFilter, setActiveFilter] = useState('24H');

    // --- INTÉGRATION DE LA COUCHE RÉSEAU ---
    const { data: sensors, isLoading, isError, error } = useSensors();

    const chartWidth = SCREEN_W > 800 ? Math.min(SCREEN_W - 140, 1000) : SCREEN_W - 80;

    // --- GESTION DES ÉTATS ---
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
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <Text style={styles.h1}>Analytique & Télémétrie</Text>
                    <View style={styles.liveBadgeRow}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                        <Text style={styles.syncText}>Dernière synchro: à l'instant</Text>
                    </View>
                </View>

                {/* --- FILTRES --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterWrap}>
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

                {/* --- MAPPING DYNAMIQUE DES CAPTEURS --- */}
                {sensors?.map((item: any) => {
                    // Attribution dynamique de couleur & graphiques factices selon le type de capteur
                    let color = TOKENS.green;
                    let mockData = dataTemp;

                    if (item.sensor_key.includes('humidity_air')) {
                        color = TOKENS.sky;
                        mockData = dataAir;
                    } else if (item.sensor_key.includes('soil')) {
                        color = TOKENS.soil;
                        mockData = dataSoil;
                    } else if (item.sensor_key.includes('ph')) {
                        color = TOKENS.amber;
                    }

                    return (
                        <View style={styles.chartCard} key={item.sensor_key}>
                            <View style={styles.chartHead}>
                                <View>
                                    <Text style={styles.chartTitle}>{item.name}</Text>
                                    <Text style={styles.chartSubtitle}>Statut: {item.status}</Text>
                                </View>
                                <Text style={[styles.chartCurrentVal, { color }]}>
                                    {item.value} <Text style={{ fontSize: 14 }}>{item.unit}</Text>
                                </Text>
                            </View>
                            <View style={styles.chartCanvas}>
                                <LineChart
                                    data={mockData}
                                    width={chartWidth}
                                    height={220}
                                    color={color}
                                    thickness={3}
                                    curved={true}
                                    hideDataPoints={IS_WEB}
                                    hideRules={true}
                                    hideYAxisText={false}
                                    yAxisTextStyle={styles.axisText}
                                    xAxisLabelTextStyle={styles.axisText}
                                    yAxisColor="transparent"
                                    xAxisColor={TOKENS.line}
                                    initialSpacing={10}
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
    container: { flex: 1, backgroundColor: TOKENS.bg },
    scrollStage: { paddingTop: 60, paddingHorizontal: Math.max(SCREEN_W * 0.05, 24), paddingBottom: 160 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontFamily: sansFamily, fontSize: 14, color: TOKENS.textDim },
    errorText: { fontFamily: sansFamily, fontSize: 16, color: 'red', textAlign: 'center', padding: 20 },

    // Header
    header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 },
    h1: { fontFamily: sansFamily, fontSize: 32, fontWeight: '700', color: TOKENS.text, letterSpacing: -0.5 },
    liveBadgeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf4ee', paddingHorizontal: 16, paddingVertical: 8, borderRadius: TOKENS.rPill, borderWidth: 1, borderColor: '#bcd6c4' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TOKENS.green, marginRight: 8 },
    liveText: { fontFamily: sansFamily, fontSize: 12, fontWeight: '700', color: TOKENS.greenDeep, marginRight: 12, letterSpacing: 0.5 },
    syncText: { fontFamily: monoFamily, fontSize: 11, color: TOKENS.textDim },

    // Filters
    filterWrap: { flexDirection: 'row', marginBottom: 30, gap: 12 },
    filterBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: TOKENS.rPill, backgroundColor: TOKENS.bg2, borderWidth: 1, borderColor: TOKENS.lineSoft },
    filterBtnActive: { backgroundColor: TOKENS.panel, borderColor: TOKENS.green, ...TOKENS.shadowSm },
    filterBtnHovered: { backgroundColor: '#e6ede4' },
    filterText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '500', color: TOKENS.textDim },
    filterTextActive: { color: TOKENS.greenDeep, fontWeight: '700' },

    // Cards
    chartCard: {
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.rMd,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: TOKENS.line,
        ...TOKENS.shadowSm
    },
    chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    chartTitle: { fontFamily: sansFamily, fontSize: 18, fontWeight: '600', color: TOKENS.text },
    chartSubtitle: { fontSize: 13, color: TOKENS.textFaint, marginTop: 4 },
    chartCurrentVal: { fontFamily: monoFamily, fontSize: 28, fontWeight: '600' },

    chartCanvas: { alignItems: 'center', justifyContent: 'center' },
    axisText: { fontFamily: monoFamily, fontSize: 10, color: TOKENS.textFaint }
});
