import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, Dimensions, PressableStateCallbackType, ActivityIndicator } from 'react-native';
import { useActuators, useToggleActuator } from '../../hooks/useActuators';

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
    amber: '#d9922f',
    sky: '#6fa9c9',
    danger: '#d9603f',
    rLg: 26,
    rMd: 16,
    rSm: 10,
    rPill: 999,
    shadowSm: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    shadowMd: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 34, elevation: 6 }
};

const SCREEN_W = Dimensions.get('window').width;
const IS_WEB = Platform.OS === 'web';
const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

const webTransitionInteractive = Platform.select({
    web: { transition: 'transform 0.3s cubic-bezier(0.22, 0.9, 0.32, 1), box-shadow 0.3s cubic-bezier(0.22, 0.9, 0.32, 1)' } as any,
    default: {}
});

const webTransitionColor = Platform.select({
    web: { transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease' } as any,
    default: {}
});

// ============================================
// CUSTOM SWITCH COMPONENT
// ============================================
const LargeSwitch = ({
    isActive,
    onToggle,
    disabled
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
            speed: 12
        }).start();
    }, [isActive]);

    return (
        <Pressable
            onPress={disabled ? undefined : onToggle}
            style={[
                styles.switchContainer,
                isActive ? styles.switchOn : styles.switchOff,
                disabled && styles.switchDisabled,
                webTransitionColor
            ]}
        >
            <Animated.View style={[styles.switchThumb, { transform: [{ translateX: trans }] }]} />
        </Pressable>
    );
};

