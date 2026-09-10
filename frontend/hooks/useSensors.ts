// hooks/useSensors.ts
import { useQuery } from '@tanstack/react-query';
import { getSensors } from '../services/api';

export const useSensors = () => {
    return useQuery({
        queryKey: ['sensors'],
        queryFn: getSensors,
        refetchInterval: 5000,
    });
};

export const useGreenhouse = () => {
    return {
        data: {
            id: 'gh-01',
            name: 'Serre Intelligente CyberCortex',
            isOnline: true,
            plantHealth: 94,
            sensors: [] as any[],
        },
        isLoading: false,
    };
};

