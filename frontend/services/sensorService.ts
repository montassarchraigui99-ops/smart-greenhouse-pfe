import { API_CONFIG } from '../constants/config';
import { SensorReading, SensorHistory, GreenhouseStatus, SensorType } from '../types/sensor';
import { mockSensorHistory, mockGreenhouse } from '../constants/mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchSensors = async (): Promise<SensorReading[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/sensors`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Erreur système! status: ${response.status}`);
        }

        const data = await response.json();

        // Mapping robuste : SQLite row -> TypeScript strict SensorReading
        const mappedSensors: SensorReading[] = data.map((row: any) => {
            // Mappe le status de la BDD vers le Literal Type TS strict
            let mappedStatus: 'normal' | 'warning' | 'critical' = 'normal';
            if (row.status === 'WARNING') mappedStatus = 'warning';
            if (row.status === 'CRITICAL') mappedStatus = 'critical';

            return {
                id: String(row.id),
                type: row.sensor_key as SensorType,
                value: row.value,
                unit: row.unit,
                timestamp: row.updated_at,
                label: row.name,
                status: mappedStatus
            };
        });

        return mappedSensors;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[SensorService] Échec de la récupération des capteurs :', error);
        throw error;
    }
};

export const fetchSensorHistory = async (): Promise<SensorHistory[]> => {
    // Reste mocké pour le moment
    await delay(400);
    return mockSensorHistory;
};

export const fetchGreenhouse = async (): Promise<GreenhouseStatus> => {
    // Reste mocké pour le moment
    await delay(300);
    return mockGreenhouse;
};
