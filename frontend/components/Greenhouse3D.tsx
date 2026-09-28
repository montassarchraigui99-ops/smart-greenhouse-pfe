/**
 * Living Intelligence 3D Digital Twin
 * Immersive WebGL Viewport with Contextual Status Indicators & Device Statistics Panel
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as THREE from 'three';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../constants/theme';
import { StatusBadge, StatusType } from './ui/StatusBadge';

export interface DeviceStatistic {
    id: string;
    name: string;
    category: string;
    icon: keyof typeof Ionicons.glyphMap;
    status: StatusType;
    statusLabel: string;
    flow: string;
    mode: 'AUTO' | 'MANUEL';
    lastActivation: string;
    metrics: { label: string; value: string }[];
    xPercent: number; // Position percentage for 3D overlay hotspot
    yPercent: number;
}

const GREENHOUSE_DEVICES: DeviceStatistic[] = [
    {
        id: 'dev-irrigation',
        name: 'Pompe d\'Irrigation NFT',
        category: 'Nutrition & Substrat',
        icon: 'water',
        status: 'healthy',
        statusLabel: 'En Service',
        flow: '2.4 L/min',
        mode: 'AUTO',
        lastActivation: 'Il y a 8 min',
        metrics: [
            { label: 'Débit mesuré', value: '2.4 L/min' },
            { label: 'Pression rampe', value: '1.8 bar' },
            { label: 'Conductivité EC', value: '1.9 mS/cm' },
            { label: 'Niveau réservoir', value: '88%' },
        ],
        xPercent: 32,
        yPercent: 70,
    },
    {
        id: 'dev-ventilation',
        name: 'Ventilation Faîtière',
        category: 'Aération & Climat',
        icon: 'sync-outline',
        status: 'healthy',
        statusLabel: 'Nominal',
        flow: '850 m³/h',
        mode: 'AUTO',
        lastActivation: 'Il y a 24 min',
        metrics: [
            { label: 'Flux d\'air', value: '850 m³/h' },
            { label: 'Ouverture trappes', value: '45%' },
            { label: 'Delta thermique', value: '+1.2 °C' },
            { label: 'Vitesse ventilateur', value: '1 200 RPM' },
        ],
        xPercent: 50,
        yPercent: 24,
    },
    {
        id: 'dev-lighting',
        name: 'Éclairage Horticole LED',
        category: 'Spectre Photosynthétique',
        icon: 'sunny',
        status: 'attention',
        statusLabel: 'Photopériode 16h',
        flow: '240 W',
        mode: 'AUTO',
        lastActivation: 'En continu',
        metrics: [
            { label: 'Spectre PAR', value: '450 µmol/m²/s' },
            { label: 'Température LED', value: '41.2 °C' },
            { label: 'Consommation', value: '0.24 kWh' },
            { label: 'Cycle actif', value: '16h / 24h' },
        ],
        xPercent: 68,
        yPercent: 44,
    },
    {
        id: 'dev-plants',
        name: 'Cultures Hydroponiques (Tomates Cherry)',
        category: 'Biomasse Végétale',
        icon: 'leaf',
        status: 'healthy',
        statusLabel: 'Croissance Végétative',
        flow: 'Santé 96%',
        mode: 'AUTO',
        lastActivation: 'Surveillance Cyber-Brain',
        metrics: [
            { label: 'Indice foliaire', value: '96%' },
            { label: 'VPD Calculé', value: '1.1 kPa' },
            { label: 'Stade phénologique', value: 'Floraison S+4' },
            { label: 'Stress hydrique', value: '0.04 (Optimal)' },
        ],
        xPercent: 46,
        yPercent: 52,
    },
];

export function Greenhouse3D() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [selectedDevice, setSelectedDevice] = useState<DeviceStatistic | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'web' || !containerRef.current) return;

        const container = containerRef.current;
        let width = container.clientWidth || 720;
        let height = container.clientHeight || 460;

        // 1. SCÈNE WEBGL 3D
        const scene = new THREE.Scene();

        // 2. CAMÉRA AVEC PERSPECTIVE IMMERSIVE
        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(0, 1.1, 7.2);
        camera.lookAt(0, 0, 0);

        // 3. RENDERER TRANSPARENT LIGHT MODE
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;

        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.outline = 'none';

        container.replaceChildren(renderer.domElement);

        // 4. ÉCLAIRAGE DYNAMIQUE 3D
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xdcfce7, 1.3, 22);
        pointLight.position.set(3, 4.5, 4);
        scene.add(pointLight);

        // 5. TEXTURE DU MODÈLE PHOTORÉALISTE TRANSPARENT
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(
            require('../assets/images/smart_greenhouse_diorama_transparent.png'),
            () => {
                renderer.render(scene, camera);
            }
        );
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // 6. GROUPE PRINCIPAL DU DIORAMA 3D
        const dioramaGroup = new THREE.Group();

        const planeGeo = new THREE.PlaneGeometry(6.6, 4.9);
        const planeMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide,
            alphaTest: 0.01,
        });
        const mainMesh = new THREE.Mesh(planeGeo, planeMat);
        mainMesh.position.set(0, 0.22, 0);
        dioramaGroup.add(mainMesh);

        // Ombre de contact 3D au sol
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 128;
        const sCtx = shadowCanvas.getContext('2d')!;
        const grad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 110);
        grad.addColorStop(0, 'rgba(23, 34, 27, 0.25)');
        grad.addColorStop(0.5, 'rgba(23, 34, 27, 0.10)');
        grad.addColorStop(0.85, 'rgba(23, 34, 27, 0.02)');
        grad.addColorStop(1, 'rgba(23, 34, 27, 0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 256, 128);

        const shadowTex = new THREE.CanvasTexture(shadowCanvas);
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(6.4, 2.2),
            new THREE.MeshBasicMaterial({
                map: shadowTex,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
            })
        );
        shadowPlane.position.set(0, -1.85, -0.2);
        dioramaGroup.add(shadowPlane);

        scene.add(dioramaGroup);

        // 7. CONTRÔLES D'INTERACTION 3D & PARALLAXE
        let targetRotX = 0;
        let targetRotY = 0;
        let currentRotX = 0;
        let currentRotY = 0;

        let isDragging = false;
        let prevMouseX = 0;
        let prevMouseY = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            prevMouseX = e.clientX;
            prevMouseY = e.clientY;
            container.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width - 0.5;
            const relY = (e.clientY - rect.top) / rect.height - 0.5;

            if (isDragging) {
                const deltaX = e.clientX - prevMouseX;
                const deltaY = e.clientY - prevMouseY;
                prevMouseX = e.clientX;
                prevMouseY = e.clientY;

                targetRotY += deltaX * 0.008;
                targetRotX += deltaY * 0.006;
                targetRotX = Math.max(-0.25, Math.min(0.25, targetRotX));
            } else {
                targetRotY = relX * 0.35;
                targetRotX = -relY * 0.22;
            }

            pointLight.position.x = relX * 8 + 3;
            pointLight.position.y = -relY * 6 + 4.5;
        };

        const onMouseUp = () => {
            isDragging = false;
            container.style.cursor = 'grab';
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                isDragging = true;
                prevMouseX = e.touches[0].clientX;
                prevMouseY = e.touches[0].clientY;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - prevMouseX;
                const deltaY = e.touches[0].clientY - prevMouseY;
                prevMouseX = e.touches[0].clientX;
                prevMouseY = e.touches[0].clientY;

                targetRotY += deltaX * 0.008;
                targetRotX += deltaY * 0.006;
                targetRotX = Math.max(-0.25, Math.min(0.25, targetRotX));
            }
        };

        const onTouchEnd = () => {
            isDragging = false;
        };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);

        // 8. BOUCLE D'ANIMATION (LÉVITATION FLUIDE)
        let animId: number;
        const startTime = performance.now();

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsedTime = (performance.now() - startTime) / 1000;

            currentRotX += (targetRotX - currentRotX) * 0.08;
            currentRotY += (targetRotY - currentRotY) * 0.08;

            const floatY = Math.sin(elapsedTime * 1.5) * 0.06;
            dioramaGroup.position.y = floatY;

            dioramaGroup.rotation.x = currentRotX + Math.sin(elapsedTime * 1.1) * 0.012;
            dioramaGroup.rotation.y = currentRotY + Math.cos(elapsedTime * 0.8) * 0.018;

            renderer.render(scene, camera);
        };
        animate();

        // 9. RESPONSIVE OBSERVER
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(animId);
            resizeObserver.disconnect();
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            renderer.dispose();
            texture.dispose();
            planeGeo.dispose();
            planeMat.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    if (Platform.OS !== 'web') {
        return <View style={styles.fallback} />;
    }

    return (
        <View style={styles.outerContainer}>
            {/* Immersive Viewport */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    touchAction: 'pan-y',
                }}
            />

            {/* Contextual Status Indicators Overlaid Directly on 3D Elements */}
            <View style={styles.hotspotsLayer} pointerEvents="box-none">
                {GREENHOUSE_DEVICES.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    const statusColor =
                        device.status === 'healthy'
                            ? Colors.secondary
                            : device.status === 'attention'
                            ? Colors.warning
                            : Colors.danger;

                    return (
                        <Pressable
                            key={device.id}
                            onPress={() => setSelectedDevice(isSelected ? null : device)}
                            style={[
                                styles.hotspotBtn,
                                {
                                    left: `${device.xPercent}%`,
                                    top: `${device.yPercent}%`,
                                    borderColor: isSelected ? Colors.primary : `${statusColor}50`,
                                    backgroundColor: isSelected ? Colors.surface : 'rgba(255, 255, 255, 0.92)',
                                },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Inspecter ${device.name}`}
                        >
                            <View style={[styles.statusPulseDot, { backgroundColor: statusColor }]} />
                            <Ionicons
                                name={device.icon}
                                size={13}
                                color={isSelected ? Colors.primary : Colors.textDark}
                            />
                            <Text style={styles.hotspotText}>
                                {device.name.split(' ')[0]}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Floating Glass Device Statistics Sheet (Shown upon Click) */}
            {selectedDevice && (
                <View style={styles.deviceCardOverlay} pointerEvents="box-none">
                    <View style={styles.deviceCard}>
                        <View style={styles.deviceHeader}>
                            <View style={styles.deviceTitleRow}>
                                <View style={styles.deviceIconBadge}>
                                    <Ionicons name={selectedDevice.icon} size={18} color={Colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.deviceName}>{selectedDevice.name}</Text>
                                    <Text style={styles.deviceCategory}>{selectedDevice.category}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setSelectedDevice(null)}
                                style={styles.closeBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Fermer"
                            >
                                <Ionicons name="close" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.deviceStatusRow}>
                            <StatusBadge status={selectedDevice.status} label={selectedDevice.statusLabel} />
                            <View style={styles.deviceModeBadge}>
                                <Text style={styles.deviceModeText}>Mode {selectedDevice.mode}</Text>
                            </View>
                        </View>

                        {/* Grid of Key Statistics */}
                        <View style={styles.metricsGrid}>
                            {selectedDevice.metrics.map((m, idx) => (
                                <View key={idx} style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>{m.label}</Text>
                                    <Text style={styles.metricValue}>{m.value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.deviceFooter}>
                            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.deviceFooterText}>
                                Dernière activation : {selectedDevice.lastActivation}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Bottom-right Floating Badge */}
            <View style={styles.fpsBadge}>
                <View style={styles.fpsDot} />
                <Text style={styles.fpsText}>IMMERSIVE TWIN · 60 FPS</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        width: '100%',
        minHeight: 440,
        height: 480,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    fallback: {
        width: '100%',
        height: 440,
        backgroundColor: Colors.background,
    },
    hotspotsLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
    },
    hotspotBtn: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        ...Shadows.diffuse,
        transform: [{ translateX: -40 }, { translateY: -15 }],
        ...Platform.select({
            web: {
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
            } as any,
            default: {},
        }),
    },
    statusPulseDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    hotspotText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    deviceCardOverlay: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        zIndex: 50,
        width: 320,
        maxWidth: '92%',
    },
    deviceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.float,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(16px)',
            } as any,
            default: {},
        }),
    },
    deviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    deviceTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    deviceIconBadge: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.sm,
        backgroundColor: `${Colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceName: {
        fontSize: 13.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    deviceCategory: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    closeBtn: {
        padding: 4,
    },
    deviceStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    deviceModeBadge: {
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    deviceModeText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: Colors.textDark,
        fontFamily: Typography.monoFont,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginVertical: Spacing.xs,
    },
    metricItem: {
        width: '48%',
        backgroundColor: Colors.background,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    metricLabel: {
        fontSize: 10,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    metricValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.monoFont,
        marginTop: 2,
    },
    deviceFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: Spacing.sm,
        paddingTop: Spacing.xs,
    },
    deviceFooterText: {
        fontSize: 10.5,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    fpsBadge: {
        position: 'absolute',
        bottom: 12,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.round,
        paddingVertical: 4,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        ...Shadows.subtle,
        ...Platform.select({
            web: { backdropFilter: 'blur(8px)' } as any,
            default: {},
        }),
    },
    fpsDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.secondary,
    },
    fpsText: {
        fontSize: 10,
        fontFamily: Typography.monoFont,
        color: Colors.primary,
        fontWeight: '600',
    },
});

export default Greenhouse3D;
