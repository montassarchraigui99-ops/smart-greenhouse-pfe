/**
 * Rôle : Principal Frontend Engineer & Design Architect
 * Fichier : components/navigation/GreenhouseSelector.tsx
 * Objectif : Sélecteur de serre interactive (Dropdown dans le Header) avec pastilles de statut,
 *            métadonnées en direct et bascule transparente de contexte.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useActiveGreenhouse } from '../../context/ActiveGreenhouseContext';
import { Greenhouse } from '../../services/api';
import { GreenhouseModal } from '../GreenhouseModal';

export interface GreenhouseSelectorProps {
    compact?: boolean;
}

export const GreenhouseSelector: React.FC<GreenhouseSelectorProps> = ({ compact = false }) => {
    const {
        activeGreenhouseId,
        activeGreenhouse,
        greenhouses,
        selectGreenhouse,
        setIsMultiViewOpen,
        setIsManagementModalOpen,
    } = useActiveGreenhouse();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const getStatusTheme = (status?: string) => {
        const s = (status || 'OPTIMAL').toUpperCase();
        switch (s) {
            case 'OPTIMAL':
                return {
                    dotColor: '#10b981',
                    badgeBg: '#ecfdf5',
                    badgeBorder: '#a7f3d0',
                    badgeText: '#047857',
                    label: 'OPTIMAL'
                };
            case 'ATTENTION':
                return {
                    dotColor: '#f59e0b',
                    badgeBg: '#fffbeb',
                    badgeBorder: '#fde68a',
                    badgeText: '#b45309',
                    label: 'ATTENTION'
                };
            case 'CRITICAL':
                return {
                    dotColor: '#ef4444',
                    badgeBg: '#fef2f2',
                    badgeBorder: '#fecaca',
                    badgeText: '#b91c1c',
                    label: 'CRITIQUE'
                };
            default:
                return {
                    dotColor: '#94a3b8',
                    badgeBg: '#f1f5f9',
                    badgeBorder: '#cbd5e1',
                    badgeText: '#475569',
                    label: 'VEILLE'
                };
        }
    };

    const currentTheme = getStatusTheme(activeGreenhouse?.status);

    const handleSelect = (gh: Greenhouse) => {
        selectGreenhouse(gh.id);
        setDropdownOpen(false);
    };

    const displayName = activeGreenhouse?.name 
        ? (compact ? activeGreenhouse.name.replace('Serre Maraîchère ', '').replace('Serre Hydroponique ', '').replace('Serre Tropicale ', '') : activeGreenhouse.name)
        : `Serre #${activeGreenhouseId}`;

    return (
        <View style={styles.container}>
            {/* Bouton déclencheur dans le Header */}
            <Pressable
                onPress={() => setDropdownOpen(!dropdownOpen)}
                style={({ pressed }) => [
                    styles.triggerButton,
                    compact && styles.triggerButtonCompact,
                    pressed && styles.triggerButtonPressed,
                    dropdownOpen && styles.triggerButtonActive
                ]}
            >
                <View style={[styles.triggerLeft, compact && styles.triggerLeftCompact]}>
                    {/* Icône Serre Botanique ou Pastille en mode Compact */}
                    {compact ? (
                        <View style={[styles.statusDot, { backgroundColor: currentTheme.dotColor, marginEnd: 6 }]} />
                    ) : (
                        <View style={styles.iconContainer}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Path
                                    d="M12 3L3 9V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V9L12 3Z"
                                    stroke="#15803d"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <Path
                                    d="M9 21V12H15V21"
                                    stroke="#15803d"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        </View>
                    )}

                    <View style={styles.textContainer}>
                        {!compact && <Text style={styles.preTitle}>SERRE ACTIVE</Text>}
                        <Text style={[styles.greenhouseName, compact && styles.greenhouseNameCompact]} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>
                </View>

                <View style={styles.triggerRight}>
                    {/* Pastille de Statut (mode normal uniquement) */}
                    {!compact && (
                        <View style={[styles.statusBadge, { backgroundColor: currentTheme.badgeBg, borderColor: currentTheme.badgeBorder }]}>
                            <View style={[styles.statusDot, { backgroundColor: currentTheme.dotColor }]} />
                            <Text style={[styles.statusText, { color: currentTheme.badgeText }]}>
                                {currentTheme.label}
                            </Text>
                        </View>
                    )}

                    {/* Chevron Déroulant */}
                    <Svg width={compact ? 12 : 16} height={compact ? 12 : 16} viewBox="0 0 24 24" fill="none" style={dropdownOpen ? styles.chevronUp : styles.chevronDown}>
                        <Path d="M6 9L12 15L18 9" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </View>
            </Pressable>

            {/* Menu Déroulant (Modal avec Backdrop) */}
            <Modal
                visible={dropdownOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDropdownOpen(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setDropdownOpen(false)}>
                    <Pressable style={styles.dropdownCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dropdownHeader}>
                            <View>
                                <Text style={styles.dropdownTitle}>Unités de Culture Multi-Serres</Text>
                                <Text style={styles.dropdownSubtitle}>
                                    {greenhouses.length} serres monitorées en temps réel
                                </Text>
                            </View>
                            <View style={styles.headerBtnsRow}>
                                <Pressable
                                    onPress={() => {
                                        setDropdownOpen(false);
                                        setIsManagementModalOpen(true);
                                    }}
                                    style={styles.manageBtn}
                                >
                                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                                        <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <Path d="M19.4 15A1.65 1.65 0 0 0 20 16.34L20.09 16.5A2 2 0 0 1 18.17 19.4L18 19.34A1.65 1.65 0 0 0 16.5 20V20.18A2 2 0 0 1 13.6 22H10.4A2 2 0 0 1 7.5 20.18V20A1.65 1.65 0 0 0 6 19.34L5.83 19.4A2 2 0 0 1 3.91 16.5L4 16.34A1.65 1.65 0 0 0 4.6 15V14.82A1.65 1.65 0 0 0 4 13.5L3.91 13.34A2 2 0 0 1 5.83 10.44L6 10.5A1.65 1.65 0 0 0 7.5 9.84V9.66A2 2 0 0 1 10.4 7.84H13.6A2 2 0 0 1 16.5 9.66V9.84A1.65 1.65 0 0 0 18 10.5L18.17 10.44A2 2 0 0 1 20.09 13.34L20 13.5A1.65 1.65 0 0 0 19.4 14.82V15Z" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </Svg>
                                    <Text style={styles.manageBtnText}>Gérer</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        setDropdownOpen(false);
                                        setIsMultiViewOpen(true);
                                    }}
                                    style={styles.gridBtn}
                                >
                                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                                        <Path d="M3 3H10V10H3V3Z" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <Path d="M14 3H21V10H14V3Z" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <Path d="M14 14H21V21H14V14Z" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <Path d="M3 14H10V21H3V14Z" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </Svg>
                                    <Text style={styles.gridBtnText}>Vue Synthèse</Text>
                                </Pressable>
                            </View>
                        </View>

                        <FlatList
                            data={greenhouses}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                            renderItem={({ item }) => {
                                const isSelected = item.id === activeGreenhouseId;
                                const itemTheme = getStatusTheme(item.status);

                                return (
                                    <Pressable
                                        onPress={() => handleSelect(item)}
                                        style={({ pressed }) => [
                                            styles.greenhouseItem,
                                            isSelected && styles.greenhouseItemSelected,
                                            pressed && styles.greenhouseItemPressed
                                        ]}
                                    >
                                        <View style={styles.itemLeft}>
                                            <View style={[styles.itemDot, { backgroundColor: itemTheme.dotColor }]} />
                                            <View style={styles.itemInfo}>
                                                <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                                                    {item.name}
                                                </Text>
                                                <Text style={styles.itemMeta}>
                                                    {item.crop_type} • {item.location}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.itemRight}>
                                            {/* Température live si disponible */}
                                            {item.live_temperature !== undefined && (
                                                <View style={styles.tempBadge}>
                                                    <Text style={styles.tempBadgeText}>
                                                        {item.live_temperature.toFixed(1)}°C
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Badge d'alertes si présentes */}
                                            {(item.unread_alerts_count || 0) > 0 && (
                                                <View style={styles.alertCountBadge}>
                                                    <Text style={styles.alertCountText}>
                                                        {item.unread_alerts_count}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Coche de sélection */}
                                            {isSelected && (
                                                <View style={styles.checkmark}>
                                                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                                        <Path d="M20 6L9 17L4 12" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                    </Svg>
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            }}
                        />

                        {/* Pied du menu fixe : Séparateur fin + Bouton cliquable + Ajouter une serre */}
                        <View style={styles.dropdownFooter}>
                            <View style={styles.footerSeparator} />

                            <Pressable
                                onPress={() => {
                                    setDropdownOpen(false);
                                    setIsAddModalOpen(true);
                                }}
                                style={({ pressed }) => [
                                    styles.addGreenhouseBtn,
                                    pressed && styles.addGreenhouseBtnPressed,
                                ]}
                            >
                                <View style={styles.addIconCircle}>
                                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                        <Path d="M12 5V19M5 12H19" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </Svg>
                                </View>
                                <Text style={styles.addGreenhouseBtnText}>+ Ajouter une serre</Text>
                            </Pressable>

                            <View style={styles.footerShield}>
                                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                                    <Path d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </Svg>
                                <Text style={styles.footerText}>
                                    Étanchéité télémétrique & Cyber-Brain garantie
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Modal d'ajout rapide d'une serre */}
            <GreenhouseModal
                visible={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 50,
    },
    triggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minWidth: 260,
        maxWidth: 380,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            },
            default: {
                elevation: 2,
            }
        })
    },
    triggerButtonCompact: {
        minWidth: 130,
        maxWidth: 220,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    triggerLeftCompact: {
        marginEnd: 6,
    },
    greenhouseNameCompact: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
    },
    triggerButtonPressed: {
        backgroundColor: '#f8fafc',
        transform: [{ scale: 0.99 }]
    },
    triggerButtonActive: {
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4'
    },
    triggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginEnd: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 10,
    },
    textContainer: {
        flex: 1,
    },
    preTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: '#15803d',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    greenhouseName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
    },
    triggerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    chevronDown: {
        transform: [{ rotate: '0deg' }],
    },
    chevronUp: {
        transform: [{ rotate: '180deg' }],
    },

    // Modal Dropdown
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Platform.OS === 'web' ? 70 : 80,
    },
    dropdownCard: {
        width: '92%',
        maxWidth: 460,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            web: {
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
            },
            default: {
                elevation: 10,
            }
        })
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: 10,
    },
    dropdownTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    dropdownSubtitle: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    gridBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },
    gridBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#166534',
    },
    listContainer: {
        gap: 8,
    },
    greenhouseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    greenhouseItemSelected: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
    },
    greenhouseItemPressed: {
        backgroundColor: '#e2e8f0',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginEnd: 10,
    },
    itemDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginEnd: 10,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    itemNameSelected: {
        color: '#15803d',
    },
    itemMeta: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tempBadge: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    tempBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    alertCountBadge: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    alertCountText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#b91c1c',
    },
    checkmark: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBtnsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    manageBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
    },
    dropdownFooter: {
        marginTop: 12,
        paddingTop: 10,
    },
    footerSeparator: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 10,
    },
    addGreenhouseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        borderWidth: 1.5,
        borderColor: '#86efac',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        gap: 8,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            },
        }),
    },
    addGreenhouseBtnPressed: {
        backgroundColor: '#dcfce7',
        transform: [{ scale: 0.99 }],
    },
    addIconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addGreenhouseBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803d',
    },
    footerShield: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#059669',
    }
});
