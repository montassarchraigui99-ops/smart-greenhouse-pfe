import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogBox } from 'react-native';

// Suppression des fausses alertes React Native Web relatives au pan-handler de Gifted Charts & React 19
const IGNORED_LOGS = [
    'Unknown event handler property',
    'Invalid event handler property',
    '"shadow*" style props are deprecated',
    'props.pointerEvents is deprecated',
    'TouchableMixin is deprecated',
    'collapsable',
    'non-boolean attribute',
    'Received `false` for a non-boolean attribute',
];

LogBox.ignoreLogs(IGNORED_LOGS);

if (typeof window !== 'undefined') {
    const origError = console.error;
    console.error = (...args: any[]) => {
        const full = args
            .map(a => {
                if (typeof a === 'string') return a;
                if (a instanceof Error) return a.message;
                try {
                    return JSON.stringify(a) || '';
                } catch {
                    return String(a);
                }
            })
            .join(' ');

        if (
            full.includes('collapsable') ||
            full.includes('non-boolean attribute') ||
            full.includes('Unknown event handler property') ||
            full.includes('Invalid event handler property') ||
            full.includes('React does not recognize')
        ) {
            return;
        }
        origError(...args);
    };

    try {
        // @ts-ignore
        const ExpoLogBox = require('@expo/log-box/src/LogBox').default;
        ExpoLogBox?.ignoreLogs?.(IGNORED_LOGS);
        ExpoLogBox?.clearAllLogs?.();
    } catch {}
}


import { Modal } from 'react-native';
import { ActiveGreenhouseProvider, useActiveGreenhouse } from '../context/ActiveGreenhouseContext';
import { AllGreenhousesGrid } from '../components/greenhouse/AllGreenhousesGrid';
import { GreenhouseManagementScreen } from '../screens/GreenhouseManagementScreen';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10000,
            retry: 2,
        },
    },
});

function GlobalMultiGreenhouseModal() {
    const { isMultiViewOpen, setIsMultiViewOpen } = useActiveGreenhouse();

    return (
        <Modal
            visible={isMultiViewOpen}
            animationType="fade"
            transparent={false}
            onRequestClose={() => setIsMultiViewOpen(false)}
        >
            <AllGreenhousesGrid onClose={() => setIsMultiViewOpen(false)} />
        </Modal>
    );
}

function GlobalGreenhouseManagementModal() {
    const { isManagementModalOpen, setIsManagementModalOpen } = useActiveGreenhouse();

    return (
        <Modal
            visible={isManagementModalOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setIsManagementModalOpen(false)}
        >
            <GreenhouseManagementScreen onClose={() => setIsManagementModalOpen(false)} />
        </Modal>
    );
}

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <ActiveGreenhouseProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                        name="digital-twin"
                        options={{
                            headerShown: true,
                            title: 'Digital Twin',
                            presentation: 'modal',
                        }}
                    />
                </Stack>
                <GlobalMultiGreenhouseModal />
                <GlobalGreenhouseManagementModal />
            </ActiveGreenhouseProvider>
        </QueryClientProvider>
    );
}
