import { SensorReading, SensorHistory, GreenhouseStatus } from '../types/sensor';
import { Alert } from '../types/alert';
import { Actuator } from '../types/control';
import { Recommendation } from '../types/recommendation';

// ── Sensor Readings ──────────────────────────────────────
export const mockSensors: SensorReading[] = [
    {
        id: 's1',
        type: 'temperature',
        value: 26.4,
        unit: '°C',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 18,
        max: 35,
        icon: 'thermometer',
        label: 'Temperature',
    },
    {
        id: 's2',
        type: 'humidity',
        value: 68,
        unit: '%',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 0,
        max: 100,
        icon: 'water-outline',
        label: 'Air Humidity',
    },
    {
        id: 's3',
        type: 'soil_moisture',
        value: 42,
        unit: '%',
        timestamp: new Date().toISOString(),
        status: 'warning',
        min: 0,
        max: 100,
        icon: 'leaf',
        label: 'Soil Moisture',
    },
    {
        id: 's4',
        type: 'light',
        value: 32000,
        unit: 'lux',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 0,
        max: 100000,
        icon: 'sunny',
        label: 'Light Intensity',
    },
    {
        id: 's5',
        type: 'ph',
        value: 6.2,
        unit: 'pH',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 0,
        max: 14,
        icon: 'flask',
        label: 'pH Level',
    },
    {
        id: 's6',
        type: 'ec',
        value: 1.8,
        unit: 'mS/cm',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 0,
        max: 5,
        icon: 'flash',
        label: 'EC Level',
    },
    {
        id: 's7',
        type: 'water_level',
        value: 72,
        unit: '%',
        timestamp: new Date().toISOString(),
        status: 'normal',
        min: 0,
        max: 100,
        icon: 'water',
        label: 'Water Tank',
    },
];

// ── Sensor History (for charts) ──────────────────────────
const generateHistory = (base: number, variance: number, count = 24): { time: string; value: number }[] => {
    return Array.from({ length: count }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        value: Math.round((base + (Math.random() - 0.5) * variance) * 10) / 10,
    }));
};

export const mockSensorHistory: SensorHistory[] = [
    { type: 'temperature', label: 'Temperature', unit: '°C', data: generateHistory(26, 8) },
    { type: 'humidity', label: 'Air Humidity', unit: '%', data: generateHistory(65, 20) },
    { type: 'soil_moisture', label: 'Soil Moisture', unit: '%', data: generateHistory(45, 15) },
    { type: 'light', label: 'Light Intensity', unit: 'lux', data: generateHistory(30000, 25000) },
    { type: 'ph', label: 'pH Level', unit: 'pH', data: generateHistory(6.2, 1.5) },
    { type: 'ec', label: 'EC Level', unit: 'mS/cm', data: generateHistory(1.8, 0.8) },
];

// ── Greenhouse Status ────────────────────────────────────
export const mockGreenhouse: GreenhouseStatus = {
    id: 'gh-001',
    name: 'Greenhouse Alpha',
    isOnline: true,
    lastSync: new Date().toISOString(),
    plantHealth: 87,
    sensors: mockSensors,
    activeAlerts: 3,
};

