/**
 * Living Intelligence Gemini AI Agronomic Copilot
 * Conversational Assistant with Structured Thought Cards (Observation → Explanation → Recommendation) & Quick-Action Chips
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Platform,
    Dimensions,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage, ChatMessage } from '../services/api';
import { Colors, BorderRadius, Spacing, Shadows, Typography } from '../constants/theme';
import { useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import { useTranslation } from '../i18n';

const SCREEN_W = Dimensions.get('window').width;

const CONTEXTUAL_ACTION_CHIPS_FR = [
    { label: '💧 Optimiser l\'irrigation', query: 'Optimiser l\'irrigation basée sur les relevés actuels.' },
    { label: '🔍 Diagnostiquer anomalie', query: 'Analyse les dernières alertes et télémétries pour diagnostiquer tout problème potentiel.' },
    { label: '🌿 Bilan nutrition (pH/EC)', query: 'Quel est l\'état de la solution nutritive (pH et électroconductivité) et que corriger ?' },
    { label: '⚡ Scénario stress thermique', query: 'Que se passe-t-il si la température augmente de 3°C et comment le Cyber-Brain réagira ?' },
];

const CONTEXTUAL_ACTION_CHIPS_AR = [
    { label: '💧 تحسين الري', query: 'تحسين الري' },
    { label: '🔍 تشخيص الأعطال', query: 'تحليل الأعطال والتنبيهات الحالية وحالة البيئة' },
    { label: '🌿 فحص المحلول المغذي (pH/EC)', query: 'ما هي حالة المحلول المغذي وما هي التوصيات لتعديلها؟' },
    { label: '⚡ سيناريو الإجهاد الحراري', query: 'ماذا يحدث إذا ارتفعت درجة الحرارة بمقدار 3 درجات مئوية وكيف سيتصرف النظام الذكي؟' },
];

interface ParsedThoughtSections {
    observation: string[];
    explanation: string[];
    recommendation: string[];
    standard: string[];
}

function parseAIThought(text: string): ParsedThoughtSections {
    const lines = text.split('\n');
    const sections: ParsedThoughtSections = {
        observation: [],
        explanation: [],
        recommendation: [],
        standard: [],
    };

    let currentSection: 'observation' | 'explanation' | 'recommendation' | 'standard' = 'standard';

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const lower = line.toLowerCase();
        const isObservation = lower.includes('observation') || lower.includes('constat') || lower.startsWith('1.') || lower.includes('état actuel') || lower.includes('الملاحظة') || lower.includes('ملاحظة') || lower.includes('البيانات');
        const isExplanation = lower.includes('explication') || lower.includes('analyse') || lower.includes('cause') || lower.startsWith('2.') || lower.includes('التفسير') || lower.includes('تفسير') || lower.includes('التحليل') || lower.includes('تحليل') || lower.includes('التشخيص');
        const isRecommendation = lower.includes('recommandation') || lower.includes('action') || lower.includes('conseil') || lower.startsWith('3.') || lower.includes('التوصية') || lower.includes('توصية') || lower.includes('التوصيات') || lower.includes('إجراء') || lower.includes('نصيحة');

        if (isObservation) {
            currentSection = 'observation';
            sections.observation.push(line.replace(/^(#+\s*|\*+|\d+\.\s*)/, ''));
        } else if (isExplanation) {
            currentSection = 'explanation';
            sections.explanation.push(line.replace(/^(#+\s*|\*+|\d+\.\s*)/, ''));
        } else if (isRecommendation) {
            currentSection = 'recommendation';
            sections.recommendation.push(line.replace(/^(#+\s*|\*+|\d+\.\s*)/, ''));
        } else {
            sections[currentSection].push(line);
        }
    }

    return sections;
}

export default function AIChatbot() {
    const { activeGreenhouseId, activeGreenhouse, greenhouses } = useActiveGreenhouse();
    const { language, isRTL } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const actionChips = useMemo(() => {
        return language === 'ar' ? CONTEXTUAL_ACTION_CHIPS_AR : CONTEXTUAL_ACTION_CHIPS_FR;
    }, [language]);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            role: 'assistant',
            text: language === 'ar'
                ? `مرحباً بك! أنا CyberCortex AI، المساعد الذكي لدفيئة ${activeGreenhouse?.name || 'مزرعتك'}.\n\nالملاحظة: التوصيل مباشر والبيانات البيئية متزامنة.\nالتفسير: المحصول : ${activeGreenhouse?.crop_type || 'الزراعة المحمية CEA'} (${activeGreenhouse?.location || 'تونس'}). الحالة : ${activeGreenhouse?.status || 'OPTIMAL'}.\nالتوصية: يمكنك استشارتي أو اختيار أحد الأوامر السريعة لتحسين الإنتاجية.`
                : `Bonjour ! Je suis CyberCortex AI, l'AI Copilot de ${activeGreenhouse?.name || 'votre serre'}.\n\nObservation: Données étanches et télémétrie en direct synchronisées.\nExplication: Culture : ${activeGreenhouse?.crop_type || 'Hydroponie CEA'} (${activeGreenhouse?.location || 'Site Principal'}). Statut : ${activeGreenhouse?.status || 'OPTIMAL'}.\nRecommandation: Posez-moi vos questions ou choisissez une analyse ciblée sur cette unité.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'gemini',
        },
    ]);

    // Mise à jour de l'accueil de l'IA lors du basculement de serre ou de langue
    useEffect(() => {
        if (activeGreenhouse) {
            setMessages([
                {
                    id: `init-${activeGreenhouseId}-${Date.now()}`,
                    role: 'assistant',
                    text: language === 'ar'
                        ? `🌱 **البيئة النشطة : ${activeGreenhouse.name}** (المعرف: \`${activeGreenhouse.id}\`)\n\nالملاحظة: القياسات مرتبطة بـ ${activeGreenhouse.location}.\nالتفسير: المحصول المراقب : *${activeGreenhouse.crop_type}*. الحالة : **${activeGreenhouse.status}**.\nالتوصية: جميع التحليلات مستندة حصرياً لهذه الدفيئة.`
                        : `🌱 **Contexte Actif : ${activeGreenhouse.name}** (ID: \`${activeGreenhouse.id}\`)\n\nObservation: Télémétrie rattachée à ${activeGreenhouse.location}.\nExplication: Culture surveillée : *${activeGreenhouse.crop_type}*. Statut : **${activeGreenhouse.status}**.\nRecommandation: Toutes mes réponses sont désormais strictement isolées à cette serre.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    source: 'gemini',
                }
            ]);
        }
    }, [activeGreenhouseId, language]);

    const scrollViewRef = useRef<ScrollView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isOpen]);

    const handleSend = async (textToSend?: string) => {
        const query = (textToSend || inputText).trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        const historyPayload = messages.slice(-5).map((m) => ({
            role: m.role,
            text: m.text,
        }));

        const spatialContext = {
            activeGreenhouseId,
            activeGreenhouseName: activeGreenhouse?.name || `Serre #${activeGreenhouseId}`,
            availableGreenhouses: greenhouses.map(g => ({ id: g.id, name: g.name }))
        };

        try {
            const res = await sendChatMessage(query, historyPayload, spatialContext);
            const assistantMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                text: res.reply || "Aucune réponse reçue du modèle.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: res.source || 'gemini',
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (e) {
            const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                role: 'assistant',
                text: `Observation: Connexion réseau instable pour ${activeGreenhouse?.name || activeGreenhouseId}.\nExplication: Impossible de joindre le backend Node.js.\nRecommandation: Vérifiez que le serveur écoute sur http://localhost:5000.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: 'cyber-brain-local',
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderAssistantResponse = (text: string) => {
        const parsed = parseAIThought(text);
        const hasStructure =
            parsed.observation.length > 0 ||
            parsed.explanation.length > 0 ||
            parsed.recommendation.length > 0;

        if (!hasStructure) {
            return (
                <Text style={styles.assistantText}>{text}</Text>
            );
        }

        return (
            <View style={styles.structuredResponse}>
                {/* 1. Observation Card */}
                {parsed.observation.length > 0 && (
                    <View style={styles.thoughtCardObservation}>
                        <View style={styles.thoughtHeader}>
                            <Ionicons name="eye-outline" size={14} color={Colors.info} />
                            <Text style={[styles.thoughtTitle, { color: Colors.info }]}>
                                {language === 'ar' ? 'الملاحظة والرصد' : 'Observation'}
                            </Text>
                        </View>
                        <Text style={styles.thoughtBody}>{parsed.observation.join('\n')}</Text>
                    </View>
                )}

                {/* 2. Explanation Card */}
                {parsed.explanation.length > 0 && (
                    <View style={styles.thoughtCardExplanation}>
                        <View style={styles.thoughtHeader}>
                            <Ionicons name="bulb-outline" size={14} color={Colors.warning} />
                            <Text style={[styles.thoughtTitle, { color: Colors.warning }]}>
                                {language === 'ar' ? 'التفسير والتحليل' : 'Explication & Analyse'}
                            </Text>
                        </View>
                        <Text style={styles.thoughtBody}>{parsed.explanation.join('\n')}</Text>
                    </View>
                )}

                {/* 3. Recommendation Card */}
                {parsed.recommendation.length > 0 && (
                    <View style={styles.thoughtCardRecommendation}>
                        <View style={styles.thoughtHeader}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
                            <Text style={[styles.thoughtTitle, { color: Colors.primary }]}>
                                {language === 'ar' ? 'التوصية الإجرائية' : 'Recommandation Actionnable'}
                            </Text>
                        </View>
                        <Text style={styles.thoughtBody}>{parsed.recommendation.join('\n')}</Text>
                    </View>
                )}

                {/* Fallback standard text if any */}
                {parsed.standard.length > 0 && (
                    <Text style={styles.thoughtBodyStandard}>{parsed.standard.join('\n')}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            {/* OPEN CHAT WINDOW */}
            {isOpen && (
                <View style={styles.chatWindow}>
                    {/* Header */}
                    <View style={styles.chatHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.avatarGlow}>
                                <Ionicons name="sparkles" size={18} color={Colors.surface} />
                            </View>
                            <View>
                                <View style={styles.titleRow}>
                                    <Text style={styles.headerTitle}>
                                        {language === 'ar' ? 'المساعد الذكي CyberCortex' : 'CyberCortex Copilot'}
                                    </Text>
                                    <View style={styles.aiBadge}>
                                        <Text style={styles.aiBadgeText}>Gemini AI</Text>
                                    </View>
                                </View>
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    {activeGreenhouse 
                                        ? (language === 'ar' ? `${activeGreenhouse.name} (${activeGreenhouse.id})` : `${activeGreenhouse.name} (${activeGreenhouse.id})`) 
                                        : (language === 'ar' ? 'المساعد الزراعي المتخصص' : 'Assistant agronomique expert')}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => setIsOpen(false)}
                            style={styles.closeBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Fermer"
                        >
                            <Ionicons name="close" size={18} color={Colors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Messages ScrollView */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesList}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((m) => {
                            const isUser = m.role === 'user';
                            return (
                                <View
                                    key={m.id}
                                    style={[styles.messageBubbleWrap, isUser ? styles.userWrap : styles.assistantWrap]}
                                >
                                    <View style={[styles.messageCard, isUser ? styles.userCard : styles.assistantCard]}>
                                        {isUser ? (
                                            <Text style={styles.userText}>{m.text}</Text>
                                        ) : (
                                            renderAssistantResponse(m.text)
                                        )}
                                        <Text style={[styles.timeText, isUser && { color: 'rgba(255,255,255,0.7)' }]}>
                                            {m.timestamp}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        {isLoading && (
                            <View style={[styles.messageBubbleWrap, styles.assistantWrap]}>
                                <View style={[styles.messageCard, styles.assistantCard, styles.loadingCard]}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.loadingText}>
                                        {language === 'ar' ? 'CyberCortex يحلل البيانات الزراعية...' : 'CyberCortex analyse les données...'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Contextual Quick-Action Chips at Bottom */}
                    <View style={styles.chipsSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsScroll}
                        >
                            {actionChips.map((chip: { label: string; query: string }, idx: number) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => handleSend(chip.query)}
                                    disabled={isLoading}
                                    style={styles.chipBtn}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.chipText}>{chip.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Input Bar */}
                    <View style={styles.inputBar}>
                        <TextInput
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={language === 'ar' ? 'اطرح سؤالاً زراعياً...' : 'Posez une question agronomique...'}
                            placeholderTextColor={Colors.textMuted}
                            style={[styles.inputField, isRTL && { textAlign: 'right' }]}
                            onSubmitEditing={() => handleSend()}
                            returnKeyType="send"
                            editable={!isLoading}
                        />
                        <Pressable
                            onPress={() => handleSend()}
                            disabled={isLoading || !inputText.trim()}
                            style={[
                                styles.sendBtn,
                                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Envoyer"
                        >
                            <Ionicons name="arrow-up" size={18} color={Colors.surface} />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* FLOATING TRIGGER BUTTON */}
            {!isOpen && (
                <Animated.View style={[styles.floatingTriggerWrap, { transform: [{ scale: pulseAnim }] }]}>
                    <Pressable
                        onPress={() => setIsOpen(true)}
                        style={styles.floatingTriggerBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Ouvrir l'assistant IA CyberCortex"
                    >
                        <Ionicons name="sparkles" size={22} color={Colors.surface} />
                        <Text style={styles.triggerText}>AI Copilot</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 85,
        right: 20,
        zIndex: 9990,
    },
    floatingTriggerWrap: {
        ...Shadows.float,
    },
    floatingTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        borderColor: `${Colors.surface}30`,
        ...Platform.select({
            web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
            default: {},
        }),
    },
    triggerText: {
        color: Colors.surface,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: Typography.primaryFont,
        letterSpacing: 0.2,
    },
    chatWindow: {
        width: Math.min(SCREEN_W - 32, 430),
        height: 560,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.float,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    avatarGlow: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.round,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    aiBadge: {
        backgroundColor: `${Colors.primary}15`,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: BorderRadius.round,
    },
    aiBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Typography.primaryFont,
    },
    headerSubtitle: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    closeBtn: {
        padding: 6,
        borderRadius: BorderRadius.round,
    },
    messagesList: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    messagesContent: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    messageBubbleWrap: {
        width: '100%',
        marginVertical: 3,
    },
    userWrap: {
        alignItems: 'flex-end',
    },
    assistantWrap: {
        alignItems: 'flex-start',
    },
    messageCard: {
        maxWidth: '88%',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadows.subtle,
    },
    userCard: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    assistantCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderBottomLeftRadius: 4,
    },
    userText: {
        color: Colors.surface,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: Typography.primaryFont,
    },
    assistantText: {
        color: Colors.textDark,
        fontSize: 13,
        lineHeight: 20,
        fontFamily: Typography.primaryFont,
    },
    timeText: {
        fontSize: 9.5,
        color: Colors.textMuted,
        fontFamily: Typography.monoFont,
        marginTop: Spacing.xs,
        alignSelf: 'flex-end',
    },
    loadingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 10,
    },
    loadingText: {
        fontSize: 12,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    // Structured Thought Process Cards (Observation -> Explanation -> Recommendation)
    structuredResponse: {
        gap: Spacing.xs + 2,
        width: '100%',
    },
    thoughtCardObservation: {
        backgroundColor: Colors.infoBg,
        borderLeftWidth: 3,
        borderLeftColor: Colors.info,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
    },
    thoughtCardExplanation: {
        backgroundColor: Colors.warningBg,
        borderLeftWidth: 3,
        borderLeftColor: Colors.warning,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
    },
    thoughtCardRecommendation: {
        backgroundColor: Colors.successBg,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
    },
    thoughtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    thoughtTitle: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: Typography.primaryFont,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    thoughtBody: {
        fontSize: 12,
        color: Colors.textDark,
        lineHeight: 18,
        fontFamily: Typography.primaryFont,
    },
    thoughtBodyStandard: {
        fontSize: 12,
        color: Colors.textDark,
        lineHeight: 18,
        fontFamily: Typography.primaryFont,
        marginTop: 4,
    },
    // Contextual Action Chips Section
    chipsSection: {
        paddingVertical: 6,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    chipsScroll: {
        gap: Spacing.xs + 2,
        paddingHorizontal: Spacing.xs,
    },
    chipBtn: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.pill,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 5,
        ...Platform.select({
            web: { cursor: 'pointer' } as any,
            default: {},
        }),
    },
    chipText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '600',
        fontFamily: Typography.primaryFont,
    },
    // Input Bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs + 2,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.xs,
    },
    inputField: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.round,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        fontSize: 12.5,
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.4,
    },
});
