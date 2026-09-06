/**
 * Rôle : Lead UX/UI React Native Developer & IoT Systems Engineer
 * Fichier : components/ActionBar.tsx
 * Objectif : Barre d'actions statégiques (Jumeau Numérique & Simulateur de Scénario Personnalisé)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { API_BASE_URL } from '../services/api';

export default function ActionBar() {
    const [isSimulating, setIsSimulating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Champs de personnalisation du scénario (Multi-conditions)
    const [temp, setTemp] = useState('');
    const [humidity, setHumidity] = useState('');
    const [light, setLight] = useState('');
    const [water, setWater] = useState('');

    // ==========================================
    // Ouvrir le Jumeau Numérique
    // ==========================================
    const handleOpenTwin = () => {
        if (Platform.OS === 'web') window.alert("Chargement du modèle 3D de la serre. Synchronisation temps-réel en cours...");
        else Alert.alert("Rechargement Spatial", "Chargement du Jumeau Numérique 3D...");
    };

    // ==========================================
    // Exécution du Scénario Combiné
    // ==========================================
    const executeSimulation = async () => {
        setIsSimulating(true);
        if (Platform.OS !== 'web') Vibration.vibrate(50);

        try {
            // Construit un payload unique pour le backend contenant uniquement les champs valides
            const payload: Record<string, number> = {};
            if (temp.trim() !== '') payload.ambient_temperature = parseFloat(temp);
            if (humidity.trim() !== '') payload.air_humidity = parseFloat(humidity);
            if (light.trim() !== '') payload.photoperiod = parseFloat(light);
            if (water.trim() !== '') payload.water_consumption = parseFloat(water);

            if (Object.keys(payload).length === 0) {
                setIsSimulating(false);
                return;
            }

            // Exécution massive au Cyber-Brain via un seul appel API
            await fetch(`${API_BASE_URL}/telemetry/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            setModalVisible(false);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);

            if (Platform.OS === 'web') {
                window.alert(`🚨 Le Cyber-Brain analyse actuellement l'environnement injecté ! \n(Rendez-vous dans le Journal des Alertes)`);
            } else {
                Alert.alert("🚨 Scénario Multi-Facteurs Injecté", "Toutes les conditions ont été poussées au Cyber-Brain");
            }
        } catch (e) {
            console.error("[ActionBar] Échec de la simulation :", e);
            if (Platform.OS === 'web') window.alert("Erreur Réseau lors de la simulation.");
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleOpenTwin}>
                <Text style={styles.primaryButtonText}>Ouvrir le jumeau numérique →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, isSuccess && { borderColor: '#27ae60' }]} activeOpacity={0.6} onPress={() => setModalVisible(true)}>
                <Text style={[styles.secondaryButtonText, isSuccess && { color: '#27ae60' }]}>
                    {isSuccess ? "✔ Scénario Envoyé" : "Simuler un scénario"}
                </Text>
            </TouchableOpacity>

            <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🧪 Conception de Scénario</Text>
                        <Text style={styles.modalDesc}>Mélangez librement les paramètres pour tester la robustesse de l'IA (Laissez vide pour ignorer).</Text>

                        <View style={styles.gridForm}>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Température Serre (°C)</Text>
                                <TextInput style={styles.input} value={temp} onChangeText={setTemp} placeholder="Ex: 40" keyboardType="numeric" />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Humidité Relative (%)</Text>
                                <TextInput style={styles.input} value={humidity} onChangeText={setHumidity} placeholder="Ex: 15" keyboardType="numeric" />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Photopériode (h/j)</Text>
                                <TextInput style={styles.input} value={light} onChangeText={setLight} placeholder="Ex: 16" keyboardType="numeric" />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Consommation d'eau (L/j)</Text>
                                <TextInput style={styles.input} value={water} onChangeText={setWater} placeholder="Ex: 8.5" keyboardType="numeric" />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.submitBtn, isSimulating && styles.disabledButton]} onPress={executeSimulation} disabled={isSimulating}>
                                {isSimulating ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.submitBtnText}>Déclencher</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 15 },
    primaryButton: { flex: 1, backgroundColor: '#27ae60', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#27ae60', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6 },
    primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.3 },
    secondaryButton: { backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 30, borderWidth: 1.5, borderColor: '#bdc3c7', justifyContent: 'center', alignItems: 'center' },
    secondaryButtonText: { color: '#2c3e50', fontSize: 13, fontWeight: '600' },
    disabledButton: { opacity: 0.6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
    modalDesc: { fontSize: 14, color: '#7f8c8d', marginBottom: 20, lineHeight: 20 },

    gridForm: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    inputCol: { width: '48%' }, // Permet d'avoir 2 colonnes
    label: { fontSize: 11, fontWeight: '700', color: '#34495e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderWidth: 1.5, borderColor: '#ecf0f1', borderRadius: 10, padding: 12, fontSize: 15, color: '#2c3e50', backgroundColor: '#f9fbfb' },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 10 },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, backgroundColor: '#ecf0f1' },
    cancelBtnText: { color: '#7f8c8d', fontWeight: 'bold' },
    submitBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, backgroundColor: '#e74c3c' },
    submitBtnText: { color: '#ffffff', fontWeight: 'bold' }
});
