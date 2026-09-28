/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : frontend/screens/GreenhouseManagementScreen.tsx
 * Objectif : Centre d'administration complet du parc multi-serres CyberCortex ERP.
 *            - Liste des serres avec pastilles de statut colorées
 *            - Actions rapides : Modifier (Crayon) & Supprimer (Corbeille avec garde-fous)
 *            - Bouton proéminent « + Ajouter une serre »
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Greenhouse, deleteGreenhouse } from '../services/api';
import { useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import { GreenhouseModal } from '../components/GreenhouseModal';

export interface GreenhouseManagementScreenProps {
    onClose?: () => void;
    embedded?: boolean;
}

export const GreenhouseManagementScreen: React.FC<GreenhouseManagementScreenProps> = ({
    onClose,
    embedded = false,
}) => {
    const { greenhouses, activeGreenhouseId, selectGreenhouse, refreshGreenhouses } = useActiveGreenhouse();

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedGhForEdit, setSelectedGhForEdit] = useState<Greenhouse | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const openCreateModal = () => {
        setSelectedGhForEdit(null);
        setModalVisible(true);
    };

    const openEditModal = (gh: Greenhouse) => {
        setSelectedGhForEdit(gh);
        setModalVisible(true);
    };

    const handleDelete = async (gh: Greenhouse) => {
        if (greenhouses.length <= 1) {
            const msg = 'Impossible de supprimer la dernière serre. Le système requiert au moins une unité opérationnelle.';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Action Interdite', msg);
            }
            return;
        }

        const confirmMessage = `Êtes-vous sûr de vouloir supprimer définitivement "${gh.name}" (${gh.id}) ? Toutes ses données télémétriques associées seront archivées.`;

        const executeDelete = async () => {
            try {
                setDeletingId(gh.id);
                setFeedbackBanner(null);
                await deleteGreenhouse(gh.id);
                await refreshGreenhouses();

                // Si la serre supprimée était l'active, basculer sur une autre
                if (activeGreenhouseId === gh.id) {
                    const remaining = greenhouses.filter(g => g.id !== gh.id);
                    if (remaining.length > 0) {
                        selectGreenhouse(remaining[0].id);
                    }
                }

                setFeedbackBanner({
                    type: 'success',
                    message: `La serre "${gh.name}" a été supprimée avec succès.`
                });
            } catch (err: any) {
                console.error('[DELETE-GH-ERROR]', err);
                setFeedbackBanner({
                    type: 'error',
                    message: err.message || 'Échec de la suppression de la serre.'
                });
            } finally {
                setDeletingId(null);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                await executeDelete();
            }
        } else {
            Alert.alert(
                'Confirmation de suppression',
                confirmMessage,
                [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: executeDelete },
                ]
            );
        }
    };

    const getStatusTheme = (status?: string) => {
        const s = (status || 'healthy').toLowerCase();
        if (s === 'critical' || s === 'critique') {
            return {
                dotColor: '#ef4444',
                bgColor: '#fef2f2',
                borderColor: '#fecaca',
                textColor: '#b91c1c',
                label: 'Critique',
            };
        }
        if (s === 'warning' || s === 'attention') {
            return {
                dotColor: '#f59e0b',
                bgColor: '#fffbeb',
                borderColor: '#fde68a',
                textColor: '#b45309',
                label: 'Attention',
            };
        }
        return {
            dotColor: '#10b981',
            bgColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
            label: 'Optimale',
        };
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Mise en service récente';
        try {
            const d = new Date(dateStr);
            return `Mise en service le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        } catch (_) {
            return dateStr;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Barre de Gestion */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    {onClose && (
                        <Pressable onPress={onClose} style={styles.backButton}>
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    )}
                    <View>
                        <Text style={styles.pageTitle}>Gestion du Parc Multi-Serres</Text>
                        <Text style={styles.pageSubtitle}>
                            {greenhouses.length} unité{greenhouses.length > 1 ? 's' : ''} agricole{greenhouses.length > 1 ? 's' : ''} connectée{greenhouses.length > 1 ? 's' : ''} au Cyber-Brain
                        </Text>
                    </View>
                </View>

                {/* Bouton Proéminent « + Ajouter une serre » */}
                <Pressable
                    onPress={openCreateModal}
                    style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.9 }]}
                >
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 5V19M5 12H19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={styles.createButtonText}>Ajouter une serre</Text>
                </Pressable>
            </View>

            {/* Bannière de Notification */}
            {feedbackBanner && (
                <View
                    style={[
                        styles.banner,
                        feedbackBanner.type === 'success' ? styles.bannerSuccess : styles.bannerError,
                    ]}
                >
                    <Text
                        style={[
                            styles.bannerText,
                            feedbackBanner.type === 'success' ? styles.bannerTextSuccess : styles.bannerTextError,
                        ]}
                    >
                        {feedbackBanner.message}
                    </Text>
                    <Pressable onPress={() => setFeedbackBanner(null)}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                            <Path d="M18 6L6 18M6 6L18 18" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
                {/* Statistiques Rapides du Parc */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{greenhouses.length}</Text>
                        <Text style={styles.statLabel}>Total Serres</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: '#16a34a' }]}>
                            {greenhouses.filter(g => (g.status || '').toLowerCase() === 'healthy' || (g.status || '').toLowerCase() === 'optimal').length}
                        </Text>
                        <Text style={styles.statLabel}>Opérationnelles</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                            {greenhouses.filter(g => (g.status || '').toLowerCase() === 'warning' || (g.status || '').toLowerCase() === 'attention').length}
                        </Text>
                        <Text style={styles.statLabel}>En Attention</Text>
                    </View>
                </View>

                {/* Liste des Cartes de Serres */}
                <View style={styles.cardsGrid}>
                    {greenhouses.map((gh) => {
                        const isCurrentActive = gh.id === activeGreenhouseId;
                        const statusTheme = getStatusTheme(gh.status);
                        const isDeleting = deletingId === gh.id;

                        return (
                            <View
                                key={gh.id}
                                style={[
                                    styles.card,
                                    isCurrentActive && styles.cardActive,
                                    isDeleting && { opacity: 0.5 },
                                ]}
                            >
                                {/* Haut de la carte : Titre, Statut & Tag Actif */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardHeaderLeft}>
                                        <View style={[styles.statusDot, { backgroundColor: statusTheme.dotColor }]} />
                                        <View>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.greenhouseName}>{gh.name}</Text>
                                                {isCurrentActive && (
                                                    <View style={styles.activeTag}>
                                                        <Text style={styles.activeTagText}>ACTIVE</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.greenhouseId}>ID: {gh.id}</Text>
                                        </View>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: statusTheme.bgColor, borderColor: statusTheme.borderColor },
                                        ]}
                                    >
                                        <Text style={[styles.statusBadgeText, { color: statusTheme.textColor }]}>
                                            {statusTheme.label}
                                        </Text>
                                    </View>
                                </View>

                                {/* Corps de la carte : Détails Agronomiques */}
                                <View style={styles.cardBody}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>🌱 Culture :</Text>
                                        <Text style={styles.detailValue}>{gh.crop_type || 'Culture sous abri'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>📍 Localisation :</Text>
                                        <Text style={styles.detailValue}>🇹🇳 {gh.location || 'Tunisie'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>📅 En service :</Text>
                                        <Text style={styles.detailValue}>{formatDate(gh.created_at)}</Text>
                                    </View>
                                </View>

                                {/* Métriques Temps Réel si présentes */}
                                {gh.live_temperature !== undefined && (
                                    <View style={styles.metricsStrip}>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricItemVal}>{gh.live_temperature.toFixed(1)} °C</Text>
                                            <Text style={styles.metricItemLbl}>Temp. Live</Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={styles.metricItemVal}>{gh.live_humidity ? gh.live_humidity.toFixed(0) : '60'} %</Text>
                                            <Text style={styles.metricItemLbl}>Hygrométrie</Text>
                                        </View>
                                        <View style={styles.metricItem}>
                                            <Text style={[styles.metricItemVal, (gh.unread_alerts_count || 0) > 0 && { color: '#dc2626' }]}>
                                                {gh.unread_alerts_count || 0}
                                            </Text>
                                            <Text style={styles.metricItemLbl}>Alerte(s)</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Barre d'Actions Inférieure */}
                                <View style={styles.cardFooter}>
                                    {!isCurrentActive ? (
                                        <Pressable
                                            onPress={() => selectGreenhouse(gh.id)}
                                            style={styles.selectBtn}
                                        >
                                            <Text style={styles.selectBtnText}>Définir comme active</Text>
                                        </Pressable>
                                    ) : (
                                        <View style={styles.selectedIndicator}>
                                            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                                <Path d="M20 6L9 17L4 12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                            <Text style={styles.selectedIndicatorText}>En cours de visualisation</Text>
                                        </View>
                                    )}

                                    <View style={styles.actionButtonsGroup}>
                                        {/* Bouton Modifier (Crayon) */}
                                        <Pressable
                                            onPress={() => openEditModal(gh)}
                                            style={styles.iconBtn}
                                            accessibilityLabel={`Modifier ${gh.name}`}
                                        >
                                            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                                                <Path
                                                    d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                    stroke="#0284c7"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </Svg>
                                        </Pressable>

                                        {/* Bouton Supprimer (Corbeille) */}
                                        <Pressable
                                            onPress={() => handleDelete(gh)}
                                            style={[styles.iconBtn, styles.deleteIconBtn]}
                                            disabled={isDeleting}
                                            accessibilityLabel={`Supprimer ${gh.name}`}
                                        >
                                            {isDeleting ? (
                                                <ActivityIndicator size="small" color="#dc2626" />
                                            ) : (
                                                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                                                    <Path
                                                        d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86725 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20"
                                                        stroke="#dc2626"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </Svg>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Modal Réutilisable de Création / Édition */}
            <GreenhouseModal
                visible={modalVisible}
                greenhouseToEdit={selectedGhForEdit}
                onClose={() => setModalVisible(false)}
                onSaved={() => {
                    setFeedbackBanner({
                        type: 'success',
                        message: selectedGhForEdit
                            ? 'Serre mise à jour avec succès.'
                            : 'Nouvelle serre ajoutée et sélectionnée avec succès.',
                    });
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 18,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        flexWrap: 'wrap',
        gap: 12,
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    pageSubtitle: {
        fontSize: 12.5,
        color: '#64748b',
        marginTop: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#16a34a',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)',
                cursor: 'pointer',
            },
        }),
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 13.5,
        fontWeight: '700',
    },
    banner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 22,
        marginTop: 14,
        padding: 12,
        borderRadius: 10,
    },
    bannerSuccess: {
        backgroundColor: '#ecfdf5',
        borderLeftWidth: 4,
        borderLeftColor: '#10b981',
    },
    bannerError: {
        backgroundColor: '#fef2f2',
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    bannerText: {
        fontSize: 13,
        fontWeight: '500',
    },
    bannerTextSuccess: {
        color: '#065f46',
    },
    bannerTextError: {
        color: '#991b1b',
    },
    scrollList: {
        padding: 22,
        paddingBottom: 40,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    statLabel: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
        fontWeight: '500',
    },
    cardsGrid: {
        gap: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 18,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    cardActive: {
        borderColor: '#86efac',
        borderWidth: 1.5,
        backgroundColor: '#fcfffd',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    greenhouseName: {
        fontSize: 15.5,
        fontWeight: '700',
        color: '#0f172a',
    },
    greenhouseId: {
        fontSize: 11.5,
        color: '#64748b',
        marginTop: 1,
    },
    activeTag: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    activeTagText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#15803d',
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardBody: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        gap: 6,
        marginBottom: 14,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12.5,
        color: '#64748b',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#1e293b',
    },
    metricsStrip: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        marginBottom: 14,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f1f5f9',
    },
    metricItem: {
        alignItems: 'center',
    },
    metricItemVal: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#0f172a',
    },
    metricItemLbl: {
        fontSize: 10.5,
        color: '#64748b',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    selectBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
    },
    selectBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectedIndicatorText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#16a34a',
    },
    actionButtonsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIconBtn: {
        backgroundColor: '#fee2e2',
    },
});

export default GreenhouseManagementScreen;
