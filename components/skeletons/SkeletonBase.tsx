import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ViewStyle,
  Easing,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonBaseProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  backgroundColor?: string;
  shimmerColor?: string;
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  width,
  height,
  borderRadius = 4,
  style,
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  shimmerColor = 'rgba(255, 255, 255, 0.2)',
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerContainer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.shimmer, { backgroundColor: shimmerColor }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  } as ViewStyle,
  shimmerContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    flexDirection: 'row',
  } as ViewStyle,
  shimmer: {
    width: 100,
    height: '100%',
    opacity: 0.5,
  } as ViewStyle,
});

export default SkeletonBase;
