/**
 * Living Intelligence Navigation
 * FloatingTabBar with responsive active states and clean tooltips
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from '../../i18n';

export interface NavTabItem {
    id: number;
    name: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    hasBadge?: boolean;
}

export const NAV_TABS: NavTabItem[] = [
    { id: 0, name: 'index', label: 'Command Center', icon: 'apps-outline', activeIcon: 'apps' },
    { id: 1, name: 'monitoring', label: 'Télémétrie & Courbes', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
    { id: 2, name: 'control', label: 'Cyber-Brain Actuateurs', icon: 'hardware-chip-outline', activeIcon: 'hardware-chip' },
    { id: 3, name: 'alerts', label: 'Journal des Alertes', icon: 'notifications-outline', activeIcon: 'notifications', hasBadge: true },
    { id: 4, name: 'profile', label: 'Espace Scientifique', icon: 'person-outline', activeIcon: 'person' },
];

export function FloatingTabBar() {
    const { t } = useTranslation();
    const router = useRouter();
    const segments = useSegments();
    const { width } = useWindowDimensions();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const currentRoute = segments[segments.length - 1] || 'index';
    const isDesktop = width >= 768;

    return (
        <View style={[styles.floatingTabBarWrapper, isDesktop && styles.desktopWrapper]} pointerEvents="box-none">
            <View style={[styles.floatingTabBar, isDesktop && styles.desktopBar]}>
                {NAV_TABS.map((tab) => {
                    const isActive = currentRoute === tab.name || (tab.name === 'index' && (currentRoute === '(tabs)' || currentRoute === 'index'));
                    const isHovered = hoveredIndex === tab.id;

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
                            {/* Living Intelligence Tooltip */}
                            {isHovered && !isActive && (
                                <View style={styles.tooltipContainer} pointerEvents="none">
                                    <View style={styles.tooltipBubble}>
                                        <Text style={styles.tooltipText}>{tab.label}</Text>
                                    </View>
                                    <View style={styles.tooltipArrow} />
                                </View>
                            )}

                            {/* Active/Inactive Tab Button */}
                            <TouchableOpacity
                                style={[
                                    styles.tabItem,
                                    isActive && styles.tabItemActive,
                                    isHovered && !isActive && styles.tabItemHovered,
                                ]}
                                onPress={() => router.push(`/${tab.name === 'index' ? '' : tab.name}` as any)}
                                activeOpacity={0.8}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: isActive }}
                                accessibilityLabel={tab.label}
                                {...(hoverHandlers as any)}
                            >
                                <Ionicons
                                    name={isActive ? tab.activeIcon : tab.icon}
                                    size={22}
                                    color={isActive ? Colors.surface : Colors.textMuted}
                                />
                                {isDesktop && (
                                    <Text
                                        style={[
                                            styles.tabLabel,
                                            isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                                        ]}
                                    >
                                        {tab.name === 'index'
                                            ? t('tab_home_short', 'Accueil')
                                            : tab.name === 'monitoring'
                                            ? t('tab_analytics_short', 'Analytique')
                                            : tab.name === 'control'
                                            ? t('tab_brain_short', 'Cyber-Brain')
                                            : tab.name === 'alerts'
                                            ? t('tab_alerts_short', 'Alertes')
                                            : t('tab_profile_short', 'Profil')}
                                    </Text>
                                )}
                                {tab.hasBadge && (
                                    <View
                                        style={[
                                            styles.tabBadge,
                                            isActive && styles.tabBadgeOnActive,
                                        ]}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

export const NavigationNavbar = FloatingTabBar;
export default FloatingTabBar;

const styles = StyleSheet.create({
    floatingTabBarWrapper: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    desktopWrapper: {
        bottom: Spacing.xl,
    },
    floatingTabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.round,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.float,
        width: '92%',
        maxWidth: 420,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    desktopBar: {
        maxWidth: 580,
        paddingHorizontal: 12,
    },
    tabItemWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: BorderRadius.round,
        position: 'relative',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                userSelect: 'none',
            } as any,
            default: {},
        }),
    },
    tabItemActive: {
        backgroundColor: Colors.primary, // Deep Botanical Green #1F7A46
        ...Shadows.subtle,
    },
    tabItemHovered: {
        backgroundColor: `${Colors.primary}10`,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
        marginStart: 6,
    },
    tabLabelActive: {
        color: Colors.surface,
    },
    tabLabelInactive: {
        color: Colors.textMuted,
    },
    tabBadge: {
        position: 'absolute',
        top: 6,
        end: 8,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: Colors.danger,
        borderWidth: 1.5,
        borderColor: Colors.surface,
    },
    tabBadgeOnActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.warning,
    },
    tooltipContainer: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        ...(Platform.OS === 'web'
            ? ({
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  pointerEvents: 'none',
              } as any)
            : {}),
    },
    tooltipBubble: {
        backgroundColor: Colors.textDark,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
        ...Shadows.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltipText: {
        color: Colors.surface,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 5,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.textDark,
    },
});
