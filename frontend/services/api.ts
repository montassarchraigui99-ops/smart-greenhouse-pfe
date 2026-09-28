/**
 * Rôle : Lead Frontend React Native Developer
 * Fichier : services/api.ts
 * Objectif : Centralisation de la communication avec le backend CyberCortex.
 */

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

export interface Greenhouse {
    id: string;
    user_id: number;
    name: string;
    status: 'OPTIMAL' | 'ATTENTION' | 'CRITICAL' | 'OFFLINE' | string;
    location: string;
    crop_type: string;
    target_temp: number;
    target_humidity: number;
    created_at: string;
    live_temperature?: number;
    live_humidity?: number;
    last_updated?: string;
    unread_alerts_count?: number;
    critical_alerts_count?: number;
    total_alerts_count?: number;
}

export interface TelemetryData {
    sensor_key: string;
    value: number;
    timestamp: string;
    greenhouse_id?: string;
}

export interface ActuatorLog {
    actuator_key: string;
    action: string;
    trigger_source: string;
    timestamp: string;
    greenhouse_id?: string;
}

export type Timeframe = 'live' | '24h' | '7d' | '30d';

/**
 * Récupère l'ensemble des serres rattachées au profil utilisateur.
 */
export const fetchGreenhouses = async (): Promise<Greenhouse[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/greenhouses`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('[API-ERROR] fetchGreenhouses:', error);
        return [
            { id: 'gh-01', user_id: 1, name: 'Serre Maraîchère Alpha (NFT)', status: 'OPTIMAL', location: 'Tunis - Zone Nord', crop_type: 'Tomates Grappes NFT', target_temp: 24, target_humidity: 65, created_at: '', live_temperature: 24.2, live_humidity: 63, unread_alerts_count: 0 },
            { id: 'gh-02', user_id: 1, name: 'Serre Hydroponique Bêta (Aéroponie)', status: 'ATTENTION', location: 'Bizerte - Pôle Bio', crop_type: 'Poivrons & Piments', target_temp: 26.5, target_humidity: 55, created_at: '', live_temperature: 28.6, live_humidity: 52, unread_alerts_count: 1 },
            { id: 'gh-03', user_id: 1, name: 'Serre Tropicale Gamma (Vertical)', status: 'OPTIMAL', location: 'Mornag - Exploitation 2', crop_type: 'Fraises & Basilic', target_temp: 22, target_humidity: 70, created_at: '', live_temperature: 22.2, live_humidity: 68, unread_alerts_count: 0 }
        ];
    }
};

/**
 * Récupère le détail d'une serre spécifique.
 */
export const fetchGreenhouseById = async (id: string): Promise<Greenhouse | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/greenhouses/${encodeURIComponent(id)}`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.data || null;
    } catch (error) {
        console.error(`[API-ERROR] fetchGreenhouseById(${id}):`, error);
        return null;
    }
};

/**
 * Crée une nouvelle serre dans le système.
 */
export const createGreenhouse = async (payload: {
    name: string;
    location: string;
    crop_type: string;
    target_temp?: number;
    target_humidity?: number;
    status?: string;
}): Promise<Greenhouse> => {
    const response = await fetch(`${API_BASE_URL}/greenhouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Erreur HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.data;
};

/**
 * Met à jour les paramètres d'une serre existante.
 */
export const updateGreenhouse = async (
    id: string,
    payload: {
        name?: string;
        location?: string;
        crop_type?: string;
        target_temp?: number;
        target_humidity?: number;
        status?: string;
    }
): Promise<Greenhouse> => {
    const response = await fetch(`${API_BASE_URL}/greenhouses/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Erreur HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.data;
};

/**
 * Supprime une serre du système.
 */
export const deleteGreenhouse = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/greenhouses/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Erreur HTTP ${response.status}`);
    }
};

/**
 * Récupère l'historique d'un capteur avec filtrage strict par serre et agrégation/downsampling SQLite.
 * @param sensorKey Ex: 'ambient_temperature' ou 'air_humidity'
 * @param timeframe 'live' | '24h' | '7d' | '30d'
 * @param greenhouseId Ex: 'gh-01', 'gh-02', 'gh-03'
 */
export const fetchTelemetry = async (
    sensorKey: string,
    timeframe: Timeframe | string = 'live',
    greenhouseId: string = 'gh-01'
): Promise<TelemetryData[]> => {
    try {
        const tfParam = timeframe ? `&timeframe=${encodeURIComponent(timeframe)}` : '';
        const ghParam = greenhouseId ? `&greenhouseId=${encodeURIComponent(greenhouseId)}` : '';
        const response = await fetch(`${API_BASE_URL}/telemetry?sensor_key=${sensorKey}${tfParam}${ghParam}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error(`[API-ERROR] Impossible de récupérer la télémétrie pour ${sensorKey} [${greenhouseId}]:`, error);
        return [];
    }
};

/**
 * Récupère les 50 dernières actions effectuées, filtrées optionnellement par serre.
 */
export const fetchActuatorLogs = async (greenhouseId?: string): Promise<ActuatorLog[]> => {
    try {
        const ghParam = greenhouseId && greenhouseId !== 'all' ? `?greenhouseId=${encodeURIComponent(greenhouseId)}` : '';
        const response = await fetch(`${API_BASE_URL}/actuators/logs${ghParam}`);
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
 * Envoie une commande de pilotage d'actionneur à une serre spécifique.
 */
export const sendActuatorCommand = async (
    greenhouseId: string = 'gh-01',
    actuatorKey: string,
    action: string = 'TOGGLE'
) => {
    try {
        const response = await fetch(`${API_BASE_URL}/actuators/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ greenhouseId, actuator_key: actuatorKey, action })
        });
        return await response.json();
    } catch (error) {
        console.error('[API-ERROR] sendActuatorCommand:', error);
        throw error;
    }
};

/**
 * Récupère la liste des capteurs de la serre.
 */
export const getSensors = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors`);
        if (response.ok) {
            const result = await response.json();
            if (result.data && result.data.length > 0) {
                return result.data;
            }
        }
    } catch (_) {}
    return [
        { id: '1', sensor_key: 'sensor.ambient_temp', sensor_name: 'sensor.ambient_temp', name: 'sensor.ambient_temp', unit: '°C', status: 'status.optimal' },
        { id: '2', sensor_key: 'sensor.air_humidity', sensor_name: 'sensor.air_humidity', name: 'sensor.air_humidity', unit: '%', status: 'status.optimal' },
        { id: '3', sensor_key: 'sensor.photoperiod', sensor_name: 'sensor.photoperiod', name: 'sensor.photoperiod', unit: 'h', status: 'status.optimal' },
        { id: '4', sensor_key: 'sensor.water_consumption', sensor_name: 'sensor.water_consumption', name: 'sensor.water_consumption', unit: 'L', status: 'status.optimal' }
    ];
};

export interface AlertItem {
    id: number;
    greenhouse_id?: string;
    severity: string;
    title: string;
    description: string;
    error_code?: string;
    tag?: string;
    is_read: boolean;
    created_at: string;
}

export const fetchAlerts = async (greenhouseId?: string): Promise<AlertItem[]> => {
    try {
        const ghParam = greenhouseId && greenhouseId !== 'all' ? `?greenhouseId=${encodeURIComponent(greenhouseId)}` : '';
        const response = await fetch(`${API_BASE_URL}/alerts${ghParam}`);
        const json = await response.json();
        const alerts = json.data || [];
        return alerts.map((a: any) => ({
            id: a.id,
            greenhouse_id: a.greenhouse_id,
            severity: a.severity ? (a.severity.charAt(0).toUpperCase() + a.severity.slice(1)) : 'Info',
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

export const markAlertAsRead = async (alertId: number, isRead: boolean = true) => {
    try {
        const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_read: isRead ? 1 : 0 })
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
    preferred_language?: string;
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

// ==========================================
// 5. API CHATBOT IA (GOOGLE GEMINI)
// ==========================================
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
    source?: 'gemini' | 'cyber-brain-local';
}

export interface ChatResponse {
    status: string;
    reply: string;
    source?: 'gemini' | 'cyber-brain-local';
    model?: string;
}

export interface CopilotChatContext {
    activeGreenhouseId: string;
    activeGreenhouseName: string;
    availableGreenhouses: { id: string; name: string }[];
}

export const sendChatMessage = async (
    message: string,
    history: { role: 'user' | 'assistant'; text: string }[] = [],
    contextOrGreenhouseId: string | CopilotChatContext = 'gh-01'
): Promise<ChatResponse> => {
    try {
        let payload: any = { message, messages: history, history };

        if (typeof contextOrGreenhouseId === 'string') {
            payload.activeGreenhouseId = contextOrGreenhouseId;
            payload.greenhouseId = contextOrGreenhouseId;
        } else if (contextOrGreenhouseId && typeof contextOrGreenhouseId === 'object') {
            payload = {
                ...payload,
                activeGreenhouseId: contextOrGreenhouseId.activeGreenhouseId,
                activeGreenhouseName: contextOrGreenhouseId.activeGreenhouseName,
                availableGreenhouses: contextOrGreenhouseId.availableGreenhouses,
                greenhouseId: contextOrGreenhouseId.activeGreenhouseId
            };
        }

        // Appel prioritaire sur le moteur Copilot avec Conscience Spatiale
        let response = await fetch(`${API_BASE_URL}/copilot/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok && response.status === 404) {
            response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error: any) {
        console.error('[API-ERROR] sendChatMessage:', error);
        return {
            status: 'error',
            reply: "Désolé, une erreur réseau empêche la communication avec le Cyber-Brain. Veuillez vérifier que le serveur backend est bien démarré.",
            source: 'cyber-brain-local'
        };
    }
};

// ==========================================
// 6. API INFRASTRUCTURE & PARAMÈTRES
// ==========================================
export const getTelemetryExportUrl = (): string => {
    return `${API_BASE_URL}/infrastructure/export/telemetry`;
};

export interface MqttTokensResponse {
    status: string;
    credentials: {
        client_id: string;
        broker: string;
        port: number;
        username: string;
        password: string;
        protocol: string;
        mtls_enabled: boolean;
        certificate_fingerprint: string;
        topics: {
            telemetry: string;
            actuators: string;
            status: string;
            alerts: string;
        };
        issued_at: string;
        validity: string;
    };
}

export const fetchMqttTokens = async (nodeId: string = 'NODE-01'): Promise<MqttTokensResponse> => {
    const response = await fetch(`${API_BASE_URL}/infrastructure/security/tokens?node_id=${encodeURIComponent(nodeId)}`);
    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des tokens MQTT (${response.status})`);
    }
    return await response.json();
};

export interface AlertsConfig {
    emergency_contacts: string;
    temp_max_threshold: number;
    temp_min_threshold: number;
    humidity_min_threshold: number;
    soil_moisture_min_threshold: number;
    sms_enabled: boolean;
    push_enabled: boolean;
}

export const fetchAlertsConfig = async (): Promise<{ status: string; config: AlertsConfig }> => {
    const response = await fetch(`${API_BASE_URL}/infrastructure/alerts/config`);
    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des configurations (${response.status})`);
    }
    return await response.json();
};

export const updateAlertsConfig = async (config: Partial<AlertsConfig>): Promise<{ status: string; message: string; config: AlertsConfig }> => {
    const response = await fetch(`${API_BASE_URL}/infrastructure/alerts/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour des seuils (${response.status})`);
    }
    return await response.json();
};

export const fetchSystemDocumentation = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infrastructure/documentation`);
    if (!response.ok) {
        throw new Error(`Erreur lors du chargement de la documentation (${response.status})`);
    }
    return await response.json();
};

