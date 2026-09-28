/**
 * Rôle : Lead Systems Architect & Principal React Native Engineer
 * Fichier : frontend/components/LanguageSelectModal.tsx
 * Système : CyberCortex ERP (Design System "Living Intelligence")
 * Objectif : Modal de sélection de la langue avec bascule atomique RTL et persistance.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ActivityIndicator,
    Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation, SupportedLanguage } from '../i18n';
import { updateUserProfile } from '../services/api';

export interface LanguageSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onLanguageChanged?: (newLang: SupportedLanguage) => void;
}

interface LanguageOption {
    code: SupportedLanguage;
    flag: string;
    title: string;
    subtitle: string;
    directionLabel: string;
    isRtlTarget: boolean;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
    {
        code: 'fr',
        flag: '🇫🇷',
        title: 'Français',
        subtitle: 'Mode standard LTR',
        directionLabel: 'LTR',
        isRtlTarget: false,
    },
    {
        code: 'ar',
        flag: '🇹🇳',
        title: 'العربية',
        subtitle: 'الاتجاه من اليمين إلى اليسار RTL',
        directionLabel: 'RTL',
        isRtlTarget: true,
    },
];

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
    visible,
    onClose,
    onLanguageChanged,
}) => {
    const { t, language, changeLanguage, isRTL } = useTranslation();
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchingTo, setSwitchingTo] = useState<SupportedLanguage | null>(null);

    const handleLanguageChange = async (targetLang: SupportedLanguage) => {
        // 1. Contrôle de redondance : Si la langue est déjà active, fermeture directe
        if (targetLang === language) {
            onClose();
            return;
        }

        setIsSwitching(true);
        setSwitchingTo(targetLang);

        try {
            // 2. Application i18n & Gestion RTL (avec persistance AsyncStorage / localStorage)
            await changeLanguage(targetLang);

            // 3. Synchronisation optionnelle avec le profil en base
            try {
                await updateUserProfile({ preferred_language: targetLang });
            } catch (apiErr) {
                console.warn('[LanguageModal] Synchronisation API profil facultative :', apiErr);
            }

            if (onLanguageChanged) {
                onLanguageChanged(targetLang);
            }

            // Petite latence pour laisser le re-render ou rechargement s'appliquer en douceur
            setTimeout(() => {
                setIsSwitching(false);
                setSwitchingTo(null);
                onClose();
            }, 150);
        } catch (error) {
            console.error('[LanguageModal] Erreur lors du changement de langue :', error);
            setIsSwitching(false);
            setSwitchingTo(null);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdropPressable} onPress={isSwitching ? undefined : onClose} />

                <View style={styles.modalCard}>
                    {/* Header de la Modal */}
                    <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                        <View style={[styles.headerTitleWrap, isRTL && styles.headerTitleWrapRTL]}>
                            <View style={styles.headerIcon}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                    <Path
                                        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                                        stroke="#1F7A46"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <Path
                                        d="M3.6 9H20.4M3.6 15H20.4M12 3C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 3Z"
                                        stroke="#1F7A46"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </View>
                            <View style={styles.titleTextContainer}>
                                <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
                                    {t('profile.modal_title', 'Choisir la langue / اختر اللغة')}
                                </Text>
                                <Text style={[styles.modalSubtitle, isRTL && styles.textRight]}>
                                    {t('profile.modal_subtitle', 'Configuration régionale & basculement LTR / RTL')}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={onClose}
                            style={styles.closeBtn}
                            disabled={isSwitching}
                            accessibilityLabel="Fermer"
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke="#66736A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>

                    {/* Liste des Options de Langue */}
                    <View style={styles.optionsList}>
                        {LANGUAGE_OPTIONS.map((opt) => {
                            const isCurrentActive = opt.code === language;
                            const isSelectedInProcess = isSwitching && switchingTo === opt.code;

                            return (
                                <Pressable
                                    key={opt.code}
                                    style={({ pressed, hovered }: any) => [
                                        styles.optionCard,
                                        isCurrentActive && styles.optionCardActive,
                                        hovered && styles.optionCardHovered,
                                        pressed && styles.optionCardPressed,
                                        isRTL && styles.optionCardRTL,
                                    ]}
                                    onPress={() => handleLanguageChange(opt.code)}
                                    disabled={isSwitching}
                                >
                                    <View style={[styles.optionLeft, isRTL && styles.optionLeftRTL]}>
                                        <Text style={styles.flagIcon}>{opt.flag}</Text>
                                        <View style={styles.optionTextWrap}>
                                            <View style={[styles.titleBadgeRow, isRTL && styles.titleBadgeRowRTL]}>
                                                <Text style={[styles.optionTitle, isCurrentActive && styles.optionTitleActive]}>
                                                    {opt.title}
                                                </Text>
                                                <View style={styles.dirTag}>
                                                    <Text style={styles.dirTagText}>{opt.directionLabel}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.optionRight}>
                                        {isSelectedInProcess ? (
                                            <ActivityIndicator size="small" color="#1F7A46" />
                                        ) : isCurrentActive ? (
                                            <View style={styles.checkCircle}>
                                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                                    <Path
                                                        d="M20 6L9 17L4 12"
                                                        stroke="#FFFFFF"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </Svg>
                                            </View>
                                        ) : (
                                            <View style={styles.uncheckCircle} />
                                        )}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Bouton Annuler */}
                    <View style={styles.modalFooter}>
                        <Pressable
                            style={({ pressed, hovered }: any) => [
                                styles.cancelBtn,
                                hovered && styles.cancelBtnHovered,
                                pressed && styles.cancelBtnPressed,
                            ]}
                            onPress={onClose}
                            disabled={isSwitching}
                        >
                            <Text style={styles.cancelBtnText}>
                                {t('profile.cancel', 'Annuler / إلغاء')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default LanguageSelectModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backdropPressable: {
        ...StyleSheet.absoluteFill,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E3E9E4',
        padding: 22,
        ...Platform.select({
            web: {
                boxShadow: '0 25px 50px -12px rgba(23, 34, 27, 0.25)',
            },
            default: {
                elevation: 10,
            },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F4F1',
        marginBottom: 16,
    },
    modalHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    headerTitleWrapRTL: {
        flexDirection: 'row-reverse',
        marginRight: 0,
        marginLeft: 12,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EBF7EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    titleTextContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#17221B',
        letterSpacing: -0.2,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#66736A',
        marginTop: 2,
    },
    textRight: {
        textAlign: 'right',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F7F9F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsList: {
        gap: 12,
        marginVertical: 4,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E3E9E4',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            } as any,
            default: {},
        }),
    },
    optionCardRTL: {
        flexDirection: 'row-reverse',
    },
    optionCardActive: {
        borderColor: '#1F7A46',
        backgroundColor: '#F5FCF7',
    },
    optionCardHovered: {
        borderColor: '#A8D5B8',
        backgroundColor: '#FAFDFB',
    },
    optionCardPressed: {
        backgroundColor: '#EBF7EE',
        transform: [{ scale: 0.99 }],
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionLeftRTL: {
        flexDirection: 'row-reverse',
    },
    flagIcon: {
        fontSize: 28,
        marginRight: 14,
        marginLeft: 4,
    },
    optionTextWrap: {
        flex: 1,
    },
    titleBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    titleBadgeRowRTL: {
        flexDirection: 'row-reverse',
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#17221B',
    },
    optionTitleActive: {
        color: '#1F7A46',
    },
    dirTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: '#F0F4F1',
    },
    dirTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#66736A',
    },
    optionSubtitle: {
        fontSize: 12.5,
        color: '#66736A',
        marginTop: 3,
    },
    optionRight: {
        marginLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1F7A46',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uncheckCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E1',
    },
    modalFooter: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F4F1',
        alignItems: 'center',
    },
    cancelBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F7F9F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E3E9E4',
    },
    cancelBtnHovered: {
        backgroundColor: '#EEF2EC',
    },
    cancelBtnPressed: {
        backgroundColor: '#E4EAE1',
    },
    cancelBtnText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#475569',
    },
});
