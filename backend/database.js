/**
 * Rôle : Lead Database Architect & Edge Computing Engineer
 * Fichier : database.js
 * Objectif : Initialisation et optimisation de la base SQLite pour le nœud Edge IoT (CyberCortex ERP).
 */

const path = require('path');

// Détermination du chemin de la base de données.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'greenhouse.db');
console.log(`[DB] Connexion à la base de données SQLite : ${dbPath}`);

let db;
try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('busy_timeout = 5000');
} catch (loadErr) {
    console.log('[DB] Fallback sur node:sqlite natif (Node.js engine):', loadErr.message);
    const { DatabaseSync } = require('node:sqlite');
    const nativeDb = new DatabaseSync(dbPath);
    try {
        nativeDb.exec('PRAGMA journal_mode = WAL;');
        nativeDb.exec('PRAGMA synchronous = NORMAL;');
        nativeDb.exec('PRAGMA temp_store = MEMORY;');
        nativeDb.exec('PRAGMA busy_timeout = 5000;');
    } catch (pErr) {
        console.warn('[DB-WARN] Pragmas WAL:', pErr.message);
    }

    db = {
        prepare: (sql) => {
            const stmt = nativeDb.prepare(sql);
            return {
                run: (...args) => {
                    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
                        return stmt.run(args[0]);
                    }
                    return stmt.run(...args);
                },
                all: (...args) => stmt.all(...args),
                get: (...args) => stmt.get(...args)
            };
        },
        transaction: (fn) => {
            return (...args) => {
                nativeDb.exec('BEGIN TRANSACTION');
                try {
                    const res = fn(...args);
                    nativeDb.exec('COMMIT');
                    return res;
                } catch (e) {
                    nativeDb.exec('ROLLBACK');
                    throw e;
                }
            };
        },
        pragma: (str) => {
            try {
                return nativeDb.exec(`PRAGMA ${str}`);
            } catch (e) {
                return null;
            }
        },
        exec: (sql) => nativeDb.exec(sql)
    };
}

