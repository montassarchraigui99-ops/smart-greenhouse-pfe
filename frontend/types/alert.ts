export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
    id: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    sensorType?: string;
}
