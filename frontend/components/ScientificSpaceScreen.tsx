/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : components/ScientificSpaceScreen.tsx
 * Système : CyberCortex ERP (Espace Scientifique & Profil Utilisateur)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Dimensions,
    Pressable,
    TextInput,
    ActivityIndicator,
    Modal,
    FlatList,
} from 'react-native';
import { fetchUserProfile, updateUserProfile, UserProfile, API_BASE_URL } from '../services/api';
import { ProfileSettingsView } from './ProfileSettingsView';
import { useTranslation } from '../i18n';
import {
    TUNISIAN_GOVERNORATES,
    Governorate,
    isValidGovernorate,
    DEFAULT_GOVERNORATE,
} from '../constants/governorates';

import { Colors, BorderRadius } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

// ============================================
// DESIGN TOKENS - Living Intelligence
// ============================================
const TOKENS = {
    bg: Colors.background,
    panel: Colors.surface,
    panelElevated: '#EFF3EF',
    surface: Colors.surface,
    surfaceLighter: '#EFF3EF',
    border: Colors.border,
    borderFocus: Colors.primary,
    text: Colors.textDark,
    textMuted: Colors.textMuted,
    textSubtle: '#8C9A91',
    primary: Colors.primary,
    primaryDeep: '#165832',
    primaryLight: 'rgba(31, 122, 70, 0.08)',
    danger: Colors.danger,
    dangerLight: 'rgba(217, 92, 92, 0.08)',
    info: Colors.info,
    infoLight: 'rgba(77, 134, 199, 0.08)',
    accent: Colors.warning,
    radiusLg: BorderRadius.lg,
    radiusMd: BorderRadius.md,
    radiusSm: BorderRadius.sm,
};

const SETTINGS_MENU = [
    { id: 'org', title: 'Paramètres du compte & organisation', desc: 'Gestion de la station, des chercheurs et des accès IAM.' },
    { id: 'notif', title: 'Canaux d\'alertes SMS & Push', desc: 'Configuration des seuils critiques et destinataires d\'astreinte.' },
    { id: 'secu', title: 'Sécurité mTLS & Tokens MQTT', desc: 'Certificats des nœuds ESP32 et clés de passerelle Edge.' },
    { id: 'data', title: 'Exportation des Séries Temporelles', desc: 'Téléchargements des données brutes en formats CSV et Parquet.' },
    { id: 'support', title: 'Documentation & Support CyberCortex', desc: 'Référentiel d\'architecture et journal des versions.' },
];

export interface ScientificSpaceScreenProps {
    onLogout?: () => void;
}

