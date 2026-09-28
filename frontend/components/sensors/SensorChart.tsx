import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { SensorHistory, SensorType } from '../../types/sensor';
import { useTranslation } from '../../i18n';

const screenWidth = Dimensions.get('window').width;

export type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';
export const TIME_RANGES: TimeRange[] = ['1H', '6H', '24H', '7D', '30D'];

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
    selectedRange?: TimeRange;
    onRangeChange?: (range: TimeRange) => void;
}

export const SensorChart: React.FC<SensorChartProps> = ({
    history,
    selectedRange: initialRange = '24H',
    onRangeChange,
}) => {
    const { t } = useTranslation();
    const [activeRange, setActiveRange] = useState<TimeRange>(initialRange);
    const color = sensorColors[history.type] || Colors.primary;

    const handleSelectRange = (range: TimeRange) => {
        setActiveRange(range);
        onRangeChange?.(range);
    };

    // Format data points for gifted charts with smooth Bézier interpolation
    const chartData = history.data.map((d, index) => {
        const showLabel = index % Math.max(1, Math.floor(history.data.length / 4)) === 0;
        return {
            value: d.value,
            label: showLabel ? d.time : '',
            labelTextStyle: { color: Colors.textMuted, fontSize: 10, fontFamily: Typography.monoFont },
            hideDataPoint: Platform.OS === 'web',
        };
    });

    const isWeb = Platform.OS === 'web';

    return (
        <View style={styles.container}>
            {/* Header with Title & Metric Tag */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{t(history.type, history.label)}</Text>
                    <Text style={styles.subtitle}>{t('monitoring.telemetry_sync', 'Télémétrie en continu')}</Text>
                </View>
                <View style={[styles.unitBadge, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
                    <Text style={[styles.unitText, { color }]}>{history.unit}</Text>
                </View>
            </View>

            {/* Segmented Time-Range Control */}
            <View style={styles.segmentedContainer}>
                {TIME_RANGES.map((range) => {
                    const isActive = activeRange === range;
                    return (
                        <Pressable
                            key={range}
                            onPress={() => handleSelectRange(range)}
                            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                                {range}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Chart Canvas with Smooth Bézier & Minimal Grid */}
            <View style={styles.chartWrapper}>
                <LineChart
                    curved
                    curveType={0} // Smooth cubic Bézier
                    data={chartData.length > 0 ? chartData : [{ value: 0, label: '' }]}
                    width={Math.min(screenWidth - 72, 800)}
                    height={180}
                    color={color}
                    thickness={2.5}
                    areaChart
                    startFillColor={color}
                    endFillColor={`${color}00`}
                    startOpacity={0.25}
                    endOpacity={0.01}
                    initialSpacing={12}
                    endSpacing={12}
                    noOfSections={3} // Minimal horizontal lines
                    rulesColor={Colors.border}
                    rulesType="solid"
                    yAxisColor="transparent"
                    xAxisColor={Colors.border}
                    yAxisTextStyle={{
                        color: Colors.textMuted,
                        fontSize: 10,
                        fontFamily: Typography.monoFont,
                    }}
                    xAxisLabelTextStyle={{
                        color: Colors.textMuted,
                        fontSize: 10,
                        fontFamily: Typography.monoFont,
                    }}
                    hideDataPoints={isWeb}
                    dataPointsColor={color}
                    dataPointsRadius={3}
                    isAnimated={!isWeb}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg, // 16px
        padding: Spacing.xl, // 24px
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.diffuse,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textDark,
        fontFamily: Typography.primaryFont,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
        marginTop: 2,
    },
    unitBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    unitText: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Typography.monoFont,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: 3,
        marginBottom: Spacing.lg,
        alignSelf: 'flex-start',
    },
    segmentBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm + 2,
        ...Platform.select({
            web: { cursor: 'pointer', userSelect: 'none' } as any,
            default: {},
        }),
    },
    segmentBtnActive: {
        backgroundColor: Colors.surface,
        ...Shadows.subtle,
    },
    segmentText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textMuted,
        fontFamily: Typography.primaryFont,
    },
    segmentTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    chartWrapper: {
        marginStart: -12,
        overflow: 'hidden',
    },
});

export default SensorChart;
