/**
 * Rôle : Lead Systems Architect & Principal UI/UX React Native Engineer
 * Fichier : components/OnboardingScreen.tsx
 * Système : CyberCortex ERP - Module d'Onboarding & Initialisation du Profil Scientifique
 */

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Dimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    FlatList,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    TUNISIAN_GOVERNORATES,
    Governorate,
    isValidGovernorate,
} from '../constants/governorates';
import { API_BASE_URL, UserProfile } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface OnboardingScreenProps {
    onSuccess?: (profile: UserProfile) => void;
}

export default function OnboardingScreen({ onSuccess }: OnboardingScreenProps) {
    const router = useRouter();
    const setAuthenticated = useAppStore((state) => state.setAuthenticated);

    // ============================================
    // 1. ÉTATS REACT (5 CHAMPS OBLIGATOIRES)
    // ============================================
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState<Governorate | ''>('');

    // États de contrôle UX
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal du Sélecteur de Gouvernorat
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ============================================
    // 2. VALIDATION STRICTE EN TEMPS RÉEL
    // ============================================
    const isFormValid = useMemo(() => {
        return Boolean(
            fullName.trim().length >= 2 &&
            email.trim().includes('@') &&
            email.trim().includes('.') &&
            role.trim().length >= 2 &&
            phone.trim().length >= 6 &&
            location &&
            isValidGovernorate(location)
        );
    }, [fullName, email, role, phone, location]);

    // Filtrage dynamique pour le Picker des 24 gouvernorats
    const filteredGovernorates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return TUNISIAN_GOVERNORATES;
        return TUNISIAN_GOVERNORATES.filter((gov) =>
            gov.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // ============================================
    // 3. TRANSACTION ATOMIQUE DE SOUMISSION
    // ============================================
    const handleRegistration = async () => {
        if (!isFormValid) {
            const missing = [];
            if (!fullName.trim()) missing.push('Nom complet');
            if (!email.trim() || !email.includes('@')) missing.push('Adresse Email valide');
            if (!role.trim()) missing.push('Rôle technique');
            if (!phone.trim()) missing.push('Numéro de Téléphone');
            if (!location) missing.push('Localisation (Gouvernorat)');

            const msg = `Veuillez renseigner tous les champs obligatoires :\n- ${missing.join('\n- ')}`;
            setErrorMessage(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Champs Incomplets', msg);
            }
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        const payload = {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            role: role.trim(),
            phone: phone.trim(),
            location: location as string,
            organization: 'CyberCortex ERP',
        };

        try {
            console.log('[ONBOARDING] Transmission de la transaction atomique :', payload);

            const response = await fetch(`${API_BASE_URL}/user/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            // Succès HTTP 200 ou 201
            if (response.status === 200 || response.status === 201) {
                console.log('[ONBOARDING] Enregistrement réussi avec statut HTTP', response.status);

                const createdProfile: UserProfile = data?.profile || payload;

                // 1. Enregistrement de l'état d'authentification dans le store
                if (setAuthenticated) {
                    setAuthenticated(true);
                }

                // 2. Déclenchement du callback parent si fourni
                if (onSuccess) {
                    onSuccess(createdProfile);
                }

                // 3. Navigation automatique vers le dashboard principal
                try {
                    router.replace('/(tabs)');
                } catch (navErr) {
                    console.log('[ONBOARDING] Navigation Router fallback :', navErr);
                }
            } else {
                throw new Error(data?.message || `Erreur serveur HTTP ${response.status}`);
            }
        } catch (error: any) {
            console.error('[ONBOARDING-ERROR] Échec de la transaction :', error);
            const err = error.message || 'Impossible d\'initialiser le profil scientifique.';
            setErrorMessage(err);
            if (Platform.OS !== 'web') {
                Alert.alert('Erreur d\'inscription', err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.screenOverlay}>
                {/* CARTE BLANCHE D'ONBOARDING */}
                <View style={[styles.card, { width: Math.min(SCREEN_W - 32, 460) }]}>
                    {/* EN-TÊTE FIXE DE LA CARTE */}
                    <View style={styles.headerArea}>
                        <View style={styles.badgeRow}>
                            <View style={styles.platformBadge}>
                                <Text style={styles.platformBadgeText}>CYBERCORTEX ERP</Text>
                            </View>
                            <View style={styles.statusIndicator}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>EDGE NODE ACTIVE</Text>
                            </View>
                        </View>

                        <Text style={styles.title}>Accès Espace Scientifique</Text>
                        <Text style={styles.subtitle}>
                            Initialisez votre profil pour accéder à la télémétrie de recherche et au pilotage de la serre.
                        </Text>
                    </View>

                    {/* BANNIÈRE D'ERREUR */}
                    {errorMessage && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorBannerText}>{errorMessage}</Text>
                        </View>
                    )}

                    {/* DÉFILEMENT VERTICAL INTERNE POUR ÉVITER TOUT DÉBORDEMENT MOBILE */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* 1. NOM COMPLET */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                                Nom complet <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Dr. Ahmed Ben Salem"
                                placeholderTextColor="#94a3b8"
                                value={fullName}
                                onChangeText={(text) => {
                                    setFullName(text);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* 2. ADRESSE EMAIL */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                                Adresse Email <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="a.bensalem@smartagri.tn"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* 3. RÔLE TECHNIQUE */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                                Rôle technique <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ingénieur Agronome / Resp. R&D"
                                placeholderTextColor="#94a3b8"
                                value={role}
                                onChangeText={(text) => {
                                    setRole(text);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                            />
                        </View>

                        {/* 4. NUMÉRO DE TÉLÉPHONE */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                                Téléphone <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="+216 98 000 000"
                                placeholderTextColor="#94a3b8"
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    if (errorMessage) setErrorMessage(null);
                                }}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* 5. LOCALISATION (24 GOUVERNORATS TUNISIENS) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                                Localisation territoriale <Text style={styles.requiredAsterisk}>*</Text>
                            </Text>
                            <Pressable
                                style={[
                                    styles.dropdownTrigger,
                                    Boolean(location) && styles.dropdownTriggerFilled,
                                ]}
                                onPress={() => setIsPickerVisible(true)}
                            >
                                <View style={styles.dropdownLeft}>
                                    <Text style={styles.locationIcon}>📍</Text>
                                    <Text
                                        style={[
                                            styles.dropdownValue,
                                            !location && styles.dropdownPlaceholder,
                                        ]}
                                    >
                                        {location ? `${location}, Tunisie` : 'Sélectionner parmi les 24 gouvernorats'}
                                    </Text>
                                </View>
                                <Text style={styles.dropdownChevron}>▼</Text>
                            </Pressable>
                        </View>
                    </ScrollView>

                    {/* BOUTON D'ACTION PRIMAIRE VERROUILLÉ */}
                    <View style={styles.footerArea}>
                        <Pressable
                            style={[
                                styles.submitButton,
                                (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
                            ]}
                            onPress={handleRegistration}
                            disabled={!isFormValid || isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Créer et se connecter</Text>
                            )}
                        </Pressable>

                        <Text style={styles.securityNote}>
                            🔒 Enregistrement sécurisé chiffré sur nœud Edge SQLite local
                        </Text>
                    </View>
                </View>
            </View>

            {/* ============================================
                MODAL DU SÉLECTEUR DE GOUVERNORAT
            ============================================ */}
            <Modal
                visible={isPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsPickerVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    {/* Arrière-plan cliquable pour fermer au clic extérieur sans interférer avec la recherche */}
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsPickerVisible(false)}
                    />

                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Gouvernorats de Tunisie (24)</Text>
                            <Pressable
                                onPress={() => setIsPickerVisible(false)}
                                hitSlop={12}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>

                        <TextInput
                            style={styles.modalSearchInput}
                            placeholder="Rechercher un gouvernorat..."
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={Platform.OS === 'web'}
                        />

                        <FlatList
                            data={filteredGovernorates}
                            keyExtractor={(item) => item}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const isSelected = item === location;
                                return (
                                    <Pressable
                                        style={[
                                            styles.pickerOption,
                                            isSelected && styles.pickerOptionSelected,
                                        ]}
                                        onPress={() => {
                                            setLocation(item);
                                            setIsPickerVisible(false);
                                            setSearchQuery('');
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerOptionText,
                                                isSelected && styles.pickerOptionTextSelected,
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                    </Pressable>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyListContainer}>
                                    <Text style={styles.emptyListText}>Aucun gouvernorat trouvé</Text>
                                </View>
                            }
                            style={styles.pickerList}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

// ============================================
// STYLES CONFORMES AU DESIGN SYSTEM CYBERCORTEX
// ============================================
const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
    },
    screenOverlay: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        maxHeight: Math.min(SCREEN_H - 32, 680),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
        ...Platform.select({
            web: {
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            },
            default: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 18,
                elevation: 6,
            },
        }),
    },
    headerArea: {
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    platformBadge: {
        backgroundColor: 'rgba(39, 174, 96, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    platformBadgeText: {
        color: '#27ae60',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#27ae60',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.4,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 6,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 12,
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
    },
    errorBannerText: {
        color: '#b91c1c',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    scrollArea: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingVertical: 4,
    },
    fieldGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 6,
    },
    requiredAsterisk: {
        color: '#ef4444',
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownTriggerFilled: {
        borderColor: '#cbd5e1',
    },
    dropdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    locationIcon: {
        fontSize: 14,
    },
    dropdownValue: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
    },
    dropdownPlaceholder: {
        color: '#94a3b8',
        fontWeight: '400',
    },
    dropdownChevron: {
        fontSize: 12,
        color: '#64748b',
    },
    footerArea: {
        marginTop: 14,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    submitButton: {
        backgroundColor: '#27ae60',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#94a3b8',
        opacity: 0.65,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    securityNote: {
        fontSize: 11,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 10,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: Math.min(SCREEN_W - 40, 380),
        maxHeight: 460,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748b',
        padding: 4,
    },
    modalSearchInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 10,
    },
    pickerList: {
        maxHeight: 300,
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    pickerOptionSelected: {
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
    },
    pickerOptionText: {
        fontSize: 14,
        color: '#1e293b',
    },
    pickerOptionTextSelected: {
        color: '#27ae60',
        fontWeight: '700',
    },
    checkmark: {
        color: '#27ae60',
        fontWeight: '800',
        fontSize: 14,
    },
    emptyListContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyListText: {
        color: '#94a3b8',
        fontSize: 13,
    },
});
