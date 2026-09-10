/**
 * Rôle : Principal Solutions Architect & Lead UI/UX Engineer
 * Fichier : components/AIChatbot.tsx
 * Système : CyberCortex ERP (Assistant IA Conversationnel Google Gemini)
 * Objectif : Chatbot flottant agronomique temps-réel, interactif et contextuel.
 */

import React, { useState, useRef, useEffect } from 'react';
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
    PressableStateCallbackType,
    Animated
} from 'react-native';
import { sendChatMessage, ChatMessage } from '../services/api';

export interface HoverState extends PressableStateCallbackType {
    hovered?: boolean;
}

const SCREEN_W = Dimensions.get('window').width;
const monoFamily = Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' });
const sansFamily = Platform.select({ ios: 'System', android: 'Roboto', web: 'sans-serif' });

const webCursorPointer = Platform.select({
    web: { cursor: 'pointer' } as any,
    default: {}
});

const webTransition = Platform.select({
    web: { transition: 'all 0.25s cubic-bezier(0.22, 0.9, 0.32, 1)' } as any,
    default: {}
});

// Suggestions rapides prédéfinies
const QUICK_PROMPTS = [
    { label: '📊 Statut Climat', query: 'Quel est l\'état actuel des capteurs et du climat de la serre ?' },
    { label: '🚨 Alertes Récentes', query: 'Quelles sont les dernières alertes enregistrées et que préconises-tu ?' },
    { label: '🧪 Simuler un Scénario', query: 'Comment fonctionne la simulation What-If et comment tester un stress ?' },
    { label: '💧 Conseil Irrigation', query: 'Quels sont les seuils hydriques optimaux pour nos cultures ?' },
    { label: '🎮 Jumeau Numérique', query: 'Comment interagir avec le Jumeau Numérique 3D ?' }
];

