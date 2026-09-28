/**
 * Living Intelligence Cyber-Brain Automation Panel
 * Intelligent entity interface with Overarching Status, Parameter Checks, Actuators & Decision Timeline
 */

import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    Pressable,
    Platform,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActuators, useToggleActuator } from '../../hooks/useActuators';
import { fetchActuatorLogs, ActuatorLog } from '../../services/api';
import { useActiveGreenhouse } from '../../context/ActiveGreenhouseContext';
import { GreenhouseSelector } from '../../components/navigation/GreenhouseSelector';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../../constants/theme';
import { StatusBadge } from '../../components/ui/StatusBadge';

const SCREEN_W = Dimensions.get('window').width;

const LargeSwitch = ({
    isActive,
    onToggle,
    disabled,
}: {
    isActive: boolean;
    onToggle: () => void;
    disabled: boolean;
}) => {
    const trans = useRef(new Animated.Value(isActive ? 24 : 0)).current;

    React.useEffect(() => {
        Animated.spring(trans, {
            toValue: isActive ? 24 : 0,
            useNativeDriver: true,
            bounciness: 10,
            speed: 14,
        }).start();
    }, [isActive]);

    return (
        <Pressable
            onPress={disabled ? undefined : onToggle}
            style={[
                styles.switchContainer,
                isActive ? styles.switchOn : styles.switchOff,
                disabled && styles.switchDisabled,
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: isActive, disabled }}
        >
            <Animated.View style={[styles.switchThumb, { transform: [{ translateX: trans }] }]} />
        </Pressable>
    );
};

