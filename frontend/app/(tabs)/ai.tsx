import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useRecommendations } from '../../hooks/useRecommendations';
import { Recommendation, RecommendationPriority } from '../../types/recommendation';

const priorityColors: Record<RecommendationPriority, string> = {
    high: Colors.critical,
    medium: Colors.warning,
    low: Colors.info,
};

const priorityBgColors: Record<RecommendationPriority, string> = {
    high: Colors.criticalBg,
    medium: Colors.warningBg,
    low: Colors.infoBg,
};

const priorityLabels: Record<RecommendationPriority, string> = {
    high: 'High Priority',
    medium: 'Medium',
    low: 'Low',
};

export default function AIScreen() {
    const { data: recommendations, isLoading } = useRecommendations();

    if (isLoading || !recommendations) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="sparkles" size={48} color={Colors.primary} />
                <Text style={styles.loadingText}>Generating insights...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.aiIconContainer}>
                    <Ionicons name="sparkles" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.headerTitle}>AI Recommendations</Text>
                <Text style={styles.headerSubtext}>
                    Smart insights powered by greenhouse sensor analysis
                </Text>
            </View>

            {/* Recommendations */}
            {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
        </ScrollView>
    );
}

const RecommendationCard: React.FC<{ recommendation: Recommendation }> = ({ recommendation }) => {
    const color = priorityColors[recommendation.priority];
    const bgColor = priorityBgColors[recommendation.priority];

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: `${color}15` }]}>
                    <Ionicons name={recommendation.icon as any} size={22} color={color} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{recommendation.title}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: bgColor }]}>
                        <Text style={[styles.priorityText, { color }]}>
                            {priorityLabels[recommendation.priority]}
                        </Text>
                    </View>
                </View>
            </View>
            <Text style={styles.cardDescription}>{recommendation.description}</Text>
            <View style={styles.cardFooter}>
                <Text style={styles.cardCategory}>{recommendation.category}</Text>
                {recommendation.actionLabel && (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${color}15` }]}>
                        <Text style={[styles.actionButtonText, { color }]}>{recommendation.actionLabel}</Text>
                        <Ionicons name="arrow-forward" size={14} color={color} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: Spacing.md,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    aiIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    headerSubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    cardHeaderText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    priorityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.round,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
    },
    cardDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardCategory: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
