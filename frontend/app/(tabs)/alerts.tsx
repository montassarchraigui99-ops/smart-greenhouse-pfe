import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    useWindowDimensions,
    Pressable,
    PressableStateCallbackType,
    RefreshControl,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAlerts, markAlertAsRead, AlertItem } from '../../services/api';
import { useActiveGreenhouse } from '../../context/ActiveGreenhouseContext';
import { GreenhouseSelector } from '../../components/navigation/GreenhouseSelector';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/theme';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AlertModal } from '../../components/AlertModal';
import { useTranslation } from '../../i18n';

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

const FILTERS = ['Toutes', 'Simulations', 'Critique', 'Warning', 'Info'] as const;

const FILTER_KEYS: Record<string, string> = {
    'Toutes': 'alerts.filter_all',
    'Simulations': 'alerts.filter_simu',
    'Critique': 'alerts.filter_crit',
    'Warning': 'alerts.filter_warn',
    'Info': 'alerts.filter_info',
};

export default function AlertsScreen() {
    const { width: windowWidth } = useWindowDimensions();
    const params = useLocalSearchParams<{ tab?: string }>();
    const { activeGreenhouseId } = useActiveGreenhouse();
    const { t, isRTL } = useTranslation();
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>(params.tab || 'Toutes');
    const [refreshing, setRefreshing] = useState(false);

    // États interactifs d'actions
    const [ackingId, setAckingId] = useState<number | null>(null);
    const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

    // Synchronisation dynamique si le paramètre URL/route change
    useEffect(() => {
        if (params.tab && FILTERS.includes(params.tab as any)) {
            setActiveFilter(params.tab);
        }
    }, [params.tab]);

    // Chargement des alertes depuis le Backend Cyber-Brain filtré par serre
    const loadAlerts = async () => {
        try {
            const data = await fetchAlerts(activeGreenhouseId);
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
    }, [activeGreenhouseId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    }, [activeGreenhouseId]);

    // Action interactive d'acquittement avec retour optimiste immédiat
    const handleToggleRead = async (id: number, currentStatus: boolean) => {
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
            titleLower.includes('simulation') ||
            titleLower.includes('simu')
        );

        if (activeFilter === 'Simulations') return isSimu;

        // Sécurité absolue : les simulations sont bannie de "Toutes", "Critique", "Warning", "Info"
        if (isSimu) return false;

        if (activeFilter === 'Toutes') return true;

        return a.severity.toLowerCase() === activeFilter.toLowerCase();
    });

    const unreadCount = filteredAlerts.filter(a => !a.is_read).length;
    const maxContentWidth = Math.min(windowWidth - 48, 1000);

    const summaryLabel = unreadCount > 0
        ? (unreadCount === 1
            ? t('alerts.unread_count_one', { count: unreadCount })
            : t('alerts.unread_count_other', { count: unreadCount }))
        : t('alerts.system_nominal');

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollStage}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                <View style={[styles.mainWrapper, { maxWidth: maxContentWidth }]}>
                    {/* --- HEADER --- */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, minWidth: 260 }}>
                            <Text style={styles.h1}>{t('alerts.title')}</Text>
                            <Text style={styles.subH1}>
                                {activeFilter === 'Simulations'
                                    ? t('alerts.subtitle_simu')
                                    : t('alerts.subtitle_prod')}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <GreenhouseSelector compact={true} />
                            <View style={styles.summaryBadge}>
                                <StatusBadge
                                    status={unreadCount > 0 ? (activeFilter === 'Critique' ? 'critical' : 'attention') : 'healthy'}
                                    label={summaryLabel}
                                />
                            </View>
                        </View>
                    </View>

                    {/* --- FILTRES DU JOURNAL (SEGMENTED TABS) --- */}
                    <View style={styles.filterWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                            {FILTERS.map((f) => {
                                const isActive = activeFilter === f;
                                const isSimuTab = f === 'Simulations';
                                const filterLabel = t(FILTER_KEYS[f] || f);
                                return (
                                    <Pressable
                                        key={f}
                                        onPress={() => setActiveFilter(f)}
                                        style={({ hovered, pressed }: HoverState) => [
                                            styles.filterBtn,
                                            isActive && (isSimuTab ? styles.filterBtnSimuActive : styles.filterBtnActive),
                                            hovered && !isActive && styles.filterBtnHovered,
                                            pressed && { transform: [{ scale: 0.98 }] },
                                        ]}
                                    >
                                        {isSimuTab && <Ionicons name="flask-outline" size={14} color={isActive ? Colors.surface : '#8B5CF6'} style={{ marginEnd: 4 }} />}
                                        <Text style={[
                                            styles.filterText,
                                            isActive && styles.filterTextActive,
                                            isSimuTab && !isActive && { color: '#8B5CF6' }
                                        ]}>
                                            {filterLabel}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* --- LISTE DES ALERTES --- */}
                    <View style={styles.listWrap}>
                        {filteredAlerts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons
                                        name={activeFilter === 'Simulations' ? 'flask-outline' : 'shield-checkmark-outline'}
                                        size={36}
                                        color={activeFilter === 'Simulations' ? '#8B5CF6' : Colors.secondary}
                                    />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {activeFilter === 'Simulations'
                                        ? t('alerts.empty_simu_title')
                                        : activeFilter === 'Critique'
                                        ? t('alerts.empty_crit_title')
                                        : activeFilter === 'Warning'
                                        ? t('alerts.empty_warn_title')
                                        : t('alerts.empty_nominal_title')}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {activeFilter === 'Simulations'
                                        ? t('alerts.empty_simu_desc')
                                        : t('alerts.empty_nominal_desc')}
                                </Text>
                            </View>
                        ) : (
                            filteredAlerts.map((alert) => {
                                const isCritical = alert.severity.toLowerCase() === 'critique' || alert.severity.toLowerCase() === 'critical';
                                const isWarning = alert.severity.toLowerCase() === 'warning' || alert.severity.toLowerCase() === 'attention';
                                const isSimuCard = Boolean(
                                    (alert.tag && alert.tag.toUpperCase().includes('SIMU')) ||
                                    (alert.title && alert.title.toLowerCase().includes('simulation')) ||
                                    (alert.title && alert.title.toLowerCase().includes('simu'))
                                );

                                const statusType = isCritical ? 'critical' : isWarning ? 'attention' : 'info';
                                const statusLabel = isCritical ? t('status.critical') : isWarning ? t('status.attention') : 'INFO';
                                const resolvedTitle = t(alert.title);

                                return (
                                    <View
                                        key={alert.id}
                                        style={[
                                            styles.alertCard,
                                            !alert.is_read && { borderStartColor: isCritical ? Colors.danger : isWarning ? Colors.warning : Colors.primary },
                                            !alert.is_read && styles.alertCardUnread,
                                        ]}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={{ flex: 1, paddingEnd: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                    <Text style={styles.cardTitle}>{resolvedTitle}</Text>
                                                    {isSimuCard && (
                                                        <View style={styles.simuBadge}>
                                                            <Text style={styles.simuBadgeText}>{t('alerts.simu_badge')}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.timestamp}>
                                                    {new Date(alert.created_at).toLocaleString()}
                                                </Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <StatusBadge status={statusType} label={statusLabel} size="small" />
                                                {alert.error_code && (
                                                    <View style={styles.codeBadge}>
                                                        <Text style={styles.codeText}>{alert.error_code}</Text>
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

                                        {/* --- ACTIONS INTERACTIVES --- */}
                                        <View style={styles.actionsRow}>
                                            <Pressable
                                                onPress={() => handleToggleRead(alert.id, alert.is_read)}
                                                disabled={ackingId === alert.id}
                                                style={({ hovered, pressed }: HoverState) => [
                                                    styles.btnAction,
                                                    alert.is_read ? styles.btnAcked : styles.btnAck,
                                                    hovered && (alert.is_read ? styles.btnAckedHovered : styles.btnAckHovered),
                                                    pressed && { transform: [{ scale: 0.97 }] },
                                                ]}
                                            >
                                                {ackingId === alert.id ? (
                                                    <ActivityIndicator size="small" color={alert.is_read ? Colors.textMuted : Colors.primary} />
                                                ) : (
                                                    <Text style={[styles.btnActionText, alert.is_read ? styles.btnAckedText : styles.btnAckText]}>
                                                        {alert.is_read ? t('alerts.acked') : t('alerts.ack')}
                                                    </Text>
                                                )}
                                            </Pressable>

                                            <Pressable
                                                onPress={() => setSelectedAlert(alert)}
                                                style={({ hovered, pressed }: HoverState) => [
                                                    styles.btnAction,
                                                    styles.btnDetails,
                                                    hovered && styles.btnDetailsHovered,
                                                    pressed && { transform: [{ scale: 0.97 }] },
                                                ]}
                                            >
                                                <Ionicons name="document-text-outline" size={14} color={Colors.textDark} style={{ marginEnd: 4 }} />
                                                <Text style={styles.btnDetailsText}>{t('alerts.view_report')}</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ============================================ */}
            {/* MODALE INTERACTIVE : DÉTAILS DE L'ALERTE     */}
            {/* ============================================ */}
            <AlertModal
                visible={selectedAlert !== null}
                alert={selectedAlert}
                onClose={() => setSelectedAlert(null)}
                onToggleRead={handleToggleRead}
                ackingId={ackingId}
            />
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

    header: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    summaryBadge: {
        alignSelf: 'flex-start',
    },

    // Filtres
    filterWrapper: {
        marginBottom: 20,
    },
    filterContainer: {
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
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        backgroundColor: 'transparent',
    },
    filterBtnActive: {
        backgroundColor: Colors.primary,
        ...Shadows.sm,
    },
    filterBtnSimuActive: {
        backgroundColor: '#8B5CF6',
        ...Shadows.sm,
    },
    filterBtnHovered: {
        backgroundColor: 'rgba(31, 122, 70, 0.06)',
    },
    filterText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    filterTextActive: {
        color: Colors.surface,
        fontWeight: '600',
    },

    // Liste
    listWrap: {
        width: '100%',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: Typography.sans,
        fontSize: 17,
        fontWeight: '600',
        color: Colors.textDark,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyText: {
        fontFamily: Typography.sans,
        fontSize: 13.5,
        color: Colors.textMuted,
        textAlign: 'center',
        maxWidth: 480,
        lineHeight: 20,
    },

    // Alert Card
    alertCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        borderLeftWidth: 4,
        borderLeftColor: Colors.border,
        ...Shadows.sm,
    },
    alertCardUnread: {
        ...Shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        flexWrap: 'wrap',
        gap: 8,
    },
    cardTitle: {
        fontFamily: Typography.sans,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textDark,
    },
    timestamp: {
        fontFamily: Typography.mono,
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 2,
    },
    cardDesc: {
        fontFamily: Typography.sans,
        fontSize: 13.5,
        color: Colors.textMuted,
        lineHeight: 20,
        marginBottom: 16,
    },

    simuBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    simuBadgeText: {
        fontFamily: Typography.mono,
        fontSize: 10,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    codeText: {
        fontFamily: Typography.mono,
        fontSize: 10,
        color: Colors.textMuted,
    },

    // Simulation Report Box
    simuReportBox: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: 12,
        marginBottom: 14,
        gap: 4,
    },
    simuReportLine: {
        marginVertical: 1,
    },
    simuLineText: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        color: Colors.textDark,
        lineHeight: 18,
    },
    simuParamText: {
        fontFamily: Typography.mono,
        fontSize: 11.5,
        color: Colors.textMuted,
    },
    simuDiagText: {
        fontWeight: '600',
        color: Colors.danger,
    },
    simuActionText: {
        color: Colors.primary,
        fontWeight: '500',
    },

    // Buttons
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    btnAction: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnActionText: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        fontWeight: '600',
    },
    btnAck: {
        backgroundColor: 'rgba(31, 122, 70, 0.08)',
        borderColor: 'rgba(31, 122, 70, 0.25)',
    },
    btnAckHovered: {
        backgroundColor: 'rgba(31, 122, 70, 0.15)',
    },
    btnAckText: {
        color: Colors.primary,
    },
    btnAcked: {
        backgroundColor: Colors.background,
        borderColor: Colors.border,
    },
    btnAckedHovered: {
        backgroundColor: Colors.border,
    },
    btnAckedText: {
        color: Colors.textMuted,
    },
    btnDetails: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
    },
    btnDetailsHovered: {
        backgroundColor: Colors.background,
    },
    btnDetailsText: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.textDark,
    },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 34, 27, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        width: '100%',
        maxWidth: 620,
        maxHeight: '85%',
        padding: 24,
        ...Shadows.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    modalTitle: {
        fontFamily: Typography.sans,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textDark,
    },
    modalTimestamp: {
        fontFamily: Typography.mono,
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalBody: {
        flexGrow: 0,
        maxHeight: 400,
    },
    sectionHeaderTitle: {
        fontFamily: Typography.sans,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDark,
        marginBottom: 10,
    },
    reportContentBox: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        marginBottom: 16,
        gap: 8,
    },
    modalParagraphBlock: {
        marginBottom: 6,
    },
    paramLabel: {
        fontFamily: Typography.sans,
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
        marginBottom: 2,
    },
    diagLabel: {
        fontFamily: Typography.sans,
        fontSize: 11,
        fontWeight: '600',
        color: Colors.danger,
        marginBottom: 2,
    },
    actionLabel: {
        fontFamily: Typography.sans,
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 2,
    },
    modalBodyText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        color: Colors.textDark,
        lineHeight: 19,
    },
    expertGuideBox: {
        backgroundColor: 'rgba(31, 122, 70, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(31, 122, 70, 0.2)',
        borderRadius: BorderRadius.md,
        padding: 14,
        marginBottom: 16,
    },
    expertGuideTitle: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 4,
    },
    expertGuideText: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        color: Colors.textDark,
        lineHeight: 18,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    modalPrimaryBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalPrimaryBtnRead: {
        backgroundColor: Colors.textMuted,
    },
    modalPrimaryBtnText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface,
    },
    modalSecondaryBtn: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSecondaryBtnText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textDark,
    },
});
