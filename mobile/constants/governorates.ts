/**
 * Référentiel Immuable des 24 Gouvernorats de la République Tunisienne
 * Système CyberCortex ERP - Module Géographique & Télémétrique
 */

export const TUNISIAN_GOVERNORATES = [
    'Ariana',
    'Béja',
    'Ben Arous',
    'Bizerte',
    'Gabès',
    'Gafsa',
    'Jendouba',
    'Kairouan',
    'Kasserine',
    'Kebili',
    'Le Kef',
    'Mahdia',
    'La Manouba',
    'Médenine',
    'Monastir',
    'Nabeul',
    'Sfax',
    'Sidi Bouzid',
    'Siliana',
    'Sousse',
    'Tataouine',
    'Tozeur',
    'Tunis',
    'Zaghouan',
] as const;

export type Governorate = typeof TUNISIAN_GOVERNORATES[number];

/**
 * Options prêtes pour Picker / Dropdown / Select
 */
export interface GovernorateOption {
    label: string;
    value: Governorate;
}

export const GOVERNORATE_OPTIONS: GovernorateOption[] = TUNISIAN_GOVERNORATES.map((gov) => ({
    label: gov,
    value: gov,
}));

/**
 * Vérifie si une chaîne correspond à un gouvernorat tunisien valide
 */
export function isValidGovernorate(value: string): value is Governorate {
    return (TUNISIAN_GOVERNORATES as readonly string[]).includes(value);
}

/**
 * Gouvernorat par défaut du système
 */
export const DEFAULT_GOVERNORATE: Governorate = 'Tunis';
