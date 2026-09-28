/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : frontend/components/GreenhouseModal.tsx
 * Objectif : Modal dual-mode réutilisable pour la création et l'édition d'une serre.
 *            - Validation stricte des données
 *            - Sélecteur des 24 gouvernorats tunisiens
 *            - Synchronisation atomique avec le contexte global
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Modal,
    ScrollView,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Greenhouse, createGreenhouse, updateGreenhouse } from '../services/api';
import { useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import { TUNISIAN_GOVERNORATES, Governorate, DEFAULT_GOVERNORATE } from '../constants/governorates';

export interface GreenhouseModalProps {
    visible: boolean;
    onClose: () => void;
    greenhouseToEdit?: Greenhouse | null;
    onSaved?: (greenhouse: Greenhouse, isEdit: boolean) => void;
}

const CROP_SUGGESTIONS = [
    'Tomates Cerises NFT',
    'Poivrons & Piments',
    'Fraises & Aromates',
    'Laitues Hydroponiques',
    'Concombres CEA',
    'Cultures Maraîchères'
];

export const GreenhouseModal: React.FC<GreenhouseModalProps> = ({
    visible,
    onClose,
    greenhouseToEdit,
    onSaved,
}) => {
    const isEditMode = Boolean(greenhouseToEdit);
    const { refreshGreenhouses, selectGreenhouse } = useActiveGreenhouse();

    const [name, setName] = useState('');
    const [cropType, setCropType] = useState('');
    const [location, setLocation] = useState<Governorate>(DEFAULT_GOVERNORATE);
    const [targetTemp, setTargetTemp] = useState('24.0');
    const [targetHum, setTargetHum] = useState('65');
    const [govPickerOpen, setGovPickerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initialisation du formulaire lors de l'ouverture ou du changement d'entité
    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (greenhouseToEdit) {
                setName(greenhouseToEdit.name || '');
                setCropType(greenhouseToEdit.crop_type || '');
                
                // Recherche d'un gouvernorat valide parmi les 24
                const matchedGov = TUNISIAN_GOVERNORATES.find(gov => 
                    (greenhouseToEdit.location || '').toLowerCase().includes(gov.toLowerCase())
                );
                setLocation(matchedGov || DEFAULT_GOVERNORATE);
                setTargetTemp(String(greenhouseToEdit.target_temp || '24.0'));
                setTargetHum(String(greenhouseToEdit.target_humidity || '65'));
            } else {
                setName('');
                setCropType('');
                setLocation(DEFAULT_GOVERNORATE);
                setTargetTemp('24.0');
                setTargetHum('65');
            }
        }
    }, [visible, greenhouseToEdit]);

    const handleSave = async () => {
        const cleanName = name.trim();
        const cleanCrop = cropType.trim();

        if (!cleanName) {
            setErrorMsg('Veuillez renseigner un nom pour la serre.');
            return;
        }

        if (!cleanCrop) {
            setErrorMsg('Veuillez préciser le type de culture sous abri.');
            return;
        }

        setErrorMsg(null);
        setIsSubmitting(true);

        try {
            const parsedTemp = parseFloat(targetTemp.replace(',', '.')) || 24.0;
            const parsedHum = parseFloat(targetHum.replace(',', '.')) || 65.0;

            if (isEditMode && greenhouseToEdit) {
                const updated = await updateGreenhouse(greenhouseToEdit.id, {
                    name: cleanName,
                    crop_type: cleanCrop,
                    location,
                    target_temp: parsedTemp,
                    target_humidity: parsedHum,
                });

                await refreshGreenhouses();
                if (onSaved) onSaved(updated, true);
                onClose();
            } else {
                const created = await createGreenhouse({
                    name: cleanName,
                    crop_type: cleanCrop,
                    location,
                    target_temp: parsedTemp,
                    target_humidity: parsedHum,
                    status: 'healthy'
                });

                await refreshGreenhouses();
                // Sélection automatique de la nouvelle serre pour une ergonomie optimale
                selectGreenhouse(created.id);
                if (onSaved) onSaved(created, false);
                onClose();
            }
        } catch (err: any) {
            console.error('[GREENHOUSE-MODAL-ERROR] Échec de l\'opération :', err);
            setErrorMsg(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <View style={[styles.headerIcon, isEditMode && styles.headerIconEdit]}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                    {isEditMode ? (
                                        <Path
                                            d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                            stroke={isEditMode ? '#0284c7' : '#15803d'}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    ) : (
                                        <Path
                                            d="M12 4V20M4 12H20"
                                            stroke="#15803d"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    )}
                                </Svg>
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>
                                    {isEditMode ? 'Modifier la Serre' : 'Ajouter une Nouvelle Serre'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {isEditMode
                                        ? `ID: ${greenhouseToEdit?.id} · Paramétrage agronomique`
                                        : 'Intégrez une nouvelle unité à votre exploitation'}
                                </Text>
                            </View>
                        </View>

                        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>

                    {/* Messages d'erreur */}
                    {errorMsg && (
                        <View style={styles.errorBanner}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                <Path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </Svg>
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.formScroll}
                    >
                        {/* 1. Nom de la Serre */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Nom de l'unité *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ex: Serre Tomates Nord, Unité Aéroponique 3"
                                placeholderTextColor="#94a3b8"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* 2. Type de Culture */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Type de Culture sous abri *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ex: Tomates Cerises NFT, Poivrons Bio..."
                                placeholderTextColor="#94a3b8"
                                value={cropType}
                                onChangeText={setCropType}
                            />
                            {/* Suggestions rapides */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                                {CROP_SUGGESTIONS.map((sug, idx) => (
                                    <Pressable
                                        key={idx}
                                        onPress={() => setCropType(sug)}
                                        style={[styles.chip, cropType === sug && styles.chipActive]}
                                    >
                                        <Text style={[styles.chipText, cropType === sug && styles.chipTextActive]}>
                                            {sug}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 3. Localisation (24 Gouvernorats Tunisiens) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Gouvernorat (Tunisie) *</Text>
                            <Pressable
                                onPress={() => setGovPickerOpen(!govPickerOpen)}
                                style={styles.govSelector}
                            >
                                <View style={styles.govSelectorLeft}>
                                    <Text style={styles.govFlag}>🇹🇳</Text>
                                    <Text style={styles.govSelectedText}>{location}</Text>
                                </View>
                                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                    <Path d="M6 9L12 15L18 9" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>

                            {/* Dropdown Déroulant des 24 Gouvernorats */}
                            {govPickerOpen && (
                                <View style={styles.govDropdown}>
                                    <Text style={styles.govDropdownTitle}>Sélectionnez le Gouvernorat</Text>
                                    <ScrollView style={styles.govList} nestedScrollEnabled={true}>
                                        {TUNISIAN_GOVERNORATES.map((gov) => {
                                            const isSelected = gov === location;
                                            return (
                                                <Pressable
                                                    key={gov}
                                                    onPress={() => {
                                                        setLocation(gov);
                                                        setGovPickerOpen(false);
                                                    }}
                                                    style={[styles.govOption, isSelected && styles.govOptionSelected]}
                                                >
                                                    <Text style={[styles.govOptionText, isSelected && styles.govOptionTextSelected]}>
                                                        {gov}
                                                    </Text>
                                                    {isSelected && (
                                                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                                            <Path d="M20 6L9 17L4 12" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </Svg>
                                                    )}
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* 4. Consignes Cibles de Climat */}
                        <View style={styles.rowFields}>
                            <View style={[styles.fieldGroup, { flex: 1, marginEnd: 8 }]}>
                                <Text style={styles.fieldLabel}>Temp. Cible (°C)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={targetTemp}
                                    onChangeText={setTargetTemp}
                                    placeholder="24.0"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            <View style={[styles.fieldGroup, { flex: 1, marginStart: 8 }]}>
                                <Text style={styles.fieldLabel}>Humidité Cible (%)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={targetHum}
                                    onChangeText={setTargetHum}
                                    placeholder="65"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <Pressable
                            onPress={onClose}
                            style={styles.cancelBtn}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelBtnText}>Annuler</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleSave}
                            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitBtnText}>
                                    {isEditMode ? 'Enregistrer les modifications' : 'Créer la serre'}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        maxHeight: '90%',
        overflow: 'hidden',
        ...Platform.select({
            web: {
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
            default: {
                elevation: 12,
            }
        })
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#dcfce7',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    headerIconEdit: {
        backgroundColor: '#e0f2fe',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        borderStartWidth: 4,
        borderStartColor: '#dc2626',
        padding: 12,
        marginHorizontal: 22,
        marginTop: 14,
        borderRadius: 8,
        gap: 8,
    },
    errorText: {
        fontSize: 12.5,
        color: '#b91c1c',
        fontWeight: '500',
        flex: 1,
    },
    formScroll: {
        paddingHorizontal: 22,
        paddingVertical: 18,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 7,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    chipsScroll: {
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        marginEnd: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
    },
    chipText: {
        fontSize: 11.5,
        color: '#475569',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#15803d',
        fontWeight: '600',
    },
    govSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    govSelectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    govFlag: {
        fontSize: 16,
        marginEnd: 8,
    },
    govSelectedText: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
    },
    govDropdown: {
        marginTop: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 14,
        padding: 8,
        maxHeight: 200,
        ...Platform.select({
            web: {
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }
        })
    },
    govDropdownTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    govList: {
        maxHeight: 160,
    },
    govOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    govOptionSelected: {
        backgroundColor: '#f0fdf4',
    },
    govOptionText: {
        fontSize: 13.5,
        color: '#334155',
    },
    govOptionTextSelected: {
        color: '#15803d',
        fontWeight: '700',
    },
    rowFields: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#fafafa',
        gap: 10,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    cancelBtnText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#475569',
    },
    submitBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#16a34a',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 140,
    },
    submitBtnDisabled: {
        opacity: 0.65,
    },
    submitBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#ffffff',
    },
});

export default GreenhouseModal;
