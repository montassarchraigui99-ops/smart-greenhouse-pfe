/**
 * Rôle : Lead Systems Architect & Principal UI/UX React Native Engineer
 * Fichier : components/navigation/FloatingTabBar.tsx
 * Système : CyberCortex ERP (Barre de navigation inférieure flottante)
 * Objectif : Système d'infobulles interactif (Tooltips / Hover Labels) au survol des 5 icônes principales.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useRouter, useSegments } from 'expo-router';

// ============================================================================
// TYPAGE STRICT DES ÉLÉMENTS DE NAVIGATION
// ============================================================================
export interface NavTabItem {
    id: number;
    name: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    hasBadge?: boolean;
}

// 1. DÉFINITION DES 5 ÉLÉMENTS DE NAVIGATION AVEC LIBELLÉS EXPLICITES
export const NAV_TABS: NavTabItem[] = [
    { id: 0, name: 'index', label: 'Accueil', icon: 'home' },
    { id: 1, name: 'monitoring', label: 'Analytique & Télémétrie', icon: 'stats-chart' },
    { id: 2, name: 'control', label: 'Jumeau Numérique', icon: 'game-controller' },
    { id: 3, name: 'alerts', label: 'Journal des Alertes', icon: 'notifications', hasBadge: true },
    { id: 4, name: 'profile', label: 'Espace Scientifique', icon: 'person' },
];

export function FloatingTabBar() {
    const router = useRouter();
    const segments = useSegments();

    // 1. ÉTAT LOCAL POUR SUIVRE L'ICÔNE ACTUELLEMENT SURVOLÉE
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Détection de la route active pour rétroéclairage de l'onglet
    const currentRoute = segments[segments.length - 1] || 'index';

    return (
        <View style={styles.floatingTabBarWrapper} pointerEvents="box-none">
            <View style={styles.floatingTabBar}>
                {NAV_TABS.map((tab) => {
                    const isActive = currentRoute === tab.name || (tab.name === 'index' && (currentRoute === '(tabs)' || currentRoute === 'index'));
                    const isHovered = hoveredIndex === tab.id;

                    // 2. GESTIONNAIRES D'ÉVÉNEMENTS POINTER / HOVER
                    const hoverHandlers = {
                        onMouseEnter: () => setHoveredIndex(tab.id),
                        onMouseLeave: () => setHoveredIndex(null),
                    };

                    return (
                        <View
                            key={tab.id}
                            style={styles.tabItemWrapper}
                            {...(hoverHandlers as any)}
                        >
                            {/* 3. RENDU DE L'INFOBULLE FLOTTANTE (TOOLTIP DESIGN) */}
                            {isHovered && (
                                <View style={styles.tooltipContainer} pointerEvents="none">
                                    <View style={styles.tooltipBubble}>
                                        <Text style={styles.tooltipText}>{tab.label}</Text>
                                    </View>
                                    {/* Flèche d'infobulle pointant vers l'icône */}
                                    <View style={styles.tooltipArrow} />
                                </View>
                            )}

                            {/* BOUTON D'INTERACTION */}
                            <TouchableOpacity
                                style={styles.tabItem}
                                onPress={() => router.push(`/${tab.name === 'index' ? '' : tab.name}` as any)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={tab.label}
                                {...(hoverHandlers as any)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={24}
                                    color={isActive ? Colors.primary : Colors.textSecondary}
                                />
                                {tab.hasBadge && <View style={styles.tabBadge} />}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

// Alias export pour assurer la compatibilité NavigationNavbar
export const NavigationNavbar = FloatingTabBar;
export default FloatingTabBar;

// ============================================================================
// STYLES AVEC RESPECT STRICT DE LA GÉOMÉTRIE FLOTTANTE
// ============================================================================
const styles = StyleSheet.create({
    floatingTabBarWrapper: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    // 4. DISPOSITION GÉOMÉTRIQUE STRICTEMENT PRÉSERVÉE
    floatingTabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 40,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        width: '90%',
        maxWidth: 400,
        justifyContent: 'space-around',
        alignItems: 'center',
        position: 'relative',
    },
    tabItemWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabItem: {
        padding: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.critical,
    },

    // ========================================================================
    // DESIGN SYSTEM DE L'INFOBULLE (TOOLTIP FLOTTANT)
    // ========================================================================
    tooltipContainer: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        // Transition douce d'apparition sur Web
        ...(Platform.OS === 'web' ? {
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            pointerEvents: 'none',
        } as any : {}),
    },
    tooltipBubble: {
        backgroundColor: '#2c3e50', // Fond sombre élégant
        paddingHorizontal: 8,        // Padding compact
        paddingVertical: 4,
        borderRadius: 6,             // Coins arrondis
        elevation: 4,                // Subtil ombrage
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltipText: {
        color: '#ffffff',            // Texte blanc
        fontSize: 12,                // Police miniature
        fontWeight: '600',
        textAlign: 'center',
        // Empêcher les sauts de ligne intempestifs sur desktop/web
        ...(Platform.OS === 'web' ? {
            whiteSpace: 'nowrap',
            userSelect: 'none',
        } as any : {}),
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 5,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#2c3e50',   // Couleur assortie à la bulle
        alignSelf: 'center',
    },
});
