export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
    id: string;
    title: string;
    description: string;
    priority: RecommendationPriority;
    category: string;
    actionLabel?: string;
    timestamp: string;
    icon: string;
}
