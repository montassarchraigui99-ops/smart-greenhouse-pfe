/**
 * Rôle : Principal Full-Stack Engineer & Data Visualization Specialist
 * Fichier : components/greenhouse/AllGreenhousesGrid.tsx
 * Objectif : Vue de synthèse multi-serres affichant l'ensemble des unités de production
 *            sous forme de cartes interactives (Nom, Statut, Température live, Compteur d'alertes).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useActiveGreenhouse } from '../../context/ActiveGreenhouseContext';
import { Greenhouse } from '../../services/api';

interface AllGreenhousesGridProps {
    onSelect?: (greenhouseId: string) => void;
    onClose?: () => void;
    embedded?: boolean;
}

export const AllGreenhousesGrid: React.FC<AllGreenhousesGridProps> = ({
    onSelect,
    onClose,
    embedded = false
}) => {
    const { greenhouses, activeGreenhouseId, selectGreenhouse, isMultiViewOpen, setIsMultiViewOpen } = useActiveGreenhouse();

    const handleSelectGreenhouse = (id: string) => {
        selectGreenhouse(id);
        if (onSelect) onSelect(id);
        if (onClose) onClose();
        setIsMultiViewOpen(false);
    };

    // Statistiques globales du parc de serres
    const totalGreenhouses = greenhouses.length;
    const optimalCount = greenhouses.filter(g => {
        const s = (g.status || '').toLowerCase();
        return s === 'optimal' || s === 'healthy';
    }).length;
    const warningCount = greenhouses.filter(g => {
        const s = (g.status || '').toLowerCase();
        return s === 'attention' || s === 'warning';
    }).length;
    const criticalCount = greenhouses.filter(g => {
        const s = (g.status || '').toLowerCase();
        return s === 'critical' || s === 'critique';
    }).length;
    const totalAlerts = greenhouses.reduce((sum, g) => sum + (g.unread_alerts_count || 0), 0);

    const getStatusStyle = (status?: string) => {
        const s = (status || 'OPTIMAL').toLowerCase();
        if (s === 'critical' || s === 'critique') {
            return {
                dot: '#ef4444',
                badgeBg: '#fef2f2',
                badgeBorder: '#fecaca',
                text: '#b91c1c',
                label: 'CRITIQUE'
            };
        }
        if (s === 'warning' || s === 'attention') {
            return {
                dot: '#f59e0b',
                badgeBg: '#fffbeb',
                badgeBorder: '#fde68a',
                text: '#b45309',
                label: 'ATTENTION'
            };
        }
        return {
            dot: '#10b981',
            badgeBg: '#ecfdf5',
            badgeBorder: '#a7f3d0',
            text: '#047857',
            label: 'OPTIMAL'
        };
    };

    const content = (
        <View style={[styles.mainWrapper, embedded && styles.embeddedWrapper]}>
            {/* Barre de synthèse KPI globale */}
            <View style={styles.kpiContainer}>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiValue}>{totalGreenhouses}</Text>
                    <Text style={styles.kpiLabel}>Unités Monitorées</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardOptimal]}>
                    <Text style={[styles.kpiValue, { color: '#059669' }]}>{optimalCount}</Text>
                    <Text style={styles.kpiLabel}>Climat Optimal</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardWarning]}>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>{warningCount + criticalCount}</Text>
                    <Text style={styles.kpiLabel}>Sous Surveillance</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardAlerts]}>
                    <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{totalAlerts}</Text>
                    <Text style={styles.kpiLabel}>Alertes Actives</Text>
                </View>
            </View>

            {/* Grille de synthèse des serres */}
            <View style={styles.gridContainer}>
                {greenhouses.map((gh) => {
                    const isSelected = gh.id === activeGreenhouseId;
                    const st = getStatusStyle(gh.status);
                    const temp = gh.live_temperature !== undefined ? gh.live_temperature : (gh.target_temp || 24);
                    const hum = gh.live_humidity !== undefined ? gh.live_humidity : (gh.target_humidity || 60);

                    return (
                        <View
                            key={gh.id}
                            style={[
                                styles.card,
                                isSelected && styles.cardActive,
                            ]}
                        >
                            {/* Entête de carte */}
                            <View style={styles.cardHeader}>
                                <View style={styles.headerLeft}>
                                    <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                                    <View>
                                        <Text style={styles.cardTitle}>{gh.name}</Text>
                                        <Text style={styles.cardSubtitle}>{gh.crop_type} • {gh.location}</Text>
                                    </View>
                                </View>

                                <View style={[styles.badge, { backgroundColor: st.badgeBg, borderColor: st.badgeBorder }]}>
                                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                                </View>
                            </View>

                            {/* Métriques Live */}
                            <View style={styles.metricsRow}>
                                <View style={styles.metricBlock}>
                                    <Text style={styles.metricLabel}>TEMPÉRATURE LIVE</Text>
                                    <View style={styles.metricValueRow}>
                                        <Text style={styles.metricVal}>{temp.toFixed(1)}°C</Text>
                                        <Text style={styles.metricTarget}>Cible: {gh.target_temp || 24}°C</Text>
                                    </View>
                                </View>

                                <View style={styles.metricBlock}>
                                    <Text style={styles.metricLabel}>HUMIDITÉ RELATIVE</Text>
                                    <View style={styles.metricValueRow}>
                                        <Text style={styles.metricVal}>{hum.toFixed(0)}%</Text>
                                        <Text style={styles.metricTarget}>Cible: {gh.target_humidity || 65}%</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Alertes et État */}
                            <View style={styles.cardFooter}>
                                <View style={styles.alertIndicator}>
                                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                        <Path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill={(gh.unread_alerts_count || 0) > 0 ? '#ef4444' : '#94a3b8'}/>
                                    </Svg>
                                    <Text style={[styles.alertText, (gh.unread_alerts_count || 0) > 0 && { color: '#b91c1c', fontWeight: '700' }]}>
                                        {(gh.unread_alerts_count || 0) > 0
                                            ? `${gh.unread_alerts_count} alerte(s) active(s)`
                                            : 'Aucune alerte'}
                                    </Text>
                                </View>

                                {/* Bouton de sélection / statut */}
                                <Pressable
                                    onPress={() => handleSelectGreenhouse(gh.id)}
                                    style={[
                                        styles.selectBtn,
                                        isSelected ? styles.selectBtnCurrent : styles.selectBtnAction
                                    ]}
                                >
                                    <Text style={[styles.selectBtnText, isSelected ? styles.selectBtnTextCurrent : styles.selectBtnTextAction]}>
                                        {isSelected ? '✓ Serre Active' : 'Gérer cette serre'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );

    if (embedded) {
        return content;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.viewHeader}>
                <View>
                    <Text style={styles.viewTitle}>Vue de Synthèse Multi-Serres</Text>
                    <Text style={styles.viewSubtitle}>
                        Supervision consolidée du parc horticole CyberCortex
                    </Text>
                </View>

                {onClose && (
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕ Fermer</Text>
                    </Pressable>
                )}
            </View>

            {content}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    embeddedWrapper: {
        padding: 0,
    },
    mainWrapper: {
        width: '100%',
    },
    viewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    viewTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    viewSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    closeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#e2e8f0',
    },
    closeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },

    // KPI Cards
    kpiContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    kpiCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            web: { boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' },
            default: { elevation: 1 }
        })
    },
    kpiCardOptimal: {
        borderColor: '#a7f3d0',
        backgroundColor: '#f0fdf4',
    },
    kpiCardWarning: {
        borderColor: '#fde68a',
        backgroundColor: '#fffbeb',
    },
    kpiCardAlerts: {
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2',
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2,
    },

    // Grid
    gridContainer: {
        gap: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.2s ease',
            },
            default: {
                elevation: 2,
            }
        })
    },
    cardActive: {
        borderColor: '#22c55e',
        backgroundColor: '#fbfdfb',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    cardSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Metrics
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    metricBlock: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    metricVal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    metricTarget: {
        fontSize: 10,
        color: '#94a3b8',
    },

    // Footer
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    alertIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    alertText: {
        fontSize: 11,
        color: '#64748b',
    },
    selectBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    selectBtnCurrent: {
        backgroundColor: '#dcfce7',
    },
    selectBtnAction: {
        backgroundColor: '#0f172a',
    },
    selectBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },
    selectBtnTextCurrent: {
        color: '#166534',
    },
    selectBtnTextAction: {
        color: '#ffffff',
    }
});
