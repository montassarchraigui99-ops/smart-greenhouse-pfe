import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Dimensions } from 'react-native';
import ScientificSpaceScreen from '../../components/ScientificSpaceScreen';
import { updateUserProfile } from '../../services/api';

const SCREEN_W = Dimensions.get('window').width;

export default function ProfileScreen() {
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [signupForm, setSignupForm] = useState({ full_name: '', email: '' });
    const [isRegistering, setIsRegistering] = useState(false);

    const handleLoginSignup = async () => {
        setIsRegistering(true);
        try {
            await updateUserProfile({
                full_name: signupForm.full_name || 'Dr. Chercheur',
                email: signupForm.email || 'chercheur@smartagri.tn',
                role: 'Ingénieur Agronome',
                organization: 'CyberCortex ERP',
                phone: '+216 71 000 000',
                location: 'Tunis',
            });
            setIsLoggedIn(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRegistering(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <View style={styles.loginContainer}>
                <View style={[styles.loginCard, { width: Math.min(SCREEN_W - 40, 420) }]}>
                    <Text style={styles.loginTitle}>Accès Espace Scientifique</Text>
                    <Text style={styles.loginSub}>
                        Initialisez votre profil pour accéder à la télémétrie de recherche.
                    </Text>

                    <Text style={styles.inputLabel}>Nom Complet</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Dr. Ahmed Ben Salem"
                        placeholderTextColor="#94a3b8"
                        value={signupForm.full_name}
                        onChangeText={(t) => setSignupForm({ ...signupForm, full_name: t })}
                    />

                    <Text style={styles.inputLabel}>Adresse Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="a.bensalem@smartagri.tn"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={signupForm.email}
                        onChangeText={(t) => setSignupForm({ ...signupForm, email: t })}
                    />

                    <Pressable
                        style={styles.loginBtn}
                        onPress={handleLoginSignup}
                        disabled={isRegistering}
                    >
                        <Text style={styles.loginBtnText}>
                            {isRegistering ? 'Connexion en cours...' : 'Créer et se connecter'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return <ScientificSpaceScreen onLogout={() => setIsLoggedIn(false)} />;
}

const styles = StyleSheet.create({
    loginContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loginCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 28,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 4,
    },
    loginTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 6,
        textAlign: 'center',
    },
    loginSub: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 18,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#0f172a',
    },
    loginBtn: {
        backgroundColor: '#27ae60',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 24,
    },
    loginBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});
