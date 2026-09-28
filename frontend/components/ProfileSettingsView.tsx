/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : components/ProfileSettingsView.tsx
 * Système : CyberCortex ERP (Espace Scientifique - Module Paramètres & Infrastructure)
 * Design System : Living Intelligence (Clean, Precision, High Contrast, Modern Botanical)
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    ScrollView,
    TextInput,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import { useTranslation } from '../i18n';
import { LanguageSelectModal } from './LanguageSelectModal';
import {
    getTelemetryExportUrl,
    fetchMqttTokens,
    fetchAlertsConfig,
    updateAlertsConfig,
    fetchSystemDocumentation,
    MqttTokensResponse,
    AlertsConfig,
} from '../services/api';

export interface ProfileSettingsViewProps {
    onLogout?: () => void;
    userEmail?: string;
    organization?: string;
}

interface SettingItem {
    id: string;
    title: string;
    subtitle: string;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
    onLogout,
    userEmail = 'chercheur@smartagri.tn',
    organization = 'CyberCortex R&D Lab',
}) => {
    const router = useRouter();
    const setAuthenticated = useAppStore((state) => state.setAuthenticated);
    const { setIsManagementModalOpen } = useActiveGreenhouse();
    const { t, language, isRTL } = useTranslation();
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);

    const settingsItems: SettingItem[] = [
        {
            id: 'account_org',
            title: t('profile.account_org_title', 'Paramètres du compte & organisation'),
            subtitle: t('profile.account_org_desc', 'Gestion de la station, des chercheurs et des accès IAM.'),
        },
        {
            id: 'app_language',
            title: t('profile.language_title', 'Langue de l\'application'),
            subtitle: t('profile.language_desc', 'Sélectionnez la langue d\'affichage et la direction de lecture.'),
        },
        {
            id: 'alerts_config',
            title: t('profile.alerts_config_title', 'Canaux d\'alertes SMS & Push'),
            subtitle: t('profile.alerts_config_desc', 'Configuration des seuils critiques et destinataires d\'astreinte.'),
        },
        {
            id: 'security_mtls',
            title: t('profile.security_mtls_title', 'Sécurité mTLS & Tokens MQTT'),
            subtitle: t('profile.security_mtls_desc', 'Certificats des nœuds ESP32 et clés de passerelle Edge.'),
        },
        {
            id: 'export_data',
            title: t('profile.export_data_title', 'Exportation des Séries Temporelles'),
            subtitle: t('profile.export_data_desc', 'Téléchargements des données brutes en formats CSV et Parquet.'),
        },
        {
            id: 'docs_support',
            title: t('profile.docs_support_title', 'Documentation & Support CyberCortex'),
            subtitle: t('profile.docs_support_desc', 'Référentiel d\'architecture et journal des versions.'),
        },
    ];

    // États de chargement et d'action
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

    // Modals
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // État Canaux d'Alertes
    const [alertsConfig, setAlertsConfig] = useState<AlertsConfig>({
        emergency_contacts: '+216 98 000 000',
        temp_max_threshold: 32.0,
        temp_min_threshold: 12.0,
        humidity_min_threshold: 35.0,
        soil_moisture_min_threshold: 30.0,
        sms_enabled: true,
        push_enabled: true,
    });
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
    const [isSavingAlerts, setIsSavingAlerts] = useState(false);

    // État Tokens MQTT
    const [mqttTokens, setMqttTokens] = useState<MqttTokensResponse['credentials'] | null>(null);
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);

    // État Documentation
    const [docsData, setDocsData] = useState<any>(null);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // ==========================================
    // ACTION 1 : Exportation des Séries Temporelles (CSV)
    // ==========================================
    const handleExportTelemetry = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setExportSuccessMessage(null);

        const exportUrl = getTelemetryExportUrl();

        try {
            if (Platform.OS === 'web') {
                // Téléchargement Web natif direct
                if (typeof window !== 'undefined') {
                    const res = await fetch(exportUrl);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    const blobUrl = window.URL.createObjectURL(blob);

                    const anchor = document.createElement('a');
                    anchor.href = blobUrl;
                    anchor.download = 'cybercortex_telemetry_export.csv';
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    window.URL.revokeObjectURL(blobUrl);

                    setExportSuccessMessage('Fichier CSV télémétrique téléchargé avec succès !');
                }
            } else {
                // Mobile Native (iOS & Android) : expo-file-system + expo-sharing
                const fsAny = FileSystem as any;
                const targetDir = fsAny.documentDirectory || fsAny.cacheDirectory || fsAny.Paths?.documentDirectory?.uri || '';
                const fileUri = `${targetDir}${targetDir.endsWith('/') ? '' : '/'}cybercortex_telemetry_export.csv`;

                const downloadRes = await fsAny.downloadAsync(exportUrl, fileUri);

                if (downloadRes.status !== 200) {
                    throw new Error(`Échec du téléchargement (HTTP ${downloadRes.status})`);
                }

                const sharingAvailable = await Sharing.isAvailableAsync();
                if (sharingAvailable) {
                    await Sharing.shareAsync(downloadRes.uri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Exporter les séries temporelles CSV (CyberCortex ERP)',
                        UTI: 'public.comma-separated-values-text',
                    });
                    setExportSuccessMessage('Partage des données ouvert avec succès.');
                } else {
                    Alert.alert(
                        'Téléchargement Terminé',
                        `Données enregistrées localement dans : ${downloadRes.uri}`
                    );
                }
            }
        } catch (err: any) {
            console.error('[Export Telemetry Error]', err);
            const errDetail = err.message || 'Impossible de joindre le serveur API pour l\'export';
            if (Platform.OS !== 'web') {
                Alert.alert('Erreur d\'exportation', errDetail);
            } else {
                alert(`Erreur d'exportation CSV : ${errDetail}`);
            }
        } finally {
            setIsExporting(false);
        }
    };

    // ==========================================
    // ACTION 2 : Chargement des Tokens MQTT & mTLS
    // ==========================================
    const openMqttSecurityModal = async () => {
        setActiveModal('security_mtls');
        setIsLoadingTokens(true);
        try {
            const data = await fetchMqttTokens('NODE-01');
            if (data && data.credentials) {
                setMqttTokens(data.credentials);
            }
        } catch (err) {
            console.error('[MQTT Tokens Error]', err);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    // ==========================================
    // ACTION 3 : Configuration Canaux d'Alertes
    // ==========================================
    const openAlertsConfigModal = async () => {
        setActiveModal('alerts_config');
        setIsLoadingAlerts(true);
        try {
            const data = await fetchAlertsConfig();
            if (data && data.config) {
                setAlertsConfig(data.config);
            }
        } catch (err) {
            console.error('[Alerts Config Error]', err);
        } finally {
            setIsLoadingAlerts(false);
        }
    };

    const handleSaveAlertsConfig = async () => {
        setIsSavingAlerts(true);
        try {
            const res = await updateAlertsConfig(alertsConfig);
            if (Platform.OS === 'web') {
                alert('✅ Seuils critiques et numéros d\'astreinte enregistrés avec succès !');
            } else {
                Alert.alert('Succès', 'Seuils critiques et numéros d\'astreinte enregistrés.');
            }
            setActiveModal(null);
        } catch (err: any) {
            console.error('[Save Config Error]', err);
            const msg = err.message || 'Erreur lors de la sauvegarde';
            if (Platform.OS === 'web') alert(`❌ ${msg}`);
            else Alert.alert('Erreur', msg);
        } finally {
            setIsSavingAlerts(false);
        }
    };

    // ==========================================
    // ACTION 4 : Documentation & Architecture
    // ==========================================
    const openDocsModal = async () => {
        setActiveModal('docs_support');
        setIsLoadingDocs(true);
        try {
            const data = await fetchSystemDocumentation();
            setDocsData(data);
        } catch (err) {
            console.error('[Docs Error]', err);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    // ==========================================
    // ACTION 5 : Déconnexion Sécurisée de la Session
    // ==========================================
    const handleLogout = () => {
        const executeLogout = async () => {
            try {
                // 1. Purge du cache global / Zustand
                setAuthenticated(false);

                // 2. Nettoyage des tokens locaux (AsyncStorage / Web storage)
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    try {
                        window.localStorage?.removeItem('cybercortex_jwt_token');
                        window.sessionStorage?.clear();
                    } catch (_) {}
                }

                // 3. Callback parent ou navigation reset
                if (onLogout) {
                    onLogout();
                } else {
                    router.replace('/');
                }
            } catch (err) {
                console.error('[Logout Error]', err);
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter de la session de recherche ?');
            if (confirmed) executeLogout();
        } else {
            Alert.alert(
                'Déconnexion de session',
                'Êtes-vous certain de vouloir clore votre session de recherche active ?',
                [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Déconnexion', style: 'destructive', onPress: executeLogout },
                ]
            );
        }
    };

    // Dispatcher de clics sur les items du menu
    const handleItemPress = (itemId: string) => {
        switch (itemId) {
            case 'account_org':
                setIsManagementModalOpen(true);
                break;
            case 'app_language':
                setIsLangModalOpen(true);
                break;
            case 'alerts_config':
                openAlertsConfigModal();
                break;
            case 'security_mtls':
                openMqttSecurityModal();
                break;
            case 'export_data':
                handleExportTelemetry();
                break;
            case 'docs_support':
                openDocsModal();
                break;
            default:
                break;
        }
    };

    return (
        <View style={styles.outerContainer}>
            {/* Feedback Toast d'exportation */}
            {Boolean(exportSuccessMessage) && (
                <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#1F7A46" />
                    <Text style={styles.successBannerText}>{exportSuccessMessage}</Text>
                    <Pressable onPress={() => setExportSuccessMessage(null)}>
                        <Ionicons name="close" size={16} color="#1F7A46" />
                    </Pressable>
                </View>
            )}

            {/* CARTE PRINCIPALE : PARAMÈTRES & INFRASTRUCTURE */}
            <View style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardHeaderText, isRTL && styles.textRight]}>
                        {t('profile.settings_header', 'PARAMÈTRES & INFRASTRUCTURE')}
                    </Text>
                </View>

                <View style={styles.itemsList}>
                    {settingsItems.map((item, index) => {
                        const isLast = index === settingsItems.length - 1;
                        const isExportItem = item.id === 'export_data';
                        const isLangItem = item.id === 'app_language';

                        return (
                            <Pressable
                                key={item.id}
                                style={({ pressed, hovered }: any) => [
                                    styles.itemRow,
                                    isRTL && styles.itemRowRTL,
                                    !isLast && styles.itemRowDivider,
                                    hovered && styles.itemRowHovered,
                                    pressed && styles.itemRowPressed,
                                ]}
                                onPress={() => handleItemPress(item.id)}
                            >
                                <View style={[styles.itemTextContainer, isRTL && styles.itemTextContainerRTL]}>
                                    <Text style={[styles.itemTitle, isRTL && styles.textRight]}>{item.title}</Text>
                                    <Text style={[styles.itemSubtitle, isRTL && styles.textRight]}>{item.subtitle}</Text>
                                </View>

                                <View style={[styles.itemAction, isRTL && styles.itemActionRTL]}>
                                    {isLangItem && (
                                        <View style={[styles.langBadge, isRTL && { marginRight: 0, marginLeft: 8 }]}>
                                            <Text style={styles.langBadgeText}>
                                                {language === 'ar' ? '🇹🇳 العربية' : '🇫🇷 Français'}
                                            </Text>
                                        </View>
                                    )}
                                    {isExportItem && isExporting ? (
                                        <ActivityIndicator size="small" color="#1F7A46" />
                                    ) : (
                                        <Ionicons
                                            name={isRTL ? "chevron-back" : "chevron-forward"}
                                            size={20}
                                            color="#66736A"
                                            style={styles.chevronIcon}
                                        />
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* BOUTON DE DÉCONNEXION DE LA SESSION DE RECHERCHE */}
            <Pressable
                style={({ pressed, hovered }: any) => [
                    styles.logoutButton,
                    hovered && styles.logoutButtonHovered,
                    pressed && styles.logoutButtonPressed,
                ]}
                onPress={handleLogout}
            >
                <Text style={styles.logoutButtonText}>
                    {t('profile.logout_btn', 'Déconnexion de la session de recherche')}
                </Text>
            </Pressable>

            {/* ========================================================
                MODAL 1 : Paramètres du compte & organisation
            ======================================================== */}
            <Modal
                visible={activeModal === 'account_org'}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Organisation & Accès IAM</Text>
                            <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color="#17221B" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Organisation R&D :</Text>
                                <Text style={styles.infoValue}>{organization}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Station Connectée :</Text>
                                <Text style={styles.infoValue}>STATION-TUNIS-01 (Hydroponie NFT)</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Identifiant Session :</Text>
                                <Text style={styles.infoValue}>{userEmail}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Habilitation IAM :</Text>
                                <Text style={[styles.infoValue, { color: '#1F7A46', fontWeight: '700' }]}>
                                    Chercheur Principal • Accès Total (L3)
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Chiffrement Base Edge :</Text>
                                <Text style={styles.infoValue}>SQLite WAL • Intégrité Vérifiée</Text>
                            </View>
                        </ScrollView>

                        <Pressable style={styles.modalPrimaryBtn} onPress={() => setActiveModal(null)}>
                            <Text style={styles.modalPrimaryBtnText}>Fermer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ========================================================
                MODAL 2 : Canaux d'alertes SMS & Push
            ======================================================== */}
            <Modal
                visible={activeModal === 'alerts_config'}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Configuration des Canaux d'Alertes</Text>
                            <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color="#17221B" />
                            </Pressable>
                        </View>

                        {isLoadingAlerts ? (
                            <ActivityIndicator size="large" color="#1F7A46" style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                                <Text style={styles.inputFieldLabel}>Numéros d'astreinte SMS (séparés par une virgule) :</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={alertsConfig.emergency_contacts}
                                    onChangeText={(txt) => setAlertsConfig({ ...alertsConfig, emergency_contacts: txt })}
                                    placeholder="+216 98 000 000, +216 50 000 000"
                                />

                                <View style={styles.twoColInputRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputFieldLabel}>T° Max Critique (°C) :</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={String(alertsConfig.temp_max_threshold)}
                                            keyboardType="numeric"
                                            onChangeText={(txt) => setAlertsConfig({ ...alertsConfig, temp_max_threshold: parseFloat(txt) || 0 })}
                                        />
                                    </View>
                                    <View style={{ width: 14 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputFieldLabel}>Humidité Min (%) :</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={String(alertsConfig.humidity_min_threshold)}
                                            keyboardType="numeric"
                                            onChangeText={(txt) => setAlertsConfig({ ...alertsConfig, humidity_min_threshold: parseFloat(txt) || 0 })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.switchRow}>
                                    <Text style={styles.switchLabel}>Activer le relais SMS GSM :</Text>
                                    <Switch
                                        value={alertsConfig.sms_enabled}
                                        onValueChange={(val) => setAlertsConfig({ ...alertsConfig, sms_enabled: val })}
                                        trackColor={{ false: '#E3E9E4', true: '#1F7A46' }}
                                    />
                                </View>

                                <View style={styles.switchRow}>
                                    <Text style={styles.switchLabel}>Notifications Push CyberCortex :</Text>
                                    <Switch
                                        value={alertsConfig.push_enabled}
                                        onValueChange={(val) => setAlertsConfig({ ...alertsConfig, push_enabled: val })}
                                        trackColor={{ false: '#E3E9E4', true: '#1F7A46' }}
                                    />
                                </View>
                            </ScrollView>
                        )}

                        <Pressable
                            style={[styles.modalPrimaryBtn, isSavingAlerts && { opacity: 0.6 }]}
                            onPress={handleSaveAlertsConfig}
                            disabled={isSavingAlerts}
                        >
                            {isSavingAlerts ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.modalPrimaryBtnText}>Enregistrer les canaux</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ========================================================
                MODAL 3 : Sécurité mTLS & Tokens MQTT
            ======================================================== */}
            <Modal
                visible={activeModal === 'security_mtls'}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Identifiants MQTT & mTLS ESP32</Text>
                            <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color="#17221B" />
                            </Pressable>
                        </View>

                        {isLoadingTokens ? (
                            <ActivityIndicator size="large" color="#1F7A46" style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                                <View style={styles.codeBlock}>
                                    <Text style={styles.codeLabel}>BROKER MQTT HOST</Text>
                                    <Text style={styles.codeValue}>{mqttTokens?.broker || 'broker.hivemq.com'}:{mqttTokens?.port || 1883}</Text>

                                    <Text style={styles.codeLabel}>CLIENT ID</Text>
                                    <Text style={styles.codeValue}>{mqttTokens?.client_id || 'ESP32-CyberCortex-NODE-01'}</Text>

                                    <Text style={styles.codeLabel}>USERNAME</Text>
                                    <Text style={styles.codeValue}>{mqttTokens?.username || 'cybercortex_edge_gateway'}</Text>

                                    <Text style={styles.codeLabel}>PASSPHRASE TOKEN</Text>
                                    <Text style={styles.codeValue}>{mqttTokens?.password || 'sec_49b8f2d87e01aa'}</Text>

                                    <Text style={styles.codeLabel}>TOPIC TELEMETRY</Text>
                                    <Text style={styles.codeValue}>{mqttTokens?.topics?.telemetry || 'ghost-pfe/greenhouse/telemetry'}</Text>

                                    <Text style={styles.codeLabel}>EMPREINTE CERTIFICAT mTLS</Text>
                                    <Text style={[styles.codeValue, { fontSize: 11, color: '#1F7A46' }]}>
                                        {mqttTokens?.certificate_fingerprint || 'SHA256:7B:3A:9F:88:2E:11:4C:9D:02:5A:F1:8E'}
                                    </Text>
                                </View>
                            </ScrollView>
                        )}

                        <Pressable style={styles.modalPrimaryBtn} onPress={() => setActiveModal(null)}>
                            <Text style={styles.modalPrimaryBtnText}>Fermer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ========================================================
                MODAL 5 : Documentation & Support CyberCortex
            ======================================================== */}
            <Modal
                visible={activeModal === 'docs_support'}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Architecture & Référentiel</Text>
                            <Pressable onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color="#17221B" />
                            </Pressable>
                        </View>

                        {isLoadingDocs ? (
                            <ActivityIndicator size="large" color="#1F7A46" style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                                <Text style={styles.docSectionTitle}>Plateforme CyberCortex ERP</Text>
                                <Text style={styles.docText}>
                                    Version : {docsData?.version || 'v2.4.0-PROD'}{'\n'}
                                    Architecture : ESP32 Dual Core (FreeRTOS) ➔ MQTT HiveMQ ➔ Node.js Express 5 ➔ SQLite WAL Mode.
                                </Text>

                                <Text style={[styles.docSectionTitle, { marginTop: 14 }]}>Journal des Versions</Text>
                                {(docsData?.release_notes || [
                                    'v2.4.0 : Exportation haute performance des séries temporelles (CSV)',
                                    'v2.3.2 : Intégration du module mTLS & gestion sécurisée des nœuds IoT',
                                    'v2.2.0 : Sélecteur territorial 24 gouvernorats tunisiens et profil chercheur',
                                ]).map((note: string, idx: number) => (
                                    <Text key={idx} style={styles.releaseItem}>• {note}</Text>
                                ))}

                                <Text style={[styles.docSectionTitle, { marginTop: 14 }]}>Support Technique & R&D</Text>
                                <Text style={styles.docText}>
                                    Ingénierie des Systèmes Intelligents & IoT{'\n'}
                                    Contact : support.rd@smartagri.co | Montassar Chraigui
                                </Text>
                            </ScrollView>
                        )}

                        <Pressable style={styles.modalPrimaryBtn} onPress={() => setActiveModal(null)}>
                            <Text style={styles.modalPrimaryBtnText}>Fermer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de Sélection de Langue (Living Intelligence) */}
            <LanguageSelectModal
                visible={isLangModalOpen}
                onClose={() => setIsLangModalOpen(false)}
            />
        </View>
    );
};

export default ProfileSettingsView;

// ============================================
// STYLES - Living Intelligence Strict Reference
// ============================================
const styles = StyleSheet.create({
    outerContainer: {
        width: '100%',
        marginTop: 18,
        marginBottom: 24,
    },

    // Bannière de confirmation
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#EBF7EE',
        borderWidth: 1,
        borderColor: '#C2E5CD',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
    },
    successBannerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1F7A46',
        marginLeft: 8,
        marginRight: 8,
    },

    // 1. Structure de la Carte Principale
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E3E9E4',
        paddingVertical: 16,
        paddingHorizontal: 16,
        shadowColor: 'rgba(23, 34, 27, 0.04)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 1,
    },

    // En-tête de section en majuscules
    cardHeader: {
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#F7F9F6',
        marginBottom: 4,
    },
    cardHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#66736A',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontFamily: Platform.select({ ios: 'Inter', android: 'sans-serif', web: 'Inter, sans-serif' }),
    },

    // Liste des modules
    itemsList: {
        width: '100%',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderRadius: 6,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                pointerEvents: 'auto',
                userSelect: 'none',
                transition: 'background-color 0.15s ease',
            } as any,
            default: {},
        }),
    },
    itemRowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F7F9F6',
    },
    itemRowHovered: {
        backgroundColor: '#F9FAF8',
    },
    itemRowPressed: {
        backgroundColor: '#F2F5F1',
    },
    itemTextContainer: {
        flex: 1,
        paddingRight: 14,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#17221B',
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    itemSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        color: '#66736A',
        lineHeight: 18,
    },
    itemAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    itemActionRTL: {
        flexDirection: 'row-reverse',
    },
    itemRowRTL: {
        flexDirection: 'row-reverse',
    },
    itemTextContainerRTL: {
        paddingRight: 0,
        paddingLeft: 14,
    },
    textRight: {
        textAlign: 'right',
    },
    langBadge: {
        backgroundColor: '#EBF7EE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C2E5CD',
        marginRight: 6,
    },
    langBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1F7A46',
    },
    chevronIcon: {
        opacity: 0.75,
    },

    // 2. Bouton de Déconnexion
    logoutButton: {
        width: '100%',
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#FDEDED',
        borderWidth: 1,
        borderColor: '#D95C5C',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                pointerEvents: 'auto',
                userSelect: 'none',
                transition: 'background-color 0.2s ease, opacity 0.2s ease',
            } as any,
            default: {},
        }),
    },
    logoutButtonHovered: {
        backgroundColor: '#FBE4E4',
    },
    logoutButtonPressed: {
        opacity: 0.85,
    },
    logoutButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D95C5C',
        textAlign: 'center',
        letterSpacing: 0.2,
    },

    // Modals Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '85%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 22,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#E3E9E4',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#17221B',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalBody: {
        marginBottom: 16,
    },
    modalPrimaryBtn: {
        backgroundColor: '#1F7A46',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Form inputs in modals
    infoRow: {
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: '#66736A',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: '#17221B',
        fontWeight: '600',
        marginTop: 2,
    },
    inputFieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#17221B',
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: '#F7F9F6',
        borderWidth: 1,
        borderColor: '#E3E9E4',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 13,
        color: '#17221B',
        marginBottom: 12,
    },
    twoColInputRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderColor: '#F7F9F6',
    },
    switchLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#17221B',
    },
    codeBlock: {
        backgroundColor: '#F7F9F6',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E3E9E4',
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#66736A',
        letterSpacing: 0.6,
        marginTop: 8,
    },
    codeValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#17221B',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
        marginTop: 2,
    },
    docSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F7A46',
        marginBottom: 4,
    },
    docText: {
        fontSize: 13,
        color: '#17221B',
        lineHeight: 18,
    },
    releaseItem: {
        fontSize: 12.5,
        color: '#66736A',
        lineHeight: 18,
        marginBottom: 4,
    },
});
