import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Pressable, Platform, Dimensions, PressableStateCallbackType } from 'react-native';
import Svg, { Ellipse, Rect, Polygon, G, Line, Circle, Path } from 'react-native-svg';
import ActionBar from '../../components/ActionBar';
import PredictiveSimulationView from '../../components/PredictiveSimulationView';
import AIChatbot from '../../components/AIChatbot';
import { API_BASE_URL, fetchActuatorLogs } from '../../services/api';
import * as Notifications from 'expo-notifications';

// Configuration du comportement des notifications pour qu'elles s'affichent même si l'app est au premier plan (Mobile uniquement)
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
    bg: '#f6f8f5',
    bg2: '#eef2ec',
    panel: '#ffffff',
    line: '#e2e8e0',
    lineSoft: '#edf1ea',
    text: '#1e2b22',
    textDim: '#5c6b60',
    textFaint: '#93a297',
    green: '#2f9e5b',
    greenDeep: '#1f7a46',
    soil: '#b08a5f',
    soilDeep: '#8a6a48',
    amber: '#d9922f',
    sky: '#6fa9c9',
    danger: '#d9603f',
    rLg: 26,
    rMd: 16,
    rSm: 10,
    rPill: 999,
    shadowSm: {
        shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    shadowMd: {
        shadowColor: 'rgba(31,58,41,0.16)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.16, shadowRadius: 34, elevation: 6
    }
};

const SCREEN_W = Dimensions.get('window').width;
const IS_WEB = Platform.OS === 'web';

const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

// ============================================
// ANIMATED UI HELPERS
// ============================================
const LiveDot = () => {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
            ])
        ).start();
    }, [anim]);
    return <Animated.View style={[styles.liveDot, { opacity: anim }]} />;
};

const CustomSwitch = ({ initial = false }: { initial?: boolean }) => {
    const [isOn, setIsOn] = useState(initial);
    const trans = useRef(new Animated.Value(initial ? 20 : 0)).current;

    const toggle = () => {
        setIsOn(!isOn);
        Animated.timing(trans, { toValue: !isOn ? 20 : 0, duration: 250, useNativeDriver: true }).start();
    };

    return (
        <Pressable onPress={toggle} style={[styles.switchTrack, isOn && styles.switchTrackOn]}>
            <Animated.View style={[styles.switchThumb, { transform: [{ translateX: trans }] }]} />
        </Pressable>
    );
};

// ============================================
// DIGITAL TWIN 3D SVG LOGIC
// ============================================
function seededRandom(seed: number) {
    var m = 0x80000000, a = 1103515245, c = 12345;
    seed = (a * seed + c) % m;
    return seed / (m - 1);
}

const PlantRows = ({ cx, baseY, n, seedIdx }: { cx: number, baseY: number, n: number, seedIdx: number }) => {
    const paths = useMemo(() => {
        let pts = [];
        for (let i = 0; i < n; i++) {
            const r1 = seededRandom(seedIdx * 100 + i * 3);
            const r2 = seededRandom(seedIdx * 100 + i * 3 + 1);

            const x = cx - (n * 7) / 2 + i * 7 + (r1 * 3 - 1.5);
            const h = 16 + r2 * 12;
            let fill = '#65c78c'; // lt
            if (i % 3 === 0) fill = '#2c8a55'; // dk
            else if (i % 3 === 1) fill = '#3fa869'; // mid

            pts.push(
                <Path
                    key={i}
                    d={`M${x},${baseY} Q${x - 6},${baseY - h * 0.6} ${x - 1},${baseY - h} Q${x + 6},${baseY - h * 0.6} ${x},${baseY} Z`}
                    fill={fill}
                />
            );
        }
        return pts;
    }, [cx, baseY, n, seedIdx]);
    return <G>{paths}</G>;
};

