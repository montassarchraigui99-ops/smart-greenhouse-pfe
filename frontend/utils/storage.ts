import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

export const storage = {
    async getItem(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
            try {
                // @ts-ignore
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                if (AsyncStorage) return await AsyncStorage.getItem(key);
            } catch (_) {}
            return memoryStore[key] || null;
        } catch (e) {
            return memoryStore[key] || null;
        }
    },
    async setItem(key: string, value: string): Promise<void> {
        try {
            memoryStore[key] = value;
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
            try {
                // @ts-ignore
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                if (AsyncStorage) await AsyncStorage.setItem(key, value);
            } catch (_) {}
        } catch (e) {
            memoryStore[key] = value;
        }
    },
    async removeItem(key: string): Promise<void> {
        try {
            delete memoryStore[key];
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            try {
                // @ts-ignore
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                if (AsyncStorage) await AsyncStorage.removeItem(key);
            } catch (_) {}
        } catch (e) {
            delete memoryStore[key];
        }
    }
};

export default storage;
