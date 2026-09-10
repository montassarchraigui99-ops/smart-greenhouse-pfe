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

    // regrouper la création de tables dans une transaction pour être plus sûr et rapide
    const createTables = db.transaction(() => {
        // 1. Table: sensors
        db.prepare(`
            CREATE TABLE IF NOT EXISTS sensors (
                id TEXT PRIMARY KEY,
                sensor_key TEXT UNIQUE NOT NULL,
                name TEXT,
                unit TEXT,
                status TEXT
            )
        `).run();

        // 2. Table: telemetry
        db.prepare(`
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_key TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sensor_key) REFERENCES sensors (sensor_key)
            )
        `).run();

        // -> Index critiques pour accélérer drastiquement les graphes et temps de requêtes
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp)`).run();
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_key ON telemetry(sensor_key)`).run();

        // 3. Table: actuators_logs
        db.prepare(`
            CREATE TABLE IF NOT EXISTS actuators_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actuator_key TEXT NOT NULL,
                action TEXT NOT NULL,
                trigger_source TEXT NOT NULL, -- 'manual' ou 'cyber_brain'
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // 4. Table: cyber_brain_rules
        db.prepare(`
            CREATE TABLE IF NOT EXISTS cyber_brain_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                condition_target TEXT NOT NULL,
                threshold REAL NOT NULL,
                operator TEXT NOT NULL, -- '<', '>', '='
                action_key TEXT NOT NULL
            )
        `).run();

        // 5. Table: alerts_log
        db.prepare(`
            CREATE TABLE IF NOT EXISTS alerts_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL, -- 'critique', 'warning', 'info'
                tag TEXT NOT NULL,
                is_read BOOLEAN DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // 6. Table: user_profiles
        db.prepare(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT,
                email TEXT UNIQUE,
                phone TEXT,
                location TEXT,
                role TEXT,
                organization TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
    });

    createTables();
    console.log('[DB] Schéma et indexes initialisés avec succès.');

    // Migration sécurisée si des colonnes manquent dans une base SQLite préexistante
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
            insertAlert.run('Alerte Chute de Pression', 'Le circuit de ventilation principal semble obstrué.', 'critique', 'SYS-VENT', 0);
            insertAlert.run('Simulation Cyber-Brain : Calibration Initiale', 'Test de résilience et étalonnage des algorithmes prédictifs achevé avec succès.', 'warning', 'SIMU-INIT', 0);
            console.log('[DB-SEEDER] Alertes de référence (Production & Simulation) injectées.');
        }

        const profileQuery = db.prepare('SELECT COUNT(*) AS count FROM user_profiles').get();
        if (profileQuery && profileQuery.count === 0) {
            db.prepare(`
                INSERT INTO user_profiles (id, full_name, email, phone, location, role, organization) 
                VALUES (1, 'Ahmed Ben Salem', 'a.bensalem@smartagri.co', '+216 98 000 000', 'Tunis', 'Ingénieur Agronome / Resp. R&D', 'CyberCortex ERP')
            `).run();
            console.log('[DB-SEEDER] Profil scientifique généré par défaut.');
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