export default function ControlScreen() {
    const { data: actuators, isLoading, isError } = useActuators();
    const { mutate: toggleCommand } = useToggleActuator();

    const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

    const toggleMode = (key: string, newMode: 'AUTO' | 'MANUAL') => {
        setLocalOverrides(prev => ({ ...prev, [key]: newMode }));
    };

    const toggleAction = (actuatorKey: string, currentState: boolean) => {
        // Envoi réseau (POST vers Node, puis SQLite -> MQTT)
        toggleCommand({ key: actuatorKey, state: !currentState });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={TOKENS.green} />
                <Text style={{ marginTop: 12, fontFamily: sansFamily, color: TOKENS.textDim }}>Chargement du matériel...</Text>
            </View>
        );
    }

    if (isError || !actuators) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'red', fontFamily: sansFamily }}>Erreur de connexion au panneau matériel.</Text>
            </View>
        );
    }

    const activeCount = actuators.filter((a: any) => Boolean(a.is_active)).length;
    const inactiveCount = actuators.length - activeCount;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollStage} showsVerticalScrollIndicator={false}>

                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <Text style={styles.h1}>Panneau de Contrôle</Text>
                    <View style={styles.summaryBadge}>
                        <Text style={styles.summaryText}>Actifs: {activeCount} <Text style={{ color: TOKENS.lineSoft }}>|</Text> Inactifs: {inactiveCount}</Text>
                    </View>
                </View>

                {/* --- ACTUATOR GRID --- */}
                <View style={styles.grid}>
                    {actuators.map((act: any) => {
                        // Priority to local override for mode matching
                        const currentMode = localOverrides[act.actuator_key] || act.mode;
                        const isAuto = currentMode === 'AUTO';
                        const isActive = Boolean(act.is_active);

                        return (
                            <Pressable
                                key={act.id}
                                style={({ hovered, pressed }: HoverState) => [
                                    styles.card,
                                    hovered && styles.cardHovered,
                                    pressed && styles.cardPressed
                                ]}
                            >
                                {/* HEADER CARD */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardTitleRow}>
                                        <View style={[styles.statusIcon, { backgroundColor: isActive ? act.icon_color : TOKENS.lineSoft }]} />
                                        <Text style={styles.cardTitle}>{act.name}</Text>
                                    </View>
                                    <View style={styles.modeToggleGroup}>
                                        <Pressable
                                            onPress={() => toggleMode(act.actuator_key, 'AUTO')}
                                            style={({ hovered }: HoverState) => [
                                                styles.modeButton,
                                                styles.modeButtonLeft,
                                                isAuto && styles.modeButtonActive,
                                                hovered && !isAuto && styles.modeButtonHovered,
                                                webTransitionColor
                                            ]}
                                        >
                                            <Text style={[styles.modeButtonText, isAuto && styles.modeButtonTextActive]}>AUTO</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => toggleMode(act.actuator_key, 'MANUAL')}
                                            style={({ hovered }: HoverState) => [
                                                styles.modeButton,
                                                styles.modeButtonRight,
                                                !isAuto && styles.modeButtonActive,
                                                hovered && isAuto && styles.modeButtonHovered,
                                                webTransitionColor
                                            ]}
                                        >
                                            <Text style={[styles.modeButtonText, !isAuto && styles.modeButtonTextActive]}>MANUEL</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                {/* BODY CARD */}
                                <View style={styles.cardBody}>
                                    {isAuto ? (
                                        <View style={styles.autoPlaceholder}>
                                            <View style={[styles.autoIndicatorDot, isActive ? { backgroundColor: act.icon_color } : { backgroundColor: TOKENS.line }]} />
                                            <Text style={styles.autoStatusText}>{act.auto_status_text}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.manualControls}>
                                            <Text style={styles.manualSubtext}>Forçage matériel activé</Text>
                                            <LargeSwitch
                                                isActive={isActive}
                                                onToggle={() => toggleAction(act.actuator_key, isActive)}
                                                disabled={isAuto}
                                            />
                                        </View>
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

            </ScrollView>
        </View>
    );
}

// ============================================
// STYLESHEET STRICT
// ============================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: TOKENS.bg },
    scrollStage: { paddingTop: 60, paddingHorizontal: Math.max(SCREEN_W * 0.05, 24), paddingBottom: 160 },

    header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' },
    h1: { fontFamily: sansFamily, fontSize: 32, fontWeight: '700', color: TOKENS.text, letterSpacing: -0.5 },
    summaryBadge: {
        backgroundColor: TOKENS.greenDeep, paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: TOKENS.rPill, marginBottom: 4, ...TOKENS.shadowSm
    },
    summaryText: { color: '#ffffff', fontSize: 12, fontWeight: '600', fontFamily: monoFamily },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    card: {
        width: SCREEN_W > 800 ? '48%' : '100%',
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.rMd,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: TOKENS.line,
        transform: [{ scale: 1 }],
        ...TOKENS.shadowSm,
        ...webTransitionInteractive
    },
    cardHovered: {
        transform: [{ scale: 1.015 }],
        borderColor: TOKENS.green,
        ...TOKENS.shadowMd
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.95
    },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
    statusIcon: { width: 12, height: 12, borderRadius: 6, marginRight: 10, ...webTransitionColor },
    cardTitle: { fontFamily: sansFamily, fontSize: 18, fontWeight: '600', color: TOKENS.text },

    modeToggleGroup: { flexDirection: 'row', borderWidth: 1, borderColor: TOKENS.line, borderRadius: TOKENS.rSm, overflow: 'hidden' },
    modeButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: TOKENS.panel },
    modeButtonHovered: { backgroundColor: TOKENS.bg2 },
    modeButtonLeft: { borderRightWidth: 1, borderRightColor: TOKENS.line },
    modeButtonRight: {},
    modeButtonActive: { backgroundColor: TOKENS.greenPale },
    modeButtonText: { fontFamily: monoFamily, fontSize: 11, fontWeight: '500', color: TOKENS.textDim },
    modeButtonTextActive: { color: TOKENS.greenDeep, fontWeight: '700' },

    cardBody: { minHeight: 64, justifyContent: 'center', backgroundColor: TOKENS.bg, borderRadius: TOKENS.rSm, paddingHorizontal: 16, borderLeftWidth: 3, borderLeftColor: TOKENS.lineSoft },
    autoPlaceholder: { flexDirection: 'row', alignItems: 'center' },
    autoIndicatorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10, ...webTransitionColor },
    autoStatusText: { fontSize: 13, color: TOKENS.textDim, flexShrink: 1, lineHeight: 20 },

    manualControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    manualSubtext: { fontSize: 13, color: TOKENS.text, fontWeight: '500' },

    switchContainer: { width: 52, height: 28, borderRadius: 14, justifyContent: 'center', padding: 2, borderWidth: 1 },
    switchOn: { backgroundColor: TOKENS.green, borderColor: TOKENS.greenDeep },
    switchOff: { backgroundColor: TOKENS.lineSoft, borderColor: TOKENS.line },
    switchDisabled: { opacity: 0.5 },
    switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', ...TOKENS.shadowSm }
});
