
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Animated,
  BackHandler
} from 'react-native';
// Image import removed as it was unused

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { colors } from '../../utils/theme';
import InstagramReelsFeed from '../../components/InstagramReelsFeed';
import { FeedType, useFeed } from '../../hooks/useFeed';

import ErrorBoundary from '../../components/ErrorBoundary';
import { VideoFeedSkeleton } from '../../components/skeletons';
import { HeaderVisibilityContext } from './_layout';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useFullscreen } from '../../contexts/FullscreenContext';
import { FeedProvider } from '../../contexts/FeedContext';

// SCREEN_HEIGHT removed as it was unused

let savedPostId: string | null = null; // Shared post ID between feed styles

// Reset saved state on login/logout so feed starts fresh
export const resetHomeSavedState = () => {
  savedPostId = null;
};

export default function Reels() {
  const [feedType, setFeedType] = useState<FeedType>(FeedType.ForYou);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(savedPostId);
  const { isFullscreen, hideFullscreen } = useFullscreen();
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const { setHomeHeaderVisible } = useContext(HeaderVisibilityContext);
  const insets = useSafeAreaInsets();

  const statusBarHeight = Constants.statusBarHeight || 0;
  const headerHeight = hp('8%');

  // Tab bar height - must match _layout.tsx (45 + insets.bottom)
  const TAB_BAR_HEIGHT = 45 + insets.bottom;


  useEffect(() => {
    const backAction = () => {
      if (showSearchModal) {
        setShowSearchModal(false);
        return true;
      }
      if (isFullscreen) {
        hideFullscreen();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showSearchModal, isFullscreen, hideFullscreen]);

  useEffect(() => {
    setHomeHeaderVisible(false); // Reels doesn't use the standard home header
  }, [setHomeHeaderVisible]);

  const { posts, users, loading, refreshing, handleRefresh, loadMore, addLikedPost } =
    useFeed(feedType);

  // Callback when current post changes in either feed
  const handleCurrentPostChange = (postId: string) => {
    setCurrentPostId(postId);
    savedPostId = postId;
  };

  const handleFeedTypeChange = (newFeedType: FeedType) => {
    setFeedType(newFeedType);
  };

  // Search press handler
  const handleSearchPress = () => {
    setShowSearchModal(true);
  };

  const Header = () => (
    <Animated.View
      style={[
        styles.header,
        styles.reelsHeader,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          pointerEvents: 'auto',
          top: statusBarHeight,
          paddingTop: hp('1%'),
        },
      ]}
    >
      {isFullscreen ? (
        <>
          <View style={styles.leftSection}></View>
          <View style={styles.rightSection}></View>
        </>
      ) : (
        <>
          <View style={styles.leftSection}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: Math.min(wp('3.5%'), 14) }}>
              Reels
            </Text>
          </View>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleFeedTypeChange(FeedType.Following)}
            >
              <Text
                style={
                  feedType === FeedType.Following
                    ? styles.activeHeaderText
                    : styles.headerText
                }
              >
                Following
              </Text>
              {feedType === FeedType.Following && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleFeedTypeChange(FeedType.ForYou)}
            >
              <Text
                style={
                  feedType === FeedType.ForYou
                    ? styles.activeHeaderText
                    : styles.headerText
                }
              >
                World Feed
              </Text>
              {feedType === FeedType.ForYou && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchPress}
            >
              <Ionicons
                name="search"
                size={Math.min(wp('6%'), 24)}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </Animated.View>
  );

  const containerStyle = [
    styles.container,
    {
      backgroundColor: 'black'
    },
  ];

  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle='light-content'
        backgroundColor='transparent'
        translucent={true}
      />

      <FeedProvider addLikedPost={addLikedPost}>
        <View style={[
          styles.reelsContainer,
          // Don't extend behind tab bar - this is the key fix!
          { bottom: isFullscreen ? 0 : TAB_BAR_HEIGHT }
        ]}>
          <ErrorBoundary>
            {loading && posts.length === 0 ? (
              <VideoFeedSkeleton count={1} />
            ) : (
              <InstagramReelsFeed
                posts={posts}
                users={users}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onLoadMore={loadMore}
                headerHeight={isFullscreen ? 0 : statusBarHeight + headerHeight}
                isFullscreen={isFullscreen}
                onSearchPress={handleSearchPress}
                feedType={feedType === FeedType.Following ? 'following' : 'forYou'}
                onSwitchToForYou={() => setFeedType(FeedType.ForYou)}
                isExternallyPaused={showSearchModal}
                initialPostId={currentPostId}
                onCurrentPostChange={handleCurrentPostChange}
                isWorldFeed={true}
              />
            )}
          </ErrorBoundary>
        </View>
      </FeedProvider>

      <Header />

      {/* Search and Tour removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: wp('6%'),
    paddingBottom: hp('1%'),
    minHeight: hp('4%'),
  } as ViewStyle,
  reelsHeader: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  instagramHeader: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    minHeight: hp('12%'),
    paddingBottom: hp('1.5%'),
  } as ViewStyle,
  fullscreenHeader: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  leftSection: {
    width: wp('25%'),
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: hp('5%'),
  } as ViewStyle,
  instagramLeftSection: {
    width: wp('20%'),
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: hp('5%'),
  } as ViewStyle,
  rightSection: {
    width: wp('25%'),
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: hp('5%'),
  } as ViewStyle,
  instagramHeaderContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: hp('0.5%'),
  } as ViewStyle,
  instagramTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: hp('0.3%'),
  } as ViewStyle,
  vennLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  vennTitle: {
    color: colors.black,
    fontSize: Math.min(wp('7%'), 28),
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  } as TextStyle,
  vennLogo: {
    width: Math.min(wp('10%'), 40),
    height: Math.min(wp('10%'), 40),
    marginLeft: 4,
  } as ImageStyle,
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('2%'),
    minHeight: hp('5%'),
  } as ViewStyle,
  headerButton: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.8%'),
    position: 'relative',
    alignItems: 'center',
    minWidth: wp('20%'),
    minHeight: hp('4%'),
    justifyContent: 'center',
  } as ViewStyle,
  instagramHomeText: {
    color: colors.black,
    fontSize: Math.min(wp('5.5%'), 22),
    fontWeight: '700',
    letterSpacing: 0.5,
  } as TextStyle,
  reelsText: {
    color: 'white',
    fontSize: Math.min(wp('5%'), 20),
    fontWeight: '700',
    marginRight: wp('60%'),
    marginTop: hp('0.6%'),
  } as TextStyle,
  instagramRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: wp('20%'),
    minHeight: hp('5%'),
  } as ViewStyle,
  headerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  activeHeaderText: {
    color: colors.white,
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  instagramHeaderText: {
    color: 'rgba(0, 0, 0, 0.5)',
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  activeInstagramHeaderText: {
    color: colors.black,
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  activeIndicator: {
    position: 'absolute',
    bottom: hp('0%'),
    left: '36%',
    marginLeft: -wp('2%'),
    width: wp('17%'),
    height: hp('0.18%'),
    backgroundColor: colors.white,
    borderRadius: wp('0.5%'),
  } as ViewStyle,
  // Light background styles for text posts
  lightBgHeaderText: {
    color: 'rgba(0, 0, 0, 0.5)',
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  activeLightBgHeaderText: {
    color: colors.primary,
    fontSize: Math.min(wp('4%'), 16),
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  activeLightBgIndicator: {
    position: 'absolute',
    bottom: hp('0%'),
    left: '36%',
    marginLeft: -wp('2%'),
    width: wp('17%'),
    height: hp('0.18%'),
    backgroundColor: colors.primary,
    borderRadius: wp('0.5%'),
  } as ViewStyle,
  activeInstagramIndicator: {
    position: 'absolute',
    bottom: hp('0%'),
    left: '36%',
    marginLeft: -wp('2%'),
    width: wp('17%'),
    height: hp('0.25%'),
    backgroundColor: colors.black,
    borderRadius: wp('0.5%'),
  } as ViewStyle,
  searchButton: {
    padding: wp('2%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Math.max(wp('10%'), 40),
    minHeight: Math.max(wp('10%'), 40),
  } as ViewStyle,
  instagramSearchButton: {
    padding: wp('1.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  } as ViewStyle,
  placeholderText: {
    color: colors.white,
    fontSize: Math.min(wp('4.5%'), 18),
    fontWeight: '500',
  } as TextStyle,
  feedContainer: {
    flex: 1,
  } as ViewStyle,
  reelsContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
});