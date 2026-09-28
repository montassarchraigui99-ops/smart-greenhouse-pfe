/**
 * Rôle : Lead Systems Architect & Principal Full-Stack Engineer
 * Fichier : context/ActiveGreenhouseContext.tsx
 * Objectif : Contexte global de gestion de la serre active (Architecture Multi-Serres).
 *            Garantit l'étanchéité des données et le re-fetch automatique des composants consommateurs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Greenhouse, fetchGreenhouses, fetchGreenhouseById } from '../services/api';

interface ActiveGreenhouseContextType {
    activeGreenhouseId: string;
    activeGreenhouse: Greenhouse | null;
    greenhouses: Greenhouse[];
    isLoading: boolean;
    isMultiViewOpen: boolean;
    setIsMultiViewOpen: (open: boolean) => void;
    isManagementModalOpen: boolean;
    setIsManagementModalOpen: (open: boolean) => void;
    selectGreenhouse: (greenhouseId: string) => void;
    refreshGreenhouses: () => Promise<Greenhouse[]>;
}

const STORAGE_KEY = 'CYBERCORTEX_ACTIVE_GREENHOUSE_ID';

const defaultContext: ActiveGreenhouseContextType = {
    activeGreenhouseId: 'gh-01',
    activeGreenhouse: null,
    greenhouses: [],
    isLoading: true,
    isMultiViewOpen: false,
    setIsMultiViewOpen: () => {},
    isManagementModalOpen: false,
    setIsManagementModalOpen: () => {},
    selectGreenhouse: () => {},
    refreshGreenhouses: async () => [],
};

const ActiveGreenhouseContext = createContext<ActiveGreenhouseContextType>(defaultContext);

export const ActiveGreenhouseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeGreenhouseId, setActiveGreenhouseId] = useState<string>('gh-01');
    const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isMultiViewOpen, setIsMultiViewOpen] = useState<boolean>(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState<boolean>(false);

    // Chargement initial des serres & restauration de la dernière serre sélectionnée
    const loadInitialState = useCallback(async () => {
        try {
            setIsLoading(true);

            // Restauration depuis le stockage local (Web ou Mobile)
            let savedId: string | null = null;
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                savedId = window.localStorage.getItem(STORAGE_KEY);
            }

            const data = await fetchGreenhouses();
            setGreenhouses(data);

            if (data && data.length > 0) {
                // Si l'identifiant sauvegardé existe dans les serres reçues, on l'utilise
                if (savedId && data.some(g => g.id === savedId)) {
                    setActiveGreenhouseId(savedId);
                } else {
                    setActiveGreenhouseId(data[0].id);
                }
            }
        } catch (error) {
            console.error('[CONTEXT-ERROR] Impossible de charger les serres :', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInitialState();
    }, [loadInitialState]);

    // Rafraîchissement périodique (toutes les 15s) pour synchroniser les alertes et les températures live
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await fetchGreenhouses();
                if (data && data.length > 0) {
                    setGreenhouses(data);
                }
            } catch (err) {
                // Silencieux pour ne pas polluer l'expérience utilisateur
            }
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Changement de serre active avec persistance
    const selectGreenhouse = useCallback((greenhouseId: string) => {
        console.log(`[ACTIVE-GREENHOUSE] Changement de serre active vers : ${greenhouseId}`);
        setActiveGreenhouseId(greenhouseId);

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, greenhouseId);
        }
    }, []);

    const refreshGreenhouses = useCallback(async (): Promise<Greenhouse[]> => {
        try {
            const data = await fetchGreenhouses();
            setGreenhouses(data);
            return data;
        } catch (error) {
            console.error('[CONTEXT-ERROR] refreshGreenhouses :', error);
            return [];
        }
    }, []);

    // Serre active courante dérivée
    const activeGreenhouse = greenhouses.find(g => g.id === activeGreenhouseId) || (greenhouses.length > 0 ? greenhouses[0] : null);

    return (
        <ActiveGreenhouseContext.Provider
            value={{
                activeGreenhouseId,
                activeGreenhouse,
                greenhouses,
                isLoading,
                isMultiViewOpen,
                setIsMultiViewOpen,
                isManagementModalOpen,
                setIsManagementModalOpen,
                selectGreenhouse,
                refreshGreenhouses
            }}
        >
            {children}
        </ActiveGreenhouseContext.Provider>
    );
};

export const useActiveGreenhouse = () => {
    const context = useContext(ActiveGreenhouseContext);
    if (!context) {
        throw new Error('useActiveGreenhouse doit être utilisé au sein d\'un ActiveGreenhouseProvider');
    }
    return context;
};
