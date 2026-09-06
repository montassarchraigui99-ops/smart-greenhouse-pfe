import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../constants/theme';

interface ProgressBarProps {
    progress: number; // 0 to 100
    color?: string;
    height?: number;
    backgroundColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    color = Colors.primary,
    height = 6,
    backgroundColor = Colors.background,
}) => {
    // Using standard React Native Animated instead of Reanimated for simplicity and minimal overhead
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progress,
            duration: 500, // Fixed, predictable timing
            useNativeDriver: false, // width doesn't support native driver
        }).start();
    }, [progress]);

    const widthInterpolation = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={[styles.container, { height, backgroundColor, borderRadius: height / 2 }]}>
            <Animated.View
                style={[
                    styles.fill,
                    {
                        width: widthInterpolation,
                        backgroundColor: color,
                        borderRadius: height / 2
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
    },
});
