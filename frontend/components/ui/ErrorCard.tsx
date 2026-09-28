import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../constants/theme';

interface ErrorCardProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
    style?: ViewStyle;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
    title = 'Connexion interrompue',
    message = 'Impossible d’établir la liaison avec les capteurs télémétriques. Vérifiez la passerelle ou réessayez.',
    onRetry,
    retryLabel = 'Réessayer',
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.iconBox}>
                <Ionicons name="cloud-offline-outline" size={26} color={Colors.danger} />
            </View>
            <View style={styles.contentBox}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
                {onRetry && (
                    <Pressable
                        onPress={onRetry}
                        style={({ pressed }) => [
                            styles.retryButton,
                            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                        ]}
                    >
                        <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                        <Text style={styles.retryText}>{retryLabel}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        marginVertical: 12,
        ...Shadows.sm,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(217, 92, 92, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentBox: {
        flex: 1,
    },
    title: {
        fontFamily: Typography.sans,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textDark,
        marginBottom: 4,
    },
    message: {
        fontFamily: Typography.sans,
        fontSize: 13.5,
        color: Colors.textMuted,
        lineHeight: 20,
        marginBottom: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        backgroundColor: 'rgba(31, 122, 70, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(31, 122, 70, 0.2)',
    },
    retryText: {
        fontFamily: Typography.sans,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
});

export default ErrorCard;
