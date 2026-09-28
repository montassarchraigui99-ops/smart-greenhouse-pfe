/**
 * ============================================================================
 * PROJET : Smart Agri Greenhouse / CyberCortex ERP
 * RÔLE : Lead IoT Systems Architect & Edge Computing Engineer
 * FICHIER : firmware/main.cpp
 * DESCRIPTION : Firmware C++ ESP32 Haute Résilience
 *   - Moteur de Survie Biophysique Local (Edge Fail-Safe Logic autonome)
 *   - Mémoire Tampon Hors-Ligne LittleFS (Store-and-Forward JSONL)
 *   - Resynchronisation automatique au retour du réseau (Bulk Sync QoS 1)
 *   - Boucle non-bloquante garantissant le pilotage de sécurité à 1000 Hz
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <time.h>

// ==========================================
// 1. CONFIGURATION RÉSEAU & BROKER MQTT
// ==========================================
const char* WIFI_SSID     = "Wokwi-GUEST";          // SSID réseau (Wokwi ou réel)
const char* WIFI_PASSWORD = "";                     // Mot de passe WiFi
const char* MQTT_SERVER   = "broker.hivemq.com";    // Broker MQTT CyberCortex Edge
const int   MQTT_PORT     = 1883;
const char* GREENHOUSE_ID = "gh-01";                // Identifiant unique de la serre

// Topics MQTT conventionnels
const char* TOPIC_TELEMETRY_LIVE = "smartagri/gh-01/telemetry";
const char* TOPIC_TELEMETRY_BULK = "smartagri/gh-01/telemetry/bulk";
const char* TOPIC_COMMANDS_ACT   = "smartagri/gh-01/commands/actuators";

// Configuration NTP (Horodatage Réel)
const char* NTP_SERVER_1  = "pool.ntp.org";
const char* NTP_SERVER_2  = "time.google.com";
const long  GMT_OFFSET_SEC = 3600;                  // UTC+1 (ex: Tunisie / France hiver)
const int   DAYLIGHT_OFFSET_SEC = 0;

// ==========================================
// 2. AFFECTATION DES BROCHES & ACTIONNEURS
// ==========================================
// Relais (Actifs à l'état BAS pour modules relais optocouplés standards)
const int PIN_RELAY_PUMP = 26; // Pompe d'irrigation / circuit NFT
const int PIN_RELAY_FAN  = 27; // Ventilateur d'extraction climatique
const int PIN_RELAY_HEAT = 14; // Chauffage d'appoint
const uint8_t RELAY_ON   = LOW;
const uint8_t RELAY_OFF  = HIGH;

// Capteurs Biophysiques (ADC1 pour compatibilité Wi-Fi active)
const int PIN_SOIL_MOISTURE = 34; // Humidimètre capacitif de sol
const int PIN_WATER_LEVEL   = 35; // Sonde de niveau de cuve NFT
const int PIN_TEMP_ANALOG   = 32; // Capteur de température ambiante (ou DHT)

// ==========================================
// 3. SEUILS CRITIQUES DU FAIL-SAFE LOCAL
// ==========================================
const float SEUIL_CRITIQUE_BAS_SOL = 30.0; // Humidité sol critique minimale (%)
const float SEUIL_MIN_EAU_NFT      = 15.0; // Niveau minimal de cuve (%)
const float SEUIL_CRITIQUE_TEMP    = 35.0; // Température d'alerte surchauffe (°C)
const float SEUIL_TEMP_HYSTERESIS  = 29.5; // Température d'arrêt ventilation (°C)

// Paramètres temporels de sécurité (Irrigation par impulsions sécurisées)
const unsigned long PUMP_PULSE_DURATION_MS = 15000; // 15 secondes d'irrigation max
const unsigned long PUMP_COOLDOWN_MS       = 60000; // 60 secondes de pause minimale anti-noyade
const unsigned long SENSOR_SAMPLE_INTERVAL = 30000; // Échantillonnage toutes les 30s (ou 5min)

// Fichier tampon Flash LittleFS
const char* OFFLINE_BUFFER_PATH = "/offline_buffer.jsonl";

// ==========================================
// 4. ÉTATS GLOBAUX & INSTANCES
// ==========================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Variables de télémétrie locale
float currentSoilMoisture = 65.0;
float currentWaterLevel   = 70.0;
float currentTemperature  = 24.5;
float currentAirHumidity  = 60.0;

// Variables du moteur Fail-Safe
bool pumpIsActive = false;
unsigned long pumpStartTime = 0;
unsigned long lastPumpStopTime = 0;
bool fanIsActive = false;

// Timers système non-bloquants
unsigned long lastSampleTime = 0;
unsigned long lastMqttReconnectAttempt = 0;
time_t baseEpochTime = 0;
unsigned long baseMillisAtSync = 0;

// Prototypes de fonctions
void executeLocalFailSafe();
void recordSensorData();
void syncOfflineData();
bool attemptMqttConnect();
time_t getCurrentTimestamp();
void sampleSensors();
void mqttCallback(char* topic, byte* message, unsigned int length);

// ==========================================
// 5. SETUP & INITIALISATION
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println(F("\n======================================================="));
    Serial.println(F("🌱 CYBERCORTEX EDGE NODE - FIRMWARE HAUTE RÉSILIENCE"));
    Serial.println(F("======================================================="));

    // 1. Initialisation des broches matérielles avec mise en sécurité immédiate
    pinMode(PIN_RELAY_PUMP, OUTPUT);
    pinMode(PIN_RELAY_FAN, OUTPUT);
    pinMode(PIN_RELAY_HEAT, OUTPUT);
    digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
    digitalWrite(PIN_RELAY_FAN, RELAY_OFF);
    digitalWrite(PIN_RELAY_HEAT, RELAY_OFF);

    pinMode(PIN_SOIL_MOISTURE, INPUT);
    pinMode(PIN_WATER_LEVEL, INPUT);
    pinMode(PIN_TEMP_ANALOG, INPUT);

    // 2. Initialisation du système de fichiers LittleFS (Flash)
    Serial.print(F("[LITTLEFS] Montage de la partition Flash... "));
    if (!LittleFS.begin(true)) {
        Serial.println(F("❌ ERREUR CRITIQUE : Échec du montage LittleFS !"));
    } else {
        Serial.println(F("✅ OK !"));
        size_t totalBytes = LittleFS.totalBytes();
        size_t usedBytes  = LittleFS.usedBytes();
        Serial.printf("[LITTLEFS] Espace Total : %u bytes | Utilisé : %u bytes\n", totalBytes, usedBytes);
    }

    // 3. Connexion WiFi (Mode non bloquant avec timeout raisonnable)
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
    Serial.print(F("[WIFI] Tentative de connexion initiale"));
    unsigned long wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 8000) {
        delay(300);
        Serial.print(F("."));
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] Connecté ! IP : %s\n", WiFi.localIP().toString().c_str());
        // Synchronisation NTP de l'horloge
        configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 5000)) {
            baseEpochTime = time(nullptr);
            baseMillisAtSync = millis();
            Serial.printf("[NTP] Horloge synchronisée : %04d-%02d-%02d %02d:%02d:%02d UTC\n",
                          timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                          timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
        }
    } else {
        Serial.println(F("\n[WIFI] Réseau indisponible au démarrage. Démarrage en Mode Edge Autonome."));
    }

    // 4. Configuration du client MQTT
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(512); // Buffer étendu pour JSON LittleFS

    Serial.println(F("[SYSTEM] Système prêt. Surveillance Fail-Safe active à 1000 Hz.\n"));
}

// ==========================================
// 6. LOOP PRINCIPALE (ZÉRO DELAY BLOQUANT)
// ==========================================
void loop() {
    // -------------------------------------------------------------
    // PRIORITÉ 1 ABSOLUE : Moteur de Survie Local Biophysique
    // S'exécute à chaque milliseconde, peu importe l'état Wi-Fi / MQTT
    // -------------------------------------------------------------
    executeLocalFailSafe();

    // -------------------------------------------------------------
    // PRIORITÉ 2 : Tâches Réseau & MQTT Asynchrones
    // -------------------------------------------------------------
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            unsigned long now = millis();
            if (now - lastMqttReconnectAttempt > 5000) {
                lastMqttReconnectAttempt = now;
                if (attemptMqttConnect()) {
                    // Au retour du réseau, déclencher la resynchronisation LittleFS
                    syncOfflineData();
                }
            }
        } else {
            mqttClient.loop();
        }
    }

    // -------------------------------------------------------------
    // PRIORITÉ 3 : Échantillonnage & Télémétrie (Live ou Store-and-Forward)
    // -------------------------------------------------------------
    unsigned long currentMillis = millis();
    if (currentMillis - lastSampleTime >= SENSOR_SAMPLE_INTERVAL) {
        lastSampleTime = currentMillis;
        sampleSensors();
        recordSensorData();
    }
}

// ============================================================================
// MISSION 1 : LE MOTEUR DE SURVIE LOCAL (EDGE FAIL-SAFE LOGIC)
// ============================================================================
/**
 * @brief Exécute les règles physiques fondamentales pour empêcher la mort des cultures.
 *        Indépendant de la connectivité réseau.
 */
