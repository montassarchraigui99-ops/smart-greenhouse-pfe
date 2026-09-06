import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '../services/recommendationService';

export const useRecommendations = () =>
    useQuery({
        queryKey: ['recommendations'],
        queryFn: fetchRecommendations,
    });
