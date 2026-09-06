const mqtt = require('mqtt');

// Connexion au broker public HiveMQ
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

client.on('connect', () => {
    console.log('[Mock ESP32] Connecté à HiveMQ. Début des transmissions...');

    // Abonnement aux commandes descendantes
    client.subscribe('ghost-pfe/greenhouse/commands/#', (err) => {
        if (!err) console.log('[Mock ESP32] En écoute des commandes depuis le Dashboard...');
    });

    // Boucle infinie non bloquante toutes les 5 secondes
    setInterval(() => {
        // Génération de données virtuelles réalistes
        const tempValue = (24.0 + (Math.random() * 3 - 1.5)).toFixed(1);

        const payload = JSON.stringify({
            sensor_key: "temperature",
            value: parseFloat(tempValue)
        });

        console.log(`[Mock ESP32] Envoi : ${payload}`);

        // Publication sur notre topic unique
        client.publish('ghost-pfe/greenhouse/telemetry/sensors', payload);
    }, 5000);
});

// Écoute des ordres entrants (Command Flux)
client.on('message', (topic, message) => {
    // Si c'est un ordre de pilotage (ex: ghost-pfe/greenhouse/commands/main_pump)
    if (topic.includes('commands/')) {
        const actuatorKey = topic.split('/').pop();
        try {
            const data = JSON.parse(message.toString());
            const hardwareState = data.state ? 'ALLUMÉ(E) [ON]' : 'ÉTEINT(E) [OFF]';
            console.log(`>>> [Mock ESP32] Ordre reçu - Actionneur ${actuatorKey} -> ${hardwareState}`);
        } catch (e) {
            console.error('[Mock ESP32] Formatting Error In Command');
        }
    }
});