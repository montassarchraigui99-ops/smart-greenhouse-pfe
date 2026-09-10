import React, { useState } from 'react';
import ScientificSpaceScreen from '../../components/ScientificSpaceScreen';
import OnboardingScreen from '../../components/OnboardingScreen';
import { useAppStore } from '../../store/useAppStore';

export default function ProfileScreen() {
    const isAuthenticated = useAppStore((state) => state.isAuthenticated);
    const setAuthenticated = useAppStore((state) => state.setAuthenticated);
    const [isLoggedIn, setIsLoggedIn] = useState(true);

    const isAuthorized = isLoggedIn && isAuthenticated;

    if (!isAuthorized) {
        return (
            <OnboardingScreen
                onSuccess={() => {
                    setIsLoggedIn(true);
                    setAuthenticated(true);
                }}
            />
        );
    }

    return (
        <ScientificSpaceScreen
            onLogout={() => {
                setIsLoggedIn(false);
                setAuthenticated(false);
            }}
        />
    );
}

