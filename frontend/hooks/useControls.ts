import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchActuators, toggleActuator } from '../services/controlService';

export const useControls = () =>
    useQuery({
        queryKey: ['actuators'],
        queryFn: fetchActuators,
    });

export const useToggleActuator = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => toggleActuator(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['actuators'] });
        },
    });
};
