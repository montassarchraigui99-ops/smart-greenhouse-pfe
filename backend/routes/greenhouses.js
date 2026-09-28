/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : backend/routes/greenhouses.js
 * Objectif : API REST CRUD complète pour la gestion administrative du parc multi-serres
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * 1. GET /api/greenhouses
 * Récupère la liste de toutes les serres de l'utilisateur avec métadonnées et métriques live
 */
router.get('/', (req, res) => {
    try {
        const userId = req.query.user_id || 1;
        const greenhouses = db.prepare(`
            SELECT id, user_id, name, status, location, crop_type, target_temp, target_humidity, created_at
            FROM greenhouses 
            WHERE user_id = ?
            ORDER BY created_at ASC
        `).all(userId);

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
                    SUM(CASE WHEN (severity = 'critical' OR severity = 'critique') AND is_read = 0 THEN 1 ELSE 0 END) as critical_alerts
                FROM alerts_log 
                WHERE greenhouse_id = ?
            `).get(gh.id);

            // Normalisation du statut pour compatibilité UI : 'healthy' | 'warning' | 'critical'
            let normalizedStatus = 'healthy';
            const rawStatus = (gh.status || 'healthy').toLowerCase();
            if (rawStatus === 'critical' || rawStatus === 'critique') {
                normalizedStatus = 'critical';
            } else if (rawStatus === 'warning' || rawStatus === 'attention') {
                normalizedStatus = 'warning';
            } else if (alertStats && alertStats.critical_alerts > 0) {
                normalizedStatus = 'critical';
            } else if (alertStats && alertStats.unread_alerts > 0) {
                normalizedStatus = 'warning';
            } else {
                normalizedStatus = 'healthy';
            }

            return {
                ...gh,
                status: normalizedStatus,
                raw_status: gh.status || 'OPTIMAL',
                live_temperature: lastTemp ? lastTemp.value : (gh.target_temp || 24.0),
                live_humidity: lastHum ? lastHum.value : (gh.target_humidity || 65.0),
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
        console.error('[API-GREENHOUSES] GET / :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la lecture des serres : ' + error.message });
    }
});

/**
 * 2. GET /api/greenhouses/:id
 * Récupère le détail d'une serre spécifique
 */
router.get('/:id', (req, res) => {
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
                SUM(CASE WHEN (severity = 'critical' OR severity = 'critique') AND is_read = 0 THEN 1 ELSE 0 END) as critical_alerts
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
        console.error('[API-GREENHOUSES] GET /:id :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur interne' });
    }
});

/**
 * 3. POST /api/greenhouses
 * Crée une nouvelle serre dans le système
 * Payload attendu : { "name": string, "location": string, "crop_type": string }
 */
router.post('/', (req, res) => {
    try {
        const { name, location, crop_type, target_temp, target_humidity, status, id } = req.body || {};

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'Le nom de la serre est obligatoire.' });
        }

        // Génération d'un identifiant lisible si non fourni
        let ghId = id ? String(id).trim() : null;
        if (!ghId) {
            const allGhs = db.prepare('SELECT id FROM greenhouses').all();
            let nextNum = allGhs.length + 1;
            while (allGhs.some(g => g.id === `gh-0${nextNum}` || g.id === `gh-${nextNum}`)) {
                nextNum++;
            }
            ghId = nextNum < 10 ? `gh-0${nextNum}` : `gh-${nextNum}`;
        }

        const cleanName = name.trim();
        const cleanLocation = (location && typeof location === 'string') ? location.trim() : 'Tunis';
        const cleanCropType = (crop_type && typeof crop_type === 'string') ? crop_type.trim() : 'Culture Hydroponique';
        const cleanStatus = status || 'healthy';
        const tTemp = target_temp ? parseFloat(target_temp) : 24.0;
        const tHum = target_humidity ? parseFloat(target_humidity) : 65.0;

        // Insertion dans la table greenhouses
        db.prepare(`
            INSERT INTO greenhouses (id, user_id, name, status, location, crop_type, target_temp, target_humidity, created_at)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(ghId, cleanName, cleanStatus, cleanLocation, cleanCropType, tTemp, tHum);

        // Insertion de points télémétriques initiaux pour disponibilité immédiate
        try {
            const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const insertTelem = db.prepare(`
                INSERT INTO telemetry (greenhouse_id, sensor_key, value, timestamp)
                VALUES (?, ?, ?, ?)
            `);
            insertTelem.run(ghId, 'ambient_temperature', tTemp, nowIso);
            insertTelem.run(ghId, 'air_humidity', tHum, nowIso);
            insertTelem.run(ghId, 'photoperiod', 14.0, nowIso);
            insertTelem.run(ghId, 'water_consumption', 35.0, nowIso);
        } catch (telemErr) {
            console.warn('[API-GREENHOUSES] Insertion télémétrie initiale facultative :', telemErr.message);
        }

        const createdGh = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(ghId);

        console.log(`[API-GREENHOUSES] ✅ Serre créée avec succès : ${cleanName} (${ghId})`);

        res.status(201).json({
            status: 'success',
            message: 'Serre créée avec succès',
            data: {
                ...createdGh,
                live_temperature: tTemp,
                live_humidity: tHum,
                unread_alerts_count: 0
            }
        });
    } catch (error) {
        console.error('[API-GREENHOUSES] POST / :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la création de la serre : ' + error.message });
    }
});

