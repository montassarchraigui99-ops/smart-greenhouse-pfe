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
const greenhousesRoutes = require('./routes/greenhouses');
const copilotRoutes = require('./routes/copilot');
const infrastructureRoutes = require('./routes/infrastructure');
const { initMqttService } = require('./services/mqttService');

const app = express();
const PORT = 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Nouvelles routes globales unifiées (Incluant /api/telemetry, /api/actuators, /api/alerts, /api/copilot, /api/greenhouses)
app.use('/api/greenhouses', greenhousesRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
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
            const photo = parseFloat((16.0 + Math.sin(timeSec / 40) * 0.3 + (Math.random() * 0.1 - 0.05)).toFixed(1));
            const water = parseFloat((4.2 + Math.cos(timeSec / 35) * 0.2 + (Math.random() * 0.1 - 0.05)).toFixed(1));

            const stmt = db.prepare('INSERT INTO telemetry (sensor_key, value, timestamp) VALUES (?, ?, ?)');
            stmt.run('temperature', temp, iso);
            stmt.run('ambient_temperature', temp, iso);
            stmt.run('humidity_air', hum, iso);
            stmt.run('air_humidity', hum, iso);
            stmt.run('photoperiod', photo, iso);
            stmt.run('water_consumption', water, iso);

            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key IN (?, ?)').run(temp, iso, 'temperature', 'ambient_temperature');
            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key IN (?, ?)').run(hum, iso, 'humidity_air', 'air_humidity');
            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key = ?').run(photo, iso, 'photoperiod');
            db.prepare('UPDATE sensors SET value = ?, updated_at = ? WHERE sensor_key = ?').run(water, iso, 'water_consumption');
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