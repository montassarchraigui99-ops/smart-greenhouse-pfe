/**
 * Rôle : Lead UX/UI React Native Developer
 * Fichier : components/CyberControlPanel.tsx
 * Objectif : Panneau de contrôle interactif avec Feedback Haptique et API Réelle.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../services/api';

// Props pour accepter des données d'un parent (ex: AnalyticsView)
interface CyberControlPanelProps {
    isSystemAutonomous?: boolean;
}

export default function CyberControlPanel({ isSystemAutonomous = true }: CyberControlPanelProps) {
    // Mission 1 : État de chargement pendant l'appel API
    const [isWatering, setIsWatering] = useState<boolean>(false);

    // Couleurs dynamiques selon l'état de l'autonomie du système
    const statusColor = isSystemAutonomous ? '#00e676' : '#ff9100';
    const statusIcon = isSystemAutonomous ? 'robot-industrial' : 'robot-dead';
    const statusLabel = isSystemAutonomous ? '⚡ 100% Autonome' : '⚠️ Intervention Requise';

    // Mission 3 : Fonction déclenchée au clic (Haptique + API Call)
    const handleManualOverride = async () => {
        // Évite l'envoi de requêtes multiples si on spam clique
        if (isWatering) return;

        // 1. Retour Haptique immédiat pour acquitter l'action Humaine
        Vibration.vibrate(50);
        setIsWatering(true);

        try {
            // 2. Envoi JSON strict au serveur backend via Fetch 
            const response = await fetch(`${API_BASE_URL}/actuators/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    actuator_key: 'water_pump',
                    action: 'ON'
                })
            });

            if (!response.ok) {
                throw new Error(`Échec serveur : statuts ${response.status}`);
            }

        } catch (error) {
            console.error("[CyberControl] Erreur réseau lors du forçage de l'irrigation :", error);
            // Fallback haptique en cas d'erreur serveur
            Vibration.vibrate([0, 100, 100, 100]);
        } finally {
            setIsWatering(false);
            // 4. Pattern de confirmation haptique joyeux (succès)
            Vibration.vibrate([0, 30, 50, 30]);
        }
    };

    return (
        <View style={styles.container}>

            {/* ==========================================
          MISSION 2 : EN-TÊTE ET INTELLIGENCE LOCALE
          ========================================== */}
            <View style={styles.headerRow}>
                <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name={statusIcon} size={42} color={statusColor} />
                    {/* Lueur d'arrière plan derrière l'avatar */}
                    <View style={[styles.avatarGlow, { backgroundColor: statusColor }]} />
                </View>
                <View style={styles.healthStats}>
                    <Text style={styles.healthTitle}>Intelligence Locale</Text>
                    <View style={[styles.badgeContainer, { borderColor: statusColor }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                            {statusLabel}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ==========================================
          MISSION 3 : BOUTON SMART OVERRIDE
          ========================================== */}
            <View style={styles.actionSection}>
                <TouchableOpacity
                    style={[styles.overrideBtn, isWatering && styles.overrideBtnDisabled]}
                    activeOpacity={0.7}
                    onPress={handleManualOverride}
                    disabled={isWatering} // Bloque le bouton tant que la requête API court
                >
                    {isWatering ? (
                        <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                    ) : (
                        <MaterialCommunityIcons name="water-pump" size={24} color="#ffffff" style={{ marginRight: 8 }} />
                    )}
                    <Text style={styles.overrideBtnText}>
                        {isWatering ? 'Hydratation en cours...' : 'Forcer l\'Hydratation'}
                    </Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

// ==========================================
// STYLES & UI MODERNE (Ombres, Bordures...)
// ==========================================
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff', // Conteneur clair et épuré
        borderRadius: 20,
        padding: 20,
        marginVertical: 15,
        // Ombres iOS + Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },

    // Section Intelligence Locale (Avatar)
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 60, height: 60,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarGlow: {
        position: 'absolute',
        width: 45, height: 45,
        borderRadius: 25,
        opacity: 0.15,
        transform: [{ scale: 1.2 }],
    },
    healthStats: { marginLeft: 15, flex: 1 },
    healthTitle: {
        color: '#34495e',
        fontSize: 15,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6
    },

    // Badges Dynamiques
    badgeContainer: {
        borderWidth: 1.5,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#f8f9fa' // fond léger contrastant le texte
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold'
    },

    // Section Bouton Central
    actionSection: { alignItems: 'center', marginTop: 5 },
    overrideBtn: {
        flexDirection: 'row',
        backgroundColor: '#1e90ff', // Bleu Néo-Hydratation
        width: '100%',
        paddingVertical: 16,
        borderRadius: 30, // Forme Pilule (Pill)
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1e90ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    overrideBtnDisabled: {
        backgroundColor: '#a4b0be', // Désactivé (grisé)
        shadowOpacity: 0,
        elevation: 0,
    },
    overrideBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
