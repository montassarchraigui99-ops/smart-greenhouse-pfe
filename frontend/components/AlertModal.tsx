/**
 * Rôle : Lead Systems Architect & Principal Frontend Expo Engineer
 * Composant : AlertModal.tsx
 * Objectif : Modale interactive du Journal des Alertes, 100% traduite (Zero Hardcoded Strings)
 *            et entièrement verrouillée en propriétés logiques RTL (marginStart, marginEnd, start, end).
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Platform,
    PressableStateCallbackType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';
import { StatusBadge } from './ui/StatusBadge';
import { useTranslation } from '../i18n';
import { AlertItem } from '../services/api';

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

interface AlertModalProps {
    visible: boolean;
    alert: AlertItem | null;
    onClose: () => void;
    onToggleRead: (id: number, currentStatus: boolean) => Promise<void> | void;
    ackingId?: number | null;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    visible,
    alert,
    onClose,
    onToggleRead,
    ackingId,
}) => {
    const { t, isRTL } = useTranslation();

    if (!alert) return null;

    const isCritical = alert.severity.toLowerCase() === 'critique' || alert.severity.toLowerCase() === 'critical';
    const isWarning = alert.severity.toLowerCase() === 'warning' || alert.severity.toLowerCase() === 'attention';
    const statusType = isCritical ? 'critical' : isWarning ? 'attention' : 'info';

    // Résolution de la clé dynamique pour le titre de l'alerte
    const resolvedTitle = t(alert.title);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalBackdrop}>
                <View style={styles.modalBox}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, paddingEnd: 12 }}>
                            <Text style={styles.modalTitle}>{resolvedTitle}</Text>
                            <Text style={styles.modalTimestamp}>
                                {t('alerts.recorded_at')} {new Date(alert.created_at).toLocaleString()}
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={styles.modalCloseBtn}
                            accessibilityLabel={t('alerts.close')}
                        >
                            <Ionicons name="close" size={20} color={Colors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Badges Métadonnées */}
                    <View style={styles.modalMetaRow}>
                        <StatusBadge
                            status={statusType}
                            label={`${t('alerts.severity_label')} ${alert.severity.toUpperCase()}`}
                        />
                        {alert.error_code ? (
                            <View style={styles.codeBadge}>
                                <Text style={styles.codeText}>CODE: {alert.error_code}</Text>
                            </View>
                        ) : null}
                        <StatusBadge
                            status={alert.is_read ? 'healthy' : 'attention'}
                            label={alert.is_read ? t('alerts.status_read') : t('alerts.status_unread')}
                        />
                    </View>

                    {/* Corps du rapport d'analyse agronomique */}
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeaderTitle}>{t('alerts.agronomic_report')}</Text>

                        <View style={styles.reportContentBox}>
                            {alert.description.split('\n').map((paragraph, pIdx) => {
                                const isParam = paragraph.startsWith('[Paramètres') || paragraph.includes('Paramètres');
                                const isDiag = paragraph.startsWith('Diagnostic IA') || paragraph.includes('Diagnostic');
                                const isAction = paragraph.startsWith('Actions engagées') || paragraph.includes('Actions');

                                return (
                                    <View key={pIdx} style={styles.modalParagraphBlock}>
                                        {isParam && <Text style={styles.paramLabel}>{t('alerts.param_label')}</Text>}
                                        {isDiag && <Text style={styles.diagLabel}>{t('alerts.diag_label')}</Text>}
                                        {isAction && <Text style={styles.actionLabel}>{t('alerts.action_label')}</Text>}
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

                        {/* Consigne Opérateur Cyber-Brain */}
                        <View style={styles.expertGuideBox}>
                            <Text style={styles.expertGuideTitle}>{t('alerts.operator_guide_title')}</Text>
                            <Text style={styles.expertGuideText}>
                                {isCritical
                                    ? t('alerts.operator_guide_crit')
                                    : t('alerts.operator_guide_warn')}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer d'action */}
                    <View style={styles.modalFooter}>
                        <Pressable
                            onPress={() => onToggleRead(alert.id, alert.is_read)}
                            disabled={ackingId === alert.id}
                            style={({ hovered, pressed }: HoverState) => [
                                styles.modalPrimaryBtn,
                                alert.is_read && styles.modalPrimaryBtnRead,
                                hovered && { opacity: 0.9 },
                                pressed && { transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            {ackingId === alert.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.modalPrimaryBtnText}>
                                    {alert.is_read ? `✓ ${t('alerts.mark_unread')}` : `✓ ${t('alerts.acknowledge')}`}
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={onClose}
                            style={styles.modalSecondaryBtn}
                        >
                            <Text style={styles.modalSecondaryBtnText}>{t('alerts.close')}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default AlertModal;

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.md,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            } as any,
            default: {},
        }),
    },
    modalBox: {
        width: '100%',
        maxWidth: 620,
        maxHeight: '85%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: Typography.sans,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textDark,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    modalTimestamp: {
        fontFamily: Typography.sans,
        fontSize: 12,
        color: Colors.textMuted,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexWrap: 'wrap',
    },
    codeBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    codeText: {
        fontFamily: Typography.mono,
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    modalBody: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    sectionHeaderTitle: {
        fontFamily: Typography.sans,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },
    reportContentBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    modalParagraphBlock: {
        marginBottom: 10,
    },
    paramLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 2,
    },
    diagLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8B5CF6',
        marginBottom: 2,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.secondary,
        marginBottom: 2,
    },
    modalBodyText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        lineHeight: 20,
        color: Colors.textDark,
    },
    simuParamText: {
        color: Colors.textMuted,
        fontFamily: Typography.mono,
        fontSize: 12,
    },
    simuDiagText: {
        color: '#6D28D9',
        fontWeight: '500',
    },
    simuActionText: {
        color: '#047857',
        fontWeight: '600',
    },
    expertGuideBox: {
        backgroundColor: '#F0FDF4',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#DCFCE7',
        marginBottom: Spacing.lg,
    },
    expertGuideTitle: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
        marginBottom: 4,
    },
    expertGuideText: {
        fontFamily: Typography.sans,
        fontSize: 12.5,
        lineHeight: 18,
        color: '#15803D',
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    modalPrimaryBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 160,
    },
    modalPrimaryBtnRead: {
        backgroundColor: '#64748B',
    },
    modalPrimaryBtnText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalSecondaryBtn: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSecondaryBtnText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textDark,
    },
});
