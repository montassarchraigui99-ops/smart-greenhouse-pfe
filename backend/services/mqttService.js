/**
 * Rôle : Lead IoT Backend Engineer
 * Fichier : services/mqttService.js
 * Objectif : Ingérer la télémétrie locale, interroger le moteur de règles (Cyber-Brain) et piloter les actionneurs.
 */

const mqtt = require('mqtt');
const { db } = require('../database'); // Instance better-sqlite3 connectée en mode WAL
const { dispatchAlertMailSafely } = require('./mailService');

// Configuration du broker MQTT (Edge résilience)
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const TELEMETRY_TOPIC = 'ghost-pfe/greenhouse/telemetry';
const COMMANDS_TOPIC = 'ghost-pfe/greenhouse/commands/actuators';

let client;

// ==========================================
// MISSION 1 : Configuration du Client MQTT
// ==========================================
function initMqttService() {
    console.log(`[MQTT] Tentative de connexion au broker : ${BROKER_URL}`);

    // Le client gère nativement la reconnexion auto via les paramètres par défaut (reconnectPeriod: 1000)
    // Idéal pour une application Edge Computing devant tolérer des microcoupures réseaux
    client = mqtt.connect(BROKER_URL, {
        clientId: `cybercortex_node_${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 5000,
    });

    client.on('connect', () => {
        console.log('[MQTT] Connecté avec succès au broker !');

        client.subscribe(TELEMETRY_TOPIC, (err) => {
            if (!err) {
                console.log(`[MQTT] Abonnement réussi au topic : ${TELEMETRY_TOPIC}`);
            } else {
                console.error('[MQTT] Erreur lors de l\'abonnement :', err);
            }
        });
    });

    client.on('error', (err) => {
        console.error('[MQTT] Erreur de connexion :', err.message);
    });

    // Écoute des trames entrantes
    client.on('message', (topic, message) => {
        if (topic === TELEMETRY_TOPIC) {
            handleIncomingTelemetry(message);
        }
    });
}

// ==========================================
// MISSION 2 : Pipeline d'Ingestion
// ==========================================
function handleIncomingTelemetry(messageBuffer) {
    try {
        // Parsing strict pour éviter un crash si l'ESP32 envoie un payload malformé
        const payloadStr = messageBuffer.toString();
        const payload = JSON.parse(payloadStr);

        const sensor_key = payload.sensor_key;
        const value = payload.value;

        if (!sensor_key || typeof value !== 'number') {
            throw new Error('Payload invalide ou incomplet (valeurs manquantes)');
        }

        // Insertion optimisée via better-sqlite3 en mode synchrone
        const stmt = db.prepare('INSERT INTO telemetry (sensor_key, value) VALUES (@sensor_key, @value)');
        stmt.run({ sensor_key, value });

        console.log(`[MQTT] Télémétrie insérée : ${sensor_key} = ${value}`);

        // Hook Cyber-Brain après succès absolu de l'insertion
        evaluateCyberBrainRules(sensor_key, value);

    } catch (error) {
        console.error('[MQTT-WARNING] Échec du parsing ou de l\'insertion :', error.message);
    }
}

// ==========================================
// MISSION 3 : Le Hook du CYBER-BRAIN
// ==========================================
function evaluateCyberBrainRules(sensor_key, value, isSimulation = false) {
    try {
        // Interrogation des règles en temps-réel (extrêmement rapide grâce à SQLite memory/WAL)
        const stmt = db.prepare('SELECT * FROM cyber_brain_rules WHERE condition_target = ?');
        const rules = stmt.all(sensor_key);

        for (const rule of rules) {
            let triggered = false;

            // Logique du moteur d'inférence CyberCortex
            switch (rule.operator) {
                case '<':
                    triggered = (value < rule.threshold);
                    break;
                case '>':
                    triggered = (value > rule.threshold);
                    break;
                case '=':
                case '==':
                    triggered = (value === rule.threshold);
                    break;
            }

            if (triggered) {
                console.log(`[CYBER-BRAIN] 🔥 Règle déclenchée : ${sensor_key} (${value}) ${rule.operator} ${rule.threshold}`);

                // Formation de la commande actionneur
                // Note : On suppose pour simplification que rule.action_key vaut 'water_pump' 
                // et déclenche une action "ON". On pourrait étendre le modèle db si besoin.
                const commandPayload = {
                    actuator_key: rule.action_key,
                    action: "ON"
                };

                // 1. Publication vers le topic d'actionneurs pour l'ESP32 / Relay
                if (client && client.connected) {
                    client.publish(COMMANDS_TOPIC, JSON.stringify(commandPayload), { qos: 1 });
                    console.log(`[CYBER-BRAIN] Ordre publié sur le broker :`, commandPayload);
                }

                // 2. Traçabilité : Historisation de l'action décidée par le Cyber-Brain
                const logStmt = db.prepare('INSERT INTO actuators_logs (actuator_key, action, trigger_source) VALUES (?, ?, ?)');
                logStmt.run(commandPayload.actuator_key, commandPayload.action, 'cyber_brain');

                // 3. Traçabilité Avancée (Alerts Log)
                let severity = (rule.operator === '<' || rule.operator === '>') ? 'critique' : 'warning';

                // Si c'est une simulation on force le tag et le titre pour isoler du dashboard de production
                let tag = isSimulation ? `SIMU-${sensor_key.toUpperCase().substring(0, 4)}` : `SYS-${sensor_key.toUpperCase().substring(0, 4)}`;
                let title = isSimulation ? `Simulation Cyber-Brain : ${sensor_key}` : `Alerte Cyber-Brain : ${sensor_key}`;

                let message = `Le moteur de règles est intervenu. Détection : ${value} ${rule.operator} ${rule.threshold} -> Injection d'action : ${commandPayload.actuator_key}`;

                const alertStmt = db.prepare('INSERT INTO alerts_log (title, message, severity, tag) VALUES (?, ?, ?, ?)');
                alertStmt.run(title, message, severity, tag);

                // 4. Dispatch automatisé d'alerte e-mail (asynchrone et non-bloquant)
                if (!isSimulation && (severity === 'critique' || severity === 'warning')) {
                    dispatchAlertMailSafely({
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
        console.error('[CYBER-BRAIN ERROR] Échec de l\'évaluation des règles :', error.message);
    }
}

module.exports = {
    initMqttService,
    evaluateCyberBrainRules // Exporter pour le testing unitaire
};
