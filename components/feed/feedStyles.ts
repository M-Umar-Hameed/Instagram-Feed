import {
  Dimensions,
  ImageStyle,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { colors } from '../../utils/theme';

// Use 'screen' to get full screen dimensions, then subtract system UI
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

const getResponsiveSize = (percentage: number, min: number, max: number) => {
  const size = wp(percentage);
  return Math.max(min, Math.min(max, size));
};

const getResponsiveFontSize = (percentage: number, min: number, max: number) => {
  const size = wp(percentage);
  return Math.max(min, Math.min(max, size));
};

const getResponsiveHeight = (percentage: number, min: number, max: number) => {
  const size = hp(percentage);
  return Math.max(min, Math.min(max, size));
};

export const RESPONSIVE = {
  iconTiny: getResponsiveSize(3, 12, 16),
  iconSmall: getResponsiveSize(4, 16, 20),
  iconMedium: getResponsiveSize(5, 20, 26),
  iconLarge: getResponsiveSize(7, 28, 36),
  iconXLarge: getResponsiveSize(10, 40, 52),
  iconHeart: getResponsiveSize(25, 80, 120),

  fontTiny: getResponsiveFontSize(2.5, 10, 13),
  fontSmall: getResponsiveFontSize(3, 12, 15),
  fontMedium: getResponsiveFontSize(3.5, 13, 16),
  fontLarge: getResponsiveFontSize(4, 15, 19),
  fontXLarge: getResponsiveFontSize(4.5, 17, 21),

  spaceXSmall: getResponsiveSize(1, 4, 8),
  spaceSmall: getResponsiveSize(2, 8, 12),
  spaceMedium: getResponsiveSize(3, 12, 16),
  spaceLarge: getResponsiveSize(4, 16, 20),
  spaceXLarge: getResponsiveSize(5, 20, 28),

  heightSmall: getResponsiveHeight(0.8, 6, 10),
  heightMedium: getResponsiveHeight(1.5, 12, 18),
  heightLarge: getResponsiveHeight(2.5, 20, 28),

  avatarSmall: getResponsiveSize(5, 20, 28),
  avatarMedium: getResponsiveSize(8, 32, 42),
  avatarLarge: getResponsiveSize(11, 44, 56),

  radiusSmall: getResponsiveSize(1, 4, 8),
  radiusMedium: getResponsiveSize(2.5, 10, 16),
  radiusLarge: getResponsiveSize(5, 20, 28),
};

export const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  emptyContainer: {
    flex: 1,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  emptyText: {
    color: colors.white,
    fontSize: RESPONSIVE.fontLarge,
    fontWeight: '500',
  } as TextStyle,

  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.black,
    position: 'relative',
  } as ViewStyle,

  videoWrapperFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 0,
  } as ViewStyle,

  videoFullBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
  } as ViewStyle,

  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as ViewStyle,

  bottomLeftContent: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT > 900 ? Math.min(hp('2%'), 30) : Math.min(hp('2%'), 40),
    left: wp('2%'),
    right: wp('25%'),
    zIndex: 10,
  } as ViewStyle,

  usernameContainer: {
    paddingVertical: RESPONSIVE.spaceXSmall,
    paddingHorizontal: 0,
    marginBottom: RESPONSIVE.spaceSmall,
    marginLeft: 0,
  } as ViewStyle,

  videoUsername: {
    color: colors.white,
    fontSize: RESPONSIVE.fontLarge,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  lightBgUsername: {
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  videoCaption: {
    color: colors.white,
    fontSize: RESPONSIVE.fontMedium,
    lineHeight: RESPONSIVE.fontMedium * 1.4,
    marginBottom: RESPONSIVE.spaceXSmall,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  lightBgCaption: {
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  videoTags: {
    color: '#00b1ff',
    fontSize: RESPONSIVE.fontSmall,
    fontWeight: '600',
    marginBottom: RESPONSIVE.spaceSmall,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  clickableHashtag: {
    color: '#00b1ff',
    fontWeight: '700',
    textDecorationLine: 'none',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  readMoreText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: RESPONSIVE.fontMedium,
    fontWeight: '600',
    marginTop: RESPONSIVE.spaceXSmall,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  circleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 177, 255, 0.3)',
    paddingHorizontal: RESPONSIVE.spaceSmall,
    paddingVertical: RESPONSIVE.spaceXSmall,
    borderRadius: RESPONSIVE.spaceSmall,
    marginBottom: RESPONSIVE.spaceSmall,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  } as ViewStyle,

  circleBadgeLight: {
    backgroundColor: 'rgba(0, 177, 255, 0.3)',
  } as ViewStyle,

  circleBadgeText: {
    color: '#fff',
    fontSize: RESPONSIVE.fontSmall,
    fontWeight: '600',
    marginLeft: RESPONSIVE.spaceXSmall,
    maxWidth: wp('40%'),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  circleBadgeTextLight: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RESPONSIVE.spaceXSmall,
  } as ViewStyle,

  repostText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: RESPONSIVE.fontSmall,
    marginLeft: RESPONSIVE.spaceXSmall,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  userAuraDisplayContainer: {
    marginTop: RESPONSIVE.spaceSmall,
  } as ViewStyle,

  userAuraDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: RESPONSIVE.radiusMedium,
    paddingVertical: RESPONSIVE.spaceXSmall,
    paddingHorizontal: RESPONSIVE.spaceSmall,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  } as ViewStyle,

  userAuraText: {
    color: '#FFD700',
    fontSize: RESPONSIVE.fontSmall,
    fontWeight: '600',
    marginLeft: RESPONSIVE.spaceXSmall,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  rightSideActions: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT > 900 ? Math.min(hp('2%'), 30) : Math.min(hp('2%'), 40),
    right: RESPONSIVE.spaceMedium,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,

  profileSection: {
    position: 'relative',
    marginBottom: RESPONSIVE.heightMedium,
    alignItems: 'center',
  } as ViewStyle,

  profileButtonWrapper: {
    position: 'relative',
  } as ViewStyle,

  profileImage: {
    width: RESPONSIVE.avatarLarge,
    height: RESPONSIVE.avatarLarge,
    borderRadius: RESPONSIVE.avatarLarge / 2,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  } as ImageStyle,

  followBadge: {
    position: 'absolute',
    bottom: -RESPONSIVE.spaceXSmall,
    left: '50%',
    marginLeft: -(RESPONSIVE.avatarSmall / 2),
    width: RESPONSIVE.avatarSmall,
    height: RESPONSIVE.avatarSmall,
    borderRadius: RESPONSIVE.avatarSmall / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
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

  actionCount: {
    color: colors.white,
    fontSize: RESPONSIVE.fontSmall,
    fontWeight: '600',
    marginTop: RESPONSIVE.spaceXSmall,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  lightBgText: {
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  } as TextStyle,

  repostedText: {
    color: '#4CD4CA',
  } as TextStyle,

  auraButtonCompact: {
    width: RESPONSIVE.iconLarge + 8,
    height: RESPONSIVE.iconLarge + 8,
    borderRadius: (RESPONSIVE.iconLarge + 8) / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  } as ViewStyle,

  pauseIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  } as ViewStyle,

  tiktokProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  } as ViewStyle,

  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  } as ViewStyle,

  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.5)',
  } as ViewStyle,

  progressTouchArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp('12%'),
  } as ViewStyle,

  progressBarTrackExpanded: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  } as ViewStyle,

  progressBarFillExpanded: {
    backgroundColor: '#fff',
  } as ViewStyle,

  seekThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  } as ViewStyle,

  seekTimeIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 101,
  } as ViewStyle,

  seekTimeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
  } as ViewStyle,

  seekTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,

  seekingOverlay: {
    position: 'absolute',
    bottom: hp('8%'),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 101,
  } as ViewStyle,

  thumbnailPreview: {
    width: wp('30%'),
    height: hp('18%'),
    borderRadius: wp('2%'),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#000',
  } as ViewStyle,

  thumbnailImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,

  seekingTimeText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontWeight: '700',
    marginTop: hp('1.5%'),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  heartAnimationContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -(RESPONSIVE.iconHeart / 2),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  } as ViewStyle,

  auraAnimationContainer: {
    position: 'absolute',
    top: '30%',
    right: wp('20%'),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  } as ViewStyle,

  auraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: RESPONSIVE.radiusMedium,
    paddingVertical: RESPONSIVE.spaceSmall,
    paddingHorizontal: RESPONSIVE.spaceMedium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  } as ViewStyle,

  auraText: {
    color: '#000',
    fontSize: RESPONSIVE.fontMedium,
    fontWeight: '700',
    marginLeft: RESPONSIVE.spaceXSmall,
  } as TextStyle,

  disabledUsername: {
    opacity: 0.7,
  } as TextStyle,

  emptyFollowingContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('10%'),
  } as ViewStyle,

  emptyFollowingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: hp('15%'),
  } as ViewStyle,

  emptyFollowingTitle: {
    color: colors.white,
    fontSize: RESPONSIVE.fontXLarge,
    fontWeight: '700',
    marginTop: RESPONSIVE.spaceLarge,
    textAlign: 'center',
  } as TextStyle,

  emptyFollowingSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: RESPONSIVE.fontMedium,
    marginTop: RESPONSIVE.spaceMedium,
    textAlign: 'center',
    lineHeight: RESPONSIVE.fontMedium * 1.6,
    paddingHorizontal: wp('5%'),
  } as TextStyle,

  endMessageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('10%'),
  } as ViewStyle,

  endMessageContent: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  endMessageTitle: {
    color: colors.white,
    fontSize: RESPONSIVE.fontXLarge,
    fontWeight: '700',
    marginTop: RESPONSIVE.spaceMedium,
    textAlign: 'center',
  } as TextStyle,

  endMessageSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: RESPONSIVE.fontMedium,
    marginTop: RESPONSIVE.spaceSmall,
    textAlign: 'center',
    lineHeight: RESPONSIVE.fontMedium * 1.5,
  } as TextStyle,

  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00b1ff',
    paddingHorizontal: wp('8%'),
    paddingVertical: hp('1.8%'),
    borderRadius: wp('8%'),
    marginTop: RESPONSIVE.spaceLarge,
    shadowColor: '#00b1ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,

  switchButtonText: {
    color: colors.white,
    fontSize: RESPONSIVE.fontLarge,
    fontWeight: '700',
    marginRight: RESPONSIVE.spaceSmall,
  } as TextStyle,

  carouselPaginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    gap: 6,
  } as ViewStyle,

  carouselPaginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  } as ViewStyle,

  carouselPaginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,

  carouselPaginationDotVideo: {
    borderWidth: 1,
    borderColor: colors.primary,
  } as ViewStyle,

  carouselCounterBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  } as ViewStyle,

  carouselCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,

  carouselVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  } as ViewStyle,

  carouselVideoIndicator: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as ViewStyle,
});
