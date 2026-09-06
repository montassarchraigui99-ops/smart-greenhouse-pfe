import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Vibration } from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-gifted-charts';

// ==========================================
// Design Tokens - CyberCortex ERP IoT
// ==========================================
const TOKENS = {
    panel: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    primary: '#27ae60',
    primaryLight: 'rgba(39, 174, 96, 0.12)',
    danger: '#e74c3c',
    dangerLight: 'rgba(231, 76, 60, 0.12)',
    gray: '#94a3b8',
    border: '#e2e8f0',
    cardDark: '#0f172a',
    cardDarkBorder: 'rgba(255, 255, 255, 0.15)',
};

export interface SimulationDataPoint {
    value: number;
    label: string;
    step: string;
    day: number;
    yieldPercent: number;
    hideDataPoint?: boolean;
}

export default function PredictiveSimulationView() {
    const [tempVariation, setTempVariation] = useState<number>(0.5);
    const [photoperiod, setPhotoperiod] = useState<number>(16);
    const [isSimulating, setIsSimulating] = useState(false);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHapticIdentifier = useRef<string | number | null>(null);

    // ==========================================
    // 1. Modélisation Mathématique Prédictive
    // ==========================================
    const calculateGrowthCurve = useCallback((tempVar: number, photo: number): SimulationDataPoint[] => {
        // Optimaux théoriques idéaux (Delta 0°C, Lumière 16h)
        const tempStress = Math.pow(Math.abs(tempVar), 1.5) * 4;       // Pénalité thermique exponentielle
        const lightStress = Math.pow(Math.abs(16 - photo), 1.2) * 5;   // Pénalité photosynthétique

        // Efficacité physiologique de la plante (10% à 100%)
        const plantHealthEfficiency = Math.max(10, 100 - tempStress - lightStress);

        const data: SimulationDataPoint[] = [];
        // Projection sur 10 jours
        for (let day = 1; day <= 10; day++) {
            // Courbe logarithmique modulée par l'efficience de santé
            const rawYield = plantHealthEfficiency * Math.log10(day + 1.5) * 1.5;
            const yieldValue = Math.max(0, Math.round(rawYield + Math.sin(day * tempVar) * 5));
            // Calcul du rendement en pourcentage normalisé
            const yieldPct = Math.min(100, Math.max(0, Math.round((yieldValue / 140) * 100)));

            data.push({
                value: yieldValue,
                label: `J${day}`,
                step: `J+${day}`,
                day,
                yieldPercent: yieldPct,
                hideDataPoint: Platform.OS === 'web',
            });
        }
        return data;
    }, []);

    // Mémorisation optimisée des points de simulation pour des rendus ultra-fluides
    const chartData = useMemo(() => {
        return calculateGrowthCurve(tempVariation, photoperiod);
    }, [calculateGrowthCurve, tempVariation, photoperiod]);

    // Détection de l'état de stress global
    const currentHealth = chartData[chartData.length - 1]?.value ?? 100;
    const isCritical = currentHealth < 60;

    // ==========================================
    // 2. Gestion du Retour Haptique
    // ==========================================
    const triggerHapticFeedback = useCallback((identifier: string | number) => {
        if (lastHapticIdentifier.current !== identifier) {
            lastHapticIdentifier.current = identifier;
            try {
                if (Platform.OS !== 'web') {
                    Vibration.vibrate(10);
                } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            } catch {
                // Silencieux si la vibration n'est pas autorisée ou non disponible
            }
        }
    }, []);

    // ==========================================
    // 3. Rendu de l'Infobulle Dynamique (Tooltip)
    // ==========================================
    const renderTooltip = useCallback((items: any) => {
        if (!items || !items[0]) return null;
        const item = items[0] as SimulationDataPoint;

        // Déclenchement du retour haptique au verrouillage du point
        triggerHapticFeedback(item.label || item.day || item.value);

        const pointColor = isCritical ? TOKENS.danger : TOKENS.primary;
        const yieldValue = item.yieldPercent ?? Math.min(100, Math.round((item.value / 140) * 100));

        return (
            <View style={styles.tooltipContainer}>
                {/* En-tête : Badge étape temporelle */}
                <View style={styles.tooltipHeader}>
                    <View style={[styles.tooltipStatusDot, { backgroundColor: pointColor }]} />
                    <Text style={styles.tooltipStepText}>{item.step || `Jour ${item.day || item.label}`}</Text>
                </View>

                {/* Métrique principale : Rendement projeté */}
                <View style={styles.tooltipBody}>
                    <Text style={styles.tooltipMetricLabel}>Rendement estimé</Text>
                    <View style={styles.tooltipValueRow}>
                        <Text style={[styles.tooltipMetricValue, { color: pointColor }]}>
                            {yieldValue}%
                        </Text>
                        <Text style={styles.tooltipSubValue}> ({item.value} pts)</Text>
                    </View>
                </View>
            </View>
        );
    }, [isCritical, triggerHapticFeedback]);

    // ==========================================
    // 4. Passerelle de Simulation (Debounce 500ms)
    // ==========================================
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setIsSimulating(true);
            try {
                // Déclenchement silencieux de la projection CyberBrain
                await fetch('http://localhost:5000/api/telemetry/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        temperature_delta: tempVariation,
                        photoperiod: photoperiod,
                    }),
                });
            } catch (e) {
                console.error("[Prediction] Impossible de contacter le CyberBrain", e);
            } finally {
                setIsSimulating(false);
            }
        }, 500);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [tempVariation, photoperiod]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Simulez avant d'agir</Text>
                {isSimulating && <ActivityIndicator size="small" color={TOKENS.primary} />}
            </View>
            <Text style={styles.subtitle}>Modélisation par Cyber-Brain™</Text>

            {/* --- CONTROLES SIMULATION --- */}
            <View style={styles.controlsLayout}>

                {/* Variation Température */}
                <View style={styles.controlGroup}>
                    <View style={styles.controlHeader}>
                        <Text style={styles.label}>Variation de température</Text>
                        <Text style={[styles.valBadge, tempVariation < 0 ? { color: '#3498db' } : { color: '#e67e22' }]}>
                            {tempVariation > 0 ? '+' : ''}{tempVariation.toFixed(1)}°C
                        </Text>
                    </View>
                    <Slider
                        style={styles.slider}
                        minimumValue={-5}
                        maximumValue={5}
                        step={0.5}
                        value={tempVariation}
                        onValueChange={setTempVariation}
                        minimumTrackTintColor={tempVariation < 0 ? '#3498db' : '#e67e22'}
                        maximumTrackTintColor={TOKENS.border}
                        thumbTintColor={TOKENS.primary}
                    />
                    <View style={styles.sliderLimits}>
                        <Text style={styles.limitText}>-5°C</Text>
                        <Text style={styles.limitText}>+5°C</Text>
                    </View>
                </View>

                {/* Photopériode */}
                <View style={styles.controlGroup}>
                    <View style={styles.controlHeader}>
                        <Text style={styles.label}>Photopériode</Text>
                        <Text style={styles.valBadge}>{photoperiod.toFixed(0)} h</Text>
                    </View>
                    <Slider
                        style={styles.slider}
                        minimumValue={8}
                        maximumValue={24}
                        step={1}
                        value={photoperiod}
                        onValueChange={setPhotoperiod}
                        minimumTrackTintColor="#f1c40f"
                        maximumTrackTintColor={TOKENS.border}
                        thumbTintColor={TOKENS.primary}
                    />
                    <View style={styles.sliderLimits}>
                        <Text style={styles.limitText}>8h</Text>
                        <Text style={styles.limitText}>24h</Text>
                    </View>
                </View>

            </View>

            {/* --- GRAPHIQUE PREDICTIF AVEC POINTEUR INTERACTIF & CROSSHAIR --- */}
            <View style={styles.chartContainer}>
                <View style={styles.chartHeaderRow}>
                    <Text style={styles.chartTitle}>Impact projeté sur le rendement (10 Jours)</Text>
                    <View style={styles.liveCursorBadge}>
                        <View style={[styles.livePulseDot, { backgroundColor: isCritical ? TOKENS.danger : TOKENS.primary }]} />
                        <Text style={styles.liveCursorText}>Survol interactif actif</Text>
                    </View>
                </View>

                <View style={styles.chartWrapper}>
                    <LineChart
                        data={chartData}
                        width={Platform.OS === 'web' ? 800 : 310}
                        height={210}
                        thickness={3.5}
                        color={isCritical ? TOKENS.danger : TOKENS.primary}
                        hideDataPoints={Platform.OS === 'web'}
                        dataPointsColor={isCritical ? TOKENS.danger : TOKENS.primary}
                        startFillColor={isCritical ? 'rgba(231, 76, 60, 0.28)' : TOKENS.primaryLight}
                        endFillColor="rgba(255,255,255,0.01)"
                        startOpacity={0.85}
                        endOpacity={0.1}
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor={TOKENS.border}
                        yAxisTextStyle={{ color: TOKENS.gray, fontSize: 11, fontWeight: '600' }}
                        xAxisLabelTextStyle={{ color: TOKENS.gray, fontSize: 11, fontWeight: '600' }}
                        noOfSections={4}
                        maxValue={150}
                        curved
                        areaChart
                        isAnimated={true}
                        animationDuration={500}
                        // ==========================================
                        // CONFIGURATION POINTER & TOOLTIP
                        // ==========================================
                        pointerConfig={{
                            // Curseur vertical pointillé vert industriel
                            pointerStripColor: '#27ae60',
                            pointerStripWidth: 2,
                            strokeDashArray: [2, 2],
                            pointerStripUptoDataPoint: true,

                            // Marqueur de point circulaire interactif
                            pointerColor: '#27ae60',
                            radius: 6,

                            // Comportement & fluidité
                            activatePointersInstantlyOnTouch: true,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelWidth: 140,
                            pointerLabelHeight: 65,
                            shiftPointerLabelX: -60,
                            shiftPointerLabelY: 5,

                            // Composant de rendu de l'infobulle
                            pointerLabelComponent: renderTooltip,
                        }}
                    />
                </View>

                {isCritical && (
                    <View style={styles.alertBanner}>
                        <Text style={styles.alertBannerText}>
                            ⚠️ Le profil paramétrique causera de lourds dommages physiologiques sur la culture.
                        </Text>
                    </View>
                )}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: TOKENS.panel,
        borderRadius: 24,
        padding: 24,
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 8,
        marginVertical: 15,
        borderWidth: 1,
        borderColor: TOKENS.border,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: TOKENS.text,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: TOKENS.textMuted,
        marginTop: 4,
        marginBottom: 20,
        fontWeight: '500',
    },
    controlsLayout: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        gap: 20,
        marginBottom: 25,
    },
    controlGroup: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    controlHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: TOKENS.text,
    },
    valBadge: {
        fontSize: 16,
        fontWeight: '800',
        color: TOKENS.primary,
        backgroundColor: TOKENS.panel,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    slider: {
        width: '100%',
        height: 40,
        marginVertical: 5,
    },
    sliderLimits: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    limitText: {
        fontSize: 12,
        color: TOKENS.gray,
        fontWeight: '600',
    },
    chartContainer: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderColor: TOKENS.border,
    },
    chartHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TOKENS.text,
    },
    liveCursorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    livePulseDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    liveCursorText: {
        fontSize: 11,
        fontWeight: '600',
        color: TOKENS.textMuted,
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        width: '100%',
        overflow: 'visible',
    },

    // ==========================================
    // Styles Infobulle Dynamique (Tooltip Card)
    // ==========================================
    tooltipContainer: {
        backgroundColor: TOKENS.cardDark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: TOKENS.cardDarkBorder,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 10,
        minWidth: 130,
        alignItems: 'flex-start',
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    tooltipStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tooltipStepText: {
        color: '#f8fafc',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    tooltipBody: {
        marginTop: 2,
    },
    tooltipMetricLabel: {
        color: '#94a3b8',
        fontSize: 9.5,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tooltipValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    tooltipMetricValue: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    tooltipSubValue: {
        color: '#94a3b8',
        fontSize: 10.5,
        fontWeight: '600',
    },

    alertBanner: {
        marginTop: 20,
        backgroundColor: TOKENS.dangerLight,
        padding: 14,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderColor: TOKENS.danger,
    },
    alertBannerText: {
        color: TOKENS.danger,
        fontWeight: '600',
        fontSize: 13,
    },
});
