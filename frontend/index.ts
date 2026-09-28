// Intercept React 19 / React Native Web DOM compatibility warnings
import { LogBox, Platform } from 'react-native';

if (typeof console !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        const fullMessage = args
            .map(arg => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return arg.message;
                try {
                    return JSON.stringify(arg) || '';
                } catch {
                    return String(arg);
                }
            })
            .join(' ');

        if (
            fullMessage.includes('Unknown event handler property') ||
            fullMessage.includes('Invalid event handler property') ||
            fullMessage.includes('non-boolean attribute') ||
            fullMessage.includes('collapsable') ||
            fullMessage.includes('React does not recognize the') ||
            fullMessage.includes('Received `false` for a non-boolean attribute') ||
            fullMessage.includes('Invalid style property of "direction"') ||
            fullMessage.includes('Invalid style property of `direction`')
        ) {
            return;
        }
        originalConsoleError(...args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
        const fullMessage = args
            .map(arg => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return arg.message;
                try {
                    return JSON.stringify(arg) || '';
                } catch {
                    return String(arg);
                }
            })
            .join(' ');

        if (
            fullMessage.includes('"shadow*" style props are deprecated') ||
            fullMessage.includes('props.pointerEvents is deprecated') ||
            fullMessage.includes('TouchableMixin is deprecated') ||
            fullMessage.includes('non-boolean attribute') ||
            fullMessage.includes('collapsable')
        ) {
            return;
        }
        originalConsoleWarn(...args);
    };
}

LogBox.ignoreLogs([
    /non-boolean attribute/i,
    /collapsable/i,
    /Unknown event handler property/i,
    /Invalid event handler property/i,
    /props\.pointerEvents is deprecated/i,
    /"shadow\*" style props are deprecated/i,
    /Invalid style property of ["`]direction["`]/i,
]);

import 'expo-router/entry';