/**
 * 4. PUT /api/greenhouses/:id
 * Met à jour les métadonnées d'une serre existante (nom, localisation, culture)
 */
router.put('/:id', (req, res) => {
    try {
        const ghId = req.params.id;
        const existing = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(ghId);

        if (!existing) {
            return res.status(404).json({ status: 'error', message: `Serre avec l'ID '${ghId}' introuvable.` });
        }

        const { name, location, crop_type, target_temp, target_humidity, status } = req.body || {};

        const updatedName = (name !== undefined && name !== null && String(name).trim() !== '') ? String(name).trim() : existing.name;
        const updatedLocation = (location !== undefined && location !== null && String(location).trim() !== '') ? String(location).trim() : existing.location;
        const updatedCropType = (crop_type !== undefined && crop_type !== null && String(crop_type).trim() !== '') ? String(crop_type).trim() : existing.crop_type;
        const updatedStatus = status || existing.status;
        const updatedTargetTemp = target_temp !== undefined ? parseFloat(target_temp) : existing.target_temp;
        const updatedTargetHum = target_humidity !== undefined ? parseFloat(target_humidity) : existing.target_humidity;

        db.prepare(`
            UPDATE greenhouses
            SET name = ?,
                location = ?,
                crop_type = ?,
                status = ?,
                target_temp = ?,
                target_humidity = ?
            WHERE id = ?
        `).run(updatedName, updatedLocation, updatedCropType, updatedStatus, updatedTargetTemp, updatedTargetHum, ghId);

        const updatedGh = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(ghId);

        console.log(`[API-GREENHOUSES] ✏️ Serre mise à jour : ${updatedName} (${ghId})`);

        res.json({
            status: 'success',
            message: 'Serre mise à jour avec succès',
            data: updatedGh
        });
    } catch (error) {
        console.error('[API-GREENHOUSES] PUT /:id :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la mise à jour : ' + error.message });
    }
});

/**
 * 5. DELETE /api/greenhouses/:id
 * Supprime une serre en vérifiant qu'il reste au moins une serre active dans le système
 */
router.delete('/:id', (req, res) => {
    try {
        const ghId = req.params.id;
        const existing = db.prepare('SELECT * FROM greenhouses WHERE id = ?').get(ghId);

        if (!existing) {
            return res.status(404).json({ status: 'error', message: `Serre avec l'ID '${ghId}' introuvable.` });
        }

        // Vérification du nombre total de serres restantes
        const countRow = db.prepare('SELECT COUNT(*) as count FROM greenhouses').get();
        if (countRow.count <= 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Impossible de supprimer la dernière serre. Le système CyberCortex ERP nécessite au moins une unité active opérationnelle.'
            });
        }

        // Nettoyage en cascade des données associées
        db.prepare('DELETE FROM telemetry WHERE greenhouse_id = ?').run(ghId);
        db.prepare('DELETE FROM alerts_log WHERE greenhouse_id = ?').run(ghId);
        db.prepare('DELETE FROM actuators_logs WHERE greenhouse_id = ?').run(ghId);
        db.prepare('DELETE FROM cyber_brain_rules WHERE greenhouse_id = ?').run(ghId);
        db.prepare('DELETE FROM greenhouses WHERE id = ?').run(ghId);

        console.log(`[API-GREENHOUSES] 🗑️ Serre supprimée : ${existing.name} (${ghId})`);

        res.json({
            status: 'success',
            message: `La serre '${existing.name}' (${ghId}) a été supprimée avec succès.`,
            deletedId: ghId
        });
    } catch (error) {
        console.error('[API-GREENHOUSES] DELETE /:id :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de la suppression de la serre : ' + error.message });
    }
});

module.exports = router;
