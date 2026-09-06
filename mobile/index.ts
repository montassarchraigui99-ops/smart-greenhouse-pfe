// Intercept React 19 / React Native Web DOM event handler compatibility warnings
if (typeof console !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';
        if (
            firstArg.includes('Unknown event handler property') ||
            firstArg.includes('Invalid event handler property')
        ) {
            return;
        }
        originalConsoleError(...args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';
        if (
            firstArg.includes('"shadow*" style props are deprecated') ||
            firstArg.includes('props.pointerEvents is deprecated') ||
            firstArg.includes('TouchableMixin is deprecated')
        ) {
            return;
        }
        originalConsoleWarn(...args);
    };
}

import 'expo-router/entry';

