import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogBox } from 'react-native';

// Suppression des fausses alertes React Native Web relatives au pan-handler de Gifted Charts & React 19
LogBox.ignoreLogs([
    'Unknown event handler property',
    '"shadow*" style props are deprecated',
    'props.pointerEvents is deprecated',
    'TouchableMixin is deprecated',
]);

if (typeof window !== 'undefined') {
    try {
        // @ts-ignore
        const ExpoLogBox = require('@expo/log-box/src/LogBox').default;
        ExpoLogBox?.ignoreLogs?.([
            'Unknown event handler property',
            '"shadow*" style props are deprecated',
            'props.pointerEvents is deprecated',
            'TouchableMixin is deprecated',
        ]);
        ExpoLogBox?.clearAllLogs?.();
    } catch {}
}


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10000,
            retry: 2,
        },
    },
});

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
    );
}
