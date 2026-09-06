export type ActuatorType = 'irrigation' | 'pump' | 'ventilation' | 'lighting';
export type ActuatorMode = 'manual' | 'auto';

export interface Actuator {
    id: string;
    type: ActuatorType;
    name: string;
    isActive: boolean;
    mode: ActuatorMode;
    lastUpdated: string;
    icon: string;
    description: string;
}