const GreenhouseSVG = () => (
    <Svg viewBox="0 0 420 320" width="100%" height={320} style={{ overflow: 'visible' }}>
        <Ellipse cx="210" cy="292" rx="150" ry="14" fill="rgba(31,58,41,0.14)" />
        <Rect x="40" y="268" width="340" height="20" rx="3" fill={TOKENS.soil} />
        <Rect x="40" y="282" width="340" height="8" rx="2" fill={TOKENS.soilDeep} />

        <Polygon points="86,268 86,150 210,66 334,150 334,268" fill="#eaf4ee" stroke="#bcd6c4" strokeWidth="1.2" />
        <G stroke="#5c8a6c" strokeWidth="1.4" fill="none">
            <Line x1="128" y1="150" x2="128" y2="268" />
            <Line x1="170" y1="150" x2="170" y2="268" />
            <Line x1="250" y1="150" x2="250" y2="268" />
            <Line x1="292" y1="150" x2="292" y2="268" />
            <Line x1="86" y1="196" x2="334" y2="196" />
            <Line x1="86" y1="232" x2="334" y2="232" />
        </G>
        <G stroke="#5c8a6c" strokeWidth="1.4" fill="none">
            <Line x1="112" y1="150" x2="196" y2="90" />
            <Line x1="152" y1="150" x2="203" y2="112" />
            <Line x1="308" y1="150" x2="224" y2="90" />
            <Line x1="268" y1="150" x2="217" y2="112" />
            <Line x1="86" y1="150" x2="334" y2="150" />
        </G>

        <Polygon points="210,66 272,110 250,150 170,150 148,110" fill="#f4faf6" stroke="#bcd6c4" strokeWidth="1.2" />
        <Polygon points="86,268 86,150 210,66 334,150 334,268" fill="none" stroke="#3a6b4d" strokeWidth="2.4" strokeLinejoin="round" />

        <G rotation={-1} transformOrigin="210 78">
            <Rect x="188" y="72" width="44" height="12" rx="2" fill="#dcece1" stroke="#3a6b4d" strokeWidth="1.6" />
        </G>
        <Line x1="210" y1="66" x2="210" y2="60" stroke="#5c8a6c" strokeWidth="1.4" fill="none" />

        <Rect x="182" y="206" width="56" height="62" rx="3" stroke="#3a6b4d" strokeWidth="2.2" fill="#e3f0e7" />
        <Line x1="210" y1="206" x2="210" y2="268" stroke="#5c8a6c" strokeWidth="1.4" fill="none" />
        <Circle cx="224" cy="238" r="2" fill="#3a6b4d" />

        <Polygon points="334,150 334,268 372,254 372,158" fill="#eaf4ee" stroke="#bcd6c4" strokeWidth="1.2" />
        <Polygon points="334,150 334,268 372,254 372,158" fill="none" stroke="#3a6b4d" strokeWidth="2.4" strokeLinejoin="round" />
        <G stroke="#5c8a6c" strokeWidth="1.4" fill="none">
            <Line x1="350" y1="153" x2="350" y2="261" />
            <Line x1="334" y1="196" x2="372" y2="185" />
            <Line x1="334" y1="232" x2="372" y2="220" />
        </G>

        <Polygon points="210,66 334,150 372,158 248,74" fill="#f4faf6" stroke="#bcd6c4" strokeWidth="1.2" />
        <Polygon points="210,66 334,150 372,158 248,74" fill="none" stroke="#3a6b4d" strokeWidth="2.4" strokeLinejoin="round" />
        <Line x1="272" y1="90" x2="343" y2="140" stroke="#5c8a6c" strokeWidth="1.4" fill="none" />

        <G>
            <PlantRows cx={104} baseY={262} n={9} seedIdx={1} />
            <PlantRows cx={150} baseY={266} n={10} seedIdx={2} />
            <PlantRows cx={258} baseY={266} n={10} seedIdx={3} />
            <PlantRows cx={306} baseY={262} n={8} seedIdx={4} />
        </G>
    </Svg>
);

