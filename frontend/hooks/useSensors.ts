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
