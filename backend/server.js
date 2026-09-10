const fs = require('fs');
const path = require('path');

// Chargement automatique des variables d'environnement (.env)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (val && !process.env[key]) {
                process.env[key] = val;
            }
        }
    }
    console.log('[ENV] Fichier .env chargé avec succès.');
}

const express = require('express');
const cors = require('cors');

// Importation de la base de données SQLite (optimisée WAL)
const { initDB, startDataPurgeTask } = require('./database');

// Importation des routes et services
const apiRoutes = require('./routes/api');
const { initMqttService } = require('./services/mqttService');

const app = express();
const PORT = 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Nouvelles routes globales unifiées (Incluant /api/telemetry, /api/actuators, /api/alerts)
app.use('/api', apiRoutes);

// Générateur automatique de télémétrie en direct (Synchronisation temps réel 3s)
function startLiveTelemetrySimulation() {
    const { db } = require('./database');
    setInterval(() => {
        try {
            const now = new Date();
            const iso = now.toISOString().replace('T', ' ').substring(0, 19);
            const timeSec = now.getTime() / 1000;

            const temp = parseFloat((23.8 + Math.sin(timeSec / 20) * 1.5 + (Math.random() * 0.4 - 0.2)).toFixed(1));
            const hum = parseFloat((61.5 + Math.cos(timeSec / 25) * 3 + (Math.random() * 0.6 - 0.3)).toFixed(1));

            const stmt = db.prepare('INSERT INTO telemetry (sensor_key, value, timestamp) VALUES (?, ?, ?)');
            stmt.run('temperature', temp, iso);
            stmt.run('ambient_temperature', temp, iso);
            stmt.run('humidity_air', hum, iso);
            stmt.run('air_humidity', hum, iso);

            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key IN (?, ?)').run(temp, iso, 'temperature', 'ambient_temperature');
            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key IN (?, ?)').run(hum, iso, 'humidity_air', 'air_humidity');
        } catch (err) {
            // Silencieux si micro-conflit
        }
    }, 3000);
}

// Initialisation globale de l'ERP Edge
initDB();
startDataPurgeTask();
initMqttService();
startLiveTelemetrySimulation();

// Route Healthcheck pour Docker
app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
    console.log(`Serveur Backend en écoute sur http://localhost:${PORT}`);
});