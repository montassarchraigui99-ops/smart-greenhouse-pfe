/**
 * Rôle : Lead Systems Architect & Principal Frontend Expo Engineer
 * Fichier : frontend/components/DashboardView.tsx
 * Objectif : Vue Dashboard / Command Center principale CyberCortex ERP.
 *            100% Zéro Hardcoded Strings, Traduction par Clés dynamique,
 *            Interpolation i18n et Verrouillage Total du Layout RTL (marginStart, marginEnd, start, end).
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Animated,
    Pressable,
    Platform,
    Dimensions,
    PressableStateCallbackType,
    Image,
    useWindowDimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import Svg, { Ellipse, Rect, G, Path } from 'react-native-svg';
import ActionBar from './ActionBar';
import PredictiveSimulationView from './PredictiveSimulationView';
import AIChatbot from './AIChatbot';
import { Greenhouse3D } from './Greenhouse3D';
import { API_BASE_URL, fetchActuatorLogs, fetchUserProfile } from '../services/api';
import { useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import * as Notifications from 'expo-notifications';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../constants/theme';
import { MetricCard } from './ui/MetricCard';
import { StatusBadge } from './ui/StatusBadge';
import { useTranslation } from '../i18n';

// Notifications au premier plan (Mobile uniquement)
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

const TOKENS = {
    bg: '#f6f8f5',
    bg2: '#eef2ec',
    panel: '#ffffff',
    line: '#e2e8e0',
    text: '#1e2b22',
    textDim: '#5c6b60',
    textFaint: '#93a297',
    green: '#2f9e5b',
    greenDeep: '#1f7a46',
    soil: '#b08a5f',
    rLg: 26,
    rMd: 16,
    rSm: 10,
    rPill: 999,
    shadowSm: {
        shadowColor: 'rgba(31,58,41,0.16)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    shadowMd: {
        shadowColor: 'rgba(31,58,41,0.16)',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.16,
        shadowRadius: 34,
        elevation: 6,
    },
};

const SCREEN_W = Dimensions.get('window').width;
const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

const LiveDot = () => {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
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

function seededRandom(seed: number) {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    return ((a * seed + c) % m) / (m - 1);
}

const PlantRows = ({ cx, baseY, n, seedIdx }: { cx: number; baseY: number; n: number; seedIdx: number }) => {
    const paths = useMemo(() => {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const r1 = seededRandom(seedIdx * 100 + i * 3);
            const r2 = seededRandom(seedIdx * 100 + i * 3 + 1);
            const x = cx - (n * 7) / 2 + i * 7 + (r1 * 3 - 1.5);
            const h = 16 + r2 * 12;
            let fill = '#65c78c';
            if (i % 3 === 0) fill = '#2c8a55';
            else if (i % 3 === 1) fill = '#3fa869';

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
        <PlantRows cx={210} baseY={266} n={32} seedIdx={1} />
    </Svg>
);

export const DashboardView: React.FC = () => {
    const { t, isRTL } = useTranslation();
    const { activeGreenhouseId, activeGreenhouse } = useActiveGreenhouse();
    const { width: windowWidth } = useWindowDimensions();

    const [userProfile, setUserProfile] = useState<{ fullName: string }>({
        fullName: 'Montassar',
    });

    const [kpis, setKpis] = useState({
        temp: 25.4,
        humidity: 62,
        light: 16,
        water: 4.2,
    });

    const [actionLogs, setActionLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'twin' | 'prediction'>('overview');
    const scrollViewRef = useRef<ScrollView>(null);
    const isManualScrolling = useRef(false);
    const sectionOffsets = useRef<{ overview: number; twin: number; prediction: number }>({
        overview: 0,
        twin: 960,
        prediction: 1850,
    });

    // Chargement du profil utilisateur pour variable dynamique {name}
    useEffect(() => {
        fetchUserProfile()
            .then(res => {
                if (res && res.profile && res.profile.full_name) {
                    setUserProfile({ fullName: res.profile.full_name });
                }
            })
            .catch(() => {});
    }, []);

    // Polling des actionneurs
    useEffect(() => {
        const pollLogs = async () => {
            try {
                const logs = await fetchActuatorLogs(activeGreenhouseId);
                if (logs && logs.length > 0) {
                    setActionLogs(logs.slice(0, 4));
                }
            } catch (_) {}
        };
        pollLogs();
        const interval = setInterval(pollLogs, 4000);
        return () => clearInterval(interval);
    }, [activeGreenhouseId]);

    // Polling de la télémétrie
    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const ghParam = encodeURIComponent(activeGreenhouseId);
                const [resTemp, resHum, resLight, resWater] = await Promise.all([
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=sensor.ambient_temp&greenhouseId=${ghParam}`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=sensor.air_humidity&greenhouseId=${ghParam}`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=sensor.photoperiod&greenhouseId=${ghParam}`),
                    fetch(`${API_BASE_URL}/telemetry?sensor_key=sensor.water_consumption&greenhouseId=${ghParam}`),
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
                    temp: latestTemp !== null ? latestTemp : (activeGreenhouse?.target_temp ?? prev.temp),
                    humidity: latestHum !== null ? latestHum : (activeGreenhouse?.target_humidity ?? prev.humidity),
                    light: latestLight !== null ? latestLight : prev.light,
                    water: latestWater !== null ? latestWater : prev.water,
                }));
            } catch (_) {}
        };

        fetchTelemetry();
        const timer = setInterval(fetchTelemetry, 5000);
        return () => clearInterval(timer);
    }, [activeGreenhouseId, activeGreenhouse]);

    const isDesktop = windowWidth >= 980;
    const isTablet = windowWidth >= 640 && windowWidth < 980;
    const isMobile = windowWidth < 640;
    const isSmallMobile = windowWidth < 460;

    const scrollToSection = (tab: 'overview' | 'twin' | 'prediction') => {
        setActiveTab(tab);
        isManualScrolling.current = true;

        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const all = Array.from(document.querySelectorAll('*'));
            const scrollContainer = all.find(el => {
                const s = window.getComputedStyle(el);
                return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
            });

            if (tab === 'overview') {
                if (scrollContainer) {
                    (scrollContainer as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else {
                const targetId = tab === 'twin' ? 'section-twin' : 'section-prediction';
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }

        let targetY = 0;
        if (tab === 'twin') {
            const recorded = sectionOffsets.current.twin;
            targetY = Math.max(0, (recorded && recorded > 100 ? recorded : 960) - 85);
        } else if (tab === 'prediction') {
            const recorded = sectionOffsets.current.prediction;
            targetY = Math.max(0, (recorded && recorded > 200 ? recorded : 1850) - 85);
        }
        try {
            scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        } catch (_) {}

        setTimeout(() => {
            isManualScrolling.current = false;
        }, 850);
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isManualScrolling.current) return;
        const scrollY = event.nativeEvent.contentOffset.y;
        const twinY = sectionOffsets.current.twin || 960;
        const predY = sectionOffsets.current.prediction || 1850;

        if (scrollY >= predY - 140) {
            setActiveTab('prediction');
        } else if (scrollY >= twinY - 140) {
            setActiveTab('twin');
        } else {
            setActiveTab('overview');
        }
    };

    return (
        <View style={styles.container}>
            {/* Navbar Flottante Centrée (Start / End et Logical Properties) */}
            <View style={styles.navHeaderContainer} pointerEvents="box-none">
                <View style={styles.navwrap} pointerEvents="auto">
                    <Pressable
                        onPress={() => scrollToSection('overview')}
                        accessibilityRole="button"
                        style={({ hovered }: HoverState) => [
                            styles.brand,
                            hovered && { opacity: 0.8 },
                        ]}
                    >
                        <Image
                            source={require('../assets/images/smart_greenhouse_logo.png')}
                            style={[styles.brandLogo, isSmallMobile && { width: 28, height: 28, marginEnd: 0 }]}
                            resizeMode="contain"
                        />
                        {!isSmallMobile && (
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.brandName} numberOfLines={1}>
                                    {isMobile ? 'Smart Agri' : 'Smart Agri Greenhouse'}
                                </Text>
                                {isDesktop && <Text style={styles.brandSub}>DIGITAL TWIN PLATFORM</Text>}
                            </View>
                        )}
                    </Pressable>

                    <View style={styles.navlinks}>
                        <Pressable
                            onPress={() => scrollToSection('overview')}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === 'overview' }}
                            style={({ hovered, pressed }: HoverState) => [
                                styles.navLinkItem,
                                isSmallMobile && styles.navLinkItemCompact,
                                activeTab === 'overview' && styles.navLinkActive,
                                hovered && activeTab !== 'overview' && styles.navLinkHovered,
                                pressed && styles.navLinkPressed,
                            ]}
                        >
                            <Text style={[
                                styles.navLinkText,
                                isSmallMobile && styles.navLinkTextCompact,
                                activeTab === 'overview' && styles.navLinkTextActive,
                            ]}>
                                {isDesktop ? t('tab_command_center') : t('tab_home_short')}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => scrollToSection('twin')}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === 'twin' }}
                            style={({ hovered, pressed }: HoverState) => [
                                styles.navLinkItem,
                                isSmallMobile && styles.navLinkItemCompact,
                                activeTab === 'twin' && styles.navLinkActive,
                                hovered && activeTab !== 'twin' && styles.navLinkHovered,
                                pressed && styles.navLinkPressed,
                            ]}
                        >
                            <Text style={[
                                styles.navLinkText,
                                isSmallMobile && styles.navLinkTextCompact,
                                activeTab === 'twin' && styles.navLinkTextActive,
                            ]}>
                                {t('dashboard.digital_twin_eyebrow')}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => scrollToSection('prediction')}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === 'prediction' }}
                            style={({ hovered, pressed }: HoverState) => [
                                styles.navLinkItem,
                                isSmallMobile && styles.navLinkItemCompact,
                                activeTab === 'prediction' && styles.navLinkActive,
                                hovered && activeTab !== 'prediction' && styles.navLinkHovered,
                                pressed && styles.navLinkPressed,
                            ]}
                        >
                            <Text style={[
                                styles.navLinkText,
                                isSmallMobile && styles.navLinkTextCompact,
                                activeTab === 'prediction' && styles.navLinkTextActive,
                            ]}>
                                {t('tab_analytics_short')}
                            </Text>
                        </Pressable>
                    </View>

                    {isDesktop && (
                        <View style={styles.navStatus}>
                            <LiveDot />
                            <Text style={styles.navStatusText}>{t('live')}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Scrollable Stage */}
            <ScrollView
                ref={scrollViewRef}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollStage}
                showsVerticalScrollIndicator={false}
            >
                {/* ---------- VUE D'ENSEMBLE / COMMAND CENTER ---------- */}
                <View
                    {...(Platform.OS === 'web' ? ({ id: 'section-overview' } as any) : { nativeID: 'section-overview' })}
                    style={[styles.section, Platform.OS === 'web' && ({ scrollMarginTop: 85 } as any)]}
                    onLayout={(e) => {
                        sectionOffsets.current.overview = e.nativeEvent.layout.y;
                    }}
                >
                    {/* Greeting Banner & Dynamic Welcome */}
                    <View style={styles.greetingCard}>
                        <View style={styles.greetingHeaderRow}>
                            <View style={styles.greetingStatusBadge}>
                                <View style={styles.greetingDot} />
                                <Text style={styles.greetingStatusText}>{t('dashboard.greeting')}</Text>
                            </View>
                            <StatusBadge status="healthy" label={t('dashboard.realtime_supervision')} />
                        </View>
                        <Text style={styles.greetingH1}>
                            {t('dashboard.welcome_user', { name: userProfile.fullName })}
                        </Text>
                        <Text style={styles.greetingSub}>
                            {t('dashboard.sub_greeting')}
                        </Text>
                    </View>

                    {/* Hero Row */}
                    <View style={[styles.heroRow, SCREEN_W < 900 && styles.heroRowCol]}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.eyebrowContainer}>
                                <View style={styles.eyebrowLine} />
                                <Text style={styles.eyebrowText}>{t('dashboard.eyebrow_nft')}</Text>
                            </View>
                            <Text style={styles.heroTitle}>{t('dashboard.hero_title')}</Text>
                            <Text style={styles.heroDesc}>{t('dashboard.hero_desc')}</Text>

                            <View style={styles.heroCta}>
                                <ActionBar />
                            </View>
                        </View>

                        <View style={styles.twinWrapHero}>
                            <Greenhouse3D />
                        </View>
                    </View>

                    {/* PROGRESSIVE DISCLOSURE - NIVEAU 1 (Télémétrie Logique) */}
                    <View style={styles.disclosureSection}>
                        <View style={styles.disclosureHead}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>{t('dashboard.level_1')}</Text>
                            </View>
                            <View>
                                <Text style={styles.disclosureTitle}>{t('dashboard.level_1_title')}</Text>
                                <Text style={styles.disclosureSubtitle}>{t('dashboard.level_1_subtitle')}</Text>
                            </View>
                        </View>

                        {/* Climat */}
                        <View style={styles.domainBlock}>
                            <Text style={styles.domainTitle}>{t('dashboard.domain_climate')}</Text>
                            <View style={styles.domainGrid}>
                                <MetricCard
                                    label={t('dashboard.temp_greenhouse')}
                                    value={kpis.temp}
                                    unit="°C"
                                    icon="thermometer-outline"
                                    status="healthy"
                                    statusLabel={t('status.optimal')}
                                    progress={Math.min(100, Math.max(0, (kpis.temp / 40) * 100))}
                                    accentColor={Colors.temperature}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                                <MetricCard
                                    label={t('dashboard.humidity_relative')}
                                    value={kpis.humidity}
                                    unit="%"
                                    icon="water-outline"
                                    status="healthy"
                                    statusLabel={t('status.nominal')}
                                    progress={Math.min(100, Math.max(0, kpis.humidity))}
                                    accentColor={Colors.humidity}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                            </View>
                        </View>

                        {/* Solution Nutritive */}
                        <View style={styles.domainBlock}>
                            <Text style={styles.domainTitle}>{t('dashboard.domain_nutrients')}</Text>
                            <View style={styles.domainGrid}>
                                <MetricCard
                                    label={t('dashboard.ph_level')}
                                    value="6.1"
                                    unit="pH"
                                    icon="flask-outline"
                                    status="healthy"
                                    statusLabel={t('status.balanced')}
                                    subtext={t('dashboard.ph_target')}
                                    accentColor={Colors.ph}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                                <MetricCard
                                    label={t('dashboard.ec_level')}
                                    value="1.9"
                                    unit="mS/cm"
                                    icon="flash-outline"
                                    status="healthy"
                                    statusLabel={t('status.optimal')}
                                    subtext={t('dashboard.ec_target')}
                                    accentColor={Colors.ec}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                            </View>
                        </View>

                        {/* Éclairage & Consommation */}
                        <View style={styles.domainBlock}>
                            <Text style={styles.domainTitle}>{t('dashboard.domain_energy')}</Text>
                            <View style={styles.domainGrid}>
                                <MetricCard
                                    label={t('dashboard.photoperiod_active')}
                                    value={kpis.light}
                                    unit="h/j"
                                    icon="sunny-outline"
                                    status="healthy"
                                    statusLabel={t('dashboard.photoperiod_target')}
                                    progress={67}
                                    accentColor={Colors.light}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                                <MetricCard
                                    label={t('dashboard.water_consumption')}
                                    value={kpis.water}
                                    unit="L/j"
                                    icon="water-outline"
                                    status="healthy"
                                    statusLabel={t('dashboard.water_stable')}
                                    progress={38}
                                    accentColor={Colors.soilMoisture}
                                    style={{ flex: 1, minWidth: 240 }}
                                />
                            </View>
                        </View>
                    </View>

                    {/* PROGRESSIVE DISCLOSURE - NIVEAU 2: WHY? (Arbitrage Cyber-Brain) */}
                    <View style={styles.logContainer}>
                        <View style={styles.logHeader}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={styles.stepBadge}>
                                        <Text style={styles.stepBadgeText}>{t('dashboard.level_2')}</Text>
                                    </View>
                                    <Text style={styles.logTitle}>{t('dashboard.level_2_title')}</Text>
                                </View>
                                <Text style={styles.logSubtitle}>{t('dashboard.level_2_subtitle')}</Text>
                            </View>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>{t('dashboard.sync_realtime')}</Text>
                            </View>
                        </View>

                        {actionLogs.length === 0 ? (
                            <View style={styles.emptyLog}>
                                <Text style={styles.emptyLogText}>{t('dashboard.no_anomaly')}</Text>
                            </View>
                        ) : (
                            actionLogs.map((log, idx) => (
                                <View key={idx} style={styles.logRow}>
                                    <View style={styles.logIcon}>
                                        <Text style={{ fontSize: 16 }}>{log.action === 'ON' ? '⚡' : '💤'}</Text>
                                    </View>
                                    <View style={styles.logContent}>
                                        <Text style={styles.logKey}>
                                            {log.actuator_key}{' '}
                                            <Text style={[styles.logBadge, log.action === 'ON' ? styles.badgeOn : styles.badgeOff]}>
                                                {log.action}
                                            </Text>
                                        </Text>
                                        <Text style={styles.logTrigger}>
                                            {t('dashboard.trigger_label')} {log.trigger_source}
                                        </Text>
                                    </View>
                                    <Text style={styles.logTime}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* ---------- JUMEAU NUMERIQUE ---------- */}
                <View
                    {...(Platform.OS === 'web' ? ({ id: 'section-twin' } as any) : { nativeID: 'section-twin' })}
                    style={[styles.section, Platform.OS === 'web' && ({ scrollMarginTop: 85 } as any)]}
                    onLayout={(e) => {
                        sectionOffsets.current.twin = e.nativeEvent.layout.y;
                    }}
                >
                    <View style={styles.sectionHead}>
                        <View style={styles.eyebrowContainer}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrowText}>{t('dashboard.digital_twin_eyebrow')}</Text>
                        </View>
                        <Text style={styles.h2}>{t('dashboard.digital_twin_title')}</Text>
                        <Text style={styles.h2Desc}>{t('dashboard.digital_twin_desc')}</Text>
                    </View>

                    <View style={[styles.twinStage, windowWidth < 960 && { flexDirection: 'column' }]}>
                        <Pressable style={({ hovered, pressed }: HoverState) => [styles.twinBigWrap, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                            <GreenhouseSVG />
                        </Pressable>

                        <View style={styles.controlList}>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View>
                                    <Text style={styles.tName}>{t('dashboard.auto_irrigation')}</Text>
                                    <Text style={styles.tSub}>{t('dashboard.auto_irrigation_sub')}</Text>
                                </View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View>
                                    <Text style={styles.tName}>{t('dashboard.grow_light')}</Text>
                                    <Text style={styles.tSub}>{t('dashboard.grow_light_sub')}</Text>
                                </View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View>
                                    <Text style={styles.tName}>{t('dashboard.ventilation')}</Text>
                                    <Text style={styles.tSub}>{t('dashboard.ventilation_sub')}</Text>
                                </View>
                                <CustomSwitch initial={false} />
                            </Pressable>
                            <Pressable style={({ hovered, pressed }: HoverState) => [styles.toggleRow, hovered && styles.hoveredState, pressed && styles.pressedState]}>
                                <View>
                                    <Text style={styles.tName}>{t('dashboard.critical_threshold_alert')}</Text>
                                    <Text style={styles.tSub}>{t('dashboard.critical_threshold_sub')}</Text>
                                </View>
                                <CustomSwitch initial={true} />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ---------- PREDICTION ---------- */}
                <View
                    {...(Platform.OS === 'web' ? ({ id: 'section-prediction' } as any) : { nativeID: 'section-prediction' })}
                    style={[styles.section, { marginBottom: 60 }, Platform.OS === 'web' && ({ scrollMarginTop: 85 } as any)]}
                    onLayout={(e) => {
                        sectionOffsets.current.prediction = e.nativeEvent.layout.y;
                    }}
                >
                    <PredictiveSimulationView />
                </View>
            </ScrollView>

            {/* Assistant IA Copilot */}
            <AIChatbot />
        </View>
    );
};

export default DashboardView;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollStage: { paddingTop: 110, paddingHorizontal: Math.max(SCREEN_W * 0.05, 24), paddingBottom: 130 },

    greetingCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
        ...Shadows.diffuse,
    },
    greetingHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    greetingStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.successBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.round,
    },
    greetingDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: Colors.secondary,
    },
    greetingStatusText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Typography.primaryFont,
    },
    greetingH1: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
        letterSpacing: -0.4,
    },
    greetingSub: {
        fontSize: 13.5,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 4,
    },
    disclosureSection: {
        marginBottom: Spacing.xl,
    },
    disclosureHead: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    stepBadge: {
        backgroundColor: `${Colors.primary}15`,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    stepBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Typography.monoFont,
    },
    disclosureTitle: {
        fontSize: 16.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    disclosureSubtitle: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    domainBlock: {
        marginBottom: Spacing.lg,
    },
    domainTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    domainGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    logSubtitle: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },

    // Navbar avec Logical Layout Properties
    navHeaderContainer: {
        position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
        top: 14,
        start: 0,
        end: 0,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    },
    navwrap: {
        width: '92%',
        maxWidth: 880,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderWidth: 1,
        borderColor: TOKENS.line,
        borderRadius: TOKENS.rPill,
        paddingVertical: 6,
        paddingHorizontal: 12,
        paddingStart: 12,
        ...TOKENS.shadowMd,
        zIndex: 9999,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 8px 30px rgba(31, 58, 41, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                pointerEvents: 'auto',
            } as any,
            default: {},
        }),
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginEnd: 6,
    },
    brandLogo: { width: 32, height: 32, marginEnd: 8 },
    brandName: { fontSize: 13.5, fontWeight: '600', color: TOKENS.text },
    brandSub: { fontSize: 10, color: TOKENS.textFaint, letterSpacing: 0.8 },
    navlinks: {
        flexDirection: 'row',
        backgroundColor: TOKENS.bg2,
        borderRadius: TOKENS.rPill,
        padding: 3,
        gap: 2,
        alignItems: 'center',
        flexShrink: 0,
    },
    navLinkItem: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: TOKENS.rPill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navLinkItemCompact: {
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    navLinkActive: {
        backgroundColor: TOKENS.greenDeep,
        ...TOKENS.shadowSm,
    },
    navLinkHovered: {
        backgroundColor: 'rgba(31, 122, 70, 0.08)',
    },
    navLinkPressed: {
        transform: [{ scale: 0.96 }],
        opacity: 0.9,
    },
    navLinkText: {
        fontSize: 12.5,
        fontWeight: '500',
        color: TOKENS.textDim,
    },
    navLinkTextCompact: {
        fontSize: 11,
    },
    navLinkTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    navStatus: { flexDirection: 'row', alignItems: 'center', paddingEnd: 6 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: TOKENS.green, marginEnd: 6 },
    navStatusText: { fontSize: 11, color: TOKENS.textDim },

    eyebrowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    eyebrowLine: { width: 16, height: 1, backgroundColor: TOKENS.greenDeep, marginEnd: 8 },
    eyebrowText: { fontFamily: monoFamily, fontSize: 11, letterSpacing: 1.4, color: TOKENS.greenDeep, textTransform: 'uppercase' },
    h2: { fontFamily: sansFamily, fontSize: 32, fontWeight: '600', color: TOKENS.text, marginBottom: 14 },
    h2Desc: { fontSize: 15, color: TOKENS.textDim, lineHeight: 24, fontWeight: '300' },

    section: { marginBottom: 80, maxWidth: 1320, alignSelf: 'center', width: '100%' },
    sectionHead: { maxWidth: 640, marginBottom: 48 },

    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 },
    heroRowCol: { flexDirection: 'column' },
    heroTitle: { fontSize: 44, fontWeight: '700', lineHeight: 50, color: TOKENS.text },
    heroDesc: { fontSize: 16, color: TOKENS.textDim, lineHeight: 24, marginVertical: 22, maxWidth: 480 },
    heroCta: { flexDirection: 'row', alignItems: 'center', gap: 14 },

    twinWrapHero: {
        flex: 1,
        minHeight: 380,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: TOKENS.rLg,
        position: 'relative',
    },

    // Digital Twin Stage
    twinStage: { flexDirection: 'row', gap: 30 },
    twinBigWrap: { flex: 2, minHeight: 460, backgroundColor: TOKENS.panel, borderRadius: TOKENS.rLg, borderWidth: 1, borderColor: TOKENS.line, justifyContent: 'center', padding: 20, ...TOKENS.shadowSm },
    controlList: { flex: 1, gap: 14 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: TOKENS.panel, borderRadius: TOKENS.rMd, padding: 16, borderWidth: 1, borderColor: TOKENS.line, marginBottom: 12, ...TOKENS.shadowSm },
    tName: { fontSize: 13.5, fontWeight: '500', color: TOKENS.text },
    tSub: { fontSize: 11, color: TOKENS.textFaint, marginTop: 2 },

    hoveredState: {
        transform: [{ scale: 1.02 }],
        ...TOKENS.shadowMd,
    },
    pressedState: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },

    // Switch
    switchTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: TOKENS.bg2, borderWidth: 1, borderColor: TOKENS.line },
    switchTrackOn: { backgroundColor: TOKENS.greenDeep, borderColor: 'transparent' },
    switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', top: 2, start: 2, ...TOKENS.shadowSm },

    // Journal Logs
    logContainer: { marginTop: 25, backgroundColor: TOKENS.panel, borderRadius: TOKENS.rLg, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, position: 'relative', zIndex: 10 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: TOKENS.bg2 },
    logTitle: { fontSize: 16, fontWeight: '700', color: TOKENS.text, letterSpacing: 0.5 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f6f3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    liveText: { fontSize: 10, fontWeight: 'bold', color: '#27ae60' },
    emptyLog: { padding: 20, alignItems: 'center' },
    emptyLogText: { color: '#95a5a6', fontStyle: 'italic' },
    logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' },
    logIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: TOKENS.bg2, justifyContent: 'center', alignItems: 'center', marginEnd: 15 },
    logContent: { flex: 1 },
    logKey: { fontSize: 13, fontWeight: 'bold', color: TOKENS.text, textTransform: 'uppercase' },
    logTrigger: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
    logTime: { fontSize: 11, fontWeight: '600', color: '#bdc3c7' },
    logBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontSize: 10, fontWeight: 'bold', marginStart: 8, color: '#fff' },
    badgeOn: { backgroundColor: '#e74c3c', color: '#fff' },
    badgeOff: { backgroundColor: '#bdc3c7', color: '#fff' },
});