// ==========================================
// MISSION 2 : Définition du Schéma (DDL)
// ==========================================
function initDB() {
    console.log('[DB] Initialisation du schéma de la base de données...');

    // 1. Création des tables de base (si elles n'existent pas)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS greenhouses (
            id TEXT PRIMARY KEY,
            user_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'OPTIMAL', -- 'OPTIMAL', 'ATTENTION', 'CRITICAL', 'OFFLINE'
            location TEXT,
            crop_type TEXT DEFAULT 'Tomates Hydroponiques NFT',
            target_temp REAL DEFAULT 24.0,
            target_humidity REAL DEFAULT 65.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user_profiles (id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS sensors (
            id TEXT PRIMARY KEY,
            sensor_key TEXT UNIQUE NOT NULL,
            name TEXT,
            unit TEXT,
            status TEXT
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            greenhouse_id TEXT DEFAULT 'gh-01',
            sensor_key TEXT NOT NULL,
            value REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (greenhouse_id) REFERENCES greenhouses (id),
            FOREIGN KEY (sensor_key) REFERENCES sensors (sensor_key)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS actuators_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            greenhouse_id TEXT DEFAULT 'gh-01',
            actuator_key TEXT NOT NULL,
            action TEXT NOT NULL,
            trigger_source TEXT NOT NULL, -- 'manual' ou 'cyber_brain'
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (greenhouse_id) REFERENCES greenhouses (id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS cyber_brain_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            greenhouse_id TEXT DEFAULT 'gh-01',
            condition_target TEXT NOT NULL,
            threshold REAL NOT NULL,
            operator TEXT NOT NULL, -- '<', '>', '='
            action_key TEXT NOT NULL,
            FOREIGN KEY (greenhouse_id) REFERENCES greenhouses (id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS alerts_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            greenhouse_id TEXT DEFAULT 'gh-01',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT NOT NULL, -- 'critique', 'warning', 'info'
            tag TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (greenhouse_id) REFERENCES greenhouses (id)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            location TEXT,
            role TEXT,
            organization TEXT,
            preferred_language TEXT DEFAULT 'fr',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // 2. Migration sécurisée si des colonnes manquent dans une base SQLite préexistante
    try {
        const tablesToMigrate = ['telemetry', 'alerts_log', 'cyber_brain_rules', 'actuators_logs'];
        for (const tableName of tablesToMigrate) {
            const cols = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
            if (!cols.includes('greenhouse_id')) {
                try {
                    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN greenhouse_id TEXT DEFAULT 'gh-01'`).run();
                    console.log(`[DB] Colonne migrée ajoutée : ${tableName}.greenhouse_id`);
                } catch (colErr) {
                    console.warn(`[DB-WARN] Impossible d'ajouter la colonne greenhouse_id à ${tableName}:`, colErr.message);
                }
            }
        }

        const upCols = db.prepare(`PRAGMA table_info(user_profiles)`).all().map(c => c.name);
        if (!upCols.includes('preferred_language')) {
            try {
                db.prepare(`ALTER TABLE user_profiles ADD COLUMN preferred_language TEXT DEFAULT 'fr'`).run();
            } catch (_) {}
        }
    } catch (migErr) {
        console.warn('[DB-WARN] Vérification des colonnes:', migErr.message);
    }

    // 3. Création des indexes après garantie de présence des colonnes
    try {
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_key ON telemetry(sensor_key)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_gh_time ON telemetry(greenhouse_id, timestamp)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_gh_sensor ON telemetry(greenhouse_id, sensor_key, timestamp)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_actuators_gh ON actuators_logs(greenhouse_id, timestamp)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_rules_gh ON cyber_brain_rules(greenhouse_id)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_alerts_gh ON alerts_log(greenhouse_id, timestamp)`).run();
    } catch (idxErr) {
        console.warn('[DB-WARN] Création des index :', idxErr.message);
    }

    try {
        const existingCols = db.prepare(`PRAGMA table_info(user_profiles)`).all().map(c => c.name);
        const requiredCols = [
            { name: 'full_name', type: 'TEXT' },
            { name: 'email', type: 'TEXT' },
            { name: 'phone', type: 'TEXT' },
            { name: 'location', type: 'TEXT' },
            { name: 'role', type: 'TEXT' },
            { name: 'organization', type: 'TEXT' },
            { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
        ];

        for (const col of requiredCols) {
            if (!existingCols.includes(col.name)) {
                try {
                    db.prepare(`ALTER TABLE user_profiles ADD COLUMN ${col.name} ${col.type}`).run();
                    console.log(`[DB] Colonne migrée ajoutée : user_profiles.${col.name}`);
                } catch (colErr) {
                    console.warn(`[DB-WARN] Impossible d'ajouter la colonne ${col.name}:`, colErr.message);
                }
            }
        }
    } catch (migErr) {
        console.warn('[DB-WARN] Vérification des colonnes:', migErr.message);
    }

    // Auto-Seeding du Cyber-Brain & Profil & Alertes
    try {
        const countQuery = db.prepare('SELECT COUNT(*) AS count FROM cyber_brain_rules').get();
        if (countQuery && countQuery.count === 0) {
            const insertRule = db.prepare(`
                INSERT INTO cyber_brain_rules (condition_target, threshold, operator, action_key) 
                VALUES (?, ?, ?, ?)
            `);
            insertRule.run('ambient_temperature', 30, '>=', 'ventilation');
            insertRule.run('air_humidity', 30, '<=', 'misting_system');
            insertRule.run('photoperiod', 12, '<=', 'grow_lights');
            insertRule.run('water_consumption', 15, '<=', 'water_pump');
            console.log('[DB-SEEDER] Règles multi-critères par défaut injectées dans le Cyber-Brain.');
        }

        const alertCount = db.prepare('SELECT COUNT(*) AS count FROM alerts_log').get();
        if (alertCount && alertCount.count === 0) {
            const insertAlert = db.prepare(`
                INSERT INTO alerts_log (title, message, severity, tag, is_read, timestamp)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `);
            insertAlert.run('alert.pressure_drop', 'Le circuit de ventilation principal semble obstrué.', 'critique', 'SYS-VENT', 0);
            insertAlert.run('alert.simu_calibration', 'Test de résilience et étalonnage des algorithmes prédictifs achevé avec succès.', 'warning', 'SIMU-INIT', 0);
            console.log('[DB-SEEDER] Alertes de référence (Production & Simulation) injectées avec clés de traduction standard.');
        }

        const profileQuery = db.prepare('SELECT COUNT(*) AS count FROM user_profiles').get();
        if (profileQuery && profileQuery.count === 0) {
            db.prepare(`
                INSERT INTO user_profiles (id, full_name, email, phone, location, role, organization) 
                VALUES (1, 'Ahmed Ben Salem', 'a.bensalem@smartagri.co', '+216 98 000 000', 'Tunis', 'Ingénieur Agronome / Resp. R&D', 'CyberCortex ERP')
            `).run();
            console.log('[DB-SEEDER] Profil scientifique généré par défaut.');
        }

        // Seeding des capteurs de référence pour intégrité référentielle
        const defaultSensors = [
            { id: 'S1', key: 'ambient_temperature', name: 'Température Ambiante', unit: '°C' },
            { id: 'S2', key: 'air_humidity', name: 'Humidité Relative (Air)', unit: '%' },
            { id: 'S3', key: 'photoperiod', name: 'Photopériode Horticole', unit: 'h' },
            { id: 'S4', key: 'water_consumption', name: 'Consommation d\'Eau', unit: 'L' },
            { id: 'S5', key: 'temperature', name: 'Température Serre', unit: '°C' },
            { id: 'S6', key: 'humidity_air', name: 'Humidité Relative', unit: '%' },
            { id: 'S7', key: 'soil_moisture', name: 'Humidité du Sol', unit: '%' },
            { id: 'S8', key: 'ph', name: 'pH de la solution', unit: 'pH' }
        ];
        const insertSensor = db.prepare(`
            INSERT OR IGNORE INTO sensors (id, sensor_key, name, unit, status)
            VALUES (?, ?, ?, ?, 'ONLINE')
        `);
        for (const s of defaultSensors) {
            insertSensor.run(s.id, s.key, s.name, s.unit);
        }

        // Table system_configs
        db.prepare(`
            CREATE TABLE IF NOT EXISTS system_configs (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        const defaultConfigs = [
            { key: 'emergency_contacts', value: '+216 98 000 000, +216 50 417 355' },
            { key: 'temp_max_threshold', value: '32.0' },
            { key: 'temp_min_threshold', value: '12.0' },
            { key: 'humidity_min_threshold', value: '35.0' },
            { key: 'soil_moisture_min_threshold', value: '30.0' },
            { key: 'sms_enabled', value: '1' },
            { key: 'push_enabled', value: '1' }
        ];
        const insertCfg = db.prepare(`
            INSERT OR IGNORE INTO system_configs (key, value) VALUES (?, ?)
        `);
        for (const c of defaultConfigs) {
            insertCfg.run(c.key, c.value);
        }

        // Seeding Multi-Serres (One-to-Many rattachées au profil utilisateur 1)
        const ghCount = db.prepare('SELECT COUNT(*) AS count FROM greenhouses').get();
        if (ghCount && ghCount.count === 0) {
            const insertGh = db.prepare(`
                INSERT INTO greenhouses (id, user_id, name, status, location, crop_type, target_temp, target_humidity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            insertGh.run('gh-01', 1, 'Serre Maraîchère Alpha (NFT)', 'OPTIMAL', 'Tunis - Zone Nord', 'Tomates Grappes NFT', 24.0, 65.0);
            insertGh.run('gh-02', '1', 'Serre Hydroponique Bêta (Aéroponie)', 'ATTENTION', 'Bizerte - Pôle Bio', 'Poivrons & Piments', 26.5, 55.0);
            insertGh.run('gh-03', '1', 'Serre Tropicale Gamma (Vertical)', 'OPTIMAL', 'Mornag - Exploitation 2', 'Fraises & Basilic', 22.0, 70.0);
            console.log('[DB-SEEDER] Multi-serres créées avec succès (gh-01, gh-02, gh-03).');

            // Mise à jour de toute télémétrie préexistante orpheline vers gh-01
            db.prepare("UPDATE telemetry SET greenhouse_id = 'gh-01' WHERE greenhouse_id IS NULL OR greenhouse_id = ''").run();
            db.prepare("UPDATE alerts_log SET greenhouse_id = 'gh-01' WHERE greenhouse_id IS NULL OR greenhouse_id = ''").run();
            db.prepare("UPDATE cyber_brain_rules SET greenhouse_id = 'gh-01' WHERE greenhouse_id IS NULL OR greenhouse_id = ''").run();
            db.prepare("UPDATE actuators_logs SET greenhouse_id = 'gh-01' WHERE greenhouse_id IS NULL OR greenhouse_id = ''").run();

            // Injection de points de télémétrie récents pour gh-02 et gh-03 pour éviter des graphes vides
            const insertTel = db.prepare(`
                INSERT INTO telemetry (greenhouse_id, sensor_key, value, timestamp)
                VALUES (?, ?, ?, datetime('now', ?))
            `);
            // gh-02 (Attention : T° légèrement élevée à 28.4°C)
            insertTel.run('gh-02', 'ambient_temperature', 28.4, '-10 minutes');
            insertTel.run('gh-02', 'ambient_temperature', 28.6, '-5 minutes');
            insertTel.run('gh-02', 'air_humidity', 52.0, '-5 minutes');
            insertTel.run('gh-02', 'photoperiod', 15.0, '-5 minutes');
            insertTel.run('gh-02', 'water_consumption', 42.0, '-5 minutes');

            // gh-03 (Optimal : T° douce 22.2°C)
            insertTel.run('gh-03', 'ambient_temperature', 22.0, '-10 minutes');
            insertTel.run('gh-03', 'ambient_temperature', 22.2, '-5 minutes');
            insertTel.run('gh-03', 'air_humidity', 68.0, '-5 minutes');
            insertTel.run('gh-03', 'photoperiod', 13.5, '-5 minutes');
            insertTel.run('gh-03', 'water_consumption', 36.5, '-5 minutes');

            // Alertes pour gh-02
            db.prepare(`
                INSERT INTO alerts_log (greenhouse_id, title, message, severity, tag, is_read, timestamp)
                VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
            `).run('gh-02', 'alert.temp_high', 'Seuil d’attention dépassé pour la culture aéroponique de poivrons.', 'warning', 'CLIM-TEMP');
        }
    } catch (err) {
        console.error('[DB-SEEDER] Erreur lors du seeding initial :', err);
    }
}

// ==========================================
// MISSION 3 : Tâche de fond de Rétention
// ==========================================
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let daysSinceVacuum = 0; // Compteur pour le défragmentage

function startDataPurgeTask() {
    console.log('[DB] Tâche de fond (Data Purge) planifiée : exécution toutes les 24h.');

    setInterval(() => {
        try {
            console.log('[DB-Task] Lancement de la purge des données obsolètes...');

            // Suppression des données telemetry vieilles de plus de 30 jours
            const stmt = db.prepare(`DELETE FROM telemetry WHERE timestamp < datetime('now', '-30 days')`);
            const info = stmt.run();
            console.log(`[DB-Task] Purge terminée, ${info.changes} lignes supprimées.`);

            daysSinceVacuum++;

            // Exécution du VACUUM hebdomadaire (tous les 7 jours)
            // Attention : Le VACUUM verrouille complètement la BDD le temps de s'exécuter.
            if (daysSinceVacuum >= 7) {
                console.log('[DB-Task] Lancement de la défragmentation (VACUUM)...');
                db.prepare('VACUUM').run();
                daysSinceVacuum = 0;
                console.log('[DB-Task] VACUUM terminé avec succès.');
            }
        } catch (error) {
            console.error('[DB-Task] Erreur lors de la purge ou du vacuum :', error);
        }
    }, ONE_DAY_MS);
}

module.exports = {
    db,
    initDB,
    startDataPurgeTask
};
