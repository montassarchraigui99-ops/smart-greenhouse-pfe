import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SensorReading, SensorType } from '../../types/sensor';
import { Colors } from '../../constants/theme';
import { MetricCard } from '../ui/MetricCard';
import { StatusType } from '../ui/StatusBadge';

const sensorIcons: Record<SensorType, keyof typeof Ionicons.glyphMap> = {
    temperature: 'thermometer',
    humidity: 'water',
    soil_moisture: 'leaf',
    light: 'sunny',
    ph: 'flask',
    ec: 'flash',
    water_level: 'water',
};

const sensorColors: Record<SensorType, string> = {
    temperature: Colors.temperature,
    humidity: Colors.humidity,
    soil_moisture: Colors.soilMoisture,
    light: Colors.light,
    ph: Colors.ph,
    ec: Colors.ec,
    water_level: Colors.waterLevel,
};

interface SensorCardProps {
    reading: SensorReading;
    onPress?: () => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({ reading, onPress }) => {
    let progress = 0;
    if (reading.type === 'temperature') progress = (reading.value / 50) * 100;
    else if (reading.type === 'humidity' || reading.type === 'soil_moisture') progress = reading.value;
    else if (reading.type === 'light') progress = (reading.value / 100000) * 100;
    else if (reading.type === 'ph') progress = (reading.value / 14) * 100;
    else if (reading.type === 'ec') progress = (reading.value / 5) * 100;

    let mappedStatus: StatusType = 'healthy';
    if (reading.status === 'critical') mappedStatus = 'critical';
    else if (reading.status === 'warning') mappedStatus = 'attention';

    const accent = sensorColors[reading.type] || Colors.primary;
    const icon = sensorIcons[reading.type] || 'hardware-chip';

    return (
        <MetricCard
            label={reading.type.replace('_', ' ')}
            value={reading.value}
            unit={reading.unit}
            icon={icon}
            status={mappedStatus}
            progress={progress}
            accentColor={accent}
            onPress={onPress}
            style={{ width: '48%', marginBottom: 14 }}
        />
    );
};

export default SensorCard;
