import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable, PressableStateCallbackType, RefreshControl } from 'react-native';

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
    info: '#2f9e5b',
    warning: '#d9922f',
    critical: '#d9603f',
    greenDeep: '#1f7a46',
    rMd: 16,
    rSm: 10,
    rPill: 999,
    shadowSm: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    shadowMd: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 34, elevation: 6 },
    shadowCritical: { shadowColor: 'rgba(217,96,63,0.3)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 }
};

const SCREEN_W = Dimensions.get('window').width;
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

import { fetchAlerts, markAlertAsRead, AlertItem } from '../../services/api';

// ============================================
// FILTRES
// ============================================
const FILTERS = ['Toutes', 'Simulations', 'Critique', 'Warning', 'Info'];

export default function AlertsScreen() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [activeFilter, setActiveFilter] = useState('Toutes');
    const [refreshing, setRefreshing] = useState(false);

    // Fonction de chargement commune (utilisée pour Init, Pull-to-Refresh et Polling)
    const loadAlerts = async () => {
        try {
            const data = await fetchAlerts();
            // Trie décroissant par date pour s'assurer que les plus récentes sont en haut
            const sortedData = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setAlerts(sortedData);
        } catch (error) {
            console.error('[ALERTS] Failed to load alerts:', error);
        }
    };

    // Cycle de vie : Polling et Nettoyage Mémoire Restrictif
    useEffect(() => {
        loadAlerts(); // 1er appel immédiat

        const intervalId = setInterval(() => {
            loadAlerts();
        }, 5000); // 5000ms stricte

        return () => clearInterval(intervalId); // Nettoyage de la mémoire au démontage
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await markAlertAsRead(id);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
        } catch (error) {
            console.error('[ALERTS] Failed to ack alert:', error);
        }
    };

    const activeAlertsCount = alerts.filter(a => !a.is_read).length;

    const filteredAlerts = alerts.filter(a => {
        // Identification formelle de simulation par le suffixe du tag injecté et titrage
        const isSimu = a.tag && (a.tag.startsWith('SIMU-') || a.title?.includes('Simulation Cyber-Brain'));

        if (activeFilter === 'Simulations') return isSimu;

        // Sécurité absolue demandée : l'onglet "Toutes" et les autres DOIVENT exclure les simulations
        if (isSimu) return false;

        if (activeFilter === 'Toutes') return true;

        return a.severity.toLowerCase() === activeFilter.toLowerCase();
    });

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollStage}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TOKENS.greenDeep]} />}
            >

                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <Text style={styles.h1}>Journal des Alertes</Text>
                    <View style={styles.summaryBadge}>
                        <Text style={styles.summaryText}>{activeAlertsCount} non lues</Text>
                    </View>
                </View>

                {/* --- FILTERS --- */}
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

                {/* --- ALERTS LIST --- */}
                <View style={styles.listWrap}>
                    {filteredAlerts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Aucune alerte critique enregistrée pour le moment.</Text>
                        </View>
                    ) : (
                        filteredAlerts.map((alert) => {

                            let colorHex = TOKENS.info;
                            let bgAccent = '#eaf4ee'; // soft green

                            if (alert.severity === 'Warning') {
                                colorHex = TOKENS.warning;
                                bgAccent = '#fdf4e8'; // soft amber
                            } else if (alert.severity === 'Critique') {
                                colorHex = TOKENS.critical;
                                bgAccent = '#fcefe8'; // soft red
                            }

                            return (
                                <Pressable
                                    key={alert.id}
                                    style={({ hovered, pressed }: HoverState) => [
                                        styles.alertCard,
                                        !alert.is_read && { borderLeftColor: colorHex },
                                        hovered && [styles.cardHovered, alert.severity === 'Critique' && { ...TOKENS.shadowCritical }],
                                        pressed && styles.cardPressed
                                    ]}
                                >
                                    <View style={styles.cardColLeft}>
                                        <View style={[styles.iconWrap, { backgroundColor: bgAccent }]}>
                                            <View style={[styles.innerDot, { backgroundColor: colorHex }]} />
                                        </View>
                                    </View>

                                    <View style={styles.cardColRight}>
                                        <View style={styles.cardHeader}>
                                            <View>
                                                <Text style={styles.cardTitle}>{alert.title}</Text>
                                                <Text style={styles.timestamp}>{new Date(alert.created_at).toLocaleString()}</Text>
                                            </View>
                                            {alert.error_code && (
                                                <View style={[styles.codeBadge, { borderColor: colorHex }]}>
                                                    <Text style={[styles.codeText, { color: colorHex }]}>{alert.error_code}</Text>
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.cardDesc}>{alert.description}</Text>

                                        <View style={styles.actionsRow}>
                                            {!alert.is_read && (
                                                <Pressable
                                                    onPress={() => handleMarkAsRead(alert.id)}
                                                    style={({ hovered }: HoverState) => [styles.btnGhost, hovered && { backgroundColor: TOKENS.line }]}
                                                >
                                                    <Text style={styles.btnText}>Acquitter</Text>
                                                </Pressable>
                                            )}
                                            <Pressable
                                                style={({ hovered }: HoverState) => [styles.btnGhost, hovered && { backgroundColor: TOKENS.line }]}
                                            >
                                                <Text style={[styles.btnText, { color: TOKENS.textDim }]}>Détails</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </View>

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

    // Header
    header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 },
    h1: { fontFamily: sansFamily, fontSize: 32, fontWeight: '700', color: TOKENS.text, letterSpacing: -0.5 },
    summaryBadge: { backgroundColor: TOKENS.panel, paddingHorizontal: 12, paddingVertical: 6, borderRadius: TOKENS.rPill, borderWidth: 1, borderColor: TOKENS.lineSoft, ...TOKENS.shadowSm },
    summaryText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '600', color: TOKENS.critical },

    // Filters
    filterWrap: { flexDirection: 'row', marginBottom: 30, gap: 10 },
    filterBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: TOKENS.rPill, backgroundColor: TOKENS.bg2, borderWidth: 1, borderColor: TOKENS.lineSoft },
    filterBtnActive: { backgroundColor: TOKENS.panel, borderColor: TOKENS.greenDeep, ...TOKENS.shadowSm },
    filterBtnHovered: { backgroundColor: '#e6ede4' },
    filterText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '500', color: TOKENS.textDim },
    filterTextActive: { color: TOKENS.greenDeep, fontWeight: '700' },

    // List Container
    listWrap: { maxWidth: 900, alignSelf: 'flex-start', width: '100%' },
    emptyState: { padding: 40, alignItems: 'center', backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd, borderWidth: 1, borderColor: TOKENS.lineSoft },
    emptyText: { color: TOKENS.textFaint },

    // Alert Card Base
    alertCard: {
        flexDirection: 'row',
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.rMd,
        padding: 22,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: TOKENS.line,
        borderLeftWidth: 4,   // Overridden with colorHex dynamically if unread
        borderLeftColor: 'transparent',
        transform: [{ scale: 1 }],
        ...TOKENS.shadowSm,
        ...webTransitionInteractive
    },
    cardHovered: { transform: [{ scale: 1.015 }], ...TOKENS.shadowMd, borderColor: TOKENS.textFaint },
    cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },

    // Card Internal
    cardColLeft: { marginRight: 20 },
    cardColRight: { flex: 1 },

    iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    innerDot: { width: 12, height: 12, borderRadius: 6 },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 12 },
    cardTitle: { fontFamily: sansFamily, fontSize: 17, fontWeight: '600', color: TOKENS.text, marginBottom: 4 },
    timestamp: { fontFamily: monoFamily, fontSize: 11, color: TOKENS.textFaint },

    codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: TOKENS.rSm, borderWidth: 1, backgroundColor: '#ffffff' },
    codeText: { fontFamily: monoFamily, fontSize: 10, fontWeight: '700' },

    cardDesc: { fontSize: 14, color: TOKENS.textDim, lineHeight: 22, marginBottom: 18, maxWidth: 650 },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 12 },
    btnGhost: {
        paddingHorizontal: 18, paddingVertical: 8,
        borderRadius: TOKENS.rPill,
        borderWidth: 1, borderColor: TOKENS.line,
        backgroundColor: '#FCFCFC',
        ...webTransitionColor
    },
    btnText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '500', color: TOKENS.text }
});
