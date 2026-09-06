export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'soil_moisture'
  | 'light'
  | 'ph'
  | 'ec'
  | 'water_level';

export interface SensorReading {
  id: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
  min?: number;
  max?: number;
  icon?: string;
  label: string;
}

export interface SensorHistory {
  type: SensorType;
  label: string;
  unit: string;
  data: { time: string; value: number }[];
}

export interface GreenhouseStatus {
  id: string;
  name: string;
  isOnline: boolean;
  lastSync: string;
  plantHealth: number; // 0-100
  sensors: SensorReading[];
  activeAlerts: number;
}
