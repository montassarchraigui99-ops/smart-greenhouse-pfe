import { API_CONFIG } from '../constants/config';
import { Alert, AlertSeverity } from '../types/alert';
import { mockAlerts } from '../constants/mockData';

export const fetchAlerts = async (): Promise<Alert[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/alerts`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Erreur système! status: ${response.status}`);
        }

        const data = await response.json();

        const mappedAlerts: Alert[] = data.map((row: any) => {
            let mappedSeverity: AlertSeverity = 'info';
            if (row.severity === 'Warning' || row.severity === 'WARNING') mappedSeverity = 'warning';
            if (row.severity === 'Critique' || row.severity === 'CRITICAL') mappedSeverity = 'critical';

            return {
                id: String(row.id),
                severity: mappedSeverity,
                title: row.title,
                message: row.description,
                timestamp: row.created_at || new Date().toISOString(),
                read: row.is_read === 1 || row.is_read === true,
                sensorType: row.error_code || undefined
            };
        });

        return mappedAlerts;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[AlertService] Échec de la récupération des alertes :', error);
        throw error;
    }
};