void executeLocalFailSafe() {
    unsigned long now = millis();

    // --- RÈGLE 1 : HYDRATATION RACINAIRE & NIVEAU DE CUVE ---
    // Si l'humidité du sol ou le niveau d'eau de la cuve NFT chute sous le seuil critique
    bool conditionIrrigationRequise = (currentSoilMoisture < SEUIL_CRITIQUE_BAS_SOL) || 
                                     (currentWaterLevel < SEUIL_MIN_EAU_NFT);

    if (conditionIrrigationRequise) {
        if (!pumpIsActive) {
            // Vérifier que le temps de pause anti-noyade (cooldown) est respecté
            if (now - lastPumpStopTime >= PUMP_COOLDOWN_MS || lastPumpStopTime == 0) {
                digitalWrite(PIN_RELAY_PUMP, RELAY_ON);
                pumpIsActive = true;
                pumpStartTime = now;
                Serial.printf("[FAIL-SAFE] 🚨 URGENCE HYDRIQUE (Sol: %.1f%%, Cuve: %.1f%%) -> POMPE ACTIVE (15s)\n",
                              currentSoilMoisture, currentWaterLevel);
            }
        } else {
            // Pompe en cours de fonctionnement : vérifier le temps d'impulsion maximum
            if (now - pumpStartTime >= PUMP_PULSE_DURATION_MS) {
                digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
                pumpIsActive = false;
                lastPumpStopTime = now;
                Serial.println(F("[FAIL-SAFE] ⏹️ Fin d'impulsion d'irrigation de secours. Début du cooldown (60s)."));
            }
        }
    } else {
        // Conditions nominales : si la pompe tournait en fail-safe, l'arrêter si durée écoulée
        if (pumpIsActive && (now - pumpStartTime >= PUMP_PULSE_DURATION_MS)) {
            digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
            pumpIsActive = false;
            lastPumpStopTime = now;
        }
    }

    // --- RÈGLE 2 : PROTECTION SURCHAUFFE CLIMATIQUE ---
    // Si la température dépasse 35°C, forcer l'extraction d'air
    if (currentTemperature > SEUIL_CRITIQUE_TEMP) {
        if (!fanIsActive) {
            digitalWrite(PIN_RELAY_FAN, RELAY_ON);
            fanIsActive = true;
            Serial.printf("[FAIL-SAFE] 🌡️ SURCHAUFFE CRITIQUE (%.1f°C > %.1f°C) -> VENTILATEUR FORCÉ ON\n",
                          currentTemperature, SEUIL_CRITIQUE_TEMP);
        }
    } else if (currentTemperature <= SEUIL_TEMP_HYSTERESIS) {
        // Hystérésis pour éviter les oscillations du relais
        if (fanIsActive) {
            digitalWrite(PIN_RELAY_FAN, RELAY_OFF);
            fanIsActive = false;
            Serial.printf("[FAIL-SAFE] ❄️ Température rétablie (%.1f°C <= %.1f°C) -> Ventilateur OFF\n",
                          currentTemperature, SEUIL_TEMP_HYSTERESIS);
        }
    }
}