export default function ScientificSpaceScreen({ onLogout }: ScientificSpaceScreenProps) {
    const { t, isRTL } = useTranslation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState({ connected_greenhouses: 1, active_sensors: 7, relays: 4 });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // États locaux du profil (Hydratation persistante)
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [role, setRole] = useState('');
    const [organization, setOrganization] = useState('');

    // Formulaire d'édition
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<UserProfile>>({});

    // Modal Sélecteur Gouvernorat
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Feedback utilisateur (Toast / Bannière)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Passerelle E-mail SMTP (Cyber-Brain Dispatcher)
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [emailTestResult, setEmailTestResult] = useState<{ type: 'success' | 'error'; message: string; previewUrl?: string } | null>(null);

    const handleTestEmail = async () => {
        setIsTestingEmail(true);
        setEmailTestResult(null);
        try {
            const targetEmail = profile?.email || email || 'montassarchraigui99@gmail.com';
            const response = await fetch(`${API_BASE_URL}/notifications/test-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail }),
            });
            const data = await response.json();
            if (response.ok && data.status === 'success') {
                setEmailTestResult({
                    type: 'success',
                    message: `✅ Alerte e-mail de test expédiée avec succès à ${targetEmail} !`,
                    previewUrl: data.details?.previewUrl,
                });
            } else {
                setEmailTestResult({
                    type: 'error',
                    message: `❌ ${data.message || 'Échec du test de notification SMTP'}`,
                });
            }
        } catch (err: any) {
            setEmailTestResult({
                type: 'error',
                message: `❌ Erreur réseau lors du test SMTP : ${err.message}`,
            });
        } finally {
            setIsTestingEmail(false);
        }
    };

    // ============================================
    // 1. Hydratation du Profil au Montage (GET /api/user/profile)
    // ============================================
    const loadProfileData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/user/profile`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const profileData: UserProfile = data.profile || data;
            if (profileData) {
                setProfile(profileData);
                setFullName(profileData.full_name || '');
                setEmail(profileData.email || '');
                setPhone(profileData.phone || '');
                setLocation(profileData.location || '');
                setRole(profileData.role || '');
                setOrganization(profileData.organization || '');
                setForm(profileData);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.error('[ScientificSpace] Erreur au chargement du profil :', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, []);

    // ============================================
    // 2. Persistance Atomique Sécurisée (handleSaveProfile)
    // ============================================
    const handleSaveProfile = async () => {
        setIsSaving(true);
        setFeedback(null);

        try {
            // Validation et normalisation du gouvernorat tunisien
            const locationValue = (form.location && isValidGovernorate(form.location))
                ? form.location
                : (location && isValidGovernorate(location)
                    ? location
                    : ((profile?.location && isValidGovernorate(profile.location)) ? profile.location : DEFAULT_GOVERNORATE));

            const payload = {
                full_name: (form.full_name !== undefined ? form.full_name : fullName)?.trim() || 'Chercheur',
                role: (form.role !== undefined ? form.role : role)?.trim() || 'Agronome',
                email: (form.email !== undefined ? form.email : email)?.trim() || 'user@smartagri.co',
                phone: (form.phone !== undefined ? form.phone : phone)?.trim() || '',
                organization: (form.organization !== undefined ? form.organization : organization)?.trim() || 'CyberCortex ERP',
                location: locationValue,
            };

            const response = await fetch(`${API_BASE_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // Le message de confirmation (Toast/Alert) ne s'affiche QUE si HTTP 200 OK
            if (response.status === 200) {
                const result = await response.json();
                const updated: UserProfile = (result && result.profile) ? result.profile : payload;

                setProfile(updated);
                setFullName(updated.full_name || '');
                setEmail(updated.email || '');
                setPhone(updated.phone || '');
                setLocation(updated.location || '');
                setRole(updated.role || '');
                setOrganization(updated.organization || '');
                setForm(updated);

                setIsEditing(false);
                setFeedback({
                    type: 'success',
                    message: 'Profil scientifique mis à jour et persisté avec succès dans SQLite Edge.',
                });
            } else {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Erreur serveur HTTP ${response.status}`);
            }
        } catch (error: any) {
            console.error('[ScientificSpace] Erreur lors de la sauvegarde :', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Impossible d\'enregistrer les modifications.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (profile) {
            setFullName(profile.full_name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setLocation(profile.location || '');
            setRole(profile.role || '');
            setOrganization(profile.organization || '');
            setForm(profile);
        }
        setIsEditing(false);
        setFeedback(null);
    };

    // ============================================
    // 3. Filtrage Dynamique des Gouvernorats
    // ============================================
    const filteredGovernorates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return TUNISIAN_GOVERNORATES;
        return TUNISIAN_GOVERNORATES.filter((gov) =>
            gov.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleSelectGovernorate = (gov: Governorate) => {
        setLocation(gov);
        setForm((prev) => ({ ...prev, location: gov }));
        setIsPickerVisible(false);
        setSearchQuery('');
    };

    // Initiales utilisateur
    const userInitials = useMemo(() => {
        const name = profile?.full_name || 'Scientifique';
        return name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }, [profile?.full_name]);

    if (loading && !profile) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={TOKENS.primary} />
                <Text style={styles.loadingLabel}>Initialisation de l'Espace Scientifique...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollStage} showsVerticalScrollIndicator={false}>

                {/* --- HEADER PRINCIPAL --- */}
                <View style={styles.headerArea}>
                    <View style={styles.headerTagRow}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.headerTagText}>NŒUD EDGE CONNECTÉ • TUNISIE</Text>
                    </View>
                    <Text style={styles.h1}>{t('scientific_space_title', 'Espace Scientifique')}</Text>
                    <Text style={styles.subtext}>
                        {t('scientific_space_subtitle', 'Identité de recherche, habilitation agronomique & référentiel territorial.')}
                    </Text>
                </View>

                {/* --- BANNIÈRE FEEDBACK (SUCCÈS / ERREUR) --- */}
                {feedback && (
                    <View
                        style={[
                            styles.feedbackBanner,
                            feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                        ]}
                    >
                        <Text style={styles.feedbackIcon}>
                            {feedback.type === 'success' ? '✓' : '⚠️'}
                        </Text>
                        <Text
                            style={[
                                styles.feedbackText,
                                feedback.type === 'success' ? styles.feedbackTextSuccess : styles.feedbackTextError,
                            ]}
                        >
                            {feedback.message}
                        </Text>
                        <Pressable onPress={() => setFeedback(null)} hitSlop={8}>
                            <Text style={styles.feedbackClose}>✕</Text>
                        </Pressable>
                    </View>
                )}

                {/* --- CARTE DU PROFIL SCIENTIFIQUE --- */}
                <View style={styles.profileCard}>
                    {!isEditing ? (
                        /* ===================== MODE VUE ===================== */
                        <>
                            <View style={styles.profileViewHeader}>
                                <View style={styles.avatarWrap}>
                                    <Text style={styles.avatarText}>{userInitials}</Text>
                                    <View style={styles.onlineStatusBadge} />
                                </View>

                                <View style={styles.profileDetails}>
                                    <View style={styles.nameRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userName}>{profile?.full_name}</Text>
                                            <Text style={styles.userRoleText}>
                                                {profile?.role} • <Text style={styles.orgText}>{profile?.organization}</Text>
                                            </Text>
                                        </View>
                                        <Pressable
                                            style={styles.editButton}
                                            onPress={() => {
                                                setForm({
                                                    full_name: fullName || profile?.full_name || '',
                                                    email: email || profile?.email || '',
                                                    phone: phone || profile?.phone || '',
                                                    location: location || profile?.location || '',
                                                    role: role || profile?.role || '',
                                                    organization: organization || profile?.organization || '',
                                                });
                                                setIsEditing(true);
                                                setFeedback(null);
                                            }}
                                        >
                                            <Text style={styles.editButtonText}>{t('edit_profile', 'Modifier')}</Text>
                                        </Pressable>
                                    </View>

                                    <View style={styles.metadataPillsRow}>
                                        <View style={styles.metaPill}>
                                            <Text style={styles.metaPillIcon}>✉</Text>
                                            <Text style={styles.metaPillText}>{profile?.email || email}</Text>
                                        </View>
                                        {Boolean(profile?.phone || phone) && (
                                            <View style={styles.metaPill}>
                                                <Text style={styles.metaPillIcon}>📞</Text>
                                                <Text style={styles.metaPillText}>{profile?.phone || phone}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.metaPill, styles.locationPill]}>
                                            <Text style={styles.metaPillIcon}>📍</Text>
                                            <Text style={styles.locationPillText}>
                                                {profile?.location || location ? `${profile?.location || location} (Tunisie)` : 'Non assigné'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* STATISTIQUES EMBARQUÉES */}
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.connected_greenhouses}</Text>
                                    <Text style={styles.statLabel}>{t('active_greenhouses', 'Serres Actives')}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.active_sensors}</Text>
                                    <Text style={styles.statLabel}>{t('telemetry_sensors', 'Capteurs Télémétrie')}</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.relays}</Text>
                                    <Text style={styles.statLabel}>{t('actuator_relays', 'Relais Actionneurs')}</Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        /* ===================== MODE FORMULAIRE ===================== */
                        <View style={styles.formContainer}>
                            <View style={styles.formTitleRow}>
                                <Text style={styles.formTitle}>Édition du Profil Chercheur</Text>
                                <Text style={styles.formSubtitle}>
                                    Tous les champs modifiés sont synchronisés de manière atomique.
                                </Text>
                            </View>

                            <View style={styles.inputsGrid}>
                                {/* Nom Complet */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        Nom complet <Text style={styles.requiredMark}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.full_name !== undefined ? form.full_name : fullName}
                                        placeholder="Ex: Dr. Ahmed Ben Salem"
                                        placeholderTextColor={TOKENS.textSubtle}
                                        onChangeText={(text) => {
                                            setFullName(text);
                                            setForm((prev) => ({ ...prev, full_name: text }));
                                        }}
                                    />
                                </View>

                                {/* Rôle Professionnel */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        Rôle technique / Titre <Text style={styles.requiredMark}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.role !== undefined ? form.role : role}
                                        placeholder="Ex: Ingénieur Agronome / Resp. R&D"
                                        placeholderTextColor={TOKENS.textSubtle}
                                        onChangeText={(text) => {
                                            setRole(text);
                                            setForm((prev) => ({ ...prev, role: text }));
                                        }}
                                    />
                                </View>

                                {/* Organisation */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Organisation / Laboratoire</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.organization !== undefined ? form.organization : organization}
                                        placeholder="Ex: CyberCortex ERP - Ferme Expérimentale"
                                        placeholderTextColor={TOKENS.textSubtle}
                                        onChangeText={(text) => {
                                            setOrganization(text);
                                            setForm((prev) => ({ ...prev, organization: text }));
                                        }}
                                    />
                                </View>

                                {/* Adresse Email */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        Adresse Email <Text style={styles.requiredMark}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.email !== undefined ? form.email : email}
                                        placeholder="chercheur@smartagri.tn"
                                        placeholderTextColor={TOKENS.textSubtle}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            setForm((prev) => ({ ...prev, email: text }));
                                        }}
                                    />
                                </View>

                                {/* Numéro de Téléphone */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Numéro de Téléphone</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.phone !== undefined ? form.phone : phone}
                                        placeholder="+216 98 000 000"
                                        placeholderTextColor={TOKENS.textSubtle}
                                        keyboardType="phone-pad"
                                        onChangeText={(text) => {
                                            setPhone(text);
                                            setForm((prev) => ({ ...prev, phone: text }));
                                        }}
                                    />
                                </View>

                                {/* SÉLECTEUR GOUVERNORAT TUNISIEN (24 GOUVERNORATS) */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        Localisation territoriale <Text style={styles.requiredMark}>*</Text>
                                    </Text>
                                    <Pressable
                                        style={styles.governorateTrigger}
                                        onPress={() => setIsPickerVisible(true)}
                                    >
                                        <View style={styles.triggerContent}>
                                            <Text style={styles.triggerFlag}>📍</Text>
                                            <Text
                                                style={[
                                                    styles.triggerValueText,
                                                    !(form.location || location) && styles.triggerPlaceholder,
                                                ]}
                                            >
                                                {form.location || location
                                                    ? `${form.location || location}, Tunisie`
                                                    : 'Sélectionner parmi les 24 gouvernorats'}
                                            </Text>
                                        </View>
                                        <Text style={styles.triggerChevron}>▼</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* BOUTONS D'ACTION */}
                            <View style={styles.formActionsRow}>
                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.cancelButtonText}>Annuler</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                                    onPress={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Enregistrer le profil</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>

                {/* --- MODULE PASSERELLE E-MAIL SMTP (CYBER-BRAIN) --- */}
                <View style={styles.smtpCard}>
                    <View style={styles.smtpHeaderRow}>
                        <View style={styles.smtpIconBadge}>
                            <Text style={styles.smtpIconText}>📬</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.smtpTitle}>Passerelle d'Alertes E-mail (SMTP)</Text>
                            <Text style={styles.smtpSubtitle}>Moteur Cyber-Brain • Notifications temps-réel des urgences</Text>
                        </View>
                        <View style={styles.smtpStatusBadge}>
                            <View style={styles.smtpStatusDot} />
                            <Text style={styles.smtpStatusText}>DISPATCHER ACTIF</Text>
                        </View>
                    </View>

                    <Text style={styles.smtpDescription}>
                        En cas de stress thermique (canicule/gel), de sécheresse racinaire ou de déficit d'humidité, un rapport agronomique détaillé au format HTML industriel est expédié instantanément à l'adresse d'astreinte :
                    </Text>

                    <View style={styles.smtpRecipientRow}>
                        <Text style={styles.smtpRecipientLabel}>Destinataire d'astreinte :</Text>
                        <View style={styles.smtpRecipientPill}>
                            <Text style={styles.smtpRecipientIcon}>✉</Text>
                            <Text style={styles.smtpRecipientText}>{profile?.email || email || 'Non configuré'}</Text>
                        </View>
                    </View>

                    {emailTestResult && (
                        <View style={[
                            styles.smtpFeedbackBox,
                            emailTestResult.type === 'success' ? styles.smtpFeedbackSuccess : styles.smtpFeedbackError
                        ]}>
                            <Text style={[
                                styles.smtpFeedbackText,
                                emailTestResult.type === 'success' ? styles.smtpFeedbackTextSuccess : styles.smtpFeedbackTextError
                            ]}>
                                {emailTestResult.message}
                            </Text>
                            {Boolean(emailTestResult.previewUrl) && (
                                <Pressable 
                                    onPress={() => {
                                        if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                            window.open(emailTestResult.previewUrl, '_blank');
                                        }
                                    }}
                                    style={styles.smtpPreviewLink}
                                >
                                    <Text style={styles.smtpPreviewLinkText}>🔗 Prévisualiser l'e-mail Ethereal ➔</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    <Pressable
                        style={[styles.smtpTestButton, isTestingEmail && styles.smtpTestButtonDisabled]}
                        onPress={handleTestEmail}
                        disabled={isTestingEmail}
                    >
                        {isTestingEmail ? (
                            <View style={styles.smtpButtonLoadingRow}>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text style={styles.smtpTestButtonText}>Test SMTP en cours...</Text>
                            </View>
                        ) : (
                            <Text style={styles.smtpTestButtonText}>🚀 Tester l'envoi d'alerte e-mail</Text>
                        )}
                    </Pressable>
                </View>

                {/* --- MODULE PARAMÈTRES & INFRASTRUCTURE --- */}
                <ProfileSettingsView
                    onLogout={onLogout}
                    userEmail={profile?.email || email}
                    organization={profile?.organization || organization}
                />

            </ScrollView>

            {/* ======================================================== */}
            {/* MODAL DU RÉFÉRENTIEL DES 24 GOUVERNORATS TUNISIENS        */}
            {/* ======================================================== */}
            <Modal
                visible={isPickerVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsPickerVisible(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Gouvernorats de Tunisie</Text>
                                <Text style={styles.modalSubtitle}>
                                    Référentiel territorial exhaustif (24 gouvernorats)
                                </Text>
                            </View>
                            <Pressable
                                style={styles.modalCloseBtn}
                                onPress={() => setIsPickerVisible(false)}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Champ de recherche rapide */}
                        <View style={styles.searchBar}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Rechercher un gouvernorat..."
                                placeholderTextColor={TOKENS.textSubtle}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={Platform.OS === 'web'}
                            />
                            {Boolean(searchQuery) && (
                                <Pressable onPress={() => setSearchQuery('')}>
                                    <Text style={styles.searchClear}>✕</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Liste des 24 gouvernorats */}
                        <FlatList
                            data={filteredGovernorates}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={true}
                            style={styles.governoratesList}
                            renderItem={({ item }) => {
                                const isSelected = form.location === item;
                                return (
                                    <Pressable
                                        style={[
                                            styles.govItem,
                                            isSelected && styles.govItemSelected,
                                        ]}
                                        onPress={() => handleSelectGovernorate(item)}
                                    >
                                        <View style={styles.govItemLeft}>
                                            <Text style={styles.govItemIcon}>📍</Text>
                                            <Text
                                                style={[
                                                    styles.govItemText,
                                                    isSelected && styles.govItemTextSelected,
                                                ]}
                                            >
                                                {item}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Text style={styles.govItemCheckmark}>✓</Text>
                                        )}
                                    </Pressable>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptySearch}>
                                    <Text style={styles.emptySearchText}>
                                        Aucun gouvernorat ne correspond à votre recherche.
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============================================
// STYLES STUCTURÉS
// ============================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TOKENS.bg,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: TOKENS.bg,
        gap: 12,
    },
    loadingLabel: {
        fontSize: 14,
        color: TOKENS.textMuted,
        fontWeight: '500',
    },
    scrollStage: {
        paddingTop: Platform.OS === 'web' ? 40 : 50,
        paddingHorizontal: Math.max(SCREEN_W * 0.05, 20),
        paddingBottom: 140,
    },

    // Header Area
    headerArea: {
        marginBottom: 24,
    },
    headerTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: TOKENS.primary,
    },
    headerTagText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: TOKENS.primaryDeep,
        textTransform: 'uppercase',
    },
    h1: {
        fontSize: 26,
        fontWeight: '800',
        color: TOKENS.text,
        letterSpacing: -0.4,
    },
    subtext: {
        fontSize: 14,
        color: TOKENS.textMuted,
        marginTop: 4,
        lineHeight: 20,
    },

    // Feedback Banner
    feedbackBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: TOKENS.radiusMd,
        marginBottom: 20,
        gap: 10,
    },
    feedbackSuccess: {
        backgroundColor: TOKENS.primaryLight,
        borderWidth: 1,
        borderColor: TOKENS.primary,
    },
    feedbackError: {
        backgroundColor: TOKENS.dangerLight,
        borderWidth: 1,
        borderColor: TOKENS.danger,
    },
    feedbackIcon: {
        fontSize: 16,
    },
    feedbackText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    feedbackTextSuccess: {
        color: TOKENS.primaryDeep,
    },
    feedbackTextError: {
        color: TOKENS.danger,
    },
    feedbackClose: {
        fontSize: 14,
        color: TOKENS.textMuted,
        fontWeight: '700',
    },

    // Profile Card
    profileCard: {
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.radiusLg,
        padding: 24,
        borderWidth: 1,
        borderColor: TOKENS.border,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
        marginBottom: 28,
    },
    profileViewHeader: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
        gap: 20,
    },
    avatarWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: TOKENS.panelElevated,
        borderWidth: 2,
        borderColor: TOKENS.border,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '800',
        color: TOKENS.primaryDeep,
    },
    onlineStatusBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: TOKENS.primary,
        borderWidth: 2,
        borderColor: TOKENS.panel,
    },
    profileDetails: {
        flex: 1,
        width: '100%',
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        color: TOKENS.text,
        letterSpacing: -0.2,
    },
    userRoleText: {
        fontSize: 14,
        color: TOKENS.textMuted,
        marginTop: 2,
    },
    orgText: {
        fontWeight: '600',
        color: TOKENS.text,
    },
    editButton: {
        backgroundColor: TOKENS.panelElevated,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: TOKENS.radiusMd,
        borderWidth: 1,
        borderColor: TOKENS.border,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: TOKENS.text,
    },
    metadataPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TOKENS.panelElevated,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: TOKENS.radiusSm,
        gap: 6,
    },
    metaPillIcon: {
        fontSize: 12,
    },
    metaPillText: {
        fontSize: 12,
        color: TOKENS.textMuted,
        fontWeight: '500',
    },
    locationPill: {
        backgroundColor: 'rgba(39, 174, 96, 0.08)',
    },
    locationPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: TOKENS.primaryDeep,
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderColor: TOKENS.border,
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: TOKENS.text,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: TOKENS.textMuted,
        marginTop: 3,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: TOKENS.border,
        alignSelf: 'center',
    },

    // Form Edit Mode
    formContainer: {
        width: '100%',
    },
    formTitleRow: {
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: TOKENS.text,
    },
    formSubtitle: {
        fontSize: 12,
        color: TOKENS.textMuted,
        marginTop: 2,
    },
    inputsGrid: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: TOKENS.text,
    },
    requiredMark: {
        color: TOKENS.danger,
    },
    input: {
        backgroundColor: TOKENS.panelElevated,
        borderWidth: 1,
        borderColor: TOKENS.border,
        borderRadius: TOKENS.radiusMd,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: TOKENS.text,
    },
    governorateTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: TOKENS.panelElevated,
        borderWidth: 1,
        borderColor: TOKENS.border,
        borderRadius: TOKENS.radiusMd,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    triggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    triggerFlag: {
        fontSize: 14,
    },
    triggerValueText: {
        fontSize: 14,
        fontWeight: '600',
        color: TOKENS.text,
    },
    triggerPlaceholder: {
        color: TOKENS.textSubtle,
        fontWeight: '400',
    },
    triggerChevron: {
        fontSize: 11,
        color: TOKENS.textMuted,
    },
    formActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: TOKENS.radiusMd,
        backgroundColor: TOKENS.panelElevated,
        borderWidth: 1,
        borderColor: TOKENS.border,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: TOKENS.textMuted,
    },
    saveButton: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: TOKENS.radiusMd,
        backgroundColor: TOKENS.primary,
        minWidth: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
    buttonDisabled: {
        opacity: 0.6,
    },

    // Settings Section
    settingsContainer: {
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.radiusLg,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: TOKENS.border,
        marginBottom: 24,
    },
    settingsSectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: TOKENS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: TOKENS.border,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: TOKENS.border,
    },
    settingTextContainer: {
        flex: 1,
        paddingRight: 12,
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: TOKENS.text,
    },
    settingDesc: {
        fontSize: 12,
        color: TOKENS.textMuted,
        marginTop: 2,
    },
    settingArrow: {
        fontSize: 20,
        color: TOKENS.textSubtle,
    },

    // Logout
    logoutButton: {
        paddingVertical: 14,
        borderRadius: TOKENS.radiusMd,
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        alignItems: 'center',
    },
    logoutButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: TOKENS.danger,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: Math.min(SCREEN_W - 40, 480),
        maxHeight: '80%',
        backgroundColor: TOKENS.panel,
        borderRadius: TOKENS.radiusLg,
        padding: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: TOKENS.text,
    },
    modalSubtitle: {
        fontSize: 12,
        color: TOKENS.textMuted,
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: TOKENS.textMuted,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TOKENS.panelElevated,
        borderWidth: 1,
        borderColor: TOKENS.border,
        borderRadius: TOKENS.radiusMd,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 14,
        gap: 8,
    },
    searchIcon: {
        fontSize: 14,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: TOKENS.text,
        padding: 0,
    },
    searchClear: {
        fontSize: 12,
        color: TOKENS.textMuted,
        fontWeight: '700',
    },
    governoratesList: {
        maxHeight: 340,
    },
    govItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: TOKENS.radiusMd,
        marginBottom: 4,
    },
    govItemSelected: {
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
    },
    govItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    govItemIcon: {
        fontSize: 13,
    },
    govItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: TOKENS.text,
    },
    govItemTextSelected: {
        color: TOKENS.primaryDeep,
        fontWeight: '700',
    },
    govItemCheckmark: {
        fontSize: 15,
        fontWeight: '800',
        color: TOKENS.primaryDeep,
    },
    emptySearch: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptySearchText: {
        fontSize: 13,
        color: TOKENS.textMuted,
        textAlign: 'center',
    },
    // STYLES PASSERELLE SMTP
    smtpCard: {
        backgroundColor: TOKENS.surface,
        borderRadius: TOKENS.radiusLg,
        borderWidth: 1,
        borderColor: 'rgba(39, 174, 96, 0.25)',
        padding: 20,
        marginBottom: 20,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            },
            default: {
                elevation: 3,
            },
        }),
    },
    smtpHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    smtpIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(39, 174, 96, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(39, 174, 96, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smtpIconText: {
        fontSize: 20,
    },
    smtpTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TOKENS.text,
    },
    smtpSubtitle: {
        fontSize: 12,
        color: TOKENS.textMuted,
        marginTop: 2,
    },
    smtpStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(39, 174, 96, 0.12)',
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(39, 174, 96, 0.3)',
    },
    smtpStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: TOKENS.primaryDeep,
    },
    smtpStatusText: {
        fontSize: 10,
        fontWeight: '800',
        color: TOKENS.primaryDeep,
        letterSpacing: 0.5,
    },
    smtpDescription: {
        fontSize: 13,
        color: TOKENS.textSubtle,
        lineHeight: 19,
        marginBottom: 14,
    },
    smtpRecipientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    smtpRecipientLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: TOKENS.textMuted,
    },
    smtpRecipientPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: TOKENS.surfaceLighter,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: TOKENS.border,
    },
    smtpRecipientIcon: {
        fontSize: 12,
        color: TOKENS.primary,
    },
    smtpRecipientText: {
        fontSize: 13,
        fontWeight: '700',
        color: TOKENS.text,
    },
    smtpFeedbackBox: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
    },
    smtpFeedbackSuccess: {
        backgroundColor: 'rgba(39, 174, 96, 0.12)',
        borderColor: 'rgba(39, 174, 96, 0.35)',
    },
    smtpFeedbackError: {
        backgroundColor: 'rgba(231, 76, 60, 0.12)',
        borderColor: 'rgba(231, 76, 60, 0.35)',
    },
    smtpFeedbackText: {
        fontSize: 13,
        lineHeight: 18,
    },
    smtpFeedbackTextSuccess: {
        color: '#27ae60',
        fontWeight: '600',
    },
    smtpFeedbackTextError: {
        color: '#e74c3c',
        fontWeight: '600',
    },
    smtpPreviewLink: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(39, 174, 96, 0.2)',
    },
    smtpPreviewLinkText: {
        fontSize: 12,
        fontWeight: '700',
        color: TOKENS.primaryDeep,
        textDecorationLine: 'underline',
    },
    smtpTestButton: {
        backgroundColor: TOKENS.primaryDeep,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: TOKENS.radiusMd,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    smtpTestButtonDisabled: {
        opacity: 0.65,
    },
    smtpButtonLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    smtpTestButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});
