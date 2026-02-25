
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
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
  Easing,
  BackHandler,
  Dimensions,
} from 'react-native';
// Image import removed as it was unused

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors } from '../../utils/theme';
import InstagramReelsFeed from '../../components/InstagramReelsFeed';
import { FeedType, useFeed } from '../../hooks/useFeed';
import FeedContainer, { ViewMode } from '../../components/FeedContainer';

import ErrorBoundary from '../../components/ErrorBoundary';
import { VideoFeedSkeleton } from '../../components/skeletons';
import { HeaderVisibilityContext } from './_layout';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useFullscreen } from '../../contexts/FullscreenContext';
import { useGlobalVideoPause } from '../../contexts/VideoPlaybackContext';
import { FeedProvider } from '../../contexts/FeedContext';


// SCREEN_HEIGHT removed as it was unused

let savedViewMode: ViewMode = ViewMode.Instagram;
let savedPostId: string | null = null; // Shared post ID between feed styles

// Reset saved state on login/logout so feed starts fresh
export const resetHomeSavedState = () => {
  savedPostId = null;
};

export default function Home() {
  const [feedType, setFeedType] = useState<FeedType>(FeedType.ForYou);
  const [viewMode, setViewMode] = useState<ViewMode>(savedViewMode);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(savedPostId);
  const [isCurrentPostLightBg, setIsCurrentPostLightBg] = useState(false); // Track if current post has light background (text posts)
  const { isFullscreen, hideFullscreen } = useFullscreen();
  const pauseAllVideos = useGlobalVideoPause();
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const { setHomeHeaderVisible, homeRefreshTrigger } = useContext(HeaderVisibilityContext);
  const insets = useSafeAreaInsets();

  // Simple scroll tracking for header animation
  const isHeaderVisible = useRef(true);
  const lastScrollY = useRef(0);
  const hasScrolledOnce = useRef(false); // Track if first real scroll happened

  // Tour guide state
  const [showHomeTour, setShowHomeTour] = useState(false);
  const guideShownRef = useRef(false);
  const toggleRef = useRef<View>(null);
  const tabsRef = useRef<View>(null);
  const [toggleLayout, setToggleLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tabsLayout, setTabsLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const statusBarHeight = Constants.statusBarHeight || 0;
  const headerHeight = hp('8%');

  // Tab bar height - must match _layout.tsx (45 + insets.bottom)
  const TAB_BAR_HEIGHT = 45 + insets.bottom;

  // Build home tour steps using measured element positions
  const homeTourSteps: any[] = React.useMemo(() => {
    const PAD = 10;
    return [
      {
        id: 'toggle',
        emoji: '\u{1F3AC}',
        title: 'Two Feeds, One Toggle',
        description: "This little switch is magic. Flip it for Reels-style full-screen videos or Instagram-style scrolling. Try both, pick your vibe.",
        duration: 6000,
        ...(toggleLayout ? {
          spotlight: {
            x: toggleLayout.x - PAD,
            y: toggleLayout.y,
            width: toggleLayout.width,
            height: toggleLayout.height + PAD,
            borderRadius: 20,
          },
        } : {}),
      },
      {
        id: 'feed-tabs',
        emoji: '\u{1F30D}',
        title: 'Following vs World',
        description: "\u2018Following\u2019 shows posts from your people. \u2018World Feed\u2019 is the wild west \u2014 content from everyone. Explore both!",
        duration: 5500,
        ...(tabsLayout ? {
          spotlight: {
            x: tabsLayout.x - PAD * 3,
            y: tabsLayout.y - PAD,
            width: tabsLayout.width + PAD * 6,
            height: tabsLayout.height + PAD * 2.5,
            borderRadius: 16,
          },
        } : {}),
      },
      {
        id: 'voting',
        emoji: '\u{1F44D}',
        title: 'Upvote the Good Stuff',
        description: "See something awesome? Smash that upvote. Not feeling it? Downvote. Your votes shape what everyone sees \u2014 with great power...",
        duration: 5500,
      },
      {
        id: 'gifts',
        emoji: '\u{1F381}',
        title: 'Send Some Love',
        description: "Gifts are the ultimate compliment. Send one to a creator you love and watch their Aura skyrocket. Generosity looks good on you.",
        duration: 5000,
      },
    ];
  }, [toggleLayout, tabsLayout]);

  // Show tour guide on first visit
  useFocusEffect(
    React.useCallback(() => {
      let tourTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const checkAndShowGuide = async () => {
        try {
          const hasSeenTour = await AsyncStorage.getItem('@venn_home_tour_shown');

          if (!hasSeenTour && !guideShownRef.current) {
            guideShownRef.current = true;
            tourTimeoutId = setTimeout(() => {
              // Measure actual element positions before showing tour
              const measureEl = (ref: React.RefObject<View | null>): Promise<{ x: number; y: number; width: number; height: number } | null> =>
                new Promise((resolve) => {
                  if (!ref.current) { resolve(null); return; }
                  ref.current.measureInWindow((x, y, w, h) => {
                    resolve(w > 0 && h > 0 ? { x, y, width: w, height: h } : null);
                  });
                });

              Promise.all([measureEl(toggleRef), measureEl(tabsRef)]).then(([toggle, tabs]) => {
                setToggleLayout(toggle);
                setTabsLayout(tabs);
                setShowHomeTour(true);
              });
            }, 1000);
          }
        } catch (error) {
          console.error('Error checking tour status:', error);
        }
      };
      checkAndShowGuide();

      return () => {
        if (tourTimeoutId) {
          clearTimeout(tourTimeoutId);
        }
      };
    }, [])
  );

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
    setHomeHeaderVisible(viewMode !== ViewMode.Reels);
  }, [viewMode, setHomeHeaderVisible]);

  const { posts, users, loading, refreshing, loadingMore, hasMore, handleRefresh, loadMore, addLikedPost } =
    useFeed(feedType);

  // Double-tap Home tab icon triggers scroll-to-top + refresh
  const homeRefreshTriggerHandled = useRef(0);
  useEffect(() => {
    if (homeRefreshTrigger > 0 && homeRefreshTrigger !== homeRefreshTriggerHandled.current) {
      homeRefreshTriggerHandled.current = homeRefreshTrigger;
      handleRefresh();
    }
  }, [homeRefreshTrigger, handleRefresh]);

  const handleFeedTypeChange = (newFeedType: FeedType) => {
    setFeedType(newFeedType);
  };

  const handleViewModeToggle = (newViewMode: ViewMode) => {
    // Pause all videos globally BEFORE switching mode to prevent audio bleed
    pauseAllVideos();

    setViewMode(newViewMode);
    savedViewMode = newViewMode;

    // Reels mode always has dark backgrounds - reset light bg flag
    if (newViewMode === ViewMode.Reels) {
      setIsCurrentPostLightBg(false);
    }

    // Reset header animation state when switching to Instagram mode
    if (newViewMode === ViewMode.Instagram) {
      isHeaderVisible.current = true;
      hasScrolledOnce.current = false;
      lastScrollY.current = 0;
      headerTranslateY.setValue(0);
    }
  };

  // Instagram header height for animation and content padding
  // Must match the actual rendered header height: statusBarHeight + paddingTop(hp('1%')) + minHeight(hp('12%')) + paddingBottom(hp('1.5%'))
  const instagramHeaderHeight = statusBarHeight + hp('14.5%');

  // Simple scroll handler for header hide/show
  const handleScroll = useCallback((scrollY: number, isScrollingDown: boolean) => {
    // First scroll event - just record and skip (handles initial layout scroll)
    if (!hasScrolledOnce.current) {
      // Only mark as scrolled if there's actual movement from 0
      if (Math.abs(scrollY - lastScrollY.current) > 5) {
        hasScrolledOnce.current = true;
      }
      lastScrollY.current = scrollY;
      return;
    }

    // SHOW header when at top OR when scrolling UP
    if (scrollY < 20 || !isScrollingDown) {
      if (!isHeaderVisible.current) {
        isHeaderVisible.current = true;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
      lastScrollY.current = scrollY;
      return;
    }

    // HIDE header when scrolling down past threshold
    if (isScrollingDown && scrollY > 50 && isHeaderVisible.current) {
      isHeaderVisible.current = false;
      Animated.timing(headerTranslateY, {
        toValue: -instagramHeaderHeight,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    lastScrollY.current = scrollY;
  }, [headerTranslateY, instagramHeaderHeight]);

  // Callback when current post changes in either feed
  const handleCurrentPostChange = (postId: string) => {
    setCurrentPostId(postId);
    savedPostId = postId;

    // Reels mode always uses dark backgrounds (text posts, image fallbacks, video)
    // so header text should always be white - no light bg detection needed
    if (viewMode === ViewMode.Reels) {
      setIsCurrentPostLightBg(false);
      return;
    }

    // Instagram mode: check if current post has light background
    const currentPost = posts.find(p => p.id === postId);
    if (currentPost) {
      const hasLightBg = currentPost.content_type === 'text';
      setIsCurrentPostLightBg(hasLightBg);
    }
  };

  const handleSearchPress = () => {
    setShowSearchModal(true);
  };

  const router = useRouter();

  // Handle home tour completion
  const handleHomeTourComplete = () => {
    setShowHomeTour(false);
    AsyncStorage.setItem('@venn_home_tour_shown', 'true');
  };

  const Header = () => (
    <Animated.View
      style={[
        styles.header,
        isFullscreen
          ? styles.fullscreenHeader
          : viewMode === ViewMode.Reels
            ? styles.reelsHeader
            : styles.instagramHeader,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          pointerEvents: 'auto',

          top: isFullscreen
            ? statusBarHeight
            : viewMode === ViewMode.Reels
              ? statusBarHeight
              : 0,
          paddingTop:
            viewMode === ViewMode.Instagram && !isFullscreen
              ? statusBarHeight + hp('1%')
              : hp('1%'),
        },
      ]}
    >
      {isFullscreen ? (
        <>
          <View style={styles.leftSection}></View>
          <View style={styles.rightSection}></View>
        </>
      ) : viewMode === ViewMode.Reels ? (
        <>
          <View ref={toggleRef} style={styles.leftSection}>
            <Text style={{ color: isCurrentPostLightBg ? colors.primary : 'white', fontWeight: '700', fontSize: Math.min(wp('3.5%'), 14) }}>
              {viewMode === ViewMode.Reels ? 'Reels' : 'Instagram'}
            </Text>
          </View>
          <View ref={tabsRef} style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleFeedTypeChange(FeedType.Following)}
            >
              <Text
                style={
                  feedType === FeedType.Following
                    ? (isCurrentPostLightBg ? styles.activeLightBgHeaderText : styles.activeHeaderText)
                    : (isCurrentPostLightBg ? styles.lightBgHeaderText : styles.headerText)
                }
              >
                Following
              </Text>
              {feedType === FeedType.Following && (
                <View style={isCurrentPostLightBg ? styles.activeLightBgIndicator : styles.activeIndicator} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => handleFeedTypeChange(FeedType.ForYou)}
            >
              <Text
                style={
                  feedType === FeedType.ForYou
                    ? (isCurrentPostLightBg ? styles.activeLightBgHeaderText : styles.activeHeaderText)
                    : (isCurrentPostLightBg ? styles.lightBgHeaderText : styles.headerText)
                }
              >
                World Feed
              </Text>
              {feedType === FeedType.ForYou && (
                <View style={isCurrentPostLightBg ? styles.activeLightBgIndicator : styles.activeIndicator} />
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
                color={isCurrentPostLightBg ? colors.primary : "white"}
              />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.instagramHeaderContainer}>
            { }
            <View style={styles.instagramTopRow}>
              <View style={styles.instagramLeftSection}>
              </View>
              <View style={styles.vennLogoContainer}>
                <Text style={styles.instagramBrand}>Instagram</Text>
              </View>
              <View style={styles.instagramRightSection}>
                <TouchableOpacity
                  style={styles.instagramSearchButton}
                  onPress={handleSearchPress}
                >
                  <Ionicons
                    name="search"
                    size={Math.min(wp('6%'), 24)}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            { }
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleFeedTypeChange(FeedType.Following)}
              >
                <Text
                  style={
                    feedType === FeedType.Following
                      ? styles.activeInstagramHeaderText
                      : styles.instagramHeaderText
                  }
                >
                  Following
                </Text>
                {feedType === FeedType.Following && (
                  <View style={styles.activeInstagramIndicator} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleFeedTypeChange(FeedType.ForYou)}
              >
                <Text
                  style={
                    feedType === FeedType.ForYou
                      ? styles.activeInstagramHeaderText
                      : styles.instagramHeaderText
                  }
                >
                  World Feed
                </Text>
                {feedType === FeedType.ForYou && (
                  <View style={styles.activeInstagramIndicator} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );

  const containerStyle = [
    styles.container,
    {

      backgroundColor: isFullscreen
        ? 'black'
        : viewMode === ViewMode.Reels
          ? 'black'
          : 'white',
    },
  ];

  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle={
          isFullscreen || viewMode === ViewMode.Reels
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          isFullscreen || viewMode === ViewMode.Reels
            ? 'transparent'
            : colors.primary
        }
        translucent={true}
      />

      <FeedProvider addLikedPost={addLikedPost}>
        {viewMode === ViewMode.Reels ? (
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
        ) : (
          <View style={styles.feedContainer}>
            <ErrorBoundary>
              <FeedContainer
                posts={posts}
                users={users}
                loading={loading}
                refreshing={refreshing}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onRefresh={handleRefresh}
                onLoadMore={loadMore}
                viewMode={viewMode}
                onFullscreenChange={() => { }}
                feedType={feedType === FeedType.Following ? 'following' : 'forYou'}
                onSwitchToForYou={() => setFeedType(FeedType.ForYou)}
                initialPostId={currentPostId}
                onCurrentPostChange={handleCurrentPostChange}
                onScrollEvent={handleScroll}
                headerHeight={instagramHeaderHeight}
              />
            </ErrorBoundary>
          </View>
        )}
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
  instagramBrand: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: Math.min(wp('7%'), 28),
    color: colors.black,
    letterSpacing: 0.5,
  } as TextStyle,
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