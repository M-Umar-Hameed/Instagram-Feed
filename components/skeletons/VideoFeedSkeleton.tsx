import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ViewStyle,
  Animated,
  Easing,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing (matching InstagramReelsFeed exactly)
const getResponsiveSize = (percentage: number, min: number, max: number) => {
  const size = wp(percentage);
  return Math.max(min, Math.min(max, size));
};

const getResponsiveHeight = (percentage: number, min: number, max: number) => {
  const size = hp(percentage);
  return Math.max(min, Math.min(max, size));
};

const RESPONSIVE = {
  iconSmall: getResponsiveSize(4, 16, 20),
  iconLarge: getResponsiveSize(7, 28, 36),
  iconTiny: getResponsiveSize(3, 12, 16),
  fontSmall: getResponsiveSize(3, 12, 15),
  fontMedium: getResponsiveSize(3.5, 13, 16),
  fontLarge: getResponsiveSize(4, 15, 19),
  spaceXSmall: getResponsiveSize(1, 4, 8),
  spaceSmall: getResponsiveSize(2, 8, 12),
  spaceMedium: getResponsiveSize(3, 12, 16),
  spaceLarge: getResponsiveSize(4, 16, 20),
  heightMedium: getResponsiveHeight(1.5, 12, 18),
  avatarSmall: getResponsiveSize(5, 20, 28),
  avatarLarge: getResponsiveSize(11, 44, 56),
};

interface VideoFeedSkeletonProps {
  count?: number;
}

// Shimmer effect component
const ShimmerBox = memo<{
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}>(({ width, height, borderRadius = 4, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          opacity,
        },
        style,
      ]}
    />
  );
});
ShimmerBox.displayName = 'ShimmerBox';

// Single video skeleton item matching Reels UI exactly
const VideoSkeletonItem = memo(() => {
  return (
    <View style={styles.videoContainer}>
      {/* Full screen dark background */}
      <View style={styles.videoBackground} />

      {/* Bottom Left Content - Username & Caption */}
      <View style={styles.bottomLeftContent}>
        {/* Username skeleton */}
        <ShimmerBox
          width={wp('35%')}
          height={RESPONSIVE.fontLarge + 4}
          borderRadius={4}
          style={styles.usernameSkeleton}
        />

        {/* Caption skeleton - 2 lines */}
        <ShimmerBox
          width={wp('55%')}
          height={RESPONSIVE.fontMedium}
          borderRadius={4}
          style={styles.captionSkeleton}
        />
        <ShimmerBox
          width={wp('40%')}
          height={RESPONSIVE.fontMedium}
          borderRadius={4}
        />
      </View>

      {/* Right Side Actions - Matching InstagramReelsFeed exactly */}
      <View style={styles.rightSideActions}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Image Circle */}
          <View style={styles.profileImageContainer}>
            <ShimmerBox
              width={RESPONSIVE.avatarLarge}
              height={RESPONSIVE.avatarLarge}
              borderRadius={RESPONSIVE.avatarLarge / 2}
            />
          </View>
          {/* Follow Badge */}
          <View style={styles.followBadge}>
            <Ionicons
              name="add-circle-sharp"
              size={RESPONSIVE.iconTiny}
              color="rgba(255, 255, 255, 0.3)"
            />
          </View>
        </View>

        {/* Upvote Action */}
        <View style={styles.actionItem}>
          <View style={styles.actionButton}>
            <Ionicons
              name="arrow-up"
              size={RESPONSIVE.iconLarge}
              color="rgba(255, 255, 255, 0.25)"
            />
          </View>
          <ShimmerBox
            width={30}
            height={RESPONSIVE.fontSmall}
            borderRadius={4}
            style={styles.actionCountSkeleton}
          />
        </View>

        {/* Downvote Action */}
        <View style={styles.actionItem}>
          <View style={styles.actionButton}>
            <Ionicons
              name="arrow-down"
              size={RESPONSIVE.iconLarge}
              color="rgba(255, 255, 255, 0.25)"
            />
          </View>
        </View>

        {/* Comments Button */}
        <View style={styles.actionItem}>
          <View style={styles.actionButton}>
            <Ionicons
              name="chatbubble-ellipses"
              size={RESPONSIVE.iconLarge}
              color="rgba(255, 255, 255, 0.2)"
            />
          </View>
          <ShimmerBox
            width={30}
            height={RESPONSIVE.fontSmall}
            borderRadius={4}
            style={styles.actionCountSkeleton}
          />
        </View>

        {/* Share/Repost Button */}
        <View style={styles.actionItem}>
          <View style={styles.actionButton}>
            <Ionicons
              name="arrow-redo"
              size={RESPONSIVE.iconLarge}
              color="rgba(255, 255, 255, 0.2)"
            />
          </View>
          <ShimmerBox
            width={25}
            height={RESPONSIVE.fontSmall}
            borderRadius={4}
            style={styles.actionCountSkeleton}
          />
        </View>
      </View>
    </View>
  );
});
VideoSkeletonItem.displayName = 'VideoSkeletonItem';

// Main skeleton component for the feed
const VideoFeedSkeleton: React.FC<VideoFeedSkeletonProps> = ({ count = 1 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <VideoSkeletonItem key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  } as ViewStyle,

  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.black,
    position: 'relative',
  } as ViewStyle,

  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  } as ViewStyle,

  bottomLeftContent: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT > 900 ? Math.min(hp('8%'), 80) : Math.min(hp('12%'), 120),
    left: RESPONSIVE.spaceLarge,
    right: wp('25%'),
    zIndex: 10,
  } as ViewStyle,

  usernameSkeleton: {
    marginBottom: RESPONSIVE.spaceSmall,
  } as ViewStyle,

  captionSkeleton: {
    marginBottom: RESPONSIVE.spaceXSmall,
  } as ViewStyle,

  rightSideActions: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT > 900 ? Math.min(hp('8%'), 80) : Math.min(hp('12%'), 120),
    right: RESPONSIVE.spaceMedium,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,

  profileSection: {
    position: 'relative',
    marginBottom: RESPONSIVE.heightMedium,
    alignItems: 'center',
  } as ViewStyle,

  profileImageContainer: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RESPONSIVE.avatarLarge / 2,
  } as ViewStyle,

  followBadge: {
    position: 'absolute',
    bottom: -RESPONSIVE.spaceXSmall,
    left: '50%',
    marginLeft: -(RESPONSIVE.avatarSmall / 2),
    width: RESPONSIVE.avatarSmall,
    height: RESPONSIVE.avatarSmall,
    borderRadius: RESPONSIVE.avatarSmall / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  actionItem: {
    alignItems: 'center',
    marginBottom: RESPONSIVE.heightMedium,
  } as ViewStyle,

  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: RESPONSIVE.iconLarge + 8,
    minWidth: RESPONSIVE.iconLarge + 8,
  } as ViewStyle,

  actionCountSkeleton: {
    marginTop: RESPONSIVE.spaceXSmall,
  } as ViewStyle,
});

export default VideoFeedSkeleton;
