/**
 * Living Intelligence Predictive Yield Simulator ("What-If" Laboratory)
 * Biophysical simulation with sleek sliders, smooth Bézier projection curves,
 * and a distinct "Before / After" outcome card (Expected Yield, Harvest Time, Risk Level).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Vibration, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../constants/theme';
import { StatusBadge, StatusType } from './ui/StatusBadge';

export interface SimulationDataPoint {
    value: number;
    label: string;
    step: string;
    day: number;
    yieldPercent: number;
    hideDataPoint?: boolean;
}

export default function PredictiveSimulationView() {
    const { width: windowWidth } = useWindowDimensions();
    const [tempDelta, setTempDelta] = useState<number>(0.5); // Delta -4°C to +4°C
    const [photoperiod, setPhotoperiod] = useState<number>(16); // 8h to 24h
    const [irrigationFactor, setIrrigationFactor] = useState<number>(100); // 50% to 150%
    const [isSimulating, setIsSimulating] = useState(false);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ==========================================
    // 1. Modélisation Mathématique & Physiological Yield
    // ==========================================
    const calculateProjection = useCallback(
        (tDelta: number, photo: number, irrig: number) => {
            const tempStress = Math.pow(Math.abs(tDelta), 1.4) * 3.8;
            const lightStress = Math.pow(Math.abs(16 - photo), 1.2) * 4.5;
            const waterStress = Math.pow(Math.abs(100 - irrig) / 10, 1.3) * 2.2;

            const healthEfficiency = Math.max(15, Math.min(100, 100 - tempStress - lightStress - waterStress));

            const points: SimulationDataPoint[] = [];
            for (let day = 1; day <= 10; day++) {
                const rawYield = healthEfficiency * Math.log10(day + 1.4) * 1.5;
                const yieldVal = Math.max(0, Math.round(rawYield + Math.sin(day * tDelta) * 4));
                const yieldPct = Math.min(100, Math.max(0, Math.round((yieldVal / 140) * 100)));

                points.push({
                    value: yieldVal,
                    label: `J${day}`,
                    step: `J+${day}`,
                    day,
                    yieldPercent: yieldPct,
                    hideDataPoint: Platform.OS === 'web',
                });
            }

            return {
                points,
                healthEfficiency: Math.round(healthEfficiency),
                simulatedYield: points[points.length - 1]?.yieldPercent || 85,
            };
        },
        []
    );

    const { points: chartData, simulatedYield } = useMemo(() => {
        return calculateProjection(tempDelta, photoperiod, irrigationFactor);
    }, [calculateProjection, tempDelta, photoperiod, irrigationFactor]);

    // Baseline (Before) vs Simulated (After)
    const baselineYield = 86;
    const baselineHarvestDays = 28;

    // Harvest time calculation based on growth acceleration or deceleration
    const deltaDays = Math.round(((baselineYield - simulatedYield) / 10) * 2.5);
    const simulatedHarvestDays = Math.max(18, baselineHarvestDays + deltaDays);

    // Risk level assessment
    let simulatedRiskStatus: StatusType = 'healthy';
    let simulatedRiskLabel = 'Faible (Optimal)';
    if (simulatedYield < 65) {
        simulatedRiskStatus = 'critical';
        simulatedRiskLabel = 'Élevé (Stress sévère)';
    } else if (simulatedYield < 80) {
        simulatedRiskStatus = 'attention';
        simulatedRiskLabel = 'Modéré (Vigilance)';
    }

    // Silent background dispatch to backend
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setIsSimulating(true);
            try {
                await fetch('http://localhost:5000/api/telemetry/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        temperature_delta: tempDelta,
                        photoperiod,
                        irrigation_factor: irrigationFactor,
                    }),
                });
            } catch (err) {
                // Silently handle
            } finally {
                setIsSimulating(false);
            }
        }, 500);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [tempDelta, photoperiod, irrigationFactor]);

    const yieldDelta = simulatedYield - baselineYield;

    return (
        <View style={styles.labCard}>
            {/* Header */}
            <View style={styles.labHeader}>
                <View style={styles.labTitleRow}>
                    <View style={styles.labIconBox}>
                        <Ionicons name="flask" size={20} color={Colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.labTitle}>Laboratoire "What-If" Prédictif</Text>
                        <Text style={styles.labSubtitle}>
                            Simulation biophysique de rendement et d'échéance de récolte
                        </Text>
                    </View>
                </View>
                {isSimulating && (
                    <View style={styles.simulatingBadge}>
                        <Ionicons name="sync" size={12} color={Colors.primary} />
                        <Text style={styles.simulatingText}>Calcul en cours</Text>
                    </View>
                )}
            </View>

            {/* Visual Sliders / Steppers for Variables */}
            <View style={styles.slidersContainer}>
                {/* 1. Temp Delta Slider */}
                <View style={styles.sliderItem}>
                    <View style={styles.sliderLabelRow}>
                        <View style={styles.sliderTag}>
                            <Ionicons name="thermometer-outline" size={14} color={Colors.temperature} />
                            <Text style={styles.sliderName}>Variation Température</Text>
                        </View>
                        <Text style={styles.sliderValueText}>
                            {tempDelta > 0 ? `+${tempDelta.toFixed(1)}` : tempDelta.toFixed(1)} °C
                        </Text>
                    </View>
                    <Slider
                        minimumValue={-4.0}
                        maximumValue={4.0}
                        step={0.1}
                        value={tempDelta}
                        onValueChange={setTempDelta}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                        style={styles.sliderControl}
                    />
                    <View style={styles.sliderRangeLimits}>
                        <Text style={styles.limitText}>-4.0°C (Froid)</Text>
                        <Text style={styles.limitCenter}>0.0°C (Réel)</Text>
                        <Text style={styles.limitText}>+4.0°C (Chaud)</Text>
                    </View>
                </View>

                {/* 2. Photoperiod Slider */}
                <View style={styles.sliderItem}>
                    <View style={styles.sliderLabelRow}>
                        <View style={styles.sliderTag}>
                            <Ionicons name="sunny-outline" size={14} color={Colors.light} />
                            <Text style={styles.sliderName}>Photopériode Artificielle</Text>
                        </View>
                        <Text style={styles.sliderValueText}>{photoperiod.toFixed(0)} h / jour</Text>
                    </View>
                    <Slider
                        minimumValue={8}
                        maximumValue={24}
                        step={1}
                        value={photoperiod}
                        onValueChange={setPhotoperiod}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                        style={styles.sliderControl}
                    />
                    <View style={styles.sliderRangeLimits}>
                        <Text style={styles.limitText}>8h (Court)</Text>
                        <Text style={styles.limitCenter}>16h (Optimal)</Text>
                        <Text style={styles.limitText}>24h (Max)</Text>
                    </View>
                </View>

                {/* 3. Irrigation Factor Slider */}
                <View style={styles.sliderItem}>
                    <View style={styles.sliderLabelRow}>
                        <View style={styles.sliderTag}>
                            <Ionicons name="water-outline" size={14} color={Colors.humidity} />
                            <Text style={styles.sliderName}>Régime d'Irrigation</Text>
                        </View>
                        <Text style={styles.sliderValueText}>{irrigationFactor.toFixed(0)} %</Text>
                    </View>
                    <Slider
                        minimumValue={50}
                        maximumValue={150}
                        step={5}
                        value={irrigationFactor}
                        onValueChange={setIrrigationFactor}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.border}
                        thumbTintColor={Colors.primary}
                        style={styles.sliderControl}
                    />
                    <View style={styles.sliderRangeLimits}>
                        <Text style={styles.limitText}>50% (Stress sec)</Text>
                        <Text style={styles.limitCenter}>100% (Nominal)</Text>
                        <Text style={styles.limitText}>150% (Sur-irrigation)</Text>
                    </View>
                </View>
            </View>

            {/* DISTINCT "BEFORE / AFTER" OUTCOME CARD */}
            <View style={styles.outcomeCard}>
                <View style={styles.outcomeHeader}>
                    <Text style={styles.outcomeTitle}>Impact Comparatif du Scénario</Text>
                    <Text style={styles.outcomeSub}>Projection calculée sur 10 jours de culture</Text>
                </View>

                <View style={styles.comparisonGrid}>
                    {/* Column 1: Expected Yield */}
                    <View style={styles.comparisonCol}>
                        <Text style={styles.compLabel}>Rendement Projeté</Text>
                        <View style={styles.compValueRow}>
                            <Text style={styles.beforeValue}>{baselineYield}%</Text>
                            <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                            <Text
                                style={[
                                    styles.afterValue,
                                    { color: yieldDelta >= 0 ? Colors.secondary : Colors.danger },
                                ]}
                            >
                                {simulatedYield}%
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.compDelta,
                                { color: yieldDelta >= 0 ? Colors.secondary : Colors.danger },
                            ]}
                        >
                            {yieldDelta >= 0 ? `+${yieldDelta}%` : `${yieldDelta}%`} vs référence
                        </Text>
                    </View>

                    <View style={styles.compDivider} />

                    {/* Column 2: Harvest Time */}
                    <View style={styles.comparisonCol}>
                        <Text style={styles.compLabel}>Échéance Récolte</Text>
                        <View style={styles.compValueRow}>
                            <Text style={styles.beforeValue}>J+{baselineHarvestDays}</Text>
                            <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                            <Text style={styles.afterValue}>J+{simulatedHarvestDays}</Text>
                        </View>
                        <Text style={styles.compDelta}>
                            {deltaDays < 0
                                ? `${deltaDays} jours plus tôt`
                                : deltaDays > 0
                                ? `+${deltaDays} jours de retard`
                                : 'Calendrier inchangé'}
                        </Text>
                    </View>

                    <View style={styles.compDivider} />

                    {/* Column 3: Risk Level */}
                    <View style={styles.comparisonCol}>
                        <Text style={styles.compLabel}>Niveau de Risque</Text>
                        <View style={{ marginTop: 6 }}>
                            <StatusBadge status={simulatedRiskStatus} label={simulatedRiskLabel} />
                        </View>
                        <Text style={styles.compDelta}>Stabilité physiologique</Text>
                    </View>
                </View>
            </View>

            {/* Projection Chart */}
            <View style={styles.chartSection}>
                <View style={styles.chartTitleRow}>
                    <Text style={styles.chartTitle}>Trajectoire d'Accroissement Biologique</Text>
                    <Text style={styles.chartScale}>Échelle normalisée (0 à 100)</Text>
                </View>

                <LineChart
                    curved
                    curveType={0}
                    data={chartData}
                    width={Math.min((windowWidth || 380) - 72, 860)}
                    height={190}
                    color={yieldDelta >= 0 ? Colors.primary : Colors.warning}
                    thickness={3}
                    areaChart
                    startFillColor={yieldDelta >= 0 ? Colors.secondary : Colors.warning}
                    endFillColor={`${Colors.surface}00`}
                    startOpacity={0.25}
                    endOpacity={0.02}
                    initialSpacing={12}
                    endSpacing={12}
                    noOfSections={3}
                    rulesColor={Colors.border}
                    rulesType="solid"
                    yAxisColor="transparent"
                    xAxisColor={Colors.border}
                    yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10, fontFamily: Typography.monoFont }}
                    xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10, fontFamily: Typography.monoFont }}
                    hideDataPoints={Platform.OS === 'web'}
                    dataPointsColor={yieldDelta >= 0 ? Colors.primary : Colors.warning}
                    dataPointsRadius={4}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    labCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse,
    },
    labHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    labTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    labIconBox: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.md,
        backgroundColor: `${Colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    labTitle: {
        fontSize: 16.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    labSubtitle: {
        fontSize: 11.5,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    simulatingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.round,
    },
    simulatingText: {
        fontSize: 11,
        color: Colors.primary,
        fontFamily: Typography.primaryFont,
        fontWeight: '600',
    },
    // Sliders
    slidersContainer: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    sliderItem: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sliderLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    sliderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sliderName: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    sliderValueText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Typography.monoFont,
    },
    sliderControl: {
        height: 34,
    },
    sliderRangeLimits: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    limitText: {
        fontSize: 10,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    limitCenter: {
        fontSize: 10,
        color: Colors.textDark,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
    },
    // Before / After Outcome Card
    outcomeCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: `${Colors.primary}30`,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        ...Shadows.subtle,
    },
    outcomeHeader: {
        marginBottom: Spacing.md,
    },
    outcomeTitle: {
        fontSize: 13.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    outcomeSub: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    comparisonGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    comparisonCol: {
        flex: 1,
        minWidth: 160,
    },
    compLabel: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    compValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    beforeValue: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.textMuted,
        fontFamily: Typography.monoFont,
        textDecorationLine: 'line-through',
    },
    afterValue: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: Typography.monoFont,
    },
    compDelta: {
        fontSize: 10.5,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 3,
    },
    compDivider: {
        width: 1,
        height: 48,
        backgroundColor: Colors.border,
    },
    // Chart Section
    chartSection: {
        marginTop: Spacing.xs,
    },
    chartTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    chartTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    chartScale: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
});