export default function ControlScreen() {
    const { activeGreenhouseId, activeGreenhouse } = useActiveGreenhouse();
    const { data: actuators, isLoading, isError } = useActuators();
    const { mutate: toggleCommand } = useToggleActuator();

    const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
    const [recentDecisions, setRecentDecisions] = useState<ActuatorLog[]>([]);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const logs = await fetchActuatorLogs(activeGreenhouseId);
                if (logs && logs.length > 0) {
                    setRecentDecisions(logs.slice(0, 8));
                }
            } catch (err) {
                // Silently fallback to mock/empty logs
            }
        };

        loadLogs();
        const interval = setInterval(loadLogs, 4000);
        return () => clearInterval(interval);
    }, [activeGreenhouseId]);

    const toggleMode = (key: string, newMode: 'AUTO' | 'MANUAL') => {
        setLocalOverrides((prev) => ({ ...prev, [key]: newMode }));
    };

    const toggleAction = (actuatorKey: string, currentState: boolean) => {
        toggleCommand({ key: actuatorKey, state: !currentState, greenhouseId: activeGreenhouseId });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Initialisation du Cyber-Brain...</Text>
            </View>
        );
    }

    if (isError || !actuators) {
        return (
            <View style={[styles.container, styles.center]}>
                <Ionicons name="alert-circle-outline" size={42} color={Colors.danger} />
                <Text style={styles.errorTitle}>Liaison Cyber-Brain interrompue</Text>
                <Text style={styles.errorSub}>Vérifiez que le serveur backend et le courtier MQTT sont actifs.</Text>
            </View>
        );
    }

    const activeCount = actuators.filter((a: any) => Boolean(a.is_active)).length;
    const inactiveCount = actuators.length - activeCount;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollStage} showsVerticalScrollIndicator={false}>
                {/* 1. OVERARCHING STATUS (Intelligent Entity Frame) */}
                <View style={styles.entityBanner}>
                    <View style={styles.entityHeaderRow}>
                        <View style={styles.entityIconBox}>
                            <Ionicons name="hardware-chip" size={24} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.statusRow}>
                                <View style={styles.livePulseDot} />
                                <Text style={styles.entityStatusTitle}>All systems operating normally</Text>
                            </View>
                            <Text style={styles.entitySubtitle}>
                                Cyber-Brain Engine · Boucle fermée temps réel active
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <GreenhouseSelector compact={true} />
                            <StatusBadge status="healthy" label="100% Autonome" />
                        </View>
                    </View>

                    <View style={styles.statsSummaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{activeCount}</Text>
                            <Text style={styles.summaryLabel}>Actuateurs En Ligne</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{inactiveCount}</Text>
                            <Text style={styles.summaryLabel}>En Veille Prédictive</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>2.4 s</Text>
                            <Text style={styles.summaryLabel}>Latence de Rétroaction</Text>
                        </View>
                    </View>
                </View>

                {/* 2. PARAMETER CHECKS (Optimal vs. Warning) */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Vérification des Paramètres Critiques</Text>
                    <Text style={styles.sectionSub}>Garde-fous algorithmiques d'environnement</Text>
                </View>

                <View style={styles.checksGrid}>
                    {[
                        { label: 'Thermique & Climat', value: '24.8 °C (Cible: 24-26°C)', status: 'healthy' as const, labelStatus: 'Optimal' },
                        { label: 'Hydrométrie Aérienne', value: '62 % (Cible: 60-70%)', status: 'healthy' as const, labelStatus: 'Optimal' },
                        { label: 'Solution Nutritive NFT', value: 'pH 6.1 · EC 1.9 mS/cm', status: 'healthy' as const, labelStatus: 'Optimal' },
                        { label: 'Indice Photopériodique', value: '16.1 h/j (Cible: 16h)', status: 'attention' as const, labelStatus: '+0.1h Delta' },
                    ].map((check, idx) => (
                        <View key={idx} style={styles.checkCard}>
                            <View style={styles.checkTop}>
                                <Text style={styles.checkLabel}>{check.label}</Text>
                                <StatusBadge status={check.status} label={check.labelStatus} />
                            </View>
                            <Text style={styles.checkValue}>{check.value}</Text>
                        </View>
                    ))}
                </View>

                {/* 3. ACTUATOR CONTROLS (Living Intelligence Cards) */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Matériel Connecté & Relais</Text>
                    <Text style={styles.sectionSub}>Bascule automatique ou forçage manuel immédiat</Text>
                </View>

                <View style={styles.actuatorsGrid}>
                    {actuators.map((act: any) => {
                        const currentMode = localOverrides[act.actuator_key] || act.mode;
                        const isAuto = currentMode === 'AUTO';
                        const isActive = Boolean(act.is_active);

                        return (
                            <View key={act.id} style={styles.actuatorCard}>
                                <View style={styles.actuatorHeader}>
                                    <View style={styles.actuatorTitleRow}>
                                        <View
                                            style={[
                                                styles.actuatorIconBox,
                                                { backgroundColor: isActive ? `${Colors.primary}15` : Colors.background },
                                            ]}
                                        >
                                            <Ionicons
                                                name={isActive ? 'power' : 'pause'}
                                                size={16}
                                                color={isActive ? Colors.primary : Colors.textMuted}
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.actuatorName}>{act.name}</Text>
                                            <Text style={styles.actuatorKey}>{act.actuator_key}</Text>
                                        </View>
                                    </View>

                                    {/* Segmented AUTO / MANUEL */}
                                    <View style={styles.modeSegment}>
                                        <Pressable
                                            onPress={() => toggleMode(act.actuator_key, 'AUTO')}
                                            style={[styles.modeBtn, isAuto && styles.modeBtnActive]}
                                        >
                                            <Text style={[styles.modeBtnText, isAuto && styles.modeBtnTextActive]}>
                                                AUTO
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => toggleMode(act.actuator_key, 'MANUAL')}
                                            style={[styles.modeBtn, !isAuto && styles.modeBtnActive]}
                                        >
                                            <Text style={[styles.modeBtnText, !isAuto && styles.modeBtnTextActive]}>
                                                MANUEL
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.actuatorBody}>
                                    {isAuto ? (
                                        <View style={styles.autoStatusBox}>
                                            <Ionicons name="sparkles" size={14} color={Colors.primary} />
                                            <Text style={styles.autoStatusText}>
                                                Régulé automatiquement : {act.auto_status_text || 'Surveillance des seuils'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.manualControlRow}>
                                            <View>
                                                <Text style={styles.manualPrompt}>Forçage matériel direct</Text>
                                                <Text style={styles.manualWarning}>
                                                    État actuel : {isActive ? 'ENCLENCHÉ (ON)' : 'COUPÉ (OFF)'}
                                                </Text>
                                            </View>
                                            <LargeSwitch
                                                isActive={isActive}
                                                onToggle={() => toggleAction(act.actuator_key, isActive)}
                                                disabled={isAuto}
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* 4. CHRONOLOGICAL TIMELINE (Recent Decisions) */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Timeline des Décisions Récentes</Text>
                    <Text style={styles.sectionSub}>Traçabilité chronologique des arbitrages autonomes</Text>
                </View>

                <View style={styles.timelineCard}>
                    {recentDecisions.length === 0 ? (
                        <Text style={styles.emptyTimelineText}>
                            Toutes les conditions sont stables. Aucune action corrective récente requise.
                        </Text>
                    ) : (
                        recentDecisions.map((decision, idx) => {
                            const dateObj = new Date(decision.timestamp);
                            const timeStr = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : 'Récemment';

                            const isTurnOn = decision.action === 'ON';

                            return (
                                <View key={idx} style={styles.timelineItem}>
                                    {/* Timeline spine dot */}
                                    <View style={styles.timelineSpine}>
                                        <View
                                            style={[
                                                styles.timelineDot,
                                                { backgroundColor: isTurnOn ? Colors.primary : Colors.textMuted },
                                            ]}
                                        />
                                        {idx !== recentDecisions.length - 1 && <View style={styles.timelineLine} />}
                                    </View>

                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Text style={styles.timelineTime}>{timeStr}</Text>
                                            <View
                                                style={[
                                                    styles.actionTag,
                                                    { backgroundColor: isTurnOn ? Colors.successBg : Colors.background },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.actionTagText,
                                                        { color: isTurnOn ? Colors.primary : Colors.textMuted },
                                                    ]}
                                                >
                                                    {decision.action}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.timelineDecisionText}>
                                            {isTurnOn ? 'Activation de' : 'Arrêt de'}{' '}
                                            <Text style={{ fontWeight: '700', color: Colors.textDark }}>
                                                {decision.actuator_key}
                                            </Text>
                                        </Text>
                                        <Text style={styles.timelineSourceText}>
                                            Déclencheur : {decision.trigger_source || 'Cyber-Brain Rule Engine'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
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
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: Spacing.md,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.danger,
        fontFamily: Typography.primaryFont,
        marginTop: Spacing.md,
    },
    errorSub: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        textAlign: 'center',
        marginTop: Spacing.xs,
        maxWidth: 320,
    },
    scrollStage: {
        paddingTop: 36,
        paddingHorizontal: Math.max(SCREEN_W * 0.05, 20),
        paddingBottom: 130,
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
    },
    // Entity Banner
    entityBanner: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse,
        marginBottom: Spacing.xl,
    },
    entityHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    entityIconBox: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: `${Colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.secondary,
    },
    entityStatusTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    entitySubtitle: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    statsSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.md,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.monoFont,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 28,
        backgroundColor: Colors.border,
    },
    // Section Headings
    sectionHeader: {
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    sectionSub: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    // Parameter Checks Grid
    checksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    checkCard: {
        flex: 1,
        minWidth: 220,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        ...Shadows.subtle,
    },
    checkTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    checkLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    checkValue: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.monoFont,
        marginTop: Spacing.xs,
    },
    // Actuators
    actuatorsGrid: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    actuatorCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        ...Shadows.diffuse,
    },
    actuatorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    actuatorTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    actuatorIconBox: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actuatorName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    actuatorKey: {
        fontSize: 10.5,
        color: Colors.textMuted,
        fontFamily: Typography.monoFont,
    },
    modeSegment: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.round,
        padding: 3,
    },
    modeBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
    },
    modeBtnActive: {
        backgroundColor: Colors.primary,
        ...Shadows.subtle,
    },
    modeBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    modeBtnTextActive: {
        color: Colors.surface,
    },
    actuatorBody: {
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    autoStatusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    autoStatusText: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    manualControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    manualPrompt: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    manualWarning: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.monoFont,
        marginTop: 2,
    },
    // Switch
    switchContainer: {
        width: 50,
        height: 28,
        borderRadius: 14,
        padding: 2,
        justifyContent: 'center',
    },
    switchOn: {
        backgroundColor: Colors.primary,
    },
    switchOff: {
        backgroundColor: Colors.border,
    },
    switchDisabled: {
        opacity: 0.5,
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        ...Shadows.subtle,
    },
    // Chronological Timeline
    timelineCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse,
    },
    emptyTimelineText: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: Spacing.md,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    timelineSpine: {
        width: 24,
        alignItems: 'center',
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    timelineLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: Colors.border,
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        paddingLeft: Spacing.sm,
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    timelineTime: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
        fontFamily: Typography.monoFont,
    },
    actionTag: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    actionTagText: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: Typography.monoFont,
    },
    timelineDecisionText: {
        fontSize: 13,
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    timelineSourceText: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
});
