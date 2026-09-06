import { mockRecommendations } from '../constants/mockData';
import { Recommendation } from '../types/recommendation';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchRecommendations = async (): Promise<Recommendation[]> => {
    await delay(350);
    return mockRecommendations;
};