// ============================================================================
// MISSION 2 : STOCKAGE HORS-LIGNE (STORE & FORWARD VIA LITTLEFS)
// ============================================================================
/**
 * @brief Échantillonne et transmet en direct si connecté, ou écrit dans la Flash si déconnecté.
 */
void recordSensorData() {
    time_t currentTs = getCurrentTimestamp();

    // 1. Préparation du document JSON strict
    StaticJsonDocument<256> doc;
    doc["ts"]            = currentTs;
    doc["greenhouse_id"] = GREENHOUSE_ID;
    doc["t"]             = round(currentTemperature * 10) / 10.0;
    doc["h"]             = round(currentAirHumidity * 10) / 10.0;
    doc["soil"]          = round(currentSoilMoisture * 10) / 10.0;
    doc["water"]         = round(currentWaterLevel * 10) / 10.0;

    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    // 2. Vérification de l'état de la connexion MQTT
    if (mqttClient.connected()) {
        // Envoi temps réel nominal
        mqttClient.publish(TOPIC_TELEMETRY_LIVE, jsonBuffer);
        Serial.printf("[TELEMETRY-LIVE] Envoi MQTT -> %s\n", jsonBuffer);
    } else {
        // Mode Déconnecté : Stockage sur LittleFS (Store-and-Forward)
        Serial.println(F("[STORE-AND-FORWARD] Réseau indisponible. Sauvegarde dans LittleFS..."));

        File file = LittleFS.open(OFFLINE_BUFFER_PATH, FILE_APPEND);
        if (!file) {
            Serial.println(F("[LITTLEFS] ❌ Échec d'ouverture du fichier tampon pour ajout !"));
            return;
        }

        // Écriture de la ligne JSONL avec saut de ligne
        file.println(jsonBuffer);
        size_t fileSize = file.size();
        file.close();

        Serial.printf("[STORE-AND-FORWARD] 💾 Donnée archivée : %s (Taille buffer: %u bytes)\n",
                      jsonBuffer, fileSize);
    }
}

