/**
 * Rôle : Lead Backend API Developer
 * Fichier : routes/api.js
 * Objectif : API REST pour le Frontend React Native de l'ERP CyberCortex.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { evaluateCyberBrainRules, publishActuatorCommand } = require('../services/mqttService');
const { dispatchAlertMailSafely, sendTestNotification } = require('../services/mailService');

// Infrastructure & Administrative Operations
router.use('/infrastructure', require('./infrastructure'));

// ==========================================
// 0. GREENHOUSES (Architecture Multi-Serre One-to-Many)
// ==========================================
router.get('/greenhouses', (req, res) => {
    try {
        const greenhouses = db.prepare('SELECT * FROM greenhouses ORDER BY id ASC').all();

        const enriched = greenhouses.map(gh => {
            const lastTemp = db.prepare(`
                SELECT value, timestamp FROM telemetry 
                WHERE greenhouse_id = ? AND sensor_key IN ('ambient_temperature', 'temperature')
                ORDER BY timestamp DESC LIMIT 1
            `).get(gh.id);

            const lastHum = db.prepare(`
                SELECT value, timestamp FROM telemetry 
                WHERE greenhouse_id = ? AND sensor_key IN ('air_humidity', 'humidity_air')
                ORDER BY timestamp DESC LIMIT 1
            `).get(gh.id);

            const alertStats = db.prepare(`
                SELECT 
                    COUNT(*) as total_alerts,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_alerts,
                    SUM(CASE WHEN severity = 'critique' AND is_read = 0 THEN 1 ELSE 0 END) as critical_alerts
                FROM alerts_log 
                WHERE greenhouse_id = ?
            `).get(gh.id);

            return {
                ...gh,
                live_temperature: lastTemp ? lastTemp.value : (gh.target_temp || 24.0),
                live_humidity: lastHum ? lastHum.value : (gh.target_humidity || 60.0),
                last_updated: lastTemp ? lastTemp.timestamp : gh.created_at,
                unread_alerts_count: alertStats ? (alertStats.unread_alerts || 0) : 0,
                critical_alerts_count: alertStats ? (alertStats.critical_alerts || 0) : 0,
                total_alerts_count: alertStats ? (alertStats.total_alerts || 0) : 0,
            };
        });

        res.json({
            status: 'success',
            count: enriched.length,
            data: enriched
        });
    } catch (error) {
        console.error('[API-ERROR] GET /greenhouses :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des serres' });
    }
});

router.get('/greenhouses/:id', (req, res) => {
    try {
        const gh = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(req.params.id);
        if (!gh) {
            return res.status(404).json({ status: 'error', message: 'Serre non trouvée' });
        }

        const lastTemp = db.prepare(`
            SELECT value, timestamp FROM telemetry 
            WHERE greenhouse_id = ? AND sensor_key IN ('ambient_temperature', 'temperature')
            ORDER BY timestamp DESC LIMIT 1
        `).get(gh.id);

        const lastHum = db.prepare(`
            SELECT value, timestamp FROM telemetry 
            WHERE greenhouse_id = ? AND sensor_key IN ('air_humidity', 'humidity_air')
            ORDER BY timestamp DESC LIMIT 1
        `).get(gh.id);

        const alertStats = db.prepare(`
            SELECT 
                COUNT(*) as total_alerts,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_alerts,
                SUM(CASE WHEN severity = 'critique' AND is_read = 0 THEN 1 ELSE 0 END) as critical_alerts
            FROM alerts_log 
            WHERE greenhouse_id = ?
        `).get(gh.id);

        res.json({
            status: 'success',
            data: {
                ...gh,
                live_temperature: lastTemp ? lastTemp.value : gh.target_temp,
                live_humidity: lastHum ? lastHum.value : gh.target_humidity,
                last_updated: lastTemp ? lastTemp.timestamp : gh.created_at,
                unread_alerts_count: alertStats ? (alertStats.unread_alerts || 0) : 0,
                critical_alerts_count: alertStats ? (alertStats.critical_alerts || 0) : 0,
                total_alerts_count: alertStats ? (alertStats.total_alerts || 0) : 0
            }
        });
    } catch (error) {
        console.error('[API-ERROR] GET /greenhouses/:id :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

router.post('/greenhouses', (req, res) => {
    try {
        const { id, name, location, crop_type, target_temp, target_humidity, status } = req.body;
        if (!name) {
            return res.status(400).json({ status: 'error', message: 'Nom de la serre requis' });
        }
        const ghId = id || `gh-${Date.now().toString().slice(-4)}`;
        db.prepare(`
            INSERT INTO greenhouses (id, user_id, name, status, location, crop_type, target_temp, target_humidity)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
        `).run(
            ghId,
            name,
            status || 'OPTIMAL',
            location || 'Site Principal',
            crop_type || 'Culture sous abri',
            target_temp || 24.0,
            target_humidity || 65.0
        );

        res.status(201).json({
            status: 'success',
            message: 'Serre créée avec succès',
            data: { id: ghId, name, status: status || 'OPTIMAL' }
        });
    } catch (error) {
        console.error('[API-ERROR] POST /greenhouses :', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ==========================================
// 0. GET /sensors
//    - Liste des capteurs avec clés de traduction standardisées i18n
// ==========================================
router.get('/sensors', (req, res) => {
    res.json({
        status: 'success',
        data: [
            { id: '1', sensor_key: 'sensor.ambient_temp', sensor_name: 'sensor.ambient_temp', name: 'sensor.ambient_temp', unit: '°C', status: 'status.optimal' },
            { id: '2', sensor_key: 'sensor.air_humidity', sensor_name: 'sensor.air_humidity', name: 'sensor.air_humidity', unit: '%', status: 'status.optimal' },
            { id: '3', sensor_key: 'sensor.photoperiod', sensor_name: 'sensor.photoperiod', name: 'sensor.photoperiod', unit: 'h', status: 'status.optimal' },
            { id: '4', sensor_key: 'sensor.water_consumption', sensor_name: 'sensor.water_consumption', name: 'sensor.water_consumption', unit: 'L', status: 'status.optimal' }
        ]
    });
});

// ==========================================
// 1. GET /telemetry
//    - Télémétrie multi-serre avec agrégation SQLite (Downsampling haute performance)
//    - Paramètre : ?greenhouseId=X & ?timeframe=live|24h|7d|30d
// ==========================================
router.get('/telemetry', (req, res) => {
    try {
        const { sensor_key, timeframe, period, range } = req.query;
        const greenhouseId = req.query.greenhouseId || req.query.greenhouse_id || 'gh-01';
        let data = [];

        // Support des alias de capteurs et clés de traduction
        let matchedKeys = [sensor_key];
        if (sensor_key) {
            if (sensor_key === 'ambient_temperature' || sensor_key === 'temperature' || sensor_key === 'sensor.ambient_temp') {
                matchedKeys = ['ambient_temperature', 'temperature', 'sensor.ambient_temp'];
            } else if (sensor_key === 'air_humidity' || sensor_key === 'humidity_air' || sensor_key === 'sensor.air_humidity') {
                matchedKeys = ['air_humidity', 'humidity_air', 'sensor.air_humidity'];
            } else if (sensor_key === 'photoperiod' || sensor_key === 'sensor.photoperiod') {
                matchedKeys = ['photoperiod', 'sensor.photoperiod'];
            } else if (sensor_key === 'water_consumption' || sensor_key === 'sensor.water_consumption') {
                matchedKeys = ['water_consumption', 'sensor.water_consumption'];
            }
        }

        const placeholders = matchedKeys.map(() => '?').join(',');
        const filterKeyClause = sensor_key ? `AND sensor_key IN (${placeholders})` : '';

        // Normalisation stricte du timeframe
        const tf = (timeframe || period || range || 'live').toLowerCase();

        let query = '';
        if (tf === '7d' || tf === '7 jours') {
            query = `
                SELECT sensor_key, ROUND(AVG(value), 1) as value, strftime('%Y-%m-%d %H:00:00', timestamp) as timestamp 
                FROM telemetry 
                WHERE greenhouse_id = ? AND timestamp >= datetime('now', '-7 days') ${filterKeyClause}
                GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp) 
                ORDER BY timestamp ASC
            `;
        } else if (tf === '30d' || tf === '30 jours') {
            query = `
                SELECT sensor_key, ROUND(AVG(value), 1) as value, strftime('%Y-%m-%d 00:00:00', timestamp) as timestamp 
                FROM telemetry 
                WHERE greenhouse_id = ? AND timestamp >= datetime('now', '-30 days') ${filterKeyClause}
                GROUP BY strftime('%Y-%m-%d 00:00:00', timestamp) 
                ORDER BY timestamp ASC
            `;
        } else if (tf === '24h') {
            query = `
                SELECT sensor_key, ROUND(AVG(value), 1) as value, strftime('%Y-%m-%d %H:00:00', timestamp) as timestamp 
                FROM telemetry 
                WHERE greenhouse_id = ? AND timestamp >= datetime('now', '-24 hours') ${filterKeyClause}
                GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp) 
                ORDER BY timestamp ASC
            `;
        } else {
            // 'live' (En direct) : mesures brutes récentes limitées aux 30 derniers points
            query = `
                SELECT sensor_key, value, timestamp 
                FROM telemetry 
                WHERE greenhouse_id = ? AND timestamp >= datetime('now', '-1 hour') ${filterKeyClause}
                GROUP BY strftime('%Y-%m-%d %H:%M:%S', timestamp) 
                ORDER BY timestamp DESC 
                LIMIT 30
            `;
        }

        const queryParams = sensor_key ? [greenhouseId, ...matchedKeys] : [greenhouseId];
        const stmt = db.prepare(query);
        data = stmt.all(...queryParams);

        // Si la base est encore vide pour cette serre spécifique sur la dernière heure, tenter sans contrainte temporelle courte
        if (data.length === 0 && (tf === 'live' || tf === 'en direct')) {
            const fallbackStmt = db.prepare(`
                SELECT sensor_key, value, timestamp 
                FROM telemetry 
                WHERE greenhouse_id = ? ${filterKeyClause}
                ORDER BY timestamp DESC 
                LIMIT 30
            `);
            data = fallbackStmt.all(...queryParams);
        }

        // Pour le mode 'live', réordonner en chronologie croissante (gauche -> droite)
        if (tf === 'live' || tf === 'en direct') {
            data.reverse();
        }

        res.json({
            status: 'success',
            greenhouseId,
            timeframe: tf,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('[API-ERROR] /telemetry :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne lors de la lecture des télémétries' });
    }
});

// ==========================================
// 2. GET /actuators/logs
//    - Dernières 50 actions de l'ERP filtrées par serre
// ==========================================
router.get('/actuators/logs', (req, res) => {
    try {
        const greenhouseId = req.query.greenhouseId || req.query.greenhouse_id;
        let query = `
            SELECT actuator_key, action, trigger_source, greenhouse_id, timestamp 
            FROM actuators_logs 
        `;
        let params = [];
        if (greenhouseId && greenhouseId !== 'all') {
            query += ` WHERE greenhouse_id = ? `;
            params.push(greenhouseId);
        }
        query += ` ORDER BY timestamp DESC LIMIT 50 `;

        const stmt = db.prepare(query);
        const logs = stmt.all(...params);

        res.json({
            status: 'success',
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('[API-ERROR] /actuators/logs :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

// ==========================================
// 2.1. POST /actuators/command
//      - Commande manuelle d'un actionneur pour une serre spécifique
// ==========================================
router.post('/actuators/command', (req, res) => {
    try {
        const { actuator_key, action } = req.body;
        const greenhouseId = req.body.greenhouseId || req.body.greenhouse_id || 'gh-01';

        if (!actuator_key) {
            return res.status(400).json({ status: 'error', message: 'actuator_key manquant' });
        }

        db.prepare(`
            INSERT INTO actuators_logs (greenhouse_id, actuator_key, action, trigger_source) 
            VALUES (?, ?, ?, 'manual')
        `).run(greenhouseId, actuator_key, action || 'TOGGLE');

        // Publication de la commande MQTT conventionnée vers la serre cible
        if (typeof publishActuatorCommand === 'function') {
            publishActuatorCommand(greenhouseId, actuator_key, action || 'TOGGLE');
        }

        res.json({ 
            status: 'success', 
            message: `Commande envoyée à ${actuator_key} pour la serre ${greenhouseId}`,
            greenhouseId 
        });
    } catch (error) {
        console.error('[API-ERROR] /actuators/command :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

// ==========================================
// 3. GET /alerts
//    - Historique des alertes Cyber-Brain filtré par serre
// ==========================================
router.get('/alerts', (req, res) => {
    try {
        const greenhouseId = req.query.greenhouseId || req.query.greenhouse_id;
        let query = `
            SELECT id, greenhouse_id, title, message, severity, tag, is_read, timestamp 
            FROM alerts_log 
        `;
        let params = [];
        if (greenhouseId && greenhouseId !== 'all') {
            query += ` WHERE greenhouse_id = ? `;
            params.push(greenhouseId);
        }
        query += ` ORDER BY timestamp DESC `;

        const stmt = db.prepare(query);
        let rawAlerts = stmt.all(...params);

        // Normalisation dynamique vers les clés de traduction i18n
        const alerts = rawAlerts.map(a => {
            let standardKey = a.title;
            if (a.title.includes('Chute de Pression') || a.title === 'Alerte Chute de Pression') {
                standardKey = 'alert.pressure_drop';
            } else if (a.title.includes('Calibration') || a.title.includes('Calibration Initiale')) {
                standardKey = 'alert.simu_calibration';
            } else if (a.title.includes('Température Élevée') || a.title.includes('Canicule') || a.title.includes('Stress Thermique')) {
                standardKey = 'alert.temp_high';
            } else if (a.title.includes('Hydrique') || a.title.includes('Sécheresse')) {
                standardKey = 'alert.water_stress';
            } else if (a.title.includes('Thermo-Hydrique')) {
                standardKey = 'alert.thermo_hydric';
            } else if (a.title.includes('Déficit Hygrométrique')) {
                standardKey = 'alert.hygro_deficit';
            } else if (a.title.includes('Pénurie d\'Irrigation') || a.title.includes('Pénurie')) {
                standardKey = 'alert.irrigation_shortage';
            } else if (a.title.includes('Scénario Personnalisé')) {
                standardKey = 'alert.simu_scenario';
            }

            return {
                ...a,
                title: standardKey,
                title_key: standardKey
            };
        });

        res.json({
            status: 'success',
            count: alerts.length,
            data: alerts
        });
    } catch (error) {
        console.error('[API-ERROR] /alerts :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

// ==========================================
// 3.1. PUT /alerts/:id/read
//      - Acquittement d'une alerte
// ==========================================
router.put('/alerts/:id/read', (req, res) => {
    try {
        const { id } = req.params;
        let isReadVal = 1;
        if (req.body && req.body.is_read !== undefined) {
            isReadVal = req.body.is_read ? 1 : 0;
        }
        const stmt = db.prepare('UPDATE alerts_log SET is_read = ? WHERE id = ?');
        const info = stmt.run(isReadVal, id);

        if (info.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Alerte non trouvée' });
        }

        res.json({ status: 'success', message: 'Statut de l\'alerte mis à jour', is_read: isReadVal });
    } catch (error) {
        console.error('[API-ERROR] /alerts/read :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

// ==========================================
// 3. GET /health
//    - Endpoint de santé pour Docker Compose
// ==========================================
router.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// ==========================================
// 4. POST /telemetry/simulate
//    - Moteur de simulation de scénario Cyber-Brain & génération d'alertes dédiées
// ==========================================
router.post('/telemetry/simulate', (req, res) => {
    try {
        const payload = req.body; // ex: { ambient_temperature: 30, air_humidity: 10, photoperiod: 10, water_consumption: 8 }
        const greenhouseId = req.body.greenhouseId || req.body.greenhouse_id || 'gh-01';

        if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
            return res.status(400).json({ status: 'error', message: 'Payload invalide ou vide' });
        }

        // 1. Définition des métadonnées des capteurs pour insertion sécurisée
        const sensorMetadata = {
            ambient_temperature: { name: 'Température Ambiante', unit: '°C' },
            temperature: { name: 'Température Ambiante', unit: '°C' },
            air_humidity: { name: 'Humidité Relative (Air)', unit: '%' },
            humidity_air: { name: 'Humidité Relative (Air)', unit: '%' },
            photoperiod: { name: 'Photopériode', unit: 'h' },
            light: { name: 'Photopériode', unit: 'h' },
            water_consumption: { name: 'Consommation d\'Eau', unit: 'L' },
            water: { name: 'Consommation d\'Eau', unit: 'L' },
            soil_moisture: { name: 'Humidité du Sol', unit: '%' },
            ph: { name: 'pH de la solution', unit: 'pH' }
        };

        const ensureSensorStmt = db.prepare(`
            INSERT OR IGNORE INTO sensors (id, sensor_key, name, unit, status)
            VALUES (?, ?, ?, ?, 'ONLINE')
        `);

        const insertTelemetryStmt = db.prepare(`
            INSERT INTO telemetry (greenhouse_id, sensor_key, value)
            VALUES (?, ?, ?)
        `);

        // Extraire les valeurs normalisées
        let tempVal = null;
        let humVal = null;
        let photoVal = null;
        let waterVal = null;

        for (const [key, val] of Object.entries(payload)) {
            if (typeof val === 'number') {
                const meta = sensorMetadata[key] || { name: key, unit: '' };
                ensureSensorStmt.run(`S_${key}`, key, meta.name, meta.unit);

                try {
                    insertTelemetryStmt.run(greenhouseId, key, val);
                } catch (tErr) {
                    console.warn(`[SIMU-WARN] Telemetry insert for ${key}:`, tErr.message);
                }

                if (key === 'ambient_temperature' || key === 'temperature') tempVal = val;
                if (key === 'air_humidity' || key === 'humidity_air' || key === 'humidity') humVal = val;
                if (key === 'photoperiod' || key === 'light') photoVal = val;
                if (key === 'water_consumption' || key === 'water') waterVal = val;
            }
        }

        // 2. Moteur d'Analyse Agronomique Multi-Facteurs (Cyber-Brain Expert Diagnosis)
        const diagnostics = [];
        const actions = [];
        const triggeredActuators = [];
        let maxSeverityLevel = 1; // 1: info, 2: warning, 3: critique

        // A. Température
        if (tempVal !== null) {
            if (tempVal >= 35) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 3);
                diagnostics.push(`Canicule extrême (${tempVal}°C ≥ 35°C) : Risque de stress thermique aigu et brûlure foliaire`);
                actions.push(`Brumisation haute pression et extracteurs d'air à 100%`);
                triggeredActuators.push({ key: 'ventilation', action: 'ON' }, { key: 'misting_system', action: 'ON' });
            } else if (tempVal >= 29) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Température élevée (${tempVal}°C ≥ 29°C) : Stress thermique modéré`);
                actions.push(`Activation de la ventilation dynamique`);
                triggeredActuators.push({ key: 'ventilation', action: 'ON' });
            } else if (tempVal <= 12) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 3);
                diagnostics.push(`Froid critique (${tempVal}°C ≤ 12°C) : Risque d'arrêt végétatif et gel`);
                actions.push(`Enclenchement du chauffage d'urgence`);
                triggeredActuators.push({ key: 'heating', action: 'ON' });
            } else if (tempVal <= 18) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Température fraîche (${tempVal}°C ≤ 18°C) : Ralentissement photosynthétique`);
                actions.push(`Activation chauffage d'appoint`);
                triggeredActuators.push({ key: 'heating', action: 'ON' });
            } else {
                diagnostics.push(`Température nominale (${tempVal}°C)`);
            }
        }

        // B. Humidité Relative
        if (humVal !== null) {
            if (humVal <= 20) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 3);
                diagnostics.push(`Humidité très basse (${humVal}% ≤ 20%) : Dessèchement accéléré des stomates`);
                actions.push(`Brumisation d'urgence activée`);
                triggeredActuators.push({ key: 'water_pump', action: 'ON' }, { key: 'misting_system', action: 'ON' });
            } else if (humVal <= 40) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Déficit hygrométrique (${humVal}% ≤ 40%) : Transpiration foliaire accrue`);
                actions.push(`Brumisation périodique programmée`);
                triggeredActuators.push({ key: 'misting_system', action: 'ON' });
            } else if (humVal >= 85) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 3);
                diagnostics.push(`Saturation d'humidité (${humVal}% ≥ 85%) : Risque d'infection cryptogamique sévère`);
                actions.push(`Ouverture des ouvrants et ventilation d'assèchement`);
                triggeredActuators.push({ key: 'ventilation', action: 'ON' });
            } else if (humVal >= 75) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Humidité élevée (${humVal}% ≥ 75%)`);
                actions.push(`Ventilation d'extraction enclenchée`);
                triggeredActuators.push({ key: 'ventilation', action: 'ON' });
            } else {
                diagnostics.push(`Humidité nominale (${humVal}%)`);
            }
        }

        // C. Photopériode
        if (photoVal !== null) {
            if (photoVal <= 10) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Photopériode très courte (${photoVal}h/j ≤ 10h) : Carence lumineuse majeure`);
                actions.push(`Éclairage horticole d'appoint activé (+4h)`);
                triggeredActuators.push({ key: 'grow_lights', action: 'ON' });
            } else if (photoVal <= 12) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Déficit de lumière (${photoVal}h/j < 12h) : Seuil végétatif minimal`);
                actions.push(`Éclairage d'appoint activé (+2h)`);
                triggeredActuators.push({ key: 'grow_lights', action: 'ON' });
            } else if (photoVal >= 18) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Photopériode excessive (${photoVal}h/j ≥ 18h) : Risque de photo-inhibition`);
                actions.push(`Fermeture des écrans d'ombrage`);
                triggeredActuators.push({ key: 'shading_screen', action: 'ON' });
            } else {
                diagnostics.push(`Photopériode optimale (${photoVal}h/j)`);
            }
        }

        // D. Consommation d'eau
        if (waterVal !== null) {
            if (waterVal <= 15) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 3);
                diagnostics.push(`Apport hydrique critique (${waterVal}L/j ≤ 15L) : Sécheresse racinaire imminente`);
                actions.push(`Irrigation goutte-à-goutte prioritaire activée`);
                triggeredActuators.push({ key: 'water_pump', action: 'ON' });
            } else if (waterVal <= 30) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Consommation d'eau déficitaire (${waterVal}L/j ≤ 30L)`);
                actions.push(`Prolongation du cycle d'irrigation (+30 min)`);
                triggeredActuators.push({ key: 'water_pump', action: 'ON' });
            } else if (waterVal >= 100) {
                maxSeverityLevel = Math.max(maxSeverityLevel, 2);
                diagnostics.push(`Consommation anormale (${waterVal}L/j ≥ 100L) : Suspicion de sur-irrigation ou fuite`);
                actions.push(`Vérification des électrovannes`);
                triggeredActuators.push({ key: 'water_pump', action: 'OFF' });
            } else {
                diagnostics.push(`Consommation d'eau équilibrée (${waterVal}L/j)`);
            }
        }

        // 3. Détermination de la Sévérité, du Tag et du Titre
        let severity = 'info';
        if (maxSeverityLevel === 3) severity = 'critique';
        else if (maxSeverityLevel === 2) severity = 'warning';

        // Tag et Titre spécifiques standardisés en clés de traduction i18n
        let tag = 'SIMU-SCENARIO';
        let title = 'alert.simu_scenario';

        if (humVal !== null && humVal <= 20 && waterVal !== null && waterVal <= 20) {
            tag = 'SIMU-HYDR';
            title = 'alert.water_stress';
        } else if (tempVal !== null && tempVal >= 30 && humVal !== null && humVal <= 30) {
            tag = 'SIMU-CLIM';
            title = 'alert.thermo_hydric';
        } else if (tempVal !== null && tempVal >= 32) {
            tag = 'SIMU-TEMP';
            title = 'alert.heatwave';
        } else if (humVal !== null && humVal <= 25) {
            tag = 'SIMU-HYDR';
            title = 'alert.hygro_deficit';
        } else if (waterVal !== null && waterVal <= 15) {
            tag = 'SIMU-EAU';
            title = 'alert.irrigation_shortage';
        }

        // Résumé compact des paramètres
        const paramSummary = [];
        if (tempVal !== null) paramSummary.push(`T: ${tempVal}°C`);
        if (humVal !== null) paramSummary.push(`H: ${humVal}%`);
        if (photoVal !== null) paramSummary.push(`Photo: ${photoVal}h/j`);
        if (waterVal !== null) paramSummary.push(`Eau: ${waterVal}L/j`);

        const message = `[Paramètres Injectés : ${paramSummary.join(' | ')}]\nDiagnostic IA : ${diagnostics.join('. ')}.\nActions engagées : ${actions.join(', ') || 'Aucune action requise (conditions optimales)'}.`;

        // 4. Enregistrement direct dans alerts_log avec greenhouse_id
        const alertStmt = db.prepare(`
            INSERT INTO alerts_log (greenhouse_id, title, message, severity, tag, is_read, timestamp)
            VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
        `);
        const alertInfo = alertStmt.run(greenhouseId, title, message, severity, tag);

        // 5. Enregistrement des commandes actionneurs dans actuators_logs avec greenhouse_id
        const logActuatorStmt = db.prepare(`
            INSERT INTO actuators_logs (greenhouse_id, actuator_key, action, trigger_source)
            VALUES (?, ?, ?, 'simulation')
        `);
        const uniqueActuators = new Map();
        for (const act of triggeredActuators) {
            uniqueActuators.set(act.key, act.action);
        }
        for (const [key, action] of uniqueActuators.entries()) {
            logActuatorStmt.run(greenhouseId, key, action);
        }

        // 5b. Dispatch automatisé d'alerte e-mail (asynchrone et non-bloquant)
        if (severity === 'critique' || severity === 'warning') {
            dispatchAlertMailSafely({
                greenhouse_id: greenhouseId,
                title,
                message,
                severity,
                tag,
                timestamp: new Date().toISOString(),
                actions: Array.from(uniqueActuators.entries()).map(([k, a]) => ({ actuator_key: k, action: a }))
            });
        }

        // 6. Exécution des règles du Cyber-Brain stockées en BDD filtrées par serre
        for (const [sensor_key, value] of Object.entries(payload)) {
            if (typeof value === 'number') {
                try {
                    evaluateCyberBrainRules(greenhouseId, sensor_key, value, true);
                } catch (e) {
                    console.warn('[SIMU-RULE-WARN]', e.message);
                }
            }
        }

        console.log(`[API-SIMULATION] ✅ Scénario simulé pour [${greenhouseId}] enregistré avec succès (Alert ID: ${alertInfo.lastInsertRowid}, Tag: ${tag})`);

        res.json({
            status: 'success',
            message: 'Scénario simulé et diagnostiqué avec succès par le Cyber-Brain',
            simulation_alert: {
                id: alertInfo.lastInsertRowid,
                title,
                message,
                severity,
                tag,
                timestamp: new Date().toISOString()
            },
            actions_triggered: Array.from(uniqueActuators.entries()).map(([k, a]) => ({ actuator_key: k, action: a }))
        });
    } catch (error) {
        console.error('[API-ERROR] /telemetry/simulate :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne lors de la simulation : ' + error.message });
    }
});

// ==========================================
// 5. GET /user/profile
//    - Profil scientifique et stats globales
// ==========================================
router.get('/user/profile', (req, res) => {
    try {
        let profile = db.prepare('SELECT * FROM user_profiles LIMIT 1').get();

        // Seeding de secours si la table est vide
        if (!profile) {
            db.prepare(`
                INSERT INTO user_profiles (id, full_name, email, phone, location, role, organization) 
                VALUES (1, 'Ahmed Ben Salem', 'a.bensalem@smartagri.co', '+216 98 000 000', 'Tunis', 'Ingénieur Agronome / Resp. R&D', 'CyberCortex ERP')
            `).run();
            profile = db.prepare('SELECT * FROM user_profiles LIMIT 1').get();
        }

        // Statistiques globales dynamiques
        let sensorsCount = 7;
        try {
            const row = db.prepare('SELECT COUNT(*) AS c FROM sensors').get();
            if (row && row.c > 0) sensorsCount = row.c;
        } catch (_) {}

        const stats = { connected_greenhouses: 1, active_sensors: sensorsCount, relays: 4 };
        res.status(200).json({ status: 'success', profile, stats });
    } catch (error) {
        console.error('[API-ERROR] GET /user/profile :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne de lecture du profil' });
    }
});

// ==========================================
// 6. PUT & POST /user/profile
//    - Mise à jour et persistance atomique du profil scientifique
// ==========================================
const saveProfileHandler = (req, res) => {
    // Log serveur obligatoire avant exécution
    console.log('[API-PROFILE] Sauvegarde demandée avec payload :', req.body);

    try {
        const { full_name, email, phone, location, role, organization, preferred_language } = req.body || {};

        let existing = db.prepare('SELECT * FROM user_profiles WHERE id = 1').get() 
                    || db.prepare('SELECT * FROM user_profiles LIMIT 1').get();

        if (!existing) {
            // Insertion sécurisée si la base est vierge
            const insertStmt = db.prepare(`
                INSERT INTO user_profiles (id, full_name, email, phone, location, role, organization, preferred_language)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            `);
            insertStmt.run(
                full_name || 'Ahmed Ben Salem',
                email || 'a.bensalem@smartagri.co',
                phone || '+216 98 000 000',
                location || 'Tunis',
                role || 'Ingénieur Agronome / Resp. R&D',
                organization || 'CyberCortex ERP',
                preferred_language || 'fr'
            );
        } else {
            // UPDATE paramétré strict de better-sqlite3 sur l'ID 1
            const updateStmt = db.prepare(`
                UPDATE user_profiles 
                SET full_name = ?,
                    email = ?,
                    phone = ?,
                    location = ?,
                    role = ?,
                    organization = COALESCE(?, organization),
                    preferred_language = COALESCE(?, preferred_language),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `);
            updateStmt.run(
                full_name !== undefined && full_name !== null ? String(full_name).trim() : existing.full_name,
                email !== undefined && email !== null ? String(email).trim() : existing.email,
                phone !== undefined && phone !== null ? String(phone).trim() : existing.phone,
                location !== undefined && location !== null ? String(location).trim() : existing.location,
                role !== undefined && role !== null ? String(role).trim() : existing.role,
                organization !== undefined && organization !== null ? String(organization).trim() : existing.organization,
                preferred_language !== undefined && preferred_language !== null ? String(preferred_language).trim() : (existing.preferred_language || 'fr')
            );
        }

        const updatedProfile = db.prepare('SELECT * FROM user_profiles WHERE id = 1').get() 
                            || db.prepare('SELECT * FROM user_profiles LIMIT 1').get();

        console.log('[API-PROFILE] Profil mis à jour avec succès dans SQLite :', updatedProfile.full_name, '|', updatedProfile.location);

        return res.status(200).json({
            status: 'success',
            message: 'Profil mis à jour avec succès',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('[API-ERROR] PUT/POST /user/profile :', error.message);
        return res.status(500).json({ status: 'error', message: 'Erreur interne de persistance : ' + error.message });
    }
};

router.put('/user/profile', express.json(), saveProfileHandler);
router.post('/user/profile', express.json(), saveProfileHandler);

// ==========================================
// 7. POST /user/register
//    - Enregistrement / initialisation atomique du compte scientifique
// ==========================================
router.post('/user/register', express.json(), (req, res) => {
    try {
        const { full_name, email, phone, location, role, organization } = req.body || {};

        if (!email || !full_name) {
            return res.status(400).json({ status: 'error', message: 'Nom complet et email requis' });
        }

        let existing = db.prepare('SELECT * FROM user_profiles WHERE email = ?').get(email)
                    || db.prepare('SELECT * FROM user_profiles WHERE id = 1').get();

        if (existing) {
            const updateStmt = db.prepare(`
                UPDATE user_profiles
                SET full_name = ?,
                    email = ?,
                    phone = COALESCE(?, phone),
                    location = COALESCE(?, location),
                    role = COALESCE(?, role),
                    organization = COALESCE(?, organization),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateStmt.run(
                full_name,
                email,
                phone || null,
                location || null,
                role || null,
                organization || null,
                existing.id
            );
            const profile = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(existing.id);
            console.log('[API-REGISTER] Profil scientifique consolidé :', profile.full_name, '|', profile.location);
            return res.status(200).json({ status: 'success', message: 'Profil enregistré avec succès', profile });
        }

        const insertStmt = db.prepare(`
            INSERT INTO user_profiles (id, full_name, email, phone, location, role, organization)
            VALUES (1, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(
            full_name,
            email,
            phone || '',
            location || 'Tunis',
            role || 'Chercheur / Agronome',
            organization || 'CyberCortex ERP'
        );

        const newProfile = db.prepare('SELECT * FROM user_profiles WHERE id = 1').get()
                        || db.prepare('SELECT * FROM user_profiles LIMIT 1').get();
        console.log('[API-REGISTER] Nouveau profil initialisé :', newProfile.full_name, '|', newProfile.location);
        return res.status(201).json({ status: 'success', message: 'Compte enregistré avec succès', profile: newProfile });
    } catch (error) {
        console.error('[API-ERROR] POST /user/register :', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ==========================================
// 8. POST /chat
//    - Copilote IA CyberCortex (Google Gemini API + Grounding Télémétrie Multi-Serre)
// ==========================================
router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const greenhouseId = req.body.greenhouseId || req.body.greenhouse_id || 'gh-01';

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'Message requis' });
        }

        // 1. Récupération des informations de la serre active
        const gh = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(greenhouseId) || {
            id: greenhouseId,
            name: greenhouseId === 'gh-02' ? 'Serre Hydroponique Bêta (Aéroponie)' : (greenhouseId === 'gh-03' ? 'Serre Tropicale Gamma (Vertical)' : 'Serre Maraîchère Alpha (NFT)'),
            status: 'OPTIMAL',
            location: 'Site Principal',
            crop_type: 'Cultures Maraîchères',
            target_temp: 24.0,
            target_humidity: 65.0
        };

        const active_greenhouse_name = gh.name;
        const active_greenhouse_id = gh.id;

        // 2. Extraction en direct des métriques réelles pour la serre active (Grounding étanche)
        const recentTelemetry = db.prepare(`
            SELECT t.sensor_key, t.value, s.name, s.unit, t.timestamp 
            FROM telemetry t
            LEFT JOIN sensors s ON t.sensor_key = s.sensor_key
            WHERE t.greenhouse_id = ?
            GROUP BY t.sensor_key
            ORDER BY t.timestamp DESC
        `).all(active_greenhouse_id);

        const alerts = db.prepare(`
            SELECT id, title, severity, tag, timestamp 
            FROM alerts_log 
            WHERE greenhouse_id = ?
            ORDER BY timestamp DESC LIMIT 4
        `).all(active_greenhouse_id);

        const actuators = db.prepare(`
            SELECT actuator_key, action, trigger_source, timestamp 
            FROM actuators_logs 
            WHERE greenhouse_id = ?
            ORDER BY timestamp DESC LIMIT 4
        `).all(active_greenhouse_id);

        const sensorSummary = recentTelemetry.length > 0
            ? recentTelemetry.map(s => `- ${s.name || s.sensor_key} (${s.sensor_key}) : ${s.value} ${s.unit || ''}`).join('\n')
            : `- Température ambiante : ${gh.target_temp || 24.0} °C\n- Humidité de l'air : ${gh.target_humidity || 65.0} %\n- Photopériode : 14.0 h\n- Consommation d'eau : 35.0 L`;

        const alertSummary = alerts.length > 0
            ? alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title} (${a.tag}) le ${a.timestamp}`).join('\n')
            : 'Aucune alerte active pour cette serre. Tous les paramètres sont nominaux.';

        const actuatorSummary = actuators.length > 0
            ? actuators.map(ac => `- ${ac.actuator_key} : ${ac.action} (Déclencheur : ${ac.trigger_source})`).join('\n')
            : 'Actionneurs en veille nominale.';

        const systemData = {
            greenhouse_id: active_greenhouse_id,
            name: active_greenhouse_name,
            status: gh.status || 'healthy',
            location: gh.location || 'Site Principal',
            crop_type: gh.crop_type || 'CEA greenhouse crop',
            metrics: recentTelemetry.reduce((acc, s) => {
                let k = s.sensor_key.replace(/^ambient_/, '').replace(/^air_/, '').replace(/_consumption$/, '');
                if (k === 'water') k = 'water_l';
                acc[k] = s.value;
                return acc;
            }, {})
        };

        const domainBounding = `[IDENTITÉ ET PÉRIMÈTRE STRICT - ZERO HALLUCINATION]
1. TON RÔLE : Tu es l'AI Copilot exclusif du système "Smart Agri Greenhouse / CyberCortex ERP". Tu es un expert en ingénierie agronomique, hydroponie, télémétrie IoT et pilotage de serres.
2. PÉRIMÈTRE D'ACTION : Ton domaine de compétence est STRICTEMENT limité aux données de la serre active, aux systèmes biophysiques (température, humidité, pH, EC, photopériode), aux actionneurs (pompes, ventilation, éclairage) et aux sciences agricoles associées.
3. RÈGLE D'OR (ANTI-HALLUCINATION) : Tu ne dois JAMAIS inventer, supposer ou extrapoler des données de capteurs qui ne sont pas explicitement présentes dans le payload JSON fourni. Si une information est manquante, tu dois déclarer que le capteur n'est pas disponible.`;

        const outOfScopeRejection = `[PROTOCOLE DE REJET DES QUESTIONS HORS-SUJET]
Si l'utilisateur pose une question qui ne concerne PAS l'agriculture, la gestion de la serre, les capteurs, l'IoT ou le système CyberCortex (exemples : politique, culture générale, programmation informatique générale, blagues, recettes de cuisine), tu as l'INTERDICTION ABSOLUE d'y répondre.
Dans ce cas, utilise EXACTEMENT la formule de rejet suivante (traduite dans la langue de l'utilisateur) :
- En Français : "En tant qu'IA agronomique du CyberCortex, mon périmètre est strictement limité à l'analyse et à la gestion de votre serre. Je ne peux pas répondre à cette question. Souhaitez-vous consulter l'état de vos cultures ou analyser la télémétrie ?"
- En Arabe : "بصفتي المساعد الذكي الخاص بنظام CyberCortex، يقتصر دوري حصرياً على تحليل وإدارة البيت المحمي الخاص بك. لا يمكنني الإجابة على هذا السؤال. هل ترغب في التحقق من حالة المحاصيل أو تحليل بيانات المستشعرات؟"`;

        const terminalConstraint = `[CONTRAINTE ABSOLUE D'OUTPUT]
1. La requête de l'utilisateur est : "${message}".
2. IDENTIFIE la langue exacte de cette requête (ex: Arabe, Français, Anglais).
3. TRADUIS obligatoirement l'intégralité de ton raisonnement, tes étiquettes de données (ex: "Température", "Consommation"), et tes recommandations dans CETTE MÊME LANGUE avant de générer ta réponse finale.
4. Il est strictement interdit de répondre en français si la question est en arabe.`;

        const systemPrompt = `${domainBounding}

${outOfScopeRejection}

SYSTEM_DATA: ${JSON.stringify(systemData)}

OPERATIONAL RULES:
1. Ground your analysis strictly on the active greenhouse: ${active_greenhouse_name} (ID: ${active_greenhouse_id}).
2. Do not hallucinate metrics. Use the provided SYSTEM_DATA.

${terminalConstraint}`;

        const generationConfig = {
            temperature: 0.1,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2500
        };

        // 3. Vérification de la clé API Google Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        if (apiKey && apiKey.trim() !== '') {
            try {
                // Construction de l'historique de conversation
                const formattedContents = [];

                if (Array.isArray(history)) {
                    for (const msg of history.slice(-6)) {
                        if (msg.role && msg.text) {
                            formattedContents.push({
                                role: msg.role === 'user' ? 'user' : 'model',
                                parts: [{ text: msg.text }]
                            });
                        }
                    }
                }

                formattedContents.push({
                    role: 'user',
                    parts: [{ text: `${message}\n\n${terminalConstraint}` }]
                });

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const geminiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: formattedContents,
                        generationConfig
                    })
                });

                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const parts = data.candidates?.[0]?.content?.parts || [];
                    const replyText = parts.map(p => p.text || '').filter(Boolean).join('\n').trim();

                    if (replyText) {
                        return res.json({
                            status: 'success',
                            reply: replyText,
                            source: 'gemini',
                            model,
                            greenhouseId: active_greenhouse_id,
                            greenhouseName: active_greenhouse_name
                        });
                    }
                } else {
                    const errData = await geminiRes.json().catch(() => ({}));
                    console.warn('[API-CHAT] Erreur Gemini API :', geminiRes.status, errData);
                }
            } catch (geminiErr) {
                console.error('[API-CHAT] Exception appel Gemini :', geminiErr.message);
            }
        }

        // 4. Moteur de Réponse Agronomique Heuristique de Secours (Étanchéité Multi-Serre)
        console.log(`[API-CHAT] Génération réponse locale Cyber-Brain pour ${active_greenhouse_name} (${active_greenhouse_id})`);
        let fallbackReply = '';
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('statut') || lowerMsg.includes('etat') || lowerMsg.includes('climat') || lowerMsg.includes('comment va')) {
            fallbackReply = `📊 **État Instantané de ${active_greenhouse_name}** (ID: \`${active_greenhouse_id}\`) :\n\n` +
                `${sensorSummary}\n\n` +
                `🛡️ **Diagnostic Global** : Statut opérationnel **${gh.status}**. Culture surveillée : *${gh.crop_type}*. Les systèmes de régulation de cette serre fonctionnent normalement sous supervision Cyber-Brain.\n\n` +
                `💡 *Conseil : Basculez sur l'onglet "Analytique" pour voir les courbes de tendance propres à ${active_greenhouse_name}.*`;
        } else if (lowerMsg.includes('alerte') || lowerMsg.includes('incident') || lowerMsg.includes('probleme')) {
            fallbackReply = `🚨 **Dernières Alertes Enregistrées pour ${active_greenhouse_name}** :\n\n` +
                `${alertSummary}\n\n` +
                `📋 Rendez-vous dans le **Journal des Alertes** pour consulter le détail agronomique propre à cette unité.`;
        } else if (lowerMsg.includes('simul') || lowerMsg.includes('scenario') || lowerMsg.includes('test')) {
            fallbackReply = `🧪 **Simulation de Scénario pour ${active_greenhouse_name}** :\n\n` +
                `1. Cliquez sur **"Simuler un scénario"** depuis le tableau de bord.\n` +
                `2. Choisissez les stress environnementaux à injecter sur **${active_greenhouse_name}** (ex: 35°C ou 15% d'humidité).\n` +
                `3. Les alertes et régulations générées seront strictement rattachées à la serre \`${active_greenhouse_id}\`.`;
        } else if (lowerMsg.includes('eau') || lowerMsg.includes('arros') || lowerMsg.includes('irrig')) {
            fallbackReply = `💧 **Gestion Hydrique de ${active_greenhouse_name} (${gh.crop_type})** :\n\n` +
                `- Consigne cible hygrométrique : **${gh.target_humidity}%**.\n` +
                `- Déclenchement automatique de l'irrigation en cas de consommation inférieure à **15 L/j**.\n` +
                `- Le circuit d'électrovannes de cette serre est autonome et sécurisé.`;
        } else {
            fallbackReply = `🌱 **Bonjour ! Je suis l'AI Copilot de ${active_greenhouse_name}** (ID: \`${active_greenhouse_id}\`).\n\n` +
                `Voici les télémesures actuelles de votre serre :\n` +
                `${sensorSummary}\n\n` +
                `💬 *Toutes mes recommandations sont étanches et dédiées à ${active_greenhouse_name}. Que souhaitez-vous analyser ?*`;
        }

        if (!apiKey || apiKey.trim() === '') {
            fallbackReply += `\n\n*(💡 Astuce : Renseignez votre \`GEMINI_API_KEY\` dans le fichier \`backend/.env\` pour débloquer l'analyse conversationnelle générative Google Gemini pour ${active_greenhouse_name}).*`;
        }

        return res.json({
            status: 'success',
            reply: fallbackReply,
            source: 'cyber-brain-local',
            greenhouseId: active_greenhouse_id,
            greenhouseName: active_greenhouse_name
        });

    } catch (error) {
        console.error('[API-ERROR] POST /chat :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne de traitement IA : ' + error.message });
    }
});

// ==========================================
// 8. POST /notifications/test-email
//    - Vérification et test opérationnel de la passerelle SMTP CyberCortex
// ==========================================
router.post('/notifications/test-email', async (req, res) => {
    try {
        let { email } = req.body || {};

        // Si aucun e-mail spécifié dans le payload, récupérer l'e-mail du profil actif
        if (!email) {
            try {
                const profile = db.prepare('SELECT email, full_name FROM user_profiles ORDER BY id ASC LIMIT 1').get();
                if (profile && profile.email) {
                    email = profile.email;
                }
            } catch (pErr) {
                console.warn('[API-WARN] Profil introuvable pour test email:', pErr.message);
            }
        }

        if (!email) {
            email = process.env.DEFAULT_ALERT_EMAIL || 'montassarchraigui99@gmail.com';
        }

        console.log(`[API-NOTIFICATION] 📨 Requête d'e-mail de test reçue pour : ${email}`);
        const result = await sendTestNotification(email);

        if (result.status === 'success' || result.status === 'simulated') {
            return res.json({
                status: 'success',
                message: `E-mail de notification de test expédié avec succès à ${email}`,
                recipient: email,
                details: result
            });
        } else {
            return res.status(500).json({
                status: 'error',
                message: `Échec de l'envoi de l'e-mail : ${result.error || 'Erreur SMTP'}`,
                details: result
            });
        }
    } catch (err) {
        console.error('[API-ERROR] /notifications/test-email :', err.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors du test SMTP : ' + err.message });
    }
});

module.exports = router;
