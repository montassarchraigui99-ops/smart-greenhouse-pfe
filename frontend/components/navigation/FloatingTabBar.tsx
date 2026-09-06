import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useRouter, useSegments } from 'expo-router';

export function FloatingTabBar() {
    const router = useRouter();
    const segments = useSegments();

    // current route detection to light up the active tab
    const currentRoute = segments[segments.length - 1] || 'index';

    const tabs = [
        { name: 'index', icon: 'home' },
        { name: 'monitoring', icon: 'stats-chart' },
        { name: 'control', icon: 'game-controller' },
        { name: 'alerts', icon: 'notifications', hasBadge: true },
        { name: 'profile', icon: 'person' },
    ];

    return (
        <View style={styles.floatingTabBarWrapper} pointerEvents="box-none">
            <View style={styles.floatingTabBar}>
                {tabs.map((tab, idx) => {
                    const isActive = currentRoute === tab.name;
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={styles.tabItem}
                            onPress={() => router.push(`/${tab.name === 'index' ? '' : tab.name}` as any)}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={24}
                                color={isActive ? Colors.primary : Colors.textSecondary}
                            />
                            {tab.hasBadge && <View style={styles.tabBadge} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    floatingTabBarWrapper: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
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
    }
});