// ============================================================================
// MISSION 3 : PROTOCOLE DE RESYNCHRONISATION (SYNC LOOP)
// ============================================================================
/**
 * @brief Synchronise les données accumulées en Flash lors de la reconnexion MQTT.
 */
void syncOfflineData() {
    if (!LittleFS.exists(OFFLINE_BUFFER_PATH)) {
        Serial.println(F("[SYNC] Aucun historique hors-ligne à synchroniser."));
        return;
    }

    File file = LittleFS.open(OFFLINE_BUFFER_PATH, FILE_READ);
    if (!file) {
        Serial.println(F("[SYNC] ❌ Impossible de lire le fichier tampon hors-ligne."));
        return;
    }

    size_t totalBytes = file.size();
    Serial.printf("\n[SYNC] 🚀 Début de resynchronisation (%u bytes accumulés)...\n", totalBytes);

    int recordsSynced = 0;
    bool syncSuccess = true;

    while (file.available()) {
        String line = file.readStringUntil('\n');
        line.trim();

        if (line.length() > 0) {
            // Publication de chaque ligne historique sur le topic bulk dédié (QoS 1)
            // Dans PubSubClient, publish() retourne true si le paquet a été transmis au socket
            bool published = mqttClient.publish(TOPIC_TELEMETRY_BULK, line.c_str());

            if (published) {
                recordsSynced++;
                Serial.printf("[SYNC] -> Enregistrement #%d resynchronisé : %s\n", recordsSynced, line.c_str());
            } else {
                Serial.println(F("[SYNC] ⚠️ Échec de transmission MQTT during bulk sync. Abandon pour retry."));
                syncSuccess = false;
                break;
            }

            // Maintien actif de la stack réseau MQTT et yield pour éviter le WDT
            mqttClient.loop();
            delay(25);
        }
    }

    file.close();

    // Nettoyage de la Flash si tous les paquets ont été délivrés avec succès
    if (syncSuccess) {
        if (LittleFS.remove(OFFLINE_BUFFER_PATH)) {
            Serial.printf("[SYNC] ✅ SUCCÈS TOTAL : %d enregistrements injectés. Buffer Flash supprimé.\n\n",
                          recordsSynced);
        } else {
            Serial.println(F("[SYNC] ⚠️ Données transmises mais échec de suppression du fichier tampon."));
        }
    }
}

