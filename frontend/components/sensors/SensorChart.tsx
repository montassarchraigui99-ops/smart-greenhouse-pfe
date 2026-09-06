import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { SensorHistory, SensorType } from '../../types/sensor';

const screenWidth = Dimensions.get('window').width;

const sensorColors: Record<SensorType, string> = {
    temperature: Colors.temperature,
    humidity: Colors.humidity,
    soil_moisture: Colors.soilMoisture,
    light: Colors.light,
    ph: Colors.ph,
    ec: Colors.ec,
    water_level: Colors.waterLevel,
};

interface SensorChartProps {
    history: SensorHistory;
}

export const SensorChart: React.FC<SensorChartProps> = ({ history }) => {
    const color = sensorColors[history.type] || Colors.primary;

    // Map data to react-native-gifted-charts format
    const chartData = history.data.map((d, index) => {
        // Only show labels for some points to prevent crowding
        const showLabel = index % 4 === 0;
        return {
            value: d.value,
            label: showLabel ? d.time : '',
            labelTextStyle: { color: Colors.textSecondary, fontSize: 10 },
            hideDataPoint: false,
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{history.label}</Text>
                <Text style={[styles.unit, { color }]}>{history.unit}</Text>
            </View>
            <View style={styles.chartWrapper}>
                <LineChart
                    hideDataPoints={Platform.OS === 'web'}
                    data={chartData}
                    width={screenWidth - 80}
                    height={160}
                    color={color}
                    thickness={3}
                    startFillColor={`${color}40`}
                    endFillColor={`${color}05`}
                    startOpacity={0.4}
                    endOpacity={0.05}
                    initialSpacing={0}
                    noOfSections={4}
                    areaChart
                    yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10, width: 40 }}
                    rulesColor={Colors.border}
                    rulesType="dashed"
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                    dataPointsColor={color}
                    dataPointsRadius={3}
                    curved
                    isAnimated
                    animationDuration={1000}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    unit: {
        fontSize: 13,
        fontWeight: '600',
    },
    chartWrapper: {
        marginLeft: -10, // Slight adjustment to pull the Y axis tighter
    }
});
