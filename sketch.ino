#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURATION WOKWI & BROKER PUBLIC
// ==========================================
const char* ssid = "Wokwi-GUEST";          // Réseau WiFi virtuel de Wokwi
const char* password = "";                 // Pas de mot de passe
const char* mqtt_server = "broker.hivemq.com"; // Broker public
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 5000; // Envoi toutes les 5 secondes

void setup_wifi() {
  delay(10);
  Serial.println('\n');
  Serial.print("[WiFi] Connexion à Wokwi-GUEST...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password, 6); // Le canal 6 accélère la connexion sur Wokwi

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connecté !");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connexion au broker HiveMQ...");
    String clientId = "Wokwi-Ghost-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println(" Connecté !");
    } else {
      Serial.print(" Échec, rc=");
      Serial.print(client.state());
      Serial.println(" -> Retentative dans 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Génération de données virtuelles
    float tempValue = 24.0 + (random(-15, 15) / 10.0);
    float humValue = 60.0 + (random(-20, 20) / 10.0);

    StaticJsonDocument<200> doc;
    doc["sensor_key"] = "temperature";
    doc["value"] = tempValue;
    
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    Serial.print("[MQTT] Envoi : ");
    Serial.println(jsonBuffer);
    
    // Publication sur le topic unique
    client.publish("ghost-pfe/greenhouse/telemetry/sensors", jsonBuffer);
  }
}
