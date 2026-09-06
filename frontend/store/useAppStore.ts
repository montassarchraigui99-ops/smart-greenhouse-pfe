import { create } from 'zustand';

interface AppState {
    greenhouseId: string;
    isDarkMode: boolean;
    notificationsEnabled: boolean;
    setGreenhouseId: (id: string) => void;
    toggleDarkMode: () => void;
    toggleNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    greenhouseId: 'gh-001',
    isDarkMode: false,
    notificationsEnabled: true,
    setGreenhouseId: (id: string) => set({ greenhouseId: id }),
    toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    toggleNotifications: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
}));
