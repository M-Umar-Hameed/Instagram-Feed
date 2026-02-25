import { memo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import SkeletonBase from './SkeletonBase';

// Responsive sizing
const getResponsiveSize = (percentage: number, min: number, max: number) => {
  const size = wp(percentage);
  return Math.max(min, Math.min(max, size));
};

const RESPONSIVE = {
  iconSmall: getResponsiveSize(4, 16, 20),
  iconMedium: getResponsiveSize(5, 20, 26),
  iconLarge: getResponsiveSize(7, 28, 36),
  fontSmall: getResponsiveSize(3, 12, 15),
  fontMedium: getResponsiveSize(3.5, 13, 16),
  fontLarge: getResponsiveSize(4, 15, 19),
  spaceXSmall: getResponsiveSize(1, 4, 8),
  spaceSmall: getResponsiveSize(2, 8, 12),
  avatarSmall: getResponsiveSize(5, 20, 28),
  avatarMedium: getResponsiveSize(8, 32, 42),
  avatarLarge: getResponsiveSize(11, 44, 56),
};

// Profile Image Skeleton
interface ProfileSkeletonProps {
  size?: 'small' | 'medium' | 'large';
  showFollowBadge?: boolean;
}

export const ProfileSkeleton = memo<ProfileSkeletonProps>(({
  size = 'large',
  showFollowBadge = true,
}) => {
  const avatarSize = size === 'small'
    ? RESPONSIVE.avatarSmall
    : size === 'medium'
      ? RESPONSIVE.avatarMedium
      : RESPONSIVE.avatarLarge;

  const badgeSize = RESPONSIVE.avatarSmall;

  return (
    <View style={styles.profileContainer}>
      <SkeletonBase
        width={avatarSize}
        height={avatarSize}
        borderRadius={avatarSize / 2}
      />
      {showFollowBadge && (
        <View style={[styles.followBadgeContainer, { marginLeft: -(badgeSize / 2) }]}>
          <SkeletonBase
            width={badgeSize}
            height={badgeSize}
            borderRadius={badgeSize / 2}
            backgroundColor="rgba(255, 255, 255, 0.3)"
          />
        </View>
      )}
    </View>
  );
});
ProfileSkeleton.displayName = 'ProfileSkeleton';

// Action Button Skeleton (Upvote, Downvote, Comments, Share)
interface ActionButtonSkeletonProps {
  showCount?: boolean;
  countWidth?: number;
}

export const ActionButtonSkeleton = memo<ActionButtonSkeletonProps>(({
  showCount = true,
  countWidth = 30,
}) => {
  return (
    <View style={styles.actionContainer}>
      <SkeletonBase
        width={RESPONSIVE.iconLarge}
        height={RESPONSIVE.iconLarge}
        borderRadius={4}
      />
      {showCount && (
        <SkeletonBase
          width={countWidth}
          height={RESPONSIVE.fontSmall}
          borderRadius={4}
          style={styles.countSkeleton}
        />
      )}
    </View>
  );
});
ActionButtonSkeleton.displayName = 'ActionButtonSkeleton';

// Text Line Skeleton
interface TextSkeletonProps {
  width: number | string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const TextSkeleton = memo<TextSkeletonProps>(({
  width,
  size = 'medium',
  style,
}) => {
  const height = size === 'small'
    ? RESPONSIVE.fontSmall
    : size === 'medium'
      ? RESPONSIVE.fontMedium
      : RESPONSIVE.fontLarge;

  return (
    <SkeletonBase
      width={width}
      height={height}
      borderRadius={4}
      style={style}
    />
  );
});
TextSkeleton.displayName = 'TextSkeleton';

// Username Skeleton
export const UsernameSkeleton = memo(() => {
  return (
    <SkeletonBase
      width={wp('35%')}
      height={RESPONSIVE.fontLarge + 4}
      borderRadius={4}
    />
  );
});
UsernameSkeleton.displayName = 'UsernameSkeleton';

// Caption Skeleton (multiple lines)
interface CaptionSkeletonProps {
  lines?: number;
}

export const CaptionSkeleton = memo<CaptionSkeletonProps>(({ lines = 2 }) => {
  const widths = ['55%', '40%', '50%', '30%'];

  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          width={wp(widths[index % widths.length])}
          height={RESPONSIVE.fontMedium}
          borderRadius={4}
          style={styles.captionLine}
        />
      ))}
    </View>
  );
});
CaptionSkeleton.displayName = 'CaptionSkeleton';

// Complete Right Side Actions Skeleton
export const RightSideActionsSkeleton = memo(() => {
  return (
    <View style={styles.rightActionsContainer}>
      {/* Profile */}
      <View style={styles.profileSection}>
        <ProfileSkeleton size="large" showFollowBadge={true} />
      </View>

      {/* Upvote */}
      <ActionButtonSkeleton showCount={true} countWidth={30} />

      {/* Downvote */}
      <ActionButtonSkeleton showCount={false} />

      {/* Comments */}
      <ActionButtonSkeleton showCount={true} countWidth={30} />

      {/* Share */}
      <ActionButtonSkeleton showCount={true} countWidth={25} />
    </View>
  );
});
RightSideActionsSkeleton.displayName = 'RightSideActionsSkeleton';

// Complete Bottom Left Content Skeleton
export const BottomLeftContentSkeleton = memo(() => {
  return (
    <View>
      <UsernameSkeleton />
      <View style={styles.captionContainer}>
        <CaptionSkeleton lines={2} />
      </View>
    </View>
  );
});
BottomLeftContentSkeleton.displayName = 'BottomLeftContentSkeleton';

const styles = StyleSheet.create({
  profileContainer: {
    position: 'relative',
    alignItems: 'center',
  } as ViewStyle,

  followBadgeContainer: {
    position: 'absolute',
    bottom: -RESPONSIVE.spaceXSmall,
    left: '50%',
  } as ViewStyle,

  actionContainer: {
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,

  countSkeleton: {
    marginTop: RESPONSIVE.spaceXSmall,
  } as ViewStyle,

  captionLine: {
    marginBottom: RESPONSIVE.spaceXSmall,
  } as ViewStyle,

  rightActionsContainer: {
    alignItems: 'center',
  } as ViewStyle,

  profileSection: {
    marginBottom: 12,
  } as ViewStyle,

  captionContainer: {
    marginTop: RESPONSIVE.spaceSmall,
  } as ViewStyle,
});
