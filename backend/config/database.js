const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Base de données ancrée dans /config pour persistance via Volume Docker Compose
const dbPath = path.resolve(__dirname, 'greenhouse.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données', err.message);
    } else {
        console.log('Connecté à la base de données SQLite (greenhouse.db)');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // Schéma Sensors
        db.run(`CREATE TABLE IF NOT EXISTS sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            status TEXT DEFAULT 'ONLINE',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Schéma Actuators
        db.run(`CREATE TABLE IF NOT EXISTS actuators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actuator_key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'AUTO',
            is_active BOOLEAN NOT NULL DEFAULT 0,
            auto_status_text TEXT,
            icon_color TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Schéma Alerts
        db.run(`CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            error_code TEXT,
            is_read BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seulement pour le seeding initial
        db.get(`SELECT COUNT(*) as count FROM sensors`, (err, row) => {
            if (row && row.count === 0) {
                db.run(`INSERT INTO sensors (sensor_key, name, value, unit) VALUES 
                ('temperature', 'Température Ambiante', 25.4, '°C'),
                ('humidity_air', 'Humidité Relative (Air)', 62.0, '%'),
                ('soil_moisture', 'Humidité du Sol', 42.0, '%'),
                ('ph', 'pH de la solution', 6.1, 'pH')`);

                db.run(`INSERT INTO actuators (actuator_key, name, mode, is_active, auto_status_text, icon_color) VALUES 
                ('drip_irrigation', 'Drip Irrigation', 'AUTO', 0, 'Géré par l humidité du sol (< 40%)', '#b08a5f'),
                ('main_pump', 'Main Water Pump', 'AUTO', 1, 'Géré par le capteur de réservoir', '#6fa9c9'),
                ('ventilation', 'Roof Ventilation', 'MANUAL', 0, 'Géré par le seuil de température (> 28°C)', '#d9922f'),
                ('grow_lights', 'Grow Lights', 'AUTO', 1, 'Géré par l horloge système (16h/jour)', '#d9603f')`);

                db.run(`INSERT INTO alerts (severity, title, description, error_code, is_read) VALUES 
                ('Critique', 'pH solution anormal', 'Le pH de la solution hydroponique a brusquement chuté.', 'ERR-PH-7.6', 0),
                ('Warning', 'Température élevée', 'Le capteur faîtier relève un pic thermique anormal.', 'WRN-TEMP-32C', 0),
                ('Info', 'Ventilation faîtière activée', 'Déclenchement automatique suite au franchissement du seuil.', NULL, 0)`);

                console.log('Données initiales insérées avec succès !');
            }
        });
    });
}

module.exports = db;
