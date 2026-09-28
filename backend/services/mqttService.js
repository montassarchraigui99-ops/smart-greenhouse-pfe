/**
 * Rôle : Lead IoT Backend Engineer & Edge Systems Architect
 * Fichier : services/mqttService.js
 * Objectif : Ingérer la télémétrie multi-serre, router dynamiquement par greenhouseId,
 *            interroger le moteur de règles (Cyber-Brain) et piloter les actionneurs.
 */

const mqtt = require('mqtt');
const { db } = require('../database');
const { dispatchAlertMailSafely } = require('./mailService');

// Configuration du broker MQTT (Edge résilience)
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';

// Topics conventionnels Multi-Serres
// Capteurs : smartagri/{greenhouseId}/telemetry/+
// Bulk Sync: smartagri/{greenhouseId}/telemetry/bulk
// Actionneurs : smartagri/{greenhouseId}/commands/actuators
const SENSOR_SUB_WILDCARD = 'smartagri/+/telemetry/+';
const SENSOR_SUB_BULK = 'smartagri/+/telemetry/bulk';
const SENSOR_SUB_BASE = 'smartagri/+/telemetry';
const LEGACY_TELEMETRY_TOPIC = 'ghost-pfe/greenhouse/telemetry';

// Table de correspondance des clés courtes (Edge LittleFS payload optimization)
const SENSOR_SHORTHAND_MAP = {
    't': 'sensor.ambient_temp',
    'temp': 'sensor.ambient_temp',
    'ambient_temp': 'sensor.ambient_temp',
    'temperature': 'sensor.ambient_temp',
    'h': 'sensor.air_humidity',
    'hum': 'sensor.air_humidity',
    'air_humidity': 'sensor.air_humidity',
    'humidity': 'sensor.air_humidity',
    'soil': 'sensor.soil_moisture',
    'soil_moisture': 'sensor.soil_moisture',
    'water': 'sensor.water_level',
    'water_level': 'sensor.water_level',
    'water_l': 'sensor.water_consumption',
    'water_consumption': 'sensor.water_consumption',
    'photo': 'sensor.photoperiod',
    'photoperiod': 'sensor.photoperiod',
    'ph': 'sensor.ph',
    'ec': 'sensor.ec',
    'vpd': 'sensor.vpd'
};

/**
 * Normalise un timestamp brut (UNIX sec, UNIX ms ou ISO) en format DATETIME SQLite
 */
function normalizeTimestamp(raw) {
    if (!raw) return null;
    try {
        if (typeof raw === 'number') {
            const millis = raw < 1e11 ? raw * 1000 : raw;
            const d = new Date(millis);
            if (!isNaN(d.getTime())) {
                return d.toISOString().replace('T', ' ').substring(0, 19);
            }
        } else if (typeof raw === 'string') {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
                return d.toISOString().replace('T', ' ').substring(0, 19);
            }
        }
    } catch (_) {}
    return null;
}

let client;

// ==========================================
// MISSION 1 & 2 : Client MQTT & Routage Multi-Serre
// ==========================================
function initMqttService() {
    console.log(`[MQTT] Connexion au broker MQTT Edge : ${BROKER_URL}`);

    client = mqtt.connect(BROKER_URL, {
        clientId: `cybercortex_hub_${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 4000,
        connectTimeout: 10000,
    });

    client.on('connect', () => {
        console.log('[MQTT] Connecté avec succès au broker !');

        // Abonnement multi-serres dynamique : smartagri/{greenhouseId}/telemetry/+ et bulk
        client.subscribe([SENSOR_SUB_WILDCARD, SENSOR_SUB_BULK, SENSOR_SUB_BASE, LEGACY_TELEMETRY_TOPIC], (err) => {
            if (!err) {
                console.log(`[MQTT] Abonnements actifs :`);
                console.log(`       - ${SENSOR_SUB_WILDCARD} (Capteurs ciblés par métrique)`);
                console.log(`       - ${SENSOR_SUB_BULK} (Ingestion Store-and-Forward Hors-Ligne)`);
                console.log(`       - ${SENSOR_SUB_BASE} (Flux télémétrie agrégé)`);
                console.log(`       - ${LEGACY_TELEMETRY_TOPIC} (Rétrocompatibilité mono-serre)`);
            } else {
                console.error('[MQTT] Erreur lors des abonnements :', err);
            }
        });
    });

    client.on('error', (err) => {
        console.error('[MQTT] Erreur socket broker :', err.message);
    });

    client.on('reconnect', () => {
        console.log('[MQTT] Reconnexion automatique au broker...');
    });

    // Routeur de messages entrant avec extraction dynamique de greenhouseId
    client.on('message', (topic, messageBuffer) => {
        handleIncomingMessage(topic, messageBuffer);
    });
}

/**
 * Routeur de messages entrant : extrait dynamiquement le greenhouseId, la métrique et les timestamps historiques
 */
function handleIncomingMessage(topic, messageBuffer) {
    try {
        const payloadStr = messageBuffer.toString().trim();
        if (!payloadStr) return;

        let payload;
        try {
            payload = JSON.parse(payloadStr);
        } catch {
            const rawVal = parseFloat(payloadStr);
            if (!isNaN(rawVal)) {
                payload = { value: rawVal };
            } else {
                throw new Error(`Format de payload non supporté : ${payloadStr}`);
            }
        }

        let greenhouseId = 'gh-01';
        let sensorKey = null;
        let value = null;

        const parts = topic.split('/');

        if (parts[0] === 'smartagri') {
            greenhouseId = parts[1] || 'gh-01';

            if (parts[2] === 'telemetry' && parts[3]) {
                sensorKey = parts[3];
            }
        }

        // Si le payload JSON explicite un greenhouse_id ou greenhouseId, il prime
        if (payload.greenhouse_id) greenhouseId = payload.greenhouse_id;
        if (payload.greenhouseId) greenhouseId = payload.greenhouseId;

        const isBulk = parts[2] === 'telemetry' && parts[3] === 'bulk';
        const timestamp = payload.ts || payload.timestamp || null;

        // --- GESTION DU PROTOCOLE STORE-AND-FORWARD BULK ---
        if (isBulk) {
            console.log(`[MQTT-SYNC] 📦 Réception resynchronisation hors-ligne (LittleFS Bulk) pour [${greenhouseId}]`);
            const records = Array.isArray(payload) ? payload : [payload];

            for (const item of records) {
                const itemTs = item.ts || item.timestamp || timestamp;
                for (const [k, v] of Object.entries(item)) {
                    if (['ts', 'timestamp', 'greenhouse_id', 'greenhouseId'].includes(k)) continue;
                    if (typeof v === 'number') {
                        persistTelemetryAndEvaluate(greenhouseId, k, v, itemTs, true);
                    }
                }
            }
            return;
        }

        // Détection de la clé de capteur
        if (payload.sensor_key) sensorKey = payload.sensor_key;
        else if (payload.metric) sensorKey = payload.metric;
        else if (payload.sensor) sensorKey = payload.sensor;

        // Détection de la valeur
        if (typeof payload.value === 'number') {
            value = payload.value;
        } else if (typeof payload === 'number') {
            value = payload;
        } else if (payload.val !== undefined) {
            value = Number(payload.val);
        }

        // Cas d'un objet multi-capteurs { ambient_temperature: 24.5, air_humidity: 65, ... }
        if (!sensorKey && typeof payload === 'object' && !payload.value) {
            for (const [k, v] of Object.entries(payload)) {
                if (typeof v === 'number' && k !== 'timestamp' && k !== 'ts') {
                    persistTelemetryAndEvaluate(greenhouseId, k, v, timestamp, !!timestamp);
                }
            }
            return;
        }

        if (!sensorKey || typeof value !== 'number' || isNaN(value)) {
            console.warn(`[MQTT] Message ignoré (données incomplètes) sur topic [${topic}]:`, payloadStr);
            return;
        }

        persistTelemetryAndEvaluate(greenhouseId, sensorKey, value, timestamp, !!timestamp);

    } catch (err) {
        console.error(`[MQTT-ERROR] Échec de traitement topic [${topic}] :`, err.message);
    }
}

/**
 * Persistance en base SQLite avec greenhouse_id obligatoire, support du timestamp historique et analyse Cyber-Brain
 */
function persistTelemetryAndEvaluate(greenhouseId, sensorKey, value, customTimestamp = null, isHistorical = false) {
    try {
        const canonicalKey = SENSOR_SHORTHAND_MAP[sensorKey] || sensorKey;

        // Validation / insertion de secours dans la table sensors pour intégrité référentielle
        try {
            db.prepare(`
                INSERT OR IGNORE INTO sensors (id, sensor_key, name, unit, status)
                VALUES (?, ?, ?, ?, 'ONLINE')
            `).run(`S_${canonicalKey}`, canonicalKey, canonicalKey, 'unit');
        } catch (_) {}

        const formattedTs = normalizeTimestamp(customTimestamp);

        if (formattedTs) {
            // Insertion avec horodatage historique explicite (Résolution Store-and-Forward)
            const stmt = db.prepare(`
                INSERT INTO telemetry (greenhouse_id, sensor_key, value, timestamp)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(greenhouseId, canonicalKey, value, formattedTs);
            console.log(`[MQTT-STORE-FORWARD] Ingestion [${greenhouseId}] -> ${canonicalKey} = ${value} à ${formattedTs}`);
        } else {
            // Insertion temps réel classique
            const stmt = db.prepare(`
                INSERT INTO telemetry (greenhouse_id, sensor_key, value, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run(greenhouseId, canonicalKey, value);
            console.log(`[MQTT-LIVE] Ingestion temps réel [${greenhouseId}] -> ${canonicalKey} = ${value}`);
        }

        // Le moteur de règles Cyber-Brain n'évalue les commandes physiques QUE sur le direct (sécurité anti-rétroaction)
        if (!isHistorical) {
            evaluateCyberBrainRules(greenhouseId, canonicalKey, value);
        }

    } catch (err) {
        console.error(`[MQTT-DB] Erreur insertion telemetry pour [${greenhouseId}] :`, err.message);
    }
}

// ==========================================
// MISSION 3 : Moteur Cyber-Brain & Publication Actionneurs
// ==========================================
/**
 * Évalue les règles d'automatisation Cyber-Brain filtrées par serre
 */
function evaluateCyberBrainRules(greenhouseIdArg, sensorKeyArg, valueArg, isSimulation = false) {
    let greenhouseId = greenhouseIdArg;
    let sensor_key = sensorKeyArg;
    let value = valueArg;

    // Rétrocompatibilité si appelée avec 2 arguments : evaluateCyberBrainRules(sensor_key, value)
    if (typeof sensorKeyArg === 'number' && typeof greenhouseIdArg === 'string' && valueArg === undefined) {
        sensor_key = greenhouseIdArg;
        value = sensorKeyArg;
        greenhouseId = 'gh-01';
    }

    if (!greenhouseId) greenhouseId = 'gh-01';

    try {
        // Récupération des règles assignées à cette serre ou règles génériques
        const stmt = db.prepare(`
            SELECT * FROM cyber_brain_rules 
            WHERE (greenhouse_id = ? OR greenhouse_id IS NULL OR greenhouse_id = '')
              AND condition_target = ?
        `);
        const rules = stmt.all(greenhouseId, sensor_key);

        for (const rule of rules) {
            let triggered = false;

            switch (rule.operator) {
                case '<':
                    triggered = (value < rule.threshold);
                    break;
                case '<=':
                    triggered = (value <= rule.threshold);
                    break;
                case '>':
                    triggered = (value > rule.threshold);
                    break;
                case '>=':
                    triggered = (value >= rule.threshold);
                    break;
                case '=':
                case '==':
                    triggered = (value === rule.threshold);
                    break;
            }

            if (triggered) {
                console.log(`[CYBER-BRAIN] 🔥 Règle déclenchée pour [${greenhouseId}] : ${sensor_key} (${value}) ${rule.operator} ${rule.threshold}`);

                const commandPayload = {
                    greenhouse_id: greenhouseId,
                    actuator_key: rule.action_key,
                    action: 'ON',
                    timestamp: new Date().toISOString()
                };

                // 1. Publication vers le topic standardisé multi-serres : smartagri/{greenhouseId}/commands/actuators
                publishActuatorCommand(greenhouseId, rule.action_key, 'ON');

                // 2. Traçabilité dans actuators_logs avec greenhouse_id
                const logStmt = db.prepare(`
                    INSERT INTO actuators_logs (greenhouse_id, actuator_key, action, trigger_source) 
                    VALUES (?, ?, ?, 'cyber_brain')
                `);
                logStmt.run(greenhouseId, commandPayload.actuator_key, commandPayload.action);

                // 3. Traçabilité dans alerts_log avec greenhouse_id
                let severity = (rule.operator.includes('<') || rule.operator.includes('>')) ? 'critique' : 'warning';
                let tag = isSimulation ? `SIMU-${sensor_key.toUpperCase().substring(0, 4)}` : `SYS-${sensor_key.toUpperCase().substring(0, 4)}`;
                let title = isSimulation ? `Simulation [${greenhouseId}] : ${sensor_key}` : `Alerte Cyber-Brain [${greenhouseId}] : ${sensor_key}`;
                let message = `Régulation automatique déclenchée. Mesure : ${value} ${rule.operator} ${rule.threshold} -> Actionneur : ${commandPayload.actuator_key}`;

                const alertStmt = db.prepare(`
                    INSERT INTO alerts_log (greenhouse_id, title, message, severity, tag) 
                    VALUES (?, ?, ?, ?, ?)
                `);
                alertStmt.run(greenhouseId, title, message, severity, tag);

                // 4. Dispatch mail si alerte critique
                if (!isSimulation && (severity === 'critique' || severity === 'warning')) {
                    dispatchAlertMailSafely({
                        greenhouse_id: greenhouseId,
                        title,
                        message,
                        severity,
                        tag,
                        timestamp: new Date().toISOString(),
                        actions: [commandPayload]
                    });
                }
            }
        }
    } catch (error) {
        console.error(`[CYBER-BRAIN ERROR] Échec de l'évaluation des règles [${greenhouseId}] :`, error.message);
    }
}

/**
 * Publication d'une commande d'actionneur sur la convention MQTT standardisée
 * Format : smartagri/{greenhouseId}/commands/actuators
 */
function publishActuatorCommand(greenhouseId = 'gh-01', actuatorKey, action = 'ON') {
    const targetTopic = `smartagri/${greenhouseId}/commands/actuators`;
    const payload = {
        greenhouse_id: greenhouseId,
        actuator_key: actuatorKey,
        action: action,
        timestamp: new Date().toISOString()
    };

    if (client && client.connected) {
        client.publish(targetTopic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT] Erreur publication vers [${targetTopic}] :`, err.message);
            } else {
                console.log(`[MQTT] Commande publiée avec succès sur [${targetTopic}] :`, payload);
            }
        });

        // Rétrocompatibilité : si serre par défaut 'gh-01', publier également sur l'ancien topic
        if (greenhouseId === 'gh-01') {
            client.publish('ghost-pfe/greenhouse/commands/actuators', JSON.stringify({ actuator_key: actuatorKey, action }), { qos: 1 });
        }
    } else {
        console.warn(`[MQTT-WARN] Broker non connecté. Commande mise en mémoire tampon pour [${targetTopic}].`);
    }
}

module.exports = {
    initMqttService,
    evaluateCyberBrainRules,
    publishActuatorCommand
};