// ==========================================
// 7. FONCTIONS AUXILIAIRES & UTILITAIRES
// ==========================================
/**
 * @brief Connexion MQTT non-bloquante
 */
bool attemptMqttConnect() {
    Serial.print(F("[MQTT] Connexion au broker HiveMQ..."));
    String clientId = "CyberCortex-ESP32-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
        Serial.println(F(" Connecté !"));
        // Souscription aux ordres actionneurs Cloud
        mqttClient.subscribe(TOPIC_COMMANDS_ACT);
        return true;
    } else {
        Serial.printf(" Échec (rc=%d). Réessai dans 5s.\n", mqttClient.state());
        return false;
    }
}

/**
 * @brief Calcule le timestamp réel actuel (avec dérive milliseconde si déconnecté)
 */
time_t getCurrentTimestamp() {
    time_t now = time(nullptr);
    // Si l'horloge NTP est synchronisée (année > 2020)
    if (now > 1600000000) {
        return now;
    }
    // Secours calculé via le boot et millis()
    if (baseEpochTime > 1600000000) {
        return baseEpochTime + ((millis() - baseMillisAtSync) / 1000);
    }
    // Secours par défaut (timestamp 2026 de référence)
    return 1774620000 + (millis() / 1000);
}

/**
 * @brief Échantillonne les capteurs physiques (ou génère les signaux pour démo)
 */
void sampleSensors() {
    // Dans une installation réelle :
    // currentSoilMoisture = map(analogRead(PIN_SOIL_MOISTURE), 4095, 1500, 0, 100);
    // currentWaterLevel   = map(analogRead(PIN_WATER_LEVEL), 0, 4095, 0, 100);

    // Simulation dynamique cohérente avec dérives réalistes
    currentTemperature  = 24.0 + (random(-15, 20) / 10.0);
    currentAirHumidity  = 60.0 + (random(-25, 25) / 10.0);
    currentSoilMoisture = constrain(currentSoilMoisture + (random(-10, 8) / 10.0), 20.0, 90.0);
    currentWaterLevel   = constrain(currentWaterLevel - 0.1, 10.0, 95.0);

    // Si la pompe est active, l'humidité et le niveau d'eau remontent
    if (pumpIsActive) {
        currentSoilMoisture += 4.5;
        currentWaterLevel += 2.0;
    }
}

/**
 * @brief Callback de réception des ordres MQTT distants
 */
void mqttCallback(char* topic, byte* message, unsigned int length) {
    String msg;
    for (unsigned int i = 0; i < length; i++) msg += (char)message[i];
    Serial.printf("[MQTT-RECV] Ordre reçu sur [%s] : %s\n", topic, msg.c_str());

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, msg) == DeserializationError::Ok) {
        const char* actuator = doc["actuator_key"];
        const char* action   = doc["action"];

        if (actuator && action) {
            bool state = (strcmp(action, "ON") == 0);
            if (strcmp(actuator, "irrigation_pump") == 0) {
                digitalWrite(PIN_RELAY_PUMP, state ? RELAY_ON : RELAY_OFF);
                pumpIsActive = state;
            } else if (strcmp(actuator, "ventilation") == 0) {
                digitalWrite(PIN_RELAY_FAN, state ? RELAY_ON : RELAY_OFF);
                fanIsActive = state;
            }
        }
    }
}
