import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle | ViewStyle[];
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.md,
    style,
}) => {
    const pulseAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.75,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.35,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
};

export const MetricCardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    return (
        <View style={[styles.cardSkeleton, style]}>
            <View style={styles.rowBetween}>
                <Skeleton width={110} height={16} />
                <Skeleton width={50} height={20} borderRadius={BorderRadius.pill} />
            </View>
            <View style={{ marginVertical: 14 }}>
                <Skeleton width={130} height={32} />
            </View>
            <Skeleton width={80} height={14} />
        </View>
    );
};

export const ChartCardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    return (
        <View style={[styles.cardSkeleton, style]}>
            <View style={styles.rowBetween}>
                <View>
                    <Skeleton width={150} height={20} />
                    <Skeleton width={100} height={14} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={80} height={28} />
            </View>
            <View style={{ marginTop: 24, marginBottom: 8 }}>
                <Skeleton width="100%" height={180} borderRadius={BorderRadius.md} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: Colors.border,
    },
    cardSkeleton: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 20,
        marginBottom: 16,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});

export default Skeleton;
