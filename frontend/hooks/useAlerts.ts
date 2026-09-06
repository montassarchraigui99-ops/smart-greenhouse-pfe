import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '../services/alertService';

export const useAlerts = () =>
    useQuery({
        queryKey: ['alerts'],
        queryFn: fetchAlerts,
        refetchInterval: 15000,
    });
