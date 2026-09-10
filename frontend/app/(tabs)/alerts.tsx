import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Dimensions,
    Pressable,
    PressableStateCallbackType,
    RefreshControl,
    Modal,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchAlerts, markAlertAsRead, AlertItem } from '../../services/api';

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
    simuPurple: '#7c3aed',
    simuPurpleBg: '#f5f3ff',
    greenDeep: '#1f7a46',
    greenLight: '#eaf4ee',
    rMd: 16,
    rSm: 10,
    rPill: 999,
    shadowSm: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    shadowMd: { shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 34, elevation: 6 },
    shadowCritical: { shadowColor: 'rgba(217,96,63,0.3)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
    shadowModal: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 12 }
};

const SCREEN_W = Dimensions.get('window').width;
const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

const webTransitionInteractive = Platform.select({
    web: { transition: 'transform 0.25s cubic-bezier(0.22, 0.9, 0.32, 1), box-shadow 0.25s cubic-bezier(0.22, 0.9, 0.32, 1)' } as any,
    default: {}
});

const webTransitionColor = Platform.select({
    web: { transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease' } as any,
    default: {}
});

const webCursorPointer = Platform.select({
    web: { cursor: 'pointer' } as any,
    default: {}
});

// ============================================
// FILTRES DU JOURNAL
// ============================================
const FILTERS = ['Toutes', 'Simulations', 'Critique', 'Warning', 'Info'];

export default function AlertsScreen() {
    const params = useLocalSearchParams<{ tab?: string }>();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [activeFilter, setActiveFilter] = useState(params.tab || 'Toutes');
    const [refreshing, setRefreshing] = useState(false);

    // États interactifs d'actions
    const [ackingId, setAckingId] = useState<number | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

    // Synchronisation dynamique si le paramètre URL/route change
    useEffect(() => {
        if (params.tab && FILTERS.includes(params.tab)) {
            setActiveFilter(params.tab);
        }
    }, [params.tab]);

    // Chargement des alertes depuis le Backend Cyber-Brain
    const loadAlerts = async () => {
        try {
            const data = await fetchAlerts();
            const sortedData = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setAlerts(sortedData);
        } catch (error) {
            console.error('[ALERTS] Failed to load alerts:', error);
        }
    };

    // Polling cyclique toutes les 5 secondes
    useEffect(() => {
        loadAlerts();
        const intervalId = setInterval(() => {
            loadAlerts();
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    }, []);

    // Action interactive d'acquittement avec retour optimiste immédiat
    const handleToggleRead = async (id: number, currentStatus: boolean) => {
        setAckingId(id);
        const nextStatus = !currentStatus;

        // Mise à jour optimiste de l'IHM
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: nextStatus } : a));
        if (selectedAlert && selectedAlert.id === id) {
            setSelectedAlert(prev => prev ? { ...prev, is_read: nextStatus } : null);
        }

        try {
            await markAlertAsRead(id, nextStatus);
        } catch (error) {
            console.error('[ALERTS] Échec de l\'acquittement :', error);
            // Rollback en cas d'erreur réseau
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: currentStatus } : a));
            if (selectedAlert && selectedAlert.id === id) {
                setSelectedAlert(prev => prev ? { ...prev, is_read: currentStatus } : null);
            }
        } finally {
            setAckingId(null);
        }
    };

    // Filtrage rigoureux assurant l'étanchéité absolue entre Simulations et Production
    const filteredAlerts = alerts.filter(a => {
        const tagUpper = (a.tag || '').toUpperCase();
        const titleLower = (a.title || '').toLowerCase();
        const isSimu = Boolean(
            tagUpper.startsWith('SIMU') ||
            tagUpper.includes('SIMU') ||
            titleLower.includes('simulation')
        );

        if (activeFilter === 'Simulations') return isSimu;

        // Sécurité absolue : les simulations sont STRICTEMENT bannies de "Toutes", "Critique", "Warning", "Info"
        if (isSimu) return false;

        if (activeFilter === 'Toutes') return true;

        return a.severity.toLowerCase() === activeFilter.toLowerCase();
    });

    const unreadCount = filteredAlerts.filter(a => !a.is_read).length;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollStage}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TOKENS.greenDeep]} />}
            >
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.h1}>Journal des Alertes</Text>
                        <Text style={styles.subH1}>
                            {activeFilter === 'Simulations'
                                ? 'Rapports diagnostiques des scénarios What-If & résilience IA'
                                : 'Surveillance continue des paramètres télémétriques de production'}
                        </Text>
                    </View>
                    <View style={styles.summaryBadge}>
                        <Text style={[styles.summaryText, activeFilter === 'Simulations' && { color: TOKENS.simuPurple }]}>
                            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* --- FILTRES --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterWrap}>
                    {FILTERS.map((f) => {
                        const isActive = activeFilter === f;
                        const isSimuTab = f === 'Simulations';
                        return (
                            <Pressable
                                key={f}
                                onPress={() => setActiveFilter(f)}
                                style={({ hovered, pressed }: HoverState) => [
                                    styles.filterBtn,
                                    isActive && (isSimuTab ? styles.filterBtnSimuActive : styles.filterBtnActive),
                                    hovered && !isActive && styles.filterBtnHovered,
                                    pressed && { transform: [{ scale: 0.98 }] },
                                    webCursorPointer,
                                    webTransitionColor
                                ]}
                            >
                                <Text style={[
                                    styles.filterText,
                                    isActive && (isSimuTab ? styles.filterTextSimuActive : styles.filterTextActive)
                                ]}>
                                    {isSimuTab ? '🧪 ' : ''}{f}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* --- LISTE DES ALERTES --- */}
                <View style={styles.listWrap}>
                    {filteredAlerts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Text style={{ fontSize: 36 }}>{activeFilter === 'Simulations' ? '🧪' : '🛡️'}</Text>
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeFilter === 'Simulations'
                                    ? "Aucun scénario simulé pour le moment"
                                    : activeFilter === 'Critique'
                                    ? "Aucune alerte critique enregistrée"
                                    : activeFilter === 'Warning'
                                    ? "Aucun avertissement enregistré"
                                    : "Aucune alerte enregistrée"}
                            </Text>
                            <Text style={styles.emptyText}>
                                {activeFilter === 'Simulations'
                                    ? "Déclenchez une simulation depuis le tableau de bord (Bouton 'Simuler un scénario') pour tester la robustesse et les réactions autonomes du Cyber-Brain."
                                    : "Tous les paramètres télémétriques de la serre sont nominaux."}
                            </Text>
                        </View>
                    ) : (
                        filteredAlerts.map((alert) => {
                            let colorHex = TOKENS.info;
                            let bgAccent = '#eaf4ee';

                            if (alert.severity === 'Warning') {
                                colorHex = TOKENS.warning;
                                bgAccent = '#fdf4e8';
                            } else if (alert.severity === 'Critique') {
                                colorHex = TOKENS.critical;
                                bgAccent = '#fcefe8';
                            }

                            const isSimuCard = Boolean(
                                (alert.tag && alert.tag.toUpperCase().includes('SIMU')) ||
                                (alert.title && alert.title.toLowerCase().includes('simulation'))
                            );

                            return (
                                <View
                                    key={alert.id}
                                    style={[
                                        styles.alertCard,
                                        !alert.is_read && { borderLeftColor: isSimuCard ? TOKENS.simuPurple : colorHex },
                                        alert.severity === 'Critique' && !alert.is_read && { ...TOKENS.shadowCritical }
                                    ]}
                                >
                                    <View style={styles.cardColLeft}>
                                        <View style={[styles.iconWrap, { backgroundColor: isSimuCard ? TOKENS.simuPurpleBg : bgAccent }]}>
                                            <View style={[styles.innerDot, { backgroundColor: isSimuCard ? TOKENS.simuPurple : colorHex }]} />
                                        </View>
                                    </View>

                                    <View style={styles.cardColRight}>
                                        <View style={styles.cardHeader}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <Text style={styles.cardTitle}>{alert.title}</Text>
                                                <Text style={styles.timestamp}>{new Date(alert.created_at).toLocaleString()}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                {isSimuCard && (
                                                    <View style={styles.simuBadge}>
                                                        <Text style={styles.simuBadgeText}>🧪 Simulation IA</Text>
                                                    </View>
                                                )}
                                                <View style={[
                                                    styles.severityBadge,
                                                    alert.severity === 'Critique' && styles.severityCritique,
                                                    alert.severity === 'Warning' && styles.severityWarning,
                                                    alert.severity === 'Info' && styles.severityInfo
                                                ]}>
                                                    <Text style={[
                                                        styles.severityText,
                                                        alert.severity === 'Critique' && { color: TOKENS.critical },
                                                        alert.severity === 'Warning' && { color: TOKENS.warning },
                                                        alert.severity === 'Info' && { color: TOKENS.info }
                                                    ]}>
                                                        {alert.severity.toUpperCase()}
                                                    </Text>
                                                </View>
                                                {alert.error_code && (
                                                    <View style={[styles.codeBadge, { borderColor: isSimuCard ? TOKENS.simuPurple : colorHex }]}>
                                                        <Text style={[styles.codeText, { color: isSimuCard ? TOKENS.simuPurple : colorHex }]}>
                                                            {alert.error_code}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {isSimuCard ? (
                                            <View style={styles.simuReportBox}>
                                                {alert.description.split('\n').map((line, idx) => {
                                                    const isHeader = line.startsWith('[Paramètres');
                                                    const isDiag = line.startsWith('Diagnostic IA');
                                                    const isAction = line.startsWith('Actions engagées');
                                                    return (
                                                        <View key={idx} style={styles.simuReportLine}>
                                                            <Text style={[
                                                                styles.simuLineText,
                                                                isHeader && styles.simuParamText,
                                                                isDiag && styles.simuDiagText,
                                                                isAction && styles.simuActionText,
                                                            ]}>
                                                                {line}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <Text style={styles.cardDesc}>{alert.description}</Text>
                                        )}

                                        {/* --- BOUTONS D'ACTION INTERACTIFS --- */}
                                        <View style={styles.actionsRow}>
                                            <Pressable
                                                onPress={() => handleToggleRead(alert.id, alert.is_read)}
                                                disabled={ackingId === alert.id}
                                                style={({ hovered, pressed }: HoverState) => [
                                                    styles.btnAction,
                                                    alert.is_read ? styles.btnAcked : styles.btnAck,
                                                    hovered && (alert.is_read ? styles.btnAckedHovered : styles.btnAckHovered),
                                                    pressed && { transform: [{ scale: 0.96 }] },
                                                    webCursorPointer,
                                                    webTransitionColor
                                                ]}
                                            >
                                                {ackingId === alert.id ? (
                                                    <ActivityIndicator size="small" color={alert.is_read ? TOKENS.textDim : TOKENS.greenDeep} />
                                                ) : (
                                                    <Text style={[styles.btnActionText, alert.is_read ? styles.btnAckedText : styles.btnAckText]}>
                                                        {alert.is_read ? '✓ Acquittée' : '✓ Acquitter'}
                                                    </Text>
                                                )}
                                            </Pressable>

                                            <Pressable
                                                onPress={() => setSelectedAlert(alert)}
                                                style={({ hovered, pressed }: HoverState) => [
                                                    styles.btnAction,
                                                    styles.btnDetails,
                                                    hovered && styles.btnDetailsHovered,
                                                    pressed && { transform: [{ scale: 0.96 }] },
                                                    webCursorPointer,
                                                    webTransitionColor
                                                ]}
                                            >
                                                <Text style={styles.btnDetailsText}>🔍 Détails</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* ============================================ */}
            {/* MODALE INTERACTIVE : DÉTAILS DE L'ALERTE     */}
            {/* ============================================ */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={selectedAlert !== null}
                onRequestClose={() => setSelectedAlert(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalBox}>
                        {selectedAlert && (
                            <>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <Text style={{ fontSize: 18 }}>
                                                {selectedAlert.tag?.toUpperCase().includes('SIMU') ? '🧪' : '🚨'}
                                            </Text>
                                            <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                                        </View>
                                        <Text style={styles.modalTimestamp}>
                                            Enregistré le : {new Date(selectedAlert.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setSelectedAlert(null)}
                                        style={({ hovered }: HoverState) => [
                                            styles.modalCloseBtn,
                                            hovered && { backgroundColor: TOKENS.bg2 },
                                            webCursorPointer
                                        ]}
                                    >
                                        <Text style={styles.modalCloseText}>✕</Text>
                                    </Pressable>
                                </View>

                                {/* Badges Meta */}
                                <View style={styles.modalMetaRow}>
                                    <View style={[
                                        styles.severityBadge,
                                        selectedAlert.severity === 'Critique' && styles.severityCritique,
                                        selectedAlert.severity === 'Warning' && styles.severityWarning,
                                        selectedAlert.severity === 'Info' && styles.severityInfo
                                    ]}>
                                        <Text style={[
                                            styles.severityText,
                                            selectedAlert.severity === 'Critique' && { color: TOKENS.critical },
                                            selectedAlert.severity === 'Warning' && { color: TOKENS.warning },
                                            selectedAlert.severity === 'Info' && { color: TOKENS.info }
                                        ]}>
                                            SÉVÉRITÉ : {selectedAlert.severity.toUpperCase()}
                                        </Text>
                                    </View>

                                    {selectedAlert.error_code && (
                                        <View style={[styles.codeBadge, { borderColor: TOKENS.line }]}>
                                            <Text style={[styles.codeText, { color: TOKENS.textDim }]}>
                                                TAG : {selectedAlert.error_code}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={[styles.statusBadge, selectedAlert.is_read ? styles.statusBadgeRead : styles.statusBadgeUnread]}>
                                        <Text style={[styles.statusBadgeText, selectedAlert.is_read ? { color: TOKENS.greenDeep } : { color: TOKENS.warning }]}>
                                            {selectedAlert.is_read ? '✓ ACQUITTÉE' : '⚠️ EN ATTENTE'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Modal Body Scrollable */}
                                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.sectionHeaderTitle}>Rapport d'Analyse & Télémétrie</Text>

                                    <View style={styles.reportContentBox}>
                                        {selectedAlert.description.split('\n').map((paragraph, pIdx) => {
                                            const isParam = paragraph.startsWith('[Paramètres');
                                            const isDiag = paragraph.startsWith('Diagnostic IA');
                                            const isAction = paragraph.startsWith('Actions engagées');

                                            return (
                                                <View key={pIdx} style={styles.modalParagraphBlock}>
                                                    {isParam && <Text style={styles.paramLabel}>🔬 Conditions Scénarisées</Text>}
                                                    {isDiag && <Text style={styles.diagLabel}>🧠 Analyse Algorithmique</Text>}
                                                    {isAction && <Text style={styles.actionLabel}>⚙️ Contre-mesures Automatisées</Text>}
                                                    <Text style={[
                                                        styles.modalBodyText,
                                                        isParam && styles.simuParamText,
                                                        isDiag && styles.simuDiagText,
                                                        isAction && styles.simuActionText,
                                                    ]}>
                                                        {paragraph}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    <View style={styles.expertGuideBox}>
                                        <Text style={styles.expertGuideTitle}>📋 Recommandation Opérateur</Text>
                                        <Text style={styles.expertGuideText}>
                                            {selectedAlert.severity === 'Critique'
                                                ? "Situation d'urgence agronomique : vérifier la réponse des relais électromécaniques (pompes et extracteurs) et s'assurer que les seuils de sécurité de la culture sont respectés."
                                                : "Surveillance renforcée : vérifier l'évolution des hygromètres et de la dynamique de régulation thermique."}
                                        </Text>
                                    </View>
                                </ScrollView>

                                {/* Modal Footer Buttons */}
                                <View style={styles.modalFooter}>
                                    <Pressable
                                        onPress={() => handleToggleRead(selectedAlert.id, selectedAlert.is_read)}
                                        disabled={ackingId === selectedAlert.id}
                                        style={({ hovered, pressed }: HoverState) => [
                                            styles.modalPrimaryBtn,
                                            selectedAlert.is_read && styles.modalPrimaryBtnRead,
                                            hovered && { opacity: 0.9 },
                                            pressed && { transform: [{ scale: 0.98 }] },
                                            webCursorPointer,
                                            webTransitionColor
                                        ]}
                                    >
                                        {ackingId === selectedAlert.id ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.modalPrimaryBtnText}>
                                                {selectedAlert.is_read ? '✓ Marquer comme non lue' : '✓ Acquitter l\'alerte'}
                                            </Text>
                                        )}
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setSelectedAlert(null)}
                                        style={({ hovered, pressed }: HoverState) => [
                                            styles.modalSecondaryBtn,
                                            hovered && { backgroundColor: TOKENS.lineSoft },
                                            pressed && { transform: [{ scale: 0.98 }] },
                                            webCursorPointer,
                                            webTransitionColor
                                        ]}
                                    >
                                        <Text style={styles.modalSecondaryBtnText}>Fermer</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
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
    header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
    h1: { fontFamily: sansFamily, fontSize: 32, fontWeight: '700', color: TOKENS.text, letterSpacing: -0.5 },
    subH1: { fontFamily: sansFamily, fontSize: 14, color: TOKENS.textDim, marginTop: 4 },
    summaryBadge: { backgroundColor: TOKENS.panel, paddingHorizontal: 12, paddingVertical: 6, borderRadius: TOKENS.rPill, borderWidth: 1, borderColor: TOKENS.lineSoft, ...TOKENS.shadowSm },
    summaryText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '600', color: TOKENS.critical },

    // Filters
    filterWrap: { flexDirection: 'row', marginBottom: 24, gap: 10 },
    filterBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: TOKENS.rPill, backgroundColor: TOKENS.bg2, borderWidth: 1, borderColor: TOKENS.lineSoft },
    filterBtnActive: { backgroundColor: TOKENS.panel, borderColor: TOKENS.greenDeep, ...TOKENS.shadowSm },
    filterBtnSimuActive: { backgroundColor: TOKENS.panel, borderColor: TOKENS.simuPurple, ...TOKENS.shadowSm },
    filterBtnHovered: { backgroundColor: '#e6ede4' },
    filterText: { fontFamily: sansFamily, fontSize: 13, fontWeight: '500', color: TOKENS.textDim },
    filterTextActive: { color: TOKENS.greenDeep, fontWeight: '700' },
    filterTextSimuActive: { color: TOKENS.simuPurple, fontWeight: '700' },

    // List Container
    listWrap: { maxWidth: 900, alignSelf: 'flex-start', width: '100%' },
    emptyState: { padding: 48, alignItems: 'center', backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd, borderWidth: 1, borderColor: TOKENS.lineSoft, ...TOKENS.shadowSm },
    emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: TOKENS.bg2, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontFamily: sansFamily, fontSize: 17, fontWeight: '700', color: TOKENS.text, marginBottom: 8, textAlign: 'center' },
    emptyText: { fontFamily: sansFamily, fontSize: 13.5, color: TOKENS.textDim, textAlign: 'center', maxWidth: 480, lineHeight: 20 },

    // Alert Card Base
    alertCard: {
        flexDirection: 'row',
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.rMd,
        padding: 22,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: TOKENS.line,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        ...TOKENS.shadowSm,
        ...webTransitionInteractive
    },

    // Card Internal
    cardColLeft: { marginRight: 16 },
    cardColRight: { flex: 1 },

    iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    innerDot: { width: 12, height: 12, borderRadius: 6 },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 },
    cardTitle: { fontFamily: sansFamily, fontSize: 17, fontWeight: '600', color: TOKENS.text, marginBottom: 4 },
    timestamp: { fontFamily: monoFamily, fontSize: 11, color: TOKENS.textFaint },

    // Badges
    simuBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: TOKENS.rSm, backgroundColor: TOKENS.simuPurpleBg, borderWidth: 1, borderColor: TOKENS.simuPurple },
    simuBadgeText: { fontFamily: sansFamily, fontSize: 11, fontWeight: '700', color: TOKENS.simuPurple },

    severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: TOKENS.rSm, borderWidth: 1 },
    severityCritique: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
    severityWarning: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
    severityInfo: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
    severityText: { fontFamily: monoFamily, fontSize: 10, fontWeight: '700' },

    codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: TOKENS.rSm, borderWidth: 1, backgroundColor: '#ffffff' },
    codeText: { fontFamily: monoFamily, fontSize: 10, fontWeight: '700' },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: TOKENS.rSm, borderWidth: 1 },
    statusBadgeRead: { backgroundColor: '#eaf7ef', borderColor: '#a3e2bb' },
    statusBadgeUnread: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
    statusBadgeText: { fontFamily: monoFamily, fontSize: 10, fontWeight: '700' },

    cardDesc: { fontSize: 14, color: TOKENS.textDim, lineHeight: 22, marginBottom: 18, maxWidth: 650 },

    // Simulation Structured Report
    simuReportBox: {
        backgroundColor: '#fafaf9',
        borderWidth: 1,
        borderColor: TOKENS.lineSoft,
        borderRadius: TOKENS.rSm,
        padding: 14,
        marginBottom: 16,
        gap: 6
    },
    simuReportLine: { marginVertical: 2 },
    simuLineText: { fontSize: 13, color: TOKENS.text, lineHeight: 20 },
    simuParamText: { fontFamily: monoFamily, fontSize: 12, fontWeight: '600', color: '#4b5563' },
    simuDiagText: { fontWeight: '600', color: TOKENS.critical },
    simuActionText: { color: TOKENS.greenDeep, fontWeight: '500' },

    // ============================================
    // BOUTONS INTERACTIFS D'ACTION
    // ============================================
    actionsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },

    btnAction: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: TOKENS.rPill,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
        ...TOKENS.shadowSm
    },
    btnActionText: {
        fontFamily: sansFamily,
        fontSize: 13,
        fontWeight: '600',
    },

    // Bouton Acquitter (Non lue)
    btnAck: {
        backgroundColor: '#ffffff',
        borderColor: '#2e7d32',
    },
    btnAckHovered: {
        backgroundColor: '#e8f5e9',
        borderColor: '#1b5e20',
        ...TOKENS.shadowMd
    },
    btnAckText: {
        color: '#2e7d32',
    },

    // Bouton Acquittée (Déjà lue)
    btnAcked: {
        backgroundColor: '#f1f5f2',
        borderColor: '#d7e2da',
    },
    btnAckedHovered: {
        backgroundColor: '#e3ece6',
        borderColor: '#b2c8ba',
    },
    btnAckedText: {
        color: '#5c6b60',
    },

    // Bouton Détails
    btnDetails: {
        backgroundColor: '#ffffff',
        borderColor: TOKENS.line,
    },
    btnDetailsHovered: {
        backgroundColor: '#f8fafc',
        borderColor: TOKENS.textDim,
        ...TOKENS.shadowMd
    },
    btnDetailsText: {
        fontFamily: sansFamily,
        fontSize: 13,
        fontWeight: '600',
        color: TOKENS.text,
    },

    // ============================================
    // MODALE DÉTAILS
    // ============================================
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalBox: {
        width: '100%',
        maxWidth: 620,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 26,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: TOKENS.lineSoft,
        ...TOKENS.shadowModal
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: TOKENS.lineSoft
    },
    modalTitle: {
        fontFamily: sansFamily,
        fontSize: 18,
        fontWeight: '700',
        color: TOKENS.text,
        flexShrink: 1
    },
    modalTimestamp: {
        fontFamily: monoFamily,
        fontSize: 11,
        color: TOKENS.textFaint
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: TOKENS.bg
    },
    modalCloseText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: TOKENS.textDim
    },

    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginVertical: 14,
        flexWrap: 'wrap'
    },

    modalBody: {
        marginVertical: 10
    },
    sectionHeaderTitle: {
        fontFamily: sansFamily,
        fontSize: 14,
        fontWeight: '700',
        color: TOKENS.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10
    },
    reportContentBox: {
        backgroundColor: '#f8faf9',
        borderWidth: 1,
        borderColor: TOKENS.lineSoft,
        borderRadius: TOKENS.rSm,
        padding: 16,
        gap: 12
    },
    modalParagraphBlock: {
        gap: 4
    },
    paramLabel: {
        fontFamily: sansFamily,
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase'
    },
    diagLabel: {
        fontFamily: sansFamily,
        fontSize: 11,
        fontWeight: '700',
        color: TOKENS.critical,
        textTransform: 'uppercase'
    },
    actionLabel: {
        fontFamily: sansFamily,
        fontSize: 11,
        fontWeight: '700',
        color: TOKENS.greenDeep,
        textTransform: 'uppercase'
    },
    modalBodyText: {
        fontSize: 13.5,
        lineHeight: 22,
        color: TOKENS.text
    },

    expertGuideBox: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: TOKENS.rSm,
        padding: 14,
        marginTop: 14
    },
    expertGuideTitle: {
        fontFamily: sansFamily,
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
        marginBottom: 4
    },
    expertGuideText: {
        fontSize: 12.5,
        lineHeight: 18,
        color: '#15803d'
    },

    // Footer
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: TOKENS.lineSoft
    },
    modalPrimaryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: TOKENS.rPill,
        backgroundColor: TOKENS.greenDeep,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140
    },
    modalPrimaryBtnRead: {
        backgroundColor: '#475569'
    },
    modalPrimaryBtnText: {
        fontFamily: sansFamily,
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff'
    },
    modalSecondaryBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: TOKENS.rPill,
        backgroundColor: TOKENS.bg2,
        borderWidth: 1,
        borderColor: TOKENS.line
    },
    modalSecondaryBtnText: {
        fontFamily: sansFamily,
        fontSize: 13,
        fontWeight: '600',
        color: TOKENS.textDim
    }
});