export default function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            role: 'assistant',
            text: "🌱 **Bonjour ! Je suis CyberCortex Assistant**, votre copilote agronomique propulsé par **Google Gemini**.\n\nJe suis connecté en temps réel aux capteurs IoT et aux algorithmes du Cyber-Brain.\n\nComment puis-je vous aider aujourd'hui ?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'gemini'
        }
    ]);

    const scrollViewRef = useRef<ScrollView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animation de pulsation du bouton déclencheur
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true })
            ])
        ).start();
    }, [pulseAnim]);

    // Scroll automatique vers le bas lors de l'ajout d'un message
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isOpen]);

    // Envoi du message au backend (Google Gemini Proxy)
    const handleSend = async (textToSend?: string) => {
        const query = (textToSend || inputText).trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Préparation de l'historique compact pour le contexte
        const historyPayload = messages.slice(-5).map(m => ({
            role: m.role,
            text: m.text
        }));

        try {
            const res = await sendChatMessage(query, historyPayload);
            const assistantMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                text: res.reply || "Aucune réponse reçue.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: res.source || 'gemini'
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (e) {
            const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                role: 'assistant',
                text: "⚠️ Erreur temporaire de communication avec l'assistant. Veuillez réessayer.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: 'cyber-brain-local'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // Rendu formaté des messages (Prise en charge basique des titres en gras et listes à puces)
    const renderMessageContent = (text: string, isUser: boolean) => {
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const cleanLine = isBullet ? line.trim().substring(2) : line;

            // Remplacement basique du markdown bold
            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

            return (
                <View key={idx} style={[styles.textLineRow, isBullet && styles.bulletRow]}>
                    {isBullet && <Text style={[styles.bulletDot, isUser && { color: '#ffffff' }]}>•</Text>}
                    <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
                        {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                    <Text key={pIdx} style={styles.boldText}>
                                        {part.slice(2, -2)}
                                    </Text>
                                );
                            }
                            return part;
                        })}
                    </Text>
                </View>
            );
        });
    };

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            {/* ============================================ */}
            {/* FENÊTRE DE CHAT OUVERTE                      */}
            {/* ============================================ */}
            {isOpen && (
                <View style={styles.chatWindow}>
                    {/* Header */}
                    <View style={styles.chatHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.avatarGlow}>
                                <Text style={styles.avatarEmoji}>🤖</Text>
                            </View>
                            <View>
                                <View style={styles.headerTitleRow}>
                                    <Text style={styles.headerTitle}>CyberCortex AI</Text>
                                    <View style={styles.geminiBadge}>
                                        <Text style={styles.geminiBadgeText}>✨ Google Gemini</Text>
                                    </View>
                                </View>
                                <View style={styles.statusRow}>
                                    <View style={styles.onlineDot} />
                                    <Text style={styles.statusText}>Copilote Agronomique Connecté</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.headerActions}>
                            <Pressable
                                onPress={() => setMessages(messages.slice(0, 1))}
                                style={({ hovered }: HoverState) => [
                                    styles.iconBtn,
                                    hovered && { backgroundColor: 'rgba(0,0,0,0.05)' },
                                    webCursorPointer
                                ]}
                            >
                                <Text style={{ fontSize: 13 }}>🗑️</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setIsOpen(false)}
                                style={({ hovered }: HoverState) => [
                                    styles.iconBtn,
                                    hovered && { backgroundColor: 'rgba(0,0,0,0.05)' },
                                    webCursorPointer
                                ]}
                            >
                                <Text style={styles.closeIcon}>✕</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Quick Prompts Chips */}
                    <View style={styles.quickPromptsWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
                            {QUICK_PROMPTS.map((qp, idx) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => handleSend(qp.query)}
                                    disabled={isLoading}
                                    style={({ hovered, pressed }: HoverState) => [
                                        styles.chipBtn,
                                        hovered && styles.chipBtnHovered,
                                        pressed && { transform: [{ scale: 0.96 }] },
                                        webCursorPointer,
                                        webTransition
                                    ]}
                                >
                                    <Text style={styles.chipText}>{qp.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
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
                                <View key={m.id} style={[styles.messageBubbleWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
                                    <View style={[styles.messageCard, isUser ? styles.userCard : styles.assistantCard]}>
                                        {renderMessageContent(m.text, isUser)}
                                        <View style={styles.timeRow}>
                                            <Text style={[styles.timeText, isUser && { color: 'rgba(255,255,255,0.7)' }]}>
                                                {m.timestamp}
                                            </Text>
                                            {!isUser && m.source === 'gemini' && (
                                                <Text style={styles.sourceTag}>Gemini 1.5</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        {/* Typing Animation Indicator */}
                        {isLoading && (
                            <View style={[styles.messageBubbleWrap, styles.assistantWrap]}>
                                <View style={[styles.messageCard, styles.assistantCard, styles.loadingCard]}>
                                    <ActivityIndicator size="small" color="#7c3aed" />
                                    <Text style={styles.loadingText}>CyberCortex analyse la télémétrie...</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Input Bar */}
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Posez une question agronomique à l'IA..."
                            placeholderTextColor="#94a3b8"
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={() => handleSend()}
                            returnKeyType="send"
                            editable={!isLoading}
                        />
                        <Pressable
                            onPress={() => handleSend()}
                            disabled={!inputText.trim() || isLoading}
                            style={({ hovered, pressed }: HoverState) => [
                                styles.sendBtn,
                                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                                hovered && inputText.trim() && { backgroundColor: '#1b5e20' },
                                pressed && { transform: [{ scale: 0.94 }] },
                                webCursorPointer,
                                webTransition
                            ]}
                        >
                            <Text style={styles.sendBtnText}>➤</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* ============================================ */}
            {/* BOUTON DÉCLENCHEUR FLOTTANT (FAB)            */}
            {/* ============================================ */}
            {!isOpen && (
                <Pressable
                    onPress={() => setIsOpen(true)}
                    style={({ hovered, pressed }: HoverState) => [
                        styles.fabButton,
                        hovered && styles.fabHovered,
                        pressed && { transform: [{ scale: 0.95 }] },
                        webCursorPointer,
                        webTransition
                    ]}
                >
                    <Animated.View style={[styles.fabInner, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.fabPulseRing} />
                        <Text style={styles.fabEmoji}>✨</Text>
                        <Text style={styles.fabLabel}>Assistant IA</Text>
                        <View style={styles.onlineStatusDot} />
                    </Animated.View>
                </Pressable>
            )}
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 95, // Positionné soigneusement au-dessus de la barre de navigation flottante
        right: 24,
        zIndex: 9999,
        alignItems: 'flex-end',
    },

    // FAB Button
    fabButton: {
        backgroundColor: '#ffffff',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    fabHovered: {
        backgroundColor: '#f5f3ff',
        transform: [{ scale: 1.05 }],
        borderColor: '#6d28d9',
        shadowOpacity: 0.35,
    },
    fabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fabPulseRing: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7c3aed',
    },
    fabEmoji: {
        fontSize: 18,
    },
    fabLabel: {
        fontFamily: sansFamily,
        fontSize: 13,
        fontWeight: '700',
        color: '#1e2b22',
        letterSpacing: 0.3,
    },
    onlineStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#10b981',
    },

    // Chat Window Container
    chatWindow: {
        width: Math.min(SCREEN_W * 0.92, 410),
        height: 560,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#e2e8e0',
        shadowColor: 'rgba(15, 23, 42, 0.2)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 36,
        elevation: 12,
        overflow: 'hidden',
        flexDirection: 'column',
    },

    // Header
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: '#f8faf9',
        borderBottomWidth: 1,
        borderBottomColor: '#edf1ea',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatarGlow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#c4b5fd',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEmoji: {
        fontSize: 18,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontFamily: sansFamily,
        fontSize: 14,
        fontWeight: '700',
        color: '#1e2b22',
    },
    geminiBadge: {
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd6fe',
    },
    geminiBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#7c3aed',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
    },
    statusText: {
        fontSize: 11,
        color: '#64748b',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },

    // Quick Prompts
    quickPromptsWrap: {
        backgroundColor: '#fbfcfb',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f2',
        paddingVertical: 8,
    },
    quickPromptsScroll: {
        paddingHorizontal: 12,
        gap: 6,
        flexDirection: 'row',
    },
    chipBtn: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chipBtnHovered: {
        backgroundColor: '#f5f3ff',
        borderColor: '#c4b5fd',
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#334155',
    },

    // Messages Stream
    messagesList: {
        flex: 1,
        backgroundColor: '#f8faf9',
    },
    messagesContent: {
        padding: 14,
        gap: 12,
    },
    messageBubbleWrap: {
        width: '100%',
        flexDirection: 'row',
    },
    userWrap: {
        justifyContent: 'flex-end',
    },
    assistantWrap: {
        justifyContent: 'flex-start',
    },
    messageCard: {
        maxWidth: '85%',
        borderRadius: 16,
        padding: 12,
        shadowColor: 'rgba(0,0,0,0.04)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userCard: {
        backgroundColor: '#1f7a46',
        borderBottomRightRadius: 4,
    },
    assistantCard: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8e0',
        borderBottomLeftRadius: 4,
    },
    loadingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    loadingText: {
        fontSize: 12,
        color: '#7c3aed',
        fontStyle: 'italic',
    },

    textLineRow: {
        marginVertical: 1.5,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
    },
    bulletDot: {
        fontSize: 13,
        color: '#7c3aed',
        marginTop: 1,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 19,
    },
    userMessageText: {
        color: '#ffffff',
    },
    assistantMessageText: {
        color: '#1e293b',
    },
    boldText: {
        fontWeight: '700',
    },

    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 6,
    },
    timeText: {
        fontSize: 10,
        color: '#94a3b8',
        fontFamily: monoFamily,
    },
    sourceTag: {
        fontSize: 9,
        color: '#7c3aed',
        fontWeight: '600',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },

    // Input Bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#edf1ea',
        gap: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 13,
        color: '#1e293b',
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1f7a46',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#cbd5e1',
        opacity: 0.6,
    },
    sendBtnText: {
        fontSize: 15,
        color: '#ffffff',
        fontWeight: 'bold',
    },
});
