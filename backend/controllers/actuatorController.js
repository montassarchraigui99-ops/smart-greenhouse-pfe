const db = require('../config/database');
const { publishCommand } = require('../services/mqttService');

const getAllActuators = (req, res) => {
    db.all(`SELECT * FROM actuators`, [], (err, rows) => {
        if (err) {
            console.error('[ActuatorController] Error fetching actuators:', err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json(rows);
    });
};

const toggleActuator = (req, res) => {
    const key = req.params.key;
    const { state } = req.body;

    if (typeof state !== 'boolean') {
        return res.status(400).json({ error: 'Invalid state format. Expected boolean.' });
    }

    // SQLite boolean storage as 0/1 integer
    const sql = `UPDATE actuators SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE actuator_key = ?`;

    db.run(sql, [state ? 1 : 0, key], function (err) {
        if (err) {
            console.error('[ActuatorController] DB Error:', err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (this.changes > 0) {
            console.log(`[ActuatorController] Actuator ${key} set to ${state}`);
            // Fire command downwards via MQTT!
            publishCommand(key, state);
            return res.status(200).json({ message: 'Commande envoyée et base mise à jour' });
        }

        return res.status(404).json({ error: 'Actionneur introuvable' });
    });
};

module.exports = {
    getAllActuators,
    toggleActuator
};
