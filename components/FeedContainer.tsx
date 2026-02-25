
import React, { useState, useRef, useEffect, useContext, useMemo, useCallback } from 'react';
import { View, FlatList, Animated, AppState, AppStateStatus, Dimensions, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, RefreshControl, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname } from 'expo-router';

import { HeaderVisibilityContext } from '../app/(tabs)/_layout';
import VideoItem from './VideoItem';
import UnifiedCommentsModal from './UnifiedCommentsModal';
import { usePostInteractions } from '../contexts/PostInteractionsContext';
import { useMute } from '../contexts/MuteContext';
import { useVideoPlayback, VIDEO_PRIORITY } from '../contexts/VideoPlaybackContext';
import { colors } from '../utils/theme';
import { VideoFeedSkeleton } from './skeletons';
import { useIsMounted } from '../hooks/useIsMounted';
import FeedErrorBoundary from './FeedErrorBoundary';
import { Database } from '../database.types';
import InstagramFullscreenVideo from './InstagramFullscreenVideo';

export enum ViewMode {
  Instagram = 'instagram',
  Reels = 'reels',
}


type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface MediaUrls {
  videoUrl?: string;
  video_url?: string;
  url?: string;
  imageUrl?: string;
  photoUrl?: string;
  image_url?: string;
  main_url?: string;
  thumbnailUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedContainerProps {
  posts: CirclePost[];
  users: Record<string, User>;
  loading: boolean;
  refreshing: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  viewMode?: ViewMode;
  feedType?: 'following' | 'forYou';
  onSwitchToForYou?: () => void;
  initialPostId?: string | null; // Shared post ID from parent for feed sync
  onCurrentPostChange?: (postId: string) => void; // Callback when current post changes
  onScrollEvent?: (scrollY: number, isScrollingDown: boolean) => void; // Callback for scroll events
  headerHeight?: number; // Height of header for content padding (Instagram mode)
}

const FeedContainer: React.FC<FeedContainerProps> = ({
  posts,
  users,
  loading,
  refreshing,
  loadingMore = false,
  hasMore = true,
  onRefresh,
  onLoadMore,
  onFullscreenChange,
  viewMode = ViewMode.Instagram,
  feedType = 'forYou',
  onSwitchToForYou,
  initialPostId = null,
  onCurrentPostChange,
  onScrollEvent,
  headerHeight = 0,
}) => {
  const isMounted = useIsMounted();

  // Calculate initial scroll index from initialPostId
  const initialScrollIndex = useMemo(() => {
    if (!initialPostId || !posts || posts.length === 0) return 0;
    // Get filtered posts to find the target index
    const seenIds = new Set<string>();
    const uniquePosts = posts.filter(post => {
      if (seenIds.has(post.id)) return false;
      seenIds.add(post.id);
      return true;
    });
    const validInstagramTypes = ['video', 'image', 'text', 'photo', 'mixed'];
    const filtered = uniquePosts.filter(post =>
      validInstagramTypes.includes(post.content_type) &&
      post.content_type !== null &&
      post.content_type !== undefined
    );
    const idx = filtered.findIndex(post => post.id === initialPostId);
    return idx >= 0 ? idx : 0;
  }, [initialPostId, posts]);
  const [currentIndex, setCurrentIndex] = useState(initialScrollIndex);
  const hasScrolledToInitial = useRef(false);
  const isInitialScrollPending = useRef(!!initialPostId);
  const lastReportedPostId = useRef<string | null>(null);
  // Show brief overlay only when switching to a non-zero index to hide the scroll shift
  // Initialize as false - we'll set it to true only when actually initiating a scroll
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);

  // Safety timeout ref to ensure overlay always gets hidden
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedCommentPostId, setSelectedCommentPostId] = useState('');
  const [buttonsOpacity] = useState(new Animated.Value(1));
  const [isPaused, setIsPaused] = useState<Record<number, boolean>>({});
  const { isMuted: globalMuteState, toggleMute: toggleGlobalMute } = useMute();
  const [videoLoading, setVideoLoading] = useState<Record<number, boolean>>({});
  const [videoError, setVideoError] = useState<Record<number, string>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});
  const [networkType, setNetworkType] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [prefetchedVideos, setPrefetchedVideos] = useState<Set<number>>(new Set());
  const [prefetchQueue, setPrefetchQueue] = useState<number[]>([]);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastScrollDirection, setLastScrollDirection] = useState('none');

  const videoRefs = useRef<Record<number, any>>({});
  const flatListRef = useRef<FlatList>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fullscreenListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<Record<number, number>>({});
  const heartAnimations = useRef<Record<number, Animated.Value>>({});
  const prefetchInProgress = useRef(false);
  const appState = useRef(AppState.currentState);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const showHeaderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideHeaderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unmount cleanup - pause and mute all videos when component is conditionally removed (toggle)
  // useFocusEffect only fires on screen blur, not on conditional render removal
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(videoRefs.current).forEach(ref => {
        if (ref) {
          try {
            ref.setStatusAsync({ shouldPlay: false, isMuted: true, volume: 0 }).catch(() => { });
          } catch { }
        }
      });
    };
  }, []);

  // LRU cache with max 50 entries to prevent memory leaks
  const loadedVideosCache = useRef<Set<string>>(new Set());
  const videoLoadStates = useRef<Record<number, 'loading' | 'loaded' | 'error'>>({});
  const MAX_VIDEO_CACHE_SIZE = 20;

  // Helper to limit cache size (LRU eviction)
  const limitVideoCacheSize = useCallback(() => {
    if (loadedVideosCache.current.size > MAX_VIDEO_CACHE_SIZE) {
      const itemsToRemove = loadedVideosCache.current.size - MAX_VIDEO_CACHE_SIZE;
      const iterator = loadedVideosCache.current.values();
      for (let i = 0; i < itemsToRemove; i++) {
        const firstItem = iterator.next().value;
        if (firstItem) {
          loadedVideosCache.current.delete(firstItem);
        }
      }
    }
    // Also limit videoLoadStates size
    const stateKeys = Object.keys(videoLoadStates.current).map(Number);
    if (stateKeys.length > MAX_VIDEO_CACHE_SIZE) {
      const keysToRemove = stateKeys.slice(0, stateKeys.length - MAX_VIDEO_CACHE_SIZE);
      keysToRemove.forEach(key => delete videoLoadStates.current[key]);
    }
  }, []);

  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingFast = useRef(false);
  const isScreenFocusedRef = useRef(true); // Ref to track focus state for async callbacks

  const { setHomeHeaderVisible } = useContext(HeaderVisibilityContext);
  const { loadPostsInteractions, currentUser, syncPostCommentCount } = usePostInteractions();
  const pathname = usePathname();

  // Global video playback control - ensures only one video plays at a time across the app
  const {
    registerPauseCallback,
    requestPlayback,
    releasePlayback,
    savePosition,
    getPosition,
    clearPosition,
  } = useVideoPlayback('FeedContainer', VIDEO_PRIORITY.FEED);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MAX_RETRIES = 2;
  const HEADER_CONFIG = {
    height: 60,
    scrollThreshold: 20,
    scrollDeltaThreshold: 3,
    showDelay: 200,
    hideDelay: 0,
  };

  const getFilteredPosts = (allPosts: CirclePost[], currentViewMode: ViewMode) => {
    // First, deduplicate posts by id to prevent duplicate key errors
    const seenIds = new Set<string>();
    const uniquePosts = allPosts.filter(post => {
      if (seenIds.has(post.id)) {
        return false;
      }
      seenIds.add(post.id);
      return true;
    });

    const validInstagramTypes = ['video', 'image', 'text', 'photo', 'mixed'];
    return uniquePosts.filter(post =>
      validInstagramTypes.includes(post.content_type) &&
      post.content_type !== null &&
      post.content_type !== undefined
    );
  };

  const filteredPostsWithoutAds = useMemo(() =>
    getFilteredPosts(posts, viewMode),
    [posts, viewMode]
  );

  // Pass through posts without ad injection
  const filteredPosts = filteredPostsWithoutAds as any;

  // Compute initial target index in filteredPosts (with ads) for initialNumToRender
  // This ensures FlatList renders enough items for scrollToIndex to work on mount
  const initialTargetIndex = useMemo(() => {
    if (!initialPostId || !filteredPosts || filteredPosts.length === 0) return 0;
    const idx = filteredPosts.findIndex((post: any) => post.id === initialPostId);
    return idx >= 0 ? idx : 0;
  }, [initialPostId, filteredPosts]);

  // Build videoPosts including virtual posts for videos inside multi-post carousels
  const videoPosts = useMemo(() => {
    const result: any[] = [];
    // @ts-ignore
    filteredPosts.forEach((post) => {
      if (post.content_type === 'video') {
        result.push(post);
      } else if (post.content_type === 'mixed' || post.content_type === 'photo' || post.content_type === 'image') {
        // Check if carousel has video items
        const mediaUrls = post.media_urls;
        if (Array.isArray(mediaUrls)) {
          mediaUrls.forEach((item: any) => {
            if (item && typeof item === 'object' && item.type === 'video' && item.url) {
              result.push({
                ...post,
                content_type: 'video',
                media_urls: {
                  videoUrl: item.url,
                  thumbnailUrl: item.thumbnailUrl || '',
                },
                _isVirtualVideoPost: true,
                _originalPostId: post.id,
              });
            }
          });
        }
      }
    });
    return result;
  }, [filteredPosts]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-ignore
  const videoPostsIndices = filteredPosts.map((post, index) =>
    post.content_type === 'video' ? index : -1
    // @ts-ignore
  ).filter(index => index !== -1);

  useEffect(() => {
    const initialPausedState: Record<number, boolean> = {};
    const initialLoadingState: Record<number, boolean> = {};

    // @ts-ignore
    filteredPosts.forEach((post, index) => {

      if (post.content_type === 'video') {

        // @ts-ignore
        const firstVideoIndex = filteredPosts.findIndex(p => p.content_type === 'video');
        initialPausedState[index] = index !== firstVideoIndex;
        initialLoadingState[index] = index <= firstVideoIndex + 2;
      } else {
        initialPausedState[index] = true;
        initialLoadingState[index] = false;
      }

      if (!heartAnimations.current[index]) {
        heartAnimations.current[index] = new Animated.Value(0);
      }
    });

    setIsPaused(initialPausedState);
    setVideoLoading(initialLoadingState);

    if (filteredPosts.length > 0 && currentUser) {
      loadPostsInteractions(filteredPosts);
    }

    if (filteredPosts.length > 0) {
      setTimeout(() => {
        // @ts-ignore
        const firstVideoIndex = filteredPosts.findIndex(p => p.content_type === 'video');
        if (firstVideoIndex >= 0) {
          preloadVideos(firstVideoIndex, Math.min(firstVideoIndex + 2, filteredPosts.length - 1));
        }
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPosts, currentUser, loadPostsInteractions]);

  // Reset scroll tracking when initialPostId changes (switching feeds)
  useEffect(() => {
    // Clear any existing overlay timeout
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }

    // Skip if this is our own reported post (not a feed switch)
    if (initialPostId === lastReportedPostId.current) {
      // Ensure overlay is hidden even when skipping
      setShowTransitionOverlay(false);
      isInitialScrollPending.current = false;
      return;
    }

    if (initialPostId && filteredPosts.length > 0) {
      // @ts-ignore
      const targetIndex = filteredPosts.findIndex(post => post.id === initialPostId);

      if (targetIndex >= 0) {
        // Show overlay briefly only if we need to scroll (not at position 0)
        if (targetIndex > 0) {
          setShowTransitionOverlay(true);

          // Safety timeout: always hide overlay after 500ms regardless of scroll success
          overlayTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
              setShowTransitionOverlay(false);
              isInitialScrollPending.current = false;
            }
          }, 500);
        }

        // Mark as scrolled BEFORE setting currentIndex to prevent backup scroll
        hasScrolledToInitial.current = true;
        if (isMounted.current) {
          setCurrentIndex(targetIndex);
        }

        // Mark the initial post as already reported to prevent notify parent from re-reporting
        lastReportedPostId.current = initialPostId;

        // Scroll to the target position - use longer delay for FlatList to be ready
        setTimeout(() => {
          if (flatListRef.current) {
            // For index 0, scroll to top (paddingTop handles spacing)
            // For other indexes, use viewOffset to position item below header
            if (targetIndex === 0) {
              flatListRef.current.scrollToOffset({
                offset: 0,
                animated: false,
              });
            } else {
              // Positive viewOffset makes item appear lower on screen (below header)
              flatListRef.current.scrollToIndex({
                index: targetIndex,
                animated: false,
                viewPosition: 0,
                viewOffset: headerHeight,
              });
            }
          }
          // Hide overlay after scroll
          setShowTransitionOverlay(false);

          // Clear safety timeout since scroll completed
          if (overlayTimeoutRef.current) {
            clearTimeout(overlayTimeoutRef.current);
            overlayTimeoutRef.current = null;
          }

          // Update isPaused state and trigger video playback for the current post
          const currentPost = filteredPosts[targetIndex];
          if (currentPost?.content_type === 'video') {
            // Mark this video as not paused
            setIsPaused(prev => ({ ...prev, [targetIndex]: false }));

            const videoRef = videoRefs.current[targetIndex];
            if (videoRef) {
              videoRef.setStatusAsync({
                shouldPlay: true,
                isMuted: globalMuteState,
                volume: globalMuteState ? 0.0 : 1.0
              }).catch(() => { });
            }
          }

          // Clear pending flag AFTER a delay to let FlatList finish layout
          // This prevents stale onViewableItemsChanged from overwriting currentIndex
          setTimeout(() => {
            isInitialScrollPending.current = false;
          }, 100);
        }, 150); // Longer delay to ensure FlatList is ready (matches InstagramReelsFeed)
      } else {
        hasScrolledToInitial.current = true;
        isInitialScrollPending.current = false;
        setShowTransitionOverlay(false);
      }
    } else if (!initialPostId) {
      // No initialPostId - ensure overlay is hidden and pending is cleared
      setShowTransitionOverlay(false);
      isInitialScrollPending.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPostId, filteredPosts]);

  // Backup scroll effect - fallback if scrollToIndexFailed was triggered
  useEffect(() => {
    // Skip if already handled or no initialPostId
    if (!initialPostId || !filteredPosts.length || hasScrolledToInitial.current) {
      return;
    }
    // This backup only runs on initial mount if reset effect hasn't set hasScrolledToInitial
    // @ts-ignore
    const targetIndex = filteredPosts.findIndex(post => post.id === initialPostId);
    if (targetIndex >= 0) {
      hasScrolledToInitial.current = true;
      setCurrentIndex(targetIndex);
    }
  }, [initialPostId, filteredPosts]);

  // Notify parent when current post changes
  useEffect(() => {
    // Don't report during initial scroll to prevent overwriting initialPostId
    if (isInitialScrollPending.current) return;

    if (onCurrentPostChange && currentIndex >= 0 && filteredPosts[currentIndex]) {
      const currentPostId = filteredPosts[currentIndex].id;
      // Only report if post ID changed to avoid duplicate calls
      if (currentPostId !== lastReportedPostId.current) {
        lastReportedPostId.current = currentPostId;
        onCurrentPostChange(currentPostId);
      }
    }
  }, [currentIndex, onCurrentPostChange, filteredPosts]);

  // Ensure the current video has proper audio state when it becomes available
  useEffect(() => {
    if (!isScreenFocused || showFullscreen) return;

    const currentPost = filteredPosts[currentIndex];
    if (currentPost?.content_type !== 'video') return;

    const currentRef = videoRefs.current[currentIndex];
    if (!currentRef) return;

    // Small delay to ensure video ref is ready
    const timer = setTimeout(() => {
      currentRef.getStatusAsync?.().then((status: any) => {
        if (status?.isLoaded && isScreenFocused) {
          currentRef.setStatusAsync({
            isMuted: globalMuteState,
            volume: globalMuteState ? 0.0 : 1.0,
            shouldPlay: !isPaused[currentIndex]
          }).catch(() => { });
        }
      }).catch(() => { });
    }, 300);

    return () => clearTimeout(timer);
  }, [currentIndex, filteredPosts, isScreenFocused, showFullscreen, globalMuteState, isPaused]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected || false);
      setNetworkType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHomeHeaderVisible(true);
    return () => {
      setHomeHeaderVisible(true);
    };
  }, [setHomeHeaderVisible]);

  useEffect(() => {
    setHomeHeaderVisible(headerVisible);
    return () => {
      setHomeHeaderVisible(true);
    };
  }, [headerVisible, setHomeHeaderVisible]);

  useEffect(() => {
    return () => {
      if (showHeaderTimeout.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(showHeaderTimeout.current);
      }
      if (hideHeaderTimeout.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(hideHeaderTimeout.current);
      }
    };
  }, []);

  // Define pauseAllVideos before useFocusEffect to avoid hoisting issues
  const pauseAllVideos = useCallback(() => {
    Object.entries(videoRefs.current).forEach(([key, ref]) => {
      if (ref) {
        const idx = Number(key);
        const post = filteredPosts[idx];
        if (post?.content_type === 'video') {
          ref.setStatusAsync({
            shouldPlay: false,
            isMuted: true,
            volume: 0.0
          }).catch(() => { });
        }
      }
    });
  }, [filteredPosts]);

  // Register pause callback with global video playback context
  useEffect(() => {
    registerPauseCallback(pauseAllVideos);
  }, [registerPauseCallback, pauseAllVideos]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      isScreenFocusedRef.current = true; // Update ref immediately

      // Claim exclusive playback when screen gains focus (only once)
      requestPlayback();

      // When screen gains focus, reload current video if needed
      if (currentIndex >= 0 && !showFullscreen) {
        const currentPost = filteredPosts[currentIndex];
        if (currentPost?.content_type === 'video') {
          const currentVideo = videoRefs.current[currentIndex];
          const videoUrl = (currentPost.media_urls as { videoUrl?: string })?.videoUrl;

          if (currentVideo && videoUrl) {
            // Check if video is loaded, if not reload it
            currentVideo.getStatusAsync().then((status: any) => {
              if (!status.isLoaded) {
                // Video is not loaded, reload it with proper audio state
                currentVideo.loadAsync(
                  { uri: videoUrl },
                  {
                    shouldPlay: !isPaused[currentIndex],
                    isMuted: globalMuteState,
                    volume: globalMuteState ? 0.0 : 1.0,
                    positionMillis: 0
                  }
                ).then(() => {
                  setPrefetchedVideos(prev => new Set([...prev, currentIndex]));
                  if (videoUrl) loadedVideosCache.current.add(videoUrl);
                  videoLoadStates.current[currentIndex] = 'loaded';
                }).catch(() => { });
              } else if (!isPaused[currentIndex]) {
                // Video is loaded, set audio state and play
                currentVideo.setStatusAsync({
                  shouldPlay: true,
                  isMuted: globalMuteState,
                  volume: globalMuteState ? 0.0 : 1.0
                }).catch(() => { });
              }
            }).catch(() => {
              // If getStatusAsync fails, try to reload
              if (videoUrl) {
                currentVideo.loadAsync(
                  { uri: videoUrl },
                  {
                    shouldPlay: !isPaused[currentIndex],
                    isMuted: globalMuteState,
                    volume: globalMuteState ? 0.0 : 1.0,
                    positionMillis: 0
                  }
                ).catch(() => { });
              }
            });
          }
        }
      }

      return () => {
        setIsScreenFocused(false);
        isScreenFocusedRef.current = false; // Update ref immediately on blur
        releasePlayback();
        pauseAllVideos();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, isPaused, filteredPosts, showFullscreen, globalMuteState, pauseAllVideos])
  );

  useEffect(() => {
    if (!pathname.includes('Home')) {
      pauseAllVideos();
    } else if (
      isScreenFocused &&
      currentIndex >= 0 &&
      !isPaused[currentIndex]
    ) {
      const currentPost = filteredPosts[currentIndex];
      if (currentPost?.content_type === 'video') {
        const currentVideo = videoRefs.current[currentIndex];
        if (currentVideo) {
          currentVideo.playAsync().catch(() => { });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isScreenFocused, currentIndex, isPaused, filteredPosts]);

  // Effect to reload videos when returning from fullscreen
  // ONLY reload if screen is focused AND user didn't navigate away
  useEffect(() => {
    // Skip if fullscreen is still showing
    if (showFullscreen) return;

    // Use a longer delay and check ref (not state) for latest focus value
    const timer = setTimeout(() => {
      // CRITICAL: Use ref to get the LATEST focus state
      // State would be stale in this closure
      if (!isScreenFocusedRef.current) {
        // User navigated away - don't reload videos
        return;
      }

      // Only reload if we're still on this screen
      const reloadVisibleVideos = async () => {
        const visibleRange = {
          start: Math.max(0, currentIndex - 1),
          end: Math.min(filteredPosts.length - 1, currentIndex + 2)
        };

        for (let idx = visibleRange.start; idx <= visibleRange.end; idx++) {
          // Check focus ref again before each video
          if (!isScreenFocusedRef.current) return;

          const post = filteredPosts[idx];
          const videoUrl = (post?.media_urls as { videoUrl?: string })?.videoUrl;
          const ref = videoRefs.current[idx];

          if (post?.content_type === 'video' && ref && videoUrl) {
            try {
              const status = await ref.getStatusAsync();
              if (!status.isLoaded) {
                await ref.loadAsync(
                  { uri: videoUrl },
                  {
                    shouldPlay: idx === currentIndex && isScreenFocusedRef.current,
                    isMuted: idx !== currentIndex || globalMuteState
                  }
                );
                setPrefetchedVideos(prev => new Set([...prev, idx]));
                loadedVideosCache.current.add(videoUrl);
                videoLoadStates.current[idx] = 'loaded';
              }
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              // Silent fail
            }
          }
        }
      };

      reloadVisibleVideos();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFullscreen]);

  useEffect(() => {
    // Update mute and volume state for all videos when current index or mute state changes
    Object.entries(videoRefs.current).forEach(([key, ref]) => {
      if (ref) {
        const idx = Number(key);
        const post = filteredPosts[idx];
        if (post?.content_type === 'video') {
          const isCurrentVideo = idx === currentIndex;
          const shouldMute = !isCurrentVideo || globalMuteState;
          ref.setStatusAsync({
            isMuted: shouldMute,
            volume: shouldMute ? 0.0 : 1.0
          }).catch(() => { });
        }
      }
    });
  }, [currentIndex, globalMuteState, filteredPosts]);

  useEffect(() => {
    if (filteredPosts.length > 0 && !isScrollingFast.current) {
      const preloadRange = networkType === 'wifi' ? 5 : 3;
      preloadVideos(currentIndex - 1, currentIndex + preloadRange);
    }
    // Limit cache size to prevent memory leaks
    limitVideoCacheSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, filteredPosts, networkType, limitVideoCacheSize]);

  useEffect(() => {
    let isMounted = true;

    const processPrefetchQueue = async () => {
      if (prefetchQueue.length === 0 || prefetchInProgress.current) {
        return;
      }

      prefetchInProgress.current = true;
      const indexToPrefetch = prefetchQueue[0];
      let queueUpdated = false;

      try {
        const postToPrefetch = filteredPosts[indexToPrefetch];
        const mediaUrls = postToPrefetch?.media_urls as MediaUrls | null;
        const videoUrl = mediaUrls?.videoUrl;

        if (prefetchedVideos.has(indexToPrefetch) ||
          indexToPrefetch === currentIndex ||
          !postToPrefetch ||
          postToPrefetch.content_type !== 'video' ||
          videoLoadStates.current[indexToPrefetch] === 'loaded') {
          if (isMounted) {
            setPrefetchQueue(prevQueue => {
              queueUpdated = true;
              return prevQueue.length > 0 ? prevQueue.slice(1) : prevQueue;
            });
          }
          prefetchInProgress.current = false;
          return;
        }

        if (videoRefs.current[indexToPrefetch] && videoUrl) {
          try {
            await videoRefs.current[indexToPrefetch].unloadAsync();
            await videoRefs.current[indexToPrefetch].loadAsync(
              { uri: videoUrl },
              {
                shouldPlay: false,
                isMuted: true,
                volume: 0
              }
            );

            if (isMounted) {
              setPrefetchedVideos(prev => new Set([...prev, indexToPrefetch]));
              videoLoadStates.current[indexToPrefetch] = 'loaded';
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {

            if (isMounted) {
              videoLoadStates.current[indexToPrefetch] = 'error';
            }
          }
        }
      } finally {
        if (isMounted && !queueUpdated) {
          setPrefetchQueue(prevQueue =>
            prevQueue.length > 0 ? prevQueue.slice(1) : prevQueue
          );
        }
        prefetchInProgress.current = false;

        if (isMounted && prefetchQueue.length > 1) {
          setTimeout(() => {
            processPrefetchQueue();
          }, 50);
        }
      }
    };

    processPrefetchQueue();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchQueue, filteredPosts, currentIndex]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      pauseAllVideos();
    }
    appState.current = nextAppState;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleHeaderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;

    if (currentY > lastScrollY && currentY > 10) {
      setHomeHeaderVisible(false);
    } else if (currentY < lastScrollY) {
      setHomeHeaderVisible(true);
    }

    setLastScrollY(currentY);
    handleScroll(event);
  };

  const handleScrollWithHeaderAnimation = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    handleScroll(event);

    if (refreshing) return;

    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY);
    if (scrollDelta < HEADER_CONFIG.scrollDeltaThreshold) {
      return;
    }

    const isScrollingDown = currentScrollY > lastScrollY;

    // Call parent scroll event callback for header animation (let parent handle it)
    if (onScrollEvent) {
      onScrollEvent(currentScrollY, isScrollingDown);
    }

    setLastScrollY(currentScrollY);
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const estimatedNextIndex = Math.floor(scrollPosition / 800) + 1;

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    isScrollingFast.current = true;

    scrollTimeout.current = setTimeout(() => {
      isScrollingFast.current = false;

      if (estimatedNextIndex >= currentIndex) {
        preloadVideos(estimatedNextIndex, estimatedNextIndex + 5);
      }
    }, 150);
  };

  const handleViewableItemsChanged = ({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;

    // Don't update currentIndex during initial scroll to target post (feed switching only)
    if (isInitialScrollPending.current) {
      return;
    }

    const visibleIndex = viewableItems[0].index || 0;

    if (currentIndex !== visibleIndex) {
      // Pause all videos and unload far-away ones to free memory
      Object.entries(videoRefs.current).forEach(([key, ref]) => {
        if (ref) {
          const idx = Number(key);
          const post = filteredPosts[idx];
          if (post?.content_type === 'video') {
            // Unload videos that are far from the current view (more than 5 items away)
            if (Math.abs(idx - visibleIndex) > 5) {
              ref.unloadAsync().catch(() => { });
              // Clean up tracking state for unloaded videos
              prefetchedVideos.delete(idx);
              const mediaUrls = post.media_urls as MediaUrls | null;
              if (mediaUrls?.videoUrl) {
                loadedVideosCache.current.delete(mediaUrls.videoUrl);
              }
              delete videoLoadStates.current[idx];
            } else {
              ref.setStatusAsync({
                shouldPlay: false,
                isMuted: true,
                volume: 0.0
              }).catch(() => { });
            }
          }
        }
      });

      setCurrentIndex(visibleIndex);

      setIsPaused(prev => {
        const newState = { ...prev };
        // @ts-ignore
        filteredPosts.forEach((post, idx) => {
          if (post.content_type === 'video') {
            newState[idx] = idx !== visibleIndex;
          }
        });
        return newState;
      });

      const currentPost = filteredPosts[visibleIndex];
      const currentMediaUrls = currentPost?.media_urls as MediaUrls | null;
      const videoUrl = currentMediaUrls?.videoUrl;

      if (currentPost?.content_type === 'video' &&
        videoRefs.current[visibleIndex] &&
        videoUrl &&
        !prefetchedVideos.has(visibleIndex) &&
        videoLoadStates.current[visibleIndex] !== 'loaded') {

        if (!loadedVideosCache.current.has(videoUrl)) {
          setVideoLoading((prev) => ({
            ...prev,
            [visibleIndex]: true,
          }));
        }

        (async () => {
          try {
            if (videoUrl) {
              // Load with correct mute state for current video
              const isCurrentVideo = visibleIndex === currentIndex && isScreenFocused;
              await videoRefs.current[visibleIndex].loadAsync(
                { uri: videoUrl },
                {
                  shouldPlay: isCurrentVideo,
                  isMuted: isCurrentVideo ? globalMuteState : true,
                  volume: isCurrentVideo && !globalMuteState ? 1.0 : 0.0
                }
              );

              setPrefetchedVideos(prev => new Set([...prev, visibleIndex]));
              loadedVideosCache.current.add(videoUrl);
              videoLoadStates.current[visibleIndex] = 'loaded';
              setVideoLoading((prev) => ({ ...prev, [visibleIndex]: false }));

              preloadVideos(visibleIndex + 1, visibleIndex + 3);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            videoLoadStates.current[visibleIndex] = 'error';
            setVideoLoading((prev) => ({ ...prev, [visibleIndex]: false }));
            setVideoError((prev) => ({ ...prev, [visibleIndex]: 'Failed to load video' }));
          }
        })();
      } else if (currentPost?.content_type === 'video' && prefetchedVideos.has(visibleIndex)) {

        setVideoLoading((prev) => ({ ...prev, [visibleIndex]: false }));

        if (videoRefs.current[visibleIndex] && isScreenFocused) {
          // Set audio state first, then play to ensure audio is ready
          videoRefs.current[visibleIndex]?.setStatusAsync({
            isMuted: globalMuteState,
            volume: globalMuteState ? 0.0 : 1.0,
            shouldPlay: true
          }).catch(() => { });
        }

        preloadVideos(visibleIndex + 1, visibleIndex + 3);
      }
    }
  };

  const handleVideoClick = (index: number) => {
    const post = filteredPosts[index];
    const postMediaUrls = post?.media_urls as MediaUrls | null;
    if (!postMediaUrls?.videoUrl || post.content_type !== 'video') {

      return;
    }

    const videoOnlyIndex = videoPosts.findIndex(videoPost => videoPost.id === post.id);

    if (videoOnlyIndex !== -1) {
      pauseAllVideos();
      setSelectedVideo(videoOnlyIndex);
      setShowFullscreen(true);

      if (onFullscreenChange) {
        onFullscreenChange(true);
      }

    }
  };

  const handleCarouselVideoClick = (postIndex: number, _mediaItemIndex: number, videoUrl: string, _thumbnailUrl?: string) => {
    const post = filteredPosts[postIndex];
    if (!post || !videoUrl) return;

    // Find the matching virtual post in videoPosts by original post id + video url
    const videoIndex = videoPosts.findIndex(
      (vp: any) => vp._isVirtualVideoPost && vp._originalPostId === post.id &&
        (vp.media_urls as any)?.videoUrl === videoUrl
    );

    if (videoIndex !== -1) {
      pauseAllVideos();
      setSelectedVideo(videoIndex);
      setShowFullscreen(true);

      if (onFullscreenChange) {
        onFullscreenChange(true);
      }
    }
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setSelectedVideo(null);

    if (onFullscreenChange) {
      onFullscreenChange(false);
    }

    // IMMEDIATELY pause all feed videos to prevent any sound
    Object.entries(videoRefs.current).forEach(([, ref]) => {
      if (ref) {
        ref.setStatusAsync({
          shouldPlay: false,
          isMuted: true,
          volume: 0
        }).catch(() => { });
      }
    });

    // Clear prefetch cache
    setPrefetchedVideos(new Set());
    loadedVideosCache.current.clear();
    Object.keys(videoLoadStates.current).forEach(key => {
      delete videoLoadStates.current[Number(key)];
    });

    // Longer delay to let navigation complete, then check ref for latest focus state
    setTimeout(() => {
      try {
        // CRITICAL: Use REF not state - state is stale in this closure
        if (!isScreenFocusedRef.current) {
          // User navigated away - don't reload anything
          return;
        }

        // Only reload if screen is still focused
        const visibleRange = {
          start: Math.max(0, currentIndex - 2),
          end: Math.min(filteredPosts.length - 1, currentIndex + 2)
        };

        Object.entries(videoRefs.current).forEach(([key, ref]) => {
          if (ref) {
            const idx = Number(key);
            const post = filteredPosts[idx];

            if (post?.content_type === 'video') {
              const videoUrl = (post.media_urls as { videoUrl?: string })?.videoUrl;

              if (idx === currentIndex) {
                // Reload and play current video ONLY if still focused
                if (videoUrl && isScreenFocusedRef.current) {
                  ref.unloadAsync().then(() => {
                    // Check ref again before loading
                    if (!isScreenFocusedRef.current) return;
                    ref.loadAsync(
                      { uri: videoUrl },
                      {
                        shouldPlay: isScreenFocusedRef.current,
                        isMuted: globalMuteState,
                        positionMillis: 0
                      }
                    ).then(() => {
                      setPrefetchedVideos(prev => new Set([...prev, idx]));
                      loadedVideosCache.current.add(videoUrl);
                      videoLoadStates.current[idx] = 'loaded';
                    }).catch(() => { });
                  }).catch(() => { });
                }
              } else if (idx >= visibleRange.start && idx <= visibleRange.end && videoUrl) {
                // Reload nearby videos (but don't play)
                if (isScreenFocusedRef.current) {
                  ref.unloadAsync().then(() => {
                    if (!isScreenFocusedRef.current) return;
                    ref.loadAsync(
                      { uri: videoUrl },
                      {
                        shouldPlay: false,
                        isMuted: true
                      }
                    ).then(() => {
                      setPrefetchedVideos(prev => new Set([...prev, idx]));
                      loadedVideosCache.current.add(videoUrl);
                      videoLoadStates.current[idx] = 'loaded';
                    }).catch(() => { });
                  }).catch(() => { });
                }
              } else {
                // Just pause videos outside visible range
                ref.setStatusAsync({
                  shouldPlay: false,
                  isMuted: true
                }).catch(() => { });
              }
            }
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
      }
    }, 500);
  };

  const handleShowComments = (postId: string) => {
    setSelectedCommentPostId(postId);
    setShowCommentsModal(true);
  };

  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setSelectedCommentPostId('');
  };

  const preloadVideos = async (startIndex: number, endIndex: number) => {
    try {
      if (!isConnected || !filteredPosts || filteredPosts.length === 0 || isScrollingFast.current) {
        return;
      }

      let preloadCount = 3;

      if (networkType === 'wifi') {
        preloadCount = 5;
      } else if (networkType === 'cellular') {
        preloadCount = 3;
      }

      const safeStartIndex = Math.max(0, startIndex);
      const safeEndIndex = Math.min(filteredPosts.length - 1, Math.min(endIndex, safeStartIndex + preloadCount));

      let hasNewVideos = false;
      const currentQueueSet = new Set(prefetchQueue);
      const newIndicesToPrefetch: number[] = [];

      for (let i = safeStartIndex; i <= safeEndIndex; i++) {
        const post = filteredPosts[i];
        const postMedia = post?.media_urls as MediaUrls | null;
        const videoUrl = postMedia?.videoUrl;

        if (post?.content_type === 'video' &&
          videoUrl &&
          !loadedVideosCache.current.has(videoUrl) &&
          !prefetchedVideos.has(i) &&
          i !== currentIndex &&
          !currentQueueSet.has(i)) {
          hasNewVideos = true;
          newIndicesToPrefetch.push(i);

          loadedVideosCache.current.add(videoUrl);
          videoLoadStates.current[i] = 'loading';
        }
      }

      if (hasNewVideos) {
        setPrefetchQueue(prevQueue => {
          const updatedExistingIndices = new Set(prevQueue);
          const finalNewIndices = newIndicesToPrefetch.filter(idx => !updatedExistingIndices.has(idx));

          if (finalNewIndices.length === 0) {
            return prevQueue;
          }

          return [...prevQueue, ...finalNewIndices];
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
    }
  };

  const smartRetryStrategy = async (index: number) => {
    const post = filteredPosts[index];
    if (!post || post.content_type !== 'video') {
      return;
    }

    const retryMediaUrls = post.media_urls as MediaUrls | null;

    setVideoError((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });

    setVideoLoading((prev) => ({ ...prev, [index]: true }));
    setRetryCount((prev) => ({ ...prev, [index]: 0 }));

    try {
      if (videoRefs.current[index]) {
        await videoRefs.current[index].unloadAsync();
        await new Promise(resolve => setTimeout(resolve, 200));

        await videoRefs.current[index].loadAsync(
          { uri: retryMediaUrls?.videoUrl },
          {
            shouldPlay: false,
            isMuted: true,
            quality: 0
          }
        );

        if (currentIndex === index || selectedVideo === index) {
          await videoRefs.current[index].setStatusAsync({
            shouldPlay: !isPaused[index] && isScreenFocused,
            isMuted: globalMuteState,
            positionMillis: 0
          });
        }

        setVideoLoading((prev) => ({ ...prev, [index]: false }));
        setPrefetchedVideos(prev => new Set([...prev, index]));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setVideoError((prev) => ({ ...prev, [index]: "Failed to load video. Tap to retry." }));
      setVideoLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handlePressIn = (index: number) => {
    const post = filteredPosts[index];
    if (post?.content_type === 'video' && videoRefs.current[index]) {
      videoRefs.current[index].pauseAsync();
      Animated.timing(buttonsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = (index: number) => {
    const post = filteredPosts[index];
    if (post?.content_type === 'video' &&
      videoRefs.current[index] &&
      !isPaused[index]) {
      videoRefs.current[index].playAsync();
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleDoubleTap = (index: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (
      lastTapRef.current[index] &&
      now - lastTapRef.current[index] < DOUBLE_TAP_DELAY
    ) {
      likePostAnimation(index);
      lastTapRef.current[index] = 0;
      return true;
    } else {
      lastTapRef.current[index] = now;

      setTimeout(() => {
        if (lastTapRef.current[index] === now) {
          lastTapRef.current[index] = 0;
        }
      }, DOUBLE_TAP_DELAY);

      return false;
    }
  };

  const likePostAnimation = (index: number) => {
    if (heartAnimations.current[index]) {
      heartAnimations.current[index].setValue(0);
      Animated.sequence([
        Animated.timing(heartAnimations.current[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(heartAnimations.current[index], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const toggleLike = (index: number) => {

  };

  const toggleMute = async () => {
    const newMuteState = !globalMuteState;
    const currentRef = videoRefs.current[currentIndex];

    if (currentRef && typeof currentRef.setStatusAsync === 'function') {
      const currentPost = filteredPosts[currentIndex];
      if (currentPost?.content_type === 'video') {
        try {
          // Get current playback status to preserve position and playing state
          const status = await currentRef.getStatusAsync();
          if (status.isLoaded) {
            // Update mute state while preserving current position and playing state
            await currentRef.setStatusAsync({
              isMuted: newMuteState,
              volume: newMuteState ? 0.0 : 1.0,
              shouldPlay: status.isPlaying, // Preserve playing state
              positionMillis: status.positionMillis // Preserve position
            });
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Fallback: just update mute state
          currentRef.setStatusAsync({
            isMuted: newMuteState,
            volume: newMuteState ? 0.0 : 1.0
          }).catch(() => { });
        }
      }
    }

    // Update global state after updating the video
    toggleGlobalMute();
  };

  const onRefreshData = async () => {
    if (onRefresh) {
      await onRefresh();

      if (filteredPosts.length > 0) {
        await preloadVideos(currentIndex, currentIndex + 10);
      }
    }
  };

  const handleVideoLoad = (index: number) => {

    setVideoLoading((prev) => ({ ...prev, [index]: false }));
    setVideoError((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });

    setPrefetchedVideos(prev => new Set([...prev, index]));

    const post = filteredPosts[index];
    const loadedMediaUrls = post?.media_urls as MediaUrls | null;
    if (loadedMediaUrls?.videoUrl) {
      loadedVideosCache.current.add(loadedMediaUrls.videoUrl);
      videoLoadStates.current[index] = 'loaded';
    }
  };

  const handleVideoError = (index: number, error: any) => {
    const post = filteredPosts[index];
    const errorMediaUrls = post?.media_urls as MediaUrls | null;
    const videoUrl = errorMediaUrls?.videoUrl;

    if (!videoUrl || videoUrl.trim() === '') {
      setVideoError((prev) => ({
        ...prev,
        [index]: 'Video URL not available'
      }));
      setVideoLoading((prev) => ({ ...prev, [index]: false }));
      return;
    }

    if (error?.toString().includes('FileNotFoundException')) {
      setVideoError((prev) => ({
        ...prev,
        [index]: 'Video file not found on server'
      }));
    }

    setVideoLoading((prev) => ({ ...prev, [index]: false }));
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={filteredPosts}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item, index }) => {
          // Regular post
          const post = item as CirclePost;
          return (
            <VideoItem
              post={post}
              // @ts-ignore
              user={users[post.user_id]}
              index={index}
              isCurrent={currentIndex === index}
              isScreenFocused={isScreenFocused}
              isPaused={isPaused}
              globalMuteState={globalMuteState}
              likedPosts={{}}
              videoRefs={videoRefs}
              videoLoading={videoLoading}
              videoError={videoError}
              heartAnimations={heartAnimations}
              prefetchedVideos={prefetchedVideos}
              viewMode={viewMode}
              onVideoLoad={handleVideoLoad}
              onVideoError={handleVideoError}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onDoubleTap={handleDoubleTap}
              onSmartRetry={smartRetryStrategy}
              onToggleLike={toggleLike}
              onToggleMute={toggleMute}
              onVideoClick={handleVideoClick}
              onCarouselVideoClick={handleCarouselVideoClick}
              loadedVideosCache={loadedVideosCache}
              videoLoadStates={videoLoadStates}
              savePosition={savePosition}
              getPosition={getPosition}
              clearPosition={clearPosition}
              onShowComments={handleShowComments}
            />
          );
        }}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 40,
          minimumViewTime: 0,
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{

          paddingBottom: 40, // Extra padding for tab bar so last post isn't cut off
        }}
        decelerationRate="normal"
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefreshData}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={() => {
          try {
            if (hasMore && !loadingMore && typeof onLoadMore === 'function') {
              onLoadMore();
            }
            if (filteredPosts && currentIndex + 5 < filteredPosts.length) {
              preloadVideos(currentIndex + 1, currentIndex + 5);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {

          }
        }}
        onEndReachedThreshold={0.8}
        onScrollToIndexFailed={(info) => {
          // When scrollToIndex fails (item not rendered), use fallback
          // For index > 0, subtract headerHeight so item appears below header overlay
          const itemOffset = info.averageItemLength * info.index;
          // We want less scroll so item is lower - subtract header height from offset
          const targetOffset = info.index === 0 ? 0 : Math.max(0, itemOffset - headerHeight);
          flatListRef.current?.scrollToOffset({
            offset: targetOffset,
            animated: false,
          });
          // Mark the target post as reported to prevent stale reports
          const targetPost = filteredPosts[info.index];
          if (targetPost?.id) {
            lastReportedPostId.current = targetPost.id;
          }
          // Update currentIndex after scroll attempt with extended guard
          setTimeout(() => {
            setCurrentIndex(info.index);
            setTimeout(() => {
              setShowTransitionOverlay(false);
              isInitialScrollPending.current = false;

              // Clear safety timeout since scroll handled (even if via fallback)
              if (overlayTimeoutRef.current) {
                clearTimeout(overlayTimeoutRef.current);
                overlayTimeoutRef.current = null;
              }

              // Update isPaused state and start video playback after scroll completes
              const currentPost = filteredPosts[info.index];
              if (currentPost?.content_type === 'video') {
                // Mark this video as not paused
                setIsPaused(prev => ({ ...prev, [info.index]: false }));

                const videoRef = videoRefs.current[info.index];
                if (videoRef) {
                  videoRef.setStatusAsync({
                    shouldPlay: true,
                    isMuted: globalMuteState,
                    volume: globalMuteState ? 0.0 : 1.0
                  }).catch(() => { });
                }
              }
            }, 100);
          }, 50);
        }}
        ListFooterComponent={() => {
          try {
            return loadingMore ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors?.primary || '#007AFF'} />
              </View>
            ) : null;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            return null;
          }
        }}
        ListEmptyComponent={() => {
          if (feedType !== 'following' || loading) {
            return null;
          }
          return (
            <View style={emptyStyles.container}>
              <Ionicons name="people-outline" size={wp('20%')} color="#999" />
              <Text style={emptyStyles.title}>You&apos;re not following anyone yet!</Text>
              <Text style={emptyStyles.subtitle}>
                Head over to the World Feed or Circles to find some content you like!
              </Text>
              {onSwitchToForYou && (
                <TouchableOpacity
                  style={emptyStyles.button}
                  onPress={onSwitchToForYou}
                  activeOpacity={0.8}
                >
                  <Text style={emptyStyles.buttonText}>Explore World Feed</Text>
                  <Ionicons name="arrow-forward" size={wp('5%')} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        onScroll={handleScrollWithHeaderAnimation}
        scrollEventThrottle={16}
        windowSize={3}
        initialNumToRender={Math.max(initialTargetIndex + 3, initialScrollIndex + 2, 3)}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        legacyImplementation={false}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* Transition overlay to hide scroll shift when switching feeds */}
      {showTransitionOverlay && (
        <View style={[transitionOverlayStyles.overlay, viewMode === ViewMode.Reels && { backgroundColor: '#000' }]}>
          <VideoFeedSkeleton count={1} />
        </View>
      )}

      {/* Fullscreen Video View */}
      {showFullscreen && selectedVideo !== null && (
        <InstagramFullscreenVideo
          posts={videoPosts}
          users={users}
          initialIndex={selectedVideo}
          visible={showFullscreen}
          onClose={closeFullscreen}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
        />
      )}

      <UnifiedCommentsModal
        visible={showCommentsModal}
        onClose={handleCloseComments}
        postId={selectedCommentPostId}
        onCommentAdded={async () => {
          if (selectedCommentPostId && syncPostCommentCount) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            await syncPostCommentCount(selectedCommentPostId);
          }
        }}
        title="Comments"
      />
    </View>
  );
};

const transitionOverlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('10%'),
    paddingVertical: hp('20%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#333',
    marginTop: hp('3%'),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#666',
    marginTop: hp('2%'),
    textAlign: 'center',
    lineHeight: wp('6%'),
    paddingHorizontal: wp('5%'),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00b1ff',
    paddingHorizontal: wp('8%'),
    paddingVertical: hp('1.8%'),
    borderRadius: wp('8%'),
    marginTop: hp('4%'),
    shadowColor: '#00b1ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: wp('4%'),
    fontWeight: '700',
    marginRight: wp('2%'),
  },
});

// Wrap with error boundary to prevent crashes during scrolling
const FeedContainerWithErrorBoundary: React.FC<FeedContainerProps> = (props) => (
  <FeedErrorBoundary fallbackMessage="Unable to load feed. Please try again.">
    <FeedContainer {...props} />
  </FeedErrorBoundary>
);

export default FeedContainerWithErrorBoundary;