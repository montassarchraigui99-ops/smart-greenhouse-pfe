const db = require('../config/database');
const { sendCriticalAlert } = require('./notificationService');

/**
 * Moteur de règles automatisé (CYBER-BRAIN)
 * Évalue la télémétrie en temps réel et prend des décisions matérielles.
 */
function evaluateTelemetry(sensorKey, value) {
    if (sensorKey === 'soil_moisture') {
        let desiredState = null;
        let actionReason = '';

        if (value < 30) {
            desiredState = true;
            actionReason = `Humidité critique du sol (${value}%). Déclenchement automatique de la pompe à eau.`;
        } else if (value > 60) {
            desiredState = false;
            actionReason = `Humidité suffisante (${value}%). Arrêt automatique de la pompe à eau.`;
        }

        if (desiredState !== null) {
            const actuatorKey = 'main_pump';

            // On vérifie l'état actuel en base pour éviter les boucles d'exécution ou conflits de mode
            db.get(`SELECT is_active, mode FROM actuators WHERE actuator_key = ?`, [actuatorKey], (err, row) => {
                if (err) {
                    console.error('[CYBER-BRAIN] Erreur SQLite:', err.message);
                    return;
                }

                if (row) {
                    // Si l'actionneur est en mode MANUEL, on empêche l'IA d'interférer (Safety Override)
                    if (row.mode === 'MANUAL') {
                        return;
                    }

                    const currentState = Boolean(row.is_active);

                    // On ne déclenche l'ordre que si l'état désiré est différent de l'actuel
                    if (currentState !== desiredState) {
                        console.log(`[CYBER-BRAIN] Alerte : ${actionReason}`);

                        const sql = `UPDATE actuators SET is_active = ?, auto_status_text = ?, updated_at = CURRENT_TIMESTAMP WHERE actuator_key = ?`;
                        db.run(sql, [desiredState ? 1 : 0, actionReason, actuatorKey], function (err) {
                            if (!err && this.changes > 0) {
                                // Require positionné ici pour éviter les dépendances circulaires
                                const { publishCommand } = require('./mqttService');
                                publishCommand(actuatorKey, desiredState);

                                // Déclenchement de l'alerte Email
                                const alertSubject = `🔴 ALERTE PFE: Actionneur ${actuatorKey} a été sollicité (CYBER-BRAIN)`;
                                sendCriticalAlert(alertSubject, actionReason);
                            }
                        });
                    }
                }
            });
        }
    }
}

module.exports = { evaluateTelemetry };