// ── Alerts ───────────────────────────────────────────────
export const mockAlerts: Alert[] = [
    {
        id: 'a1',
        severity: 'critical',
        title: 'Low Soil Moisture',
        message: 'Soil moisture has dropped below 40%. Immediate irrigation recommended to prevent crop damage.',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        read: false,
        sensorType: 'soil_moisture',
    },
    {
        id: 'a2',
        severity: 'warning',
        title: 'High Temperature',
        message: 'Greenhouse temperature approaching 32°C. Consider activating ventilation to cool down.',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        read: false,
        sensorType: 'temperature',
    },
    {
        id: 'a3',
        severity: 'warning',
        title: 'pH Drift Detected',
        message: 'pH level trending upward from 6.2 to 6.8 over the last 3 hours. Monitor nutrient solution.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: true,
        sensorType: 'ph',
    },
    {
        id: 'a4',
        severity: 'info',
        title: 'Ventilation Activated',
        message: 'Automatic ventilation was activated at 14:30 due to temperature threshold being reached.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
        sensorType: 'temperature',
    },
    {
        id: 'a5',
        severity: 'info',
        title: 'Water Tank Refilled',
        message: 'Water tank level restored to 95% after scheduled refill cycle.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        sensorType: 'water_level',
    },
    {
        id: 'a6',
        severity: 'critical',
        title: 'Pump Malfunction',
        message: 'Irrigation pump failed to start during scheduled watering cycle. Manual check required.',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        read: false,
        sensorType: 'irrigation',
    },
];

// ── Actuators ────────────────────────────────────────────
export const mockActuators: Actuator[] = [
    {
        id: 'act1',
        type: 'irrigation',
        name: 'Drip Irrigation',
        isActive: false,
        mode: 'auto',
        lastUpdated: new Date(Date.now() - 1200000).toISOString(),
        icon: 'water',
        description: 'Controls the drip irrigation system for all plant rows.',
    },
    {
        id: 'act2',
        type: 'pump',
        name: 'Main Water Pump',
        isActive: true,
        mode: 'manual',
        lastUpdated: new Date(Date.now() - 600000).toISOString(),
        icon: 'cog',
        description: 'Primary water pump connected to the main reservoir.',
    },
    {
        id: 'act3',
        type: 'ventilation',
        name: 'Roof Ventilation',
        isActive: true,
        mode: 'auto',
        lastUpdated: new Date(Date.now() - 300000).toISOString(),
        icon: 'fan',
        description: 'Roof-mounted ventilation fans for temperature regulation.',
    },
    {
        id: 'act4',
        type: 'lighting',
        name: 'Grow Lights',
        isActive: false,
        mode: 'auto',
        lastUpdated: new Date(Date.now() - 7200000).toISOString(),
        icon: 'bulb',
        description: 'Full-spectrum LED grow lights for supplemental lighting.',
    },
];

// ── AI Recommendations ───────────────────────────────────
export const mockRecommendations: Recommendation[] = [
    {
        id: 'r1',
        title: 'Irrigate Immediately',
        description: 'Low soil moisture detected (42%). Irrigation recommended to prevent plant stress. Optimal moisture level is 55-65%.',
        priority: 'high',
        category: 'Irrigation',
        actionLabel: 'Start Irrigation',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        icon: 'water',
    },
    {
        id: 'r2',
        title: 'Increase Ventilation',
        description: 'Temperature is trending high (26.4°C → 30°C predicted). Increase ventilation speed by 20% over the next 2 hours.',
        priority: 'medium',
        category: 'Climate',
        actionLabel: 'Adjust Ventilation',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        icon: 'thermometer',
    },
    {
        id: 'r3',
        title: 'Nutrient Solution Adjustment',
        description: 'EC levels slightly low (1.8 mS/cm). Consider increasing nutrient concentration by 10% for optimal tomato growth.',
        priority: 'medium',
        category: 'Nutrients',
        actionLabel: 'View Details',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        icon: 'flask',
    },
    {
        id: 'r4',
        title: 'Activate Grow Lights',
        description: 'Daylight hours decreasing. Supplement with 4 hours of artificial lighting (06:00-08:00, 17:00-19:00) for optimal photosynthesis.',
        priority: 'low',
        category: 'Lighting',
        actionLabel: 'Schedule Lights',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        icon: 'sunny',
    },
    {
        id: 'r5',
        title: 'Harvest Window Approaching',
        description: 'Based on growth patterns and current conditions, tomato crop section A is estimated to reach harvest readiness in 5-7 days.',
        priority: 'low',
        category: 'Planning',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        icon: 'leaf',
    },
];
