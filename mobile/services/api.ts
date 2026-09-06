/**
 * Rôle : Lead Frontend React Native Developer
 * Fichier : services/api.ts
 * Objectif : Centralisation de la communication avec le backend CyberCortex.
 */

// Si vous testez sur un appareil physique ou sur Android Studio, remplacez localhost
// par l'adresse IP locale de votre machine (ex: 192.168.1.X:5000)
export const API_BASE_URL = 'http://localhost:5000/api';

export interface TelemetryData {
    sensor_key: string;
    value: number;
    timestamp: string;
}

export interface ActuatorLog {
    actuator_key: string;
    action: string;
    trigger_source: string;
    timestamp: string;
}

/**
 * Récupère l'historique d'un capteur sur les dernières 24h.
 * @param sensorKey Ex: 'ambient_temperature' ou 'air_humidity'
 */
export const fetchTelemetry = async (sensorKey: string): Promise<TelemetryData[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/telemetry?sensor_key=${sensorKey}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error(`[API-ERROR] Impossible de récupérer la télémétrie pour ${sensorKey}:`, error);
        return []; // Fallback vide pour éviter un crash complet
    }
};

/**
 * Récupère les 50 dernières actions effectuées par le moteur ou manuellement.
 */
export const fetchActuatorLogs = async (): Promise<ActuatorLog[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/actuators/logs`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('[API-ERROR] Impossible de récupérer les logs d\'actionneurs:', error);
        return [];
    }
};

/**
 * Récupère la liste des capteurs de la serre.
 * Mock temporaire si le backend ne l'expose pas encore.
 */
export const getSensors = async () => {
    return [
        { id: '1', sensor_key: 'ambient_temperature', name: 'Température Ambiante', unit: '°C', status: 'Actif' },
        { id: '2', sensor_key: 'air_humidity', name: 'Humidité de l\'Air', unit: '%', status: 'Actif' }
    ];
};

export interface AlertItem {
    id: number;
    severity: string;
    title: string;
    description: string;
    error_code?: string;
    tag?: string;
    is_read: boolean;
    created_at: string;
}

export const fetchAlerts = async (): Promise<AlertItem[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/alerts`);
        const json = await response.json();
        const alerts = json.data || [];
        // Mapping depuis le Backend vers la structure demandée
        return alerts.map((a: any) => ({
            id: a.id,
            severity: a.severity.charAt(0).toUpperCase() + a.severity.slice(1), // Capitalize 'critique' -> 'Critique'
            title: a.title,
            description: a.message,
            error_code: a.tag,
            tag: a.tag,
            is_read: a.is_read,
            created_at: a.timestamp
        }));
    } catch (error) {
        console.error('Erreur API fetchAlerts:', error);
        return [];
    }
};

export const markAlertAsRead = async (alertId: number) => {
    try {
        const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/read`, {
            method: 'PUT',
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.error('Erreur API markAlertAsRead:', error);
        throw error;
    }
};

// ==========================================
// 4. API PROFIL UTILISATEUR
// ==========================================
export interface UserProfile {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    location: string;
    role: string;
    organization: string;
    updated_at: string;
}

export interface ProfileResponse {
    status: string;
    profile: UserProfile;
    stats: {
        connected_greenhouses: number;
        active_sensors: number;
        relays: number;
    };
}

export const fetchUserProfile = async (): Promise<ProfileResponse | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`);
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.error('Erreur API fetchUserProfile:', error);
        return null;
    }
};

export const updateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileUpdate)
        });
        return await response.json();
    } catch (error) {
        console.error('Erreur API updateUserProfile:', error);
        throw error;
    }
};
