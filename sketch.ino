/**
 * ============================================================================
 * PROJET : Smart Agri Greenhouse / CyberCortex ERP
 * RÔLE : Lead IoT Systems Architect & Edge Computing Engineer
 * FICHIER : sketch.ino (Wokwi & Arduino IDE)
 * DESCRIPTION : Firmware C++ ESP32 Haute Résilience
 *   - Moteur de Survie Biophysique Local (Edge Fail-Safe Logic autonome)
 *   - Mémoire Tampon Hors-Ligne LittleFS (Store-and-Forward JSONL)
 *   - Resynchronisation automatique au retour du réseau (Bulk Sync QoS 1)
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <time.h>

// Configuration Réseau & MQTT
const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* greenhouse_id = "gh-01";

const char* topic_live = "smartagri/gh-01/telemetry";
const char* topic_bulk = "smartagri/gh-01/telemetry/bulk";

// Relais physiques (Actifs à l'état BAS)
const int PIN_RELAY_PUMP = 26;
const int PIN_RELAY_FAN  = 27;
const uint8_t RELAY_ON   = LOW;
const uint8_t RELAY_OFF  = HIGH;

// Seuils Critiques Fail-Safe
const float SEUIL_CRITIQUE_BAS_SOL = 30.0;
const float SEUIL_MIN_EAU_NFT      = 15.0;
const float SEUIL_CRITIQUE_TEMP    = 35.0;
const float SEUIL_TEMP_HYSTERESIS  = 29.5;

const unsigned long PUMP_PULSE_DURATION_MS = 15000;
const unsigned long PUMP_COOLDOWN_MS       = 60000;
const unsigned long SENSOR_SAMPLE_INTERVAL = 10000; // 10s pour démo Wokwi

const char* OFFLINE_BUFFER_PATH = "/offline_buffer.jsonl";

WiFiClient espClient;
PubSubClient client(espClient);

float currentSoilMoisture = 60.0;
float currentWaterLevel   = 65.0;
float currentTemperature  = 24.5;
float currentAirHumidity  = 60.0;

bool pumpIsActive = false;
unsigned long pumpStartTime = 0;
unsigned long lastPumpStopTime = 0;
bool fanIsActive = false;

unsigned long lastSampleTime = 0;
unsigned long lastReconnectAttempt = 0;
time_t baseEpochTime = 0;
unsigned long baseMillisAtSync = 0;

void executeLocalFailSafe();
void recordSensorData();
void syncOfflineData();
bool attemptMqttConnect();
time_t getCurrentTimestamp();
void sampleSensors();

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(F("\n[EDGE-NODE] Initialisation CyberCortex Edge..."));

  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
  digitalWrite(PIN_RELAY_FAN, RELAY_OFF);

  if (!LittleFS.begin(true)) {
    Serial.println(F("[LITTLEFS] Erreur montage Flash !"));
  } else {
    Serial.println(F("[LITTLEFS] Partition Flash montée avec succès."));
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password, 6);
  Serial.print(F("[WiFi] Connexion"));
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 6000) {
    delay(250);
    Serial.print(F("."));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connecté !"));
    configTime(3600, 0, "pool.ntp.org", "time.google.com");
    baseEpochTime = time(nullptr);
    baseMillisAtSync = millis();
  } else {
    Serial.println(F("\n[WiFi] Hors-Ligne. Démarrage autonome."));
  }

  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(512);
}

void loop() {
  // PRIORITÉ 1 : Sécurité Biophysique Locale à chaque milliseconde
  executeLocalFailSafe();

  // PRIORITÉ 2 : Gestion Réseau Asynchrone (Non Bloquante)
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      unsigned long now = millis();
      if (now - lastReconnectAttempt > 5000) {
        lastReconnectAttempt = now;
        if (attemptMqttConnect()) {
          syncOfflineData();
        }
      }
    } else {
      client.loop();
    }
  }

  // PRIORITÉ 3 : Échantillonnage & Télémétrie
  unsigned long now = millis();
  if (now - lastSampleTime >= SENSOR_SAMPLE_INTERVAL) {
    lastSampleTime = now;
    sampleSensors();
    recordSensorData();
  }
}

// -------------------------------------------------------------
// MISSION 1 : FAIL-SAFE LOCAL
// -------------------------------------------------------------
void executeLocalFailSafe() {
  unsigned long now = millis();

  bool alerteHydrique = (currentSoilMoisture < SEUIL_CRITIQUE_BAS_SOL) || 
                        (currentWaterLevel < SEUIL_MIN_EAU_NFT);

  if (alerteHydrique) {
    if (!pumpIsActive) {
      if (now - lastPumpStopTime >= PUMP_COOLDOWN_MS || lastPumpStopTime == 0) {
        digitalWrite(PIN_RELAY_PUMP, RELAY_ON);
        pumpIsActive = true;
        pumpStartTime = now;
        Serial.printf("[FAIL-SAFE] 🚨 URGENCE HYDRIQUE (Sol: %.1f%%, Cuve: %.1f%%) -> POMPE ACTIVE\n",
                      currentSoilMoisture, currentWaterLevel);
      }
    } else if (now - pumpStartTime >= PUMP_PULSE_DURATION_MS) {
      digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
      pumpIsActive = false;
      lastPumpStopTime = now;
      Serial.println(F("[FAIL-SAFE] ⏹️ Arrêt pompe de secours. Début pause 60s."));
    }
  } else if (pumpIsActive && (now - pumpStartTime >= PUMP_PULSE_DURATION_MS)) {
    digitalWrite(PIN_RELAY_PUMP, RELAY_OFF);
    pumpIsActive = false;
    lastPumpStopTime = now;
  }

  // Ventilation de sécurité surchauffe
  if (currentTemperature > SEUIL_CRITIQUE_TEMP) {
    if (!fanIsActive) {
      digitalWrite(PIN_RELAY_FAN, RELAY_ON);
      fanIsActive = true;
      Serial.printf("[FAIL-SAFE] 🌡️ SURCHAUFFE (%.1f°C) -> VENTILATION ON\n", currentTemperature);
    }
  } else if (currentTemperature <= SEUIL_TEMP_HYSTERESIS && fanIsActive) {
    digitalWrite(PIN_RELAY_FAN, RELAY_OFF);
    fanIsActive = false;
    Serial.printf("[FAIL-SAFE] ❄️ Climat régulé (%.1f°C) -> Ventilation OFF\n", currentTemperature);
  }
}

// -------------------------------------------------------------
// MISSION 2 : STORE & FORWARD VIA LITTLEFS
// -------------------------------------------------------------
void recordSensorData() {
  time_t ts = getCurrentTimestamp();

  StaticJsonDocument<256> doc;
  doc["ts"]            = ts;
  doc["greenhouse_id"] = greenhouse_id;
  doc["t"]             = round(currentTemperature * 10) / 10.0;
  doc["h"]             = round(currentAirHumidity * 10) / 10.0;
  doc["soil"]          = round(currentSoilMoisture * 10) / 10.0;
  doc["water"]         = round(currentWaterLevel * 10) / 10.0;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  if (client.connected()) {
    client.publish(topic_live, jsonBuffer);
    Serial.printf("[LIVE] %s\n", jsonBuffer);
  } else {
    File file = LittleFS.open(OFFLINE_BUFFER_PATH, FILE_APPEND);
    if (file) {
      file.println(jsonBuffer);
      file.close();
      Serial.printf("[STORE-AND-FORWARD] 💾 Archivé dans Flash LittleFS : %s\n", jsonBuffer);
    }
  }
}

// -------------------------------------------------------------
// MISSION 3 : RESYNCHRONISATION BULK
// -------------------------------------------------------------
void syncOfflineData() {
  if (!LittleFS.exists(OFFLINE_BUFFER_PATH)) return;

  File file = LittleFS.open(OFFLINE_BUFFER_PATH, FILE_READ);
  if (!file) return;

  Serial.println(F("\n[SYNC] 🚀 Transmission des données hors-ligne vers le Cloud..."));
  int count = 0;
  bool ok = true;

  while (file.available()) {
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      if (client.publish(topic_bulk, line.c_str())) {
        count++;
        Serial.printf("[SYNC] -> Enregistrement #%d resynchronisé\n", count);
      } else {
        ok = false;
        break;
      }
      client.loop();
      delay(20);
    }
  }
  file.close();

  if (ok) {
    LittleFS.remove(OFFLINE_BUFFER_PATH);
    Serial.printf("[SYNC] ✅ %d enregistrements injectés. Buffer Flash supprimé.\n\n", count);
  }
}

bool attemptMqttConnect() {
  String id = "ESP32-" + String(random(0xffff), HEX);
  if (client.connect(id.c_str())) {
    Serial.println(F("[MQTT] Connecté au broker !"));
    return true;
  }
  return false;
}

time_t getCurrentTimestamp() {
  time_t now = time(nullptr);
  if (now > 1600000000) return now;
  if (baseEpochTime > 1600000000) {
    return baseEpochTime + ((millis() - baseMillisAtSync) / 1000);
  }
  return 1774620000 + (millis() / 1000);
}

void sampleSensors() {
  currentTemperature  = 24.0 + (random(-15, 20) / 10.0);
  currentAirHumidity  = 60.0 + (random(-25, 25) / 10.0);
  currentSoilMoisture = constrain(currentSoilMoisture + (random(-10, 8) / 10.0), 20.0, 90.0);
  currentWaterLevel   = constrain(currentWaterLevel - 0.1, 10.0, 95.0);

  if (pumpIsActive) {
    currentSoilMoisture += 4.0;
    currentWaterLevel += 1.5;
  }
}
