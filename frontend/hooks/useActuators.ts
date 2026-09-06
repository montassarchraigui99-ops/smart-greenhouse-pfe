import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActuators, toggleActuatorAPI } from '../services/actuatorApi';

export const useActuators = () => {
    return useQuery({
        queryKey: ['actuators'],
        queryFn: getActuators,
        refetchInterval: 5000,
    });
};

export const useToggleActuator = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, state }: { key: string; state: boolean }) => toggleActuatorAPI(key, state),
        onSuccess: () => {
            // Force re-fetch of actuators so UI updates immediately
            queryClient.invalidateQueries({ queryKey: ['actuators'] });
        },
    });
};