// ============================================
// MAIN SCREEN
// ============================================
export default function HomeScreen() {
    // ============================================
    // STATE: KPIs Dynamiques Connectés au Backend
    // ============================================
    const [kpis, setKpis] = useState({
        temp: 25.4,
        humidity: 62,
        light: 16,
        water: 4.2
    });

    // ============================================
    // STATE: Moteur de Notifications Natives & Logs
    // ============================================
    const [lastLogTime, setLastLogTime] = useState<string | null>(null);
    const [actionLogs, setActionLogs] = useState<any[]>([]);

    useEffect(() => {
        // Demander les permissions système de notification (Mobile uniquement)
        if (Platform.OS !== 'web') {
            Notifications.requestPermissionsAsync().then(({ status }) => {
                if (status !== 'granted') console.log('Notification permissions denied.');
            }).catch(() => {});
        } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }

        const pollLogsAndNotify = async () => {
            try {
                const logs = await fetchActuatorLogs();
                if (logs && logs.length > 0) {
                    setActionLogs(logs.slice(0, 4)); // Limité aux 4 derniers pour la grille
                    const latest = logs[0];
                    setLastLogTime(prevTime => {
                        if (prevTime === null) return latest.timestamp;

                        if (new Date(latest.timestamp) > new Date(prevTime)) {
                            // Déclenche une notification Push Native/Web selon la plateforme
                            if (Platform.OS !== 'web') {
                                Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: '⚠️ Intervention Cyber-Brain',
                                        body: `Action corrective: ${latest.action} (${latest.actuator_key})\nDéclencheur: ${latest.trigger_source}`,
                                        sound: true,
                                    },
                                    trigger: null,
                                }).catch(() => {});
                            } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                                try {
                                    new window.Notification('⚠️ Intervention Cyber-Brain', {
                                        body: `Action corrective: ${latest.action} (${latest.actuator_key}) - Déclencheur: ${latest.trigger_source}`,
                                    });
                                } catch (notifErr) {
                                    console.log('[NOTIF-WEB]', notifErr);
                                }
                            }
                            return latest.timestamp;
                        }
                        return prevTime;
                    });
                }
            } catch (e) {
                // Silencieux car exécuté en tâche de fond (polling)
            }
        };

        const interval = setInterval(pollLogsAndNotify, 4000); // 4 secondes
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const [resTemp, resHum, resLight, resWater] = await Promise.all([
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=ambient_temperature`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=air_humidity`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=photoperiod`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=water_consumption`)
                ]);
                const dataTemp = await resTemp.json();
                const dataHum = await resHum.json();
                const dataLight = await resLight.json();
                const dataWater = await resWater.json();

                const latestTemp = dataTemp.data?.length > 0 ? parseFloat(dataTemp.data[0].value.toFixed(1)) : null;
                const latestHum = dataHum.data?.length > 0 ? parseFloat(dataHum.data[0].value.toFixed(0)) : null;
                const latestLight = dataLight.data?.length > 0 ? parseFloat(dataLight.data[0].value.toFixed(1)) : null;
                const latestWater = dataWater.data?.length > 0 ? parseFloat(dataWater.data[0].value.toFixed(1)) : null;

                setKpis(prev => ({
                    ...prev,
                    temp: latestTemp !== null ? latestTemp : prev.temp,
                    humidity: latestHum !== null ? latestHum : prev.humidity,
                    light: latestLight !== null ? latestLight : prev.light,
                    water: latestWater !== null ? latestWater : prev.water
                }));
            } catch (err) {
                // Silencieux pour ne pas spammer d'erreurs UI, les valeurs de fallback persistent
            }
        };

        // Polling toute les 5 secondes
        fetchTelemetry();
        const timer = setInterval(fetchTelemetry, 5000);
        return () => clearInterval(timer);
    }, []);
    return (
        <View style={styles.container}>
            {/* Navbar Flottante (Simulée abs top) */}
            <View style={styles.navwrap}>
                <View style={styles.brand}>
                    <View style={styles.brandMark} />
                    <View>
                        <Text style={styles.brandName}>Smart Agri Greenhouse</Text>
                        {SCREEN_W > 600 && <Text style={styles.brandSub}>DIGITAL TWIN PLATFORM</Text>}
                    </View>
                </View>
                {SCREEN_W > 800 && (
                    <View style={styles.navlinks}>
                        <Text style={[styles.navLinkItem, styles.navLinkActive]}>Vue d'ensemble</Text>
                        <Text style={styles.navLinkItem}>Jumeau Numérique</Text>
                        <Text style={styles.navLinkItem}>Prédiction</Text>
                    </View>
                )}
                <View style={styles.navStatus}>
                    <LiveDot />
                    <Text style={styles.navStatusText}>LIVE · SERRE-01</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollStage} showsVerticalScrollIndicator={false}>

                {/* ---------- VUE D'ENSEMBLE ---------- */}
                <View style={styles.section}>
                    <View style={[styles.heroRow, SCREEN_W < 900 && styles.heroRowCol]}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.eyebrowContainer}>
                                <View style={styles.eyebrowLine} />
                                <Text style={styles.eyebrowText}>Agriculture de précision · Hydroponie</Text>
                            </View>
                            <Text style={styles.heroTitle}>Le pilotage <Text style={styles.heroAccent}>prédictif</Text> de votre serre, en direct.</Text>
                            <Text style={styles.heroDesc}>Un jumeau numérique synchronisé en temps réel avec vos capteurs, capable de simuler des scénarios what-if avant toute action réelle sur la culture.</Text>

                            <View style={styles.heroCta}>
                                <ActionBar />
                            </View>
                        </View>

                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.twinWrapHero, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <GreenhouseSVG />
                        </Pressable>
                    </View>

                    {/* KPI GRID */}
                    <View style={styles.kpiGrid}>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.kpi, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <View style={styles.kpiLabelRow}><Text style={styles.kpiLabelText}>TEMPÉRATURE SERRE</Text><Text style={styles.kpiLabelSub}>°C</Text></View>
                            <Text style={styles.kpiVal}>{kpis.temp}</Text>
                            <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: `${Math.min(100, Math.max(0, (kpis.temp / 40) * 100))}%`, backgroundColor: TOKENS.green }]} /></View>
                        </Pressable>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.kpi, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <View style={styles.kpiLabelRow}><Text style={styles.kpiLabelText}>HUMIDITÉ RELATIVE</Text><Text style={styles.kpiLabelSub}>%</Text></View>
                            <Text style={styles.kpiVal}>{kpis.humidity} <Text style={styles.kpiValSmall}>%</Text></Text>
                            <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: `${Math.min(100, Math.max(0, kpis.humidity))}%`, backgroundColor: TOKENS.sky }]} /></View>
                        </Pressable>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.kpi, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <View style={styles.kpiLabelRow}><Text style={styles.kpiLabelText}>PHOTOPÉRIODE</Text><Text style={styles.kpiLabelSub}>h/j</Text></View>
                            <Text style={styles.kpiVal}>{kpis.light} <Text style={styles.kpiValSmall}>h</Text></Text>
                            <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: '67%', backgroundColor: TOKENS.amber }]} /></View>
                        </Pressable>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.kpi, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <View style={styles.kpiLabelRow}><Text style={styles.kpiLabelText}>CONSOMMATION EAU</Text><Text style={styles.kpiLabelSub}>L/j</Text></View>
                            <Text style={styles.kpiVal}>{kpis.water} <Text style={styles.kpiValSmall}>L</Text></Text>
                            <View style={styles.kpiBar}><View style={[styles.kpiFill, { width: '38%', backgroundColor: TOKENS.soilDeep }]} /></View>
                        </Pressable>
                    </View>

                    {/* JOURNAL DES ACTIONS / ALERTES */}
                    <View style={styles.logContainer}>
                        <View style={styles.logHeader}>
                            <Text style={styles.logTitle}>📡 Journal des Interventions (Cyber-Brain)</Text>
                            <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>SYNC</Text></View>
                        </View>
                        {actionLogs.length === 0 ? (
                            <View style={styles.emptyLog}><Text style={styles.emptyLogText}>Aucune anomalie détectée récemment.</Text></View>
                        ) : (
                            actionLogs.map((log, idx) => (
                                <View key={idx} style={styles.logRow}>
                                    <View style={styles.logIcon}>
                                        <Text style={{ fontSize: 16 }}>{log.action === 'ON' ? '⚡' : '💤'}</Text>
                                    </View>
                                    <View style={styles.logContent}>
                                        <Text style={styles.logKey}>{log.actuator_key} <Text style={[styles.logBadge, log.action === 'ON' ? styles.badgeOn : styles.badgeOff]}>{log.action}</Text></Text>
                                        <Text style={styles.logTrigger}>Déclencheur : {log.trigger_source}</Text>
                                    </View>
                                    <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* ---------- JUMEAU NUMERIQUE ---------- */}
                <View style={styles.section}>
                    <View style={styles.sectionHead}>
                        <View style={styles.eyebrowContainer}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrowText}>Digital Twin</Text>
                        </View>
                        <Text style={styles.h2}>Le double exact de votre serre</Text>
                        <Text style={styles.h2Desc}>Synchronisé en temps réel avec les capteurs physiques (ESP32, DHT22, pH/EC). Chaque interaction ci-dessous reflète et pilote l'état réel.</Text>
                    </View>

                    <View style={[styles.twinStage, SCREEN_W < 960 && { flexDirection: 'column' }]}>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.twinBigWrap, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <GreenhouseSVG />
                        </Pressable>

                        <View style={styles.controlList}>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View><Text style={styles.tName}>Irrigation automatique</Text><Text style={styles.tSub}>Seuil : humidité sol &lt; 40%</Text></View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View><Text style={styles.tName}>Éclairage horticole</Text><Text style={styles.tSub}>Complément LED · 16h/jour</Text></View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View><Text style={styles.tName}>Ventilation faîtière</Text><Text style={styles.tSub}>Déclenchement si T &gt; 28°C</Text></View>
                                <CustomSwitch initial={false} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View><Text style={styles.tName}>Alertes seuils critiques</Text><Text style={styles.tSub}>pH, température, d'eau</Text></View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ---------- PREDICTION ---------- */}
                <View style={styles.section}>
                    <PredictiveSimulationView />
                </View>

                {/* ---------- ARCHITECTURE ---------- */}
                <View style={[styles.section, { marginBottom: 100 }]}>
                    <View style={styles.sectionHead}>
                        <View style={styles.eyebrowContainer}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrowText}>Architecture technique</Text>
                        </View>
                        <Text style={styles.h2}>Quatre couches, un seul flux</Text>
                        <Text style={styles.h2Desc}>De la mesure physique au tableau de bord, chaque couche communique en continu.</Text>
                    </View>

                    <View style={styles.archList}>
                        {[
                            { num: '01', title: 'Couche physique / embarquée', desc: 'ESP32, capteurs DHT22, pH/EC, luminosité, relais horticoles.', tags: ['ESP32', 'DHT22', 'Capteurs pH/EC'] },
                            { num: '02', title: 'Communication / ingestion', desc: 'Protocole MQTT vers passerelle, file des messages continue.', tags: ['MQTT', 'Mosquitto / EMQX'] },
                            { num: '03', title: 'Traitement & intelligence', desc: 'Backend applicatif, TSDB, prédiction algorithmique légère.', tags: ['FastAPI / Node.js', 'TimescaleDB', 'scikit-learn'] },
                            { num: '04', title: 'Présentation', desc: 'Tableau de bord web temps réel, SVG rendu par composant React.', tags: ['React / Expo', 'SVG API'] }
                        ].map((arch, idx) => (
                            <Pressable key={idx} style={({ hovered, pressed }: HoverState) => [styles.archItem, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View style={styles.archColLeft}>
                                    <View style={styles.archNumBox}><Text style={styles.archNumText}>{arch.num}</Text></View>
                                    {idx !== 3 && <View style={styles.archLine} />}
                                </View>
                                <View style={styles.archColRight}>
                                    <Text style={styles.archTitle}>{arch.title}</Text>
                                    <Text style={styles.archDesc}>{arch.desc}</Text>
                                    <View style={styles.tagRow}>
                                        {arch.tags.map((t, tid) => (
                                            <View key={tid} style={styles.tagBox}><Text style={styles.tagText}>{t}</Text></View>
                                        ))}
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Assistant IA Conversationnel (Google Gemini Copilot) */}
            <AIChatbot />
        </View>
    );
}

// ============================================
// STYLES
// ============================================
// Native WEB transitions
const webTransitionInteractive = Platform.select({
    web: {
        transition: 'transform 0.3s cubic-bezier(0.22, 0.9, 0.32, 1), box-shadow 0.3s cubic-bezier(0.22, 0.9, 0.32, 1)'
    } as any,
    default: {}
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: TOKENS.bg },
    scrollStage: { paddingTop: 110, paddingHorizontal: Math.max(SCREEN_W * 0.05, 24), paddingBottom: 120 },

    // Interactions
    hoveredState: {
        transform: [{ scale: 1.02 }],
        ...TOKENS.shadowMd,
    },
    pressedState: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },

    // Navbar
    navwrap: {
        position: 'absolute', top: 18, left: '50%', transform: [{ translateX: -SCREEN_W * 0.47 }],
        width: '94%', maxWidth: 980, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderWidth: 1, borderColor: TOKENS.line, borderRadius: TOKENS.rPill,
        paddingVertical: 8, paddingHorizontal: 12, paddingLeft: 20,
        ...TOKENS.shadowMd,
    },
    brand: { flexDirection: 'row', alignItems: 'center' },
    brandMark: { width: 28, height: 28, borderRadius: 9, backgroundColor: TOKENS.green, marginRight: 10 },
    brandName: { fontSize: 14, fontWeight: '600', color: TOKENS.text },
    brandSub: { fontSize: 11, color: TOKENS.textFaint, letterSpacing: 0.8 },
    navlinks: { flexDirection: 'row', backgroundColor: TOKENS.bg2, borderRadius: TOKENS.rPill, padding: 4 },
    navLinkItem: { fontSize: 12.5, color: TOKENS.textDim, paddingHorizontal: 16, paddingVertical: 8, borderRadius: TOKENS.rPill },
    navLinkActive: { backgroundColor: TOKENS.greenDeep, color: '#fff' },
    navStatus: { flexDirection: 'row', alignItems: 'center', paddingRight: 6 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: TOKENS.green, marginRight: 6 },
    navStatusText: { fontSize: 11, color: TOKENS.textDim },

    // Typo
    eyebrowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    eyebrowLine: { width: 16, height: 1, backgroundColor: TOKENS.greenDeep, marginRight: 8 },
    eyebrowText: { fontFamily: monoFamily, fontSize: 11, letterSpacing: 1.4, color: TOKENS.greenDeep, textTransform: 'uppercase' },
    h2: { fontFamily: sansFamily, fontSize: 32, fontWeight: '600', color: TOKENS.text, marginBottom: 14 },
    h2Desc: { fontSize: 15, color: TOKENS.textDim, lineHeight: 24, fontWeight: '300' },

    // Layouts
    section: { marginBottom: 80, maxWidth: 1320, alignSelf: 'center', width: '100%' },
    sectionHead: { maxWidth: 640, marginBottom: 48 },

    // Hero
    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 },
    heroRowCol: { flexDirection: 'column' },
    heroTitle: { fontSize: 48, fontWeight: '700', lineHeight: 52, color: TOKENS.text },
    heroAccent: { color: TOKENS.green },
    heroDesc: { fontSize: 16, color: TOKENS.textDim, lineHeight: 24, marginVertical: 22, maxWidth: 480 },
    heroCta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    btn: { paddingHorizontal: 26, paddingVertical: 14, borderRadius: TOKENS.rPill, borderWidth: 1, borderColor: 'transparent', transform: [{ scale: 1 }], ...webTransitionInteractive },
    btnHovered: { ...TOKENS.shadowMd },
    btnPrimary: { backgroundColor: TOKENS.greenDeep, ...TOKENS.shadowMd },
    btnTextPrimary: { color: '#fff', fontSize: 13.5, fontWeight: '500' },
    btnGhost: { backgroundColor: '#fff', borderColor: TOKENS.line },
    btnTextGhost: { color: TOKENS.text, fontSize: 13.5, fontWeight: '500' },

    twinWrapHero: { flex: 1, minHeight: 400, justifyContent: 'center', alignItems: 'center', transform: [{ scale: 1 }], ...webTransitionInteractive, borderRadius: TOKENS.rLg },

    // KPI Grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    kpi: {
        width: SCREEN_W > 900 ? '23%' : '48%', backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd,
        padding: 20, marginBottom: 16, borderWidth: 1, borderColor: TOKENS.line,
        transform: [{ scale: 1 }], ...TOKENS.shadowSm, ...webTransitionInteractive
    },
    kpiLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    kpiLabelText: { fontSize: 11, color: TOKENS.textFaint, letterSpacing: 0.8 },
    kpiLabelSub: { fontSize: 11, color: TOKENS.textFaint },
    kpiVal: { fontFamily: monoFamily, fontSize: 30, fontWeight: '500', color: TOKENS.text, fontVariant: ['tabular-nums'] },
    kpiValSmall: { fontSize: 14, color: TOKENS.textDim, fontWeight: '400' },
    kpiBar: { height: 4, borderRadius: 2, backgroundColor: TOKENS.bg2, marginTop: 14 },
    kpiFill: { height: '100%', borderRadius: 2 },

    card: { backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd, padding: 26, borderWidth: 1, borderColor: TOKENS.line, transform: [{ scale: 1 }], ...TOKENS.shadowSm, ...webTransitionInteractive },
    cardTitle: { fontFamily: sansFamily, fontSize: 18, fontWeight: '600', color: TOKENS.text, marginBottom: 6 },
    cardDesc: { fontSize: 13.5, color: TOKENS.textDim, lineHeight: 22 },

    // Digital Twin Section
    twinStage: { flexDirection: 'row', gap: 30 },
    twinBigWrap: { flex: 2, minHeight: 460, backgroundColor: TOKENS.panel, borderRadius: TOKENS.rLg, borderWidth: 1, borderColor: TOKENS.line, justifyContent: 'center', padding: 20, transform: [{ scale: 1 }], ...TOKENS.shadowSm, ...webTransitionInteractive },
    controlList: { flex: 1, gap: 14 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd, padding: 16, borderWidth: 1, borderColor: TOKENS.line, marginBottom: 12, transform: [{ scale: 1 }], ...TOKENS.shadowSm, ...webTransitionInteractive },
    tName: { fontSize: 13.5, fontWeight: '500', color: TOKENS.text },
    tSub: { fontSize: 11, color: TOKENS.textFaint, marginTop: 2 },

    // Switch Simulateur
    switchTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: TOKENS.bg2, borderWidth: 1, borderColor: TOKENS.line },
    switchTrackOn: { backgroundColor: TOKENS.greenDeep, borderColor: 'transparent' },
    switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', top: 2, left: 2, ...TOKENS.shadowSm },

    // Prediction
    predictCard: { backgroundColor: TOKENS.panel, borderRadius: TOKENS.rLg, padding: 36, borderWidth: 1, borderColor: TOKENS.line, transform: [{ scale: 1 }], ...TOKENS.shadowSm, ...webTransitionInteractive },
    slidersWrap: { flexDirection: 'row', gap: 26, marginBottom: 30 },
    sliderBlock: { flex: 1 },
    sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    sliderLabel: { fontSize: 12.5, color: TOKENS.textDim, fontFamily: monoFamily },
    sliderVal: { fontSize: 12.5, fontWeight: '500', fontFamily: monoFamily },
    sliderTrack: { height: 4, borderRadius: 2, backgroundColor: TOKENS.bg2, justifyContent: 'center' },
    sliderTrackFill: { position: 'absolute', left: 0, height: 4, width: '50%', backgroundColor: TOKENS.greenDeep, borderRadius: 2 },
    sliderThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: TOKENS.greenDeep, position: 'absolute', left: '50%', marginLeft: -8, borderWidth: 2, borderColor: '#fff' },
    chartWrap: { height: 240, marginTop: 10 },

    // Architecture
    archList: { maxWidth: 900, alignSelf: 'flex-start', width: '100%' },
    archItem: { flexDirection: 'row', marginBottom: 36, transform: [{ scale: 1 }], ...webTransitionInteractive, padding: 8, borderRadius: TOKENS.rMd },
    archColLeft: { width: 64, alignItems: 'center', marginRight: 20 },
    archNumBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: TOKENS.panel, borderWidth: 1, borderColor: TOKENS.line, alignItems: 'center', justifyContent: 'center', ...TOKENS.shadowSm, zIndex: 2 },
    archNumText: { fontFamily: monoFamily, fontSize: 13, color: TOKENS.greenDeep },
    archLine: { position: 'absolute', top: 48, bottom: -36, width: 1, backgroundColor: TOKENS.sky, opacity: 0.4 },
    archColRight: { flex: 1 },
    archTitle: { fontSize: 16.5, fontWeight: '600', color: TOKENS.text, marginBottom: 6 },
    archDesc: { fontSize: 13.5, color: TOKENS.textDim, lineHeight: 22 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
    tagBox: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: TOKENS.line, backgroundColor: TOKENS.panel, borderRadius: TOKENS.rPill },
    tagText: { fontFamily: monoFamily, fontSize: 10.5, color: TOKENS.textDim },

    // Journal
    logContainer: { marginTop: 25, backgroundColor: TOKENS.panel, borderRadius: TOKENS.rLg, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, position: 'relative', zIndex: 10 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: TOKENS.bg2 },
    logTitle: { fontSize: 16, fontWeight: '700', color: TOKENS.text, letterSpacing: 0.5 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f6f3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    liveText: { fontSize: 10, fontWeight: 'bold', color: '#27ae60' },
    emptyLog: { padding: 20, alignItems: 'center' },
    emptyLogText: { color: '#95a5a6', fontStyle: 'italic' },
    logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' },
    logIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: TOKENS.bg2, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    logContent: { flex: 1 },
    logKey: { fontSize: 13, fontWeight: 'bold', color: TOKENS.text, textTransform: 'uppercase' },
    logTrigger: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
    logTime: { fontSize: 11, fontWeight: '600', color: '#bdc3c7' },
    logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontSize: 10, fontWeight: 'bold', marginLeft: 8, color: '#fff' },
    badgeOn: { backgroundColor: '#e74c3c', color: '#fff' },
    badgeOff: { backgroundColor: '#bdc3c7', color: '#fff' }
});
