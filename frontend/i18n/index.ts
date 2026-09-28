/**
 * Rôle : Lead Systems Architect & Principal React Native Engineer
 * Fichier : frontend/i18n/index.ts
 * Objectif : Module i18n centralisé avec dictionnaire atomique, gestion RTL, persistance et interpolation de variables.
 */

import i18next from 'i18next';
import { useState, useEffect, useCallback } from 'react';
import { I18nManager, Platform } from 'react-native';
import { storage } from '../utils/storage';
import profileFr from '../locales/fr/profile.json';
import profileAr from '../locales/ar/profile.json';
import commonFr from '../locales/fr/common.json';
import commonAr from '../locales/ar/common.json';

export type SupportedLanguage = 'fr' | 'ar';

export const STORAGE_KEY_LANGUAGE = 'user_language';

const combinedFr: Record<string, string> = {
    ...profileFr,
    ...commonFr,
};

const combinedAr: Record<string, string> = {
    ...profileAr,
    ...commonAr,
};

const DICTIONARIES: Record<SupportedLanguage, Record<string, string>> = {
    fr: combinedFr,
    ar: combinedAr,
};

const resources = {
    fr: {
        profile: combinedFr,
        common: combinedFr,
        translation: combinedFr,
        ...combinedFr,
    },
    ar: {
        profile: combinedAr,
        common: combinedAr,
        translation: combinedAr,
        ...combinedAr,
    },
};

// Initialisation synchrone robuste
i18next.init({
    compatibilityJSON: 'v4',
    lng: 'fr',
    fallbackLng: 'fr',
    defaultNS: 'common',
    resources,
    interpolation: {
        escapeValue: false,
    },
});

type Listener = (lang: SupportedLanguage) => void;
const listeners = new Set<Listener>();

let currentActiveLang: SupportedLanguage = 'fr';

export const getActiveLanguage = (): SupportedLanguage => {
    return currentActiveLang;
};

export const applyRTLDirection = async (newLang: SupportedLanguage) => {
    const isArabic = newLang === 'ar';

    // 1. Mise à jour DOM Web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    }

    // 2. Mise à jour React Native Native I18nManager
    if (I18nManager.isRTL !== isArabic) {
        I18nManager.allowRTL(isArabic);
        I18nManager.forceRTL(isArabic);

        try {
            // @ts-ignore
            const Updates = require('expo-updates');
            if (Updates && typeof Updates.reloadAsync === 'function') {
                await Updates.reloadAsync();
            }
        } catch (_) {}
    }
};

export const changeLanguage = async (newLang: SupportedLanguage) => {
    currentActiveLang = newLang;
    await i18next.changeLanguage(newLang);
    await storage.setItem(STORAGE_KEY_LANGUAGE, newLang);
    await applyRTLDirection(newLang);

    // Notification de tous les composants abonnés
    listeners.forEach((fn) => {
        try {
            fn(newLang);
        } catch (e) {
            console.error('[i18n] Erreur listener :', e);
        }
    });
};

export const initLanguageFromStorage = async () => {
    try {
        const saved = await storage.getItem(STORAGE_KEY_LANGUAGE);
        if (saved && (saved === 'fr' || saved === 'ar')) {
            currentActiveLang = saved as SupportedLanguage;
            await i18next.changeLanguage(saved);
            await applyRTLDirection(saved as SupportedLanguage);
            listeners.forEach((fn) => fn(saved as SupportedLanguage));
        }
    } catch (e) {
        console.warn('[i18n] Erreur chargement langue sauvegardée :', e);
    }
};

// Initialisation dès le chargement du module
initLanguageFromStorage();

/**
 * Moteur d'interpolation de variables (supporte {name} et {{name}})
 */
function interpolate(template: string, params?: Record<string, any>): string {
    if (!params || typeof params !== 'object') return template;
    let result = template;
    for (const [k, v] of Object.entries(params)) {
        const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\{\\s*${k}\\s*\\}`, 'g');
        result = result.replace(regex, String(v));
    }
    return result;
}

/**
 * Fonction de traduction universelle et tolérante aux préfixes de namespaces
 */
export const t = (
    key: string,
    paramsOrFallback?: Record<string, any> | string,
    fallback?: string
): string => {
    const params = typeof paramsOrFallback === 'object' ? paramsOrFallback : undefined;
    const defaultFallback = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback;

    const lang = currentActiveLang;
    const cleanKey = key.replace(/^(profile|common|tabs|monitoring|settings|dashboard|alerts|alert|sensor)\./, '');

    const activeDict = DICTIONARIES[lang] || DICTIONARIES.fr;
    let matched: string | undefined;

    if (activeDict && activeDict[key] !== undefined) {
        matched = activeDict[key];
    } else if (activeDict && activeDict[cleanKey] !== undefined) {
        matched = activeDict[cleanKey];
    }

    if (matched === undefined) {
        // Repli sur le français si non trouvé dans la langue cible
        const fallbackDict = DICTIONARIES.fr;
        if (fallbackDict && fallbackDict[key] !== undefined) {
            matched = fallbackDict[key];
        } else if (fallbackDict && fallbackDict[cleanKey] !== undefined) {
            matched = fallbackDict[cleanKey];
        }
    }

    const resolved = matched !== undefined ? matched : (defaultFallback || key);
    return interpolate(resolved, params);
};

/**
 * Hook React pour réactivité instantanée dans les composants
 */
export const useTranslation = () => {
    const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getActiveLanguage);

    useEffect(() => {
        const handler: Listener = (lang) => {
            setCurrentLanguage(lang);
        };
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    const translate = useCallback(
        (
            key: string,
            paramsOrFallback?: Record<string, any> | string,
            fallback?: string
        ): string => {
            const params = typeof paramsOrFallback === 'object' ? paramsOrFallback : undefined;
            const defaultFallback = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback;

            const cleanKey = key.replace(/^(profile|common|tabs|monitoring|settings|dashboard|alerts|alert|sensor)\./, '');
            const activeDict = DICTIONARIES[currentLanguage] || DICTIONARIES.fr;

            let matched: string | undefined;
            if (activeDict && activeDict[key] !== undefined) {
                matched = activeDict[key];
            } else if (activeDict && activeDict[cleanKey] !== undefined) {
                matched = activeDict[cleanKey];
            }

            if (matched === undefined) {
                const fallbackDict = DICTIONARIES.fr;
                if (fallbackDict && fallbackDict[key] !== undefined) {
                    matched = fallbackDict[key];
                } else if (fallbackDict && fallbackDict[cleanKey] !== undefined) {
                    matched = fallbackDict[cleanKey];
                }
            }

            const resolved = matched !== undefined ? matched : (defaultFallback || key);
            return interpolate(resolved, params);
        },
        [currentLanguage]
    );

    return {
        t: translate,
        language: currentLanguage,
        isRTL: currentLanguage === 'ar',
        changeLanguage,
    };
};

export { i18next as i18n };
export default i18next;
