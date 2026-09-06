import { API_CONFIG } from '../constants/config';
import { Actuator, ActuatorType, ActuatorMode } from '../types/control';
import { mockActuators } from '../constants/mockData';

export const fetchActuators = async (): Promise<Actuator[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/actuators`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Erreur système! status: ${response.status}`);
        }

        const data = await response.json();

        // Mappage robuste SQLite -> TypeScript strict
        const mappedActuators: Actuator[] = data.map((row: any) => ({
            id: String(row.id),
            type: row.actuator_key as ActuatorType,
            name: row.name,
            isActive: row.is_active === 1 || row.is_active === true,
            mode: row.mode as ActuatorMode,
            lastUpdated: row.updated_at,
            icon: '', // Default or mapped if available
            description: row.auto_status_text || ''
        }));

        return mappedActuators;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[ControlService] Échec de la récupération des actionneurs :', error);
        // Propagation maîtrisée en cas de coupure réseau
        throw error;
    }
};

export const toggleActuator = async (id: string): Promise<Actuator> => {
    // Note: This relies on a POST/PUT endpoint. For now simulating robustly or waiting for API update.
    console.warn('[ControlService] Toggle endpoint not yet implemented on backend.');
    throw new Error('Toggle operations require backend mutation bindings.');
};
