const express = require('express');
const cors = require('cors');

// Importation de la base de données SQLite (optimisée WAL)
const { initDB, startDataPurgeTask } = require('./database');

// Importation des routes et services
const actuatorRoutes = require('./routes/actuatorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const apiRoutes = require('./routes/api');
const { initMqttService } = require('./services/mqttService');

const app = express();
const PORT = 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Nouvelles routes globales unifiées (Incluant /api/telemetry, /api/actuators, /api/alerts)
app.use('/api', apiRoutes);

// Initialisation globale de l'ERP Edge
initDB();
startDataPurgeTask();
initMqttService();

// Route Healthcheck pour Docker
app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
    console.log(`Serveur Backend en écoute sur http://localhost:${PORT}`);
});