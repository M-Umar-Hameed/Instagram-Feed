
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Modal,
  BackHandler,
  Alert,
  PixelRatio,
  useWindowDimensions,
  TextStyle,
  GestureResponderEvent,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CrossPlatformImage as Image } from './ui/CrossPlatformImage';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { usePostInteractions } from '../contexts/PostInteractionsContext';
import { useMute } from '../contexts/MuteContext';
import { useVideoPlayback, VIDEO_PRIORITY } from '../contexts/VideoPlaybackContext';
import { navigateToUserProfile, isProfileViewable, getUserDisplayName } from '../utils/profileNavigation';
import { followService } from '../services/followService'; // Mocked
import { notifyFollowUpdate } from '../hooks/useFeed';
import { colors } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { trackPostView } from '../utils/postInteractions';
import UnifiedCommentsModal from './UnifiedCommentsModal';
import RepostOptionsModal from './RepostOptionsModal';
import PostOptionsModal from './PostOptionsModal';
// import ReportPostModal from './modals/ReportPostModal';
import HashtagText, { HashtagChip } from './HashtagText';
import { useIsMounted } from '../hooks/useIsMounted';
// import GiftModal from './gift/GiftModal';
// import CoinPurchaseModal from './gift/CoinPurchaseModal';

const isGooglePixel = () => {
  if (Platform.OS !== 'android') return false;

  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  const pixelRatio = PixelRatio.get();

  console.log('Device Info:', {
    aspectRatio,
    pixelRatio,
    screenHeight: SCREEN_HEIGHT,
    screenWidth: SCREEN_WIDTH,
    platform: Platform.OS
  });

  return aspectRatio >= 2.2 && pixelRatio >= 2.5;
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getBottomNavPosition = () => {
  if (Platform.OS === 'ios') return hp('4%');
  if (isGooglePixel()) return hp('3%');
  return hp('2%');
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface InstagramFullscreenVideoProps {
  posts: any[];
  users: Record<string, any>;
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onDeletePost?: (postId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onHashtagPress?: (tag: string) => void; // Custom handler for hashtag navigation (closes modal first)
}

// Sub-component for multi-media carousel in fullscreen view
interface CarouselMediaItem {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
}

const FullscreenCarousel = ({ items, screenWidth, screenHeight, isMuted }: {
  items: CarouselMediaItem[];
  screenWidth: number;
  screenHeight: number;
  isMuted?: boolean;
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / screenWidth);
    if (newIdx >= 0 && newIdx < items.length) {
      setCurrentIdx(newIdx);
    }
  }, [screenWidth, items.length]);

  if (items.length === 1) {
    const item = items[0];
    return (
      <View style={{ width: screenWidth, height: screenHeight, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        {item.type === 'video' ? (
          <Video
            source={{ uri: item.url }}
            style={{ width: screenWidth, height: screenHeight }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted={isMuted}
          />
        ) : (
          <Image
            source={item.url}
            style={{ width: screenWidth, height: screenHeight }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ width: screenWidth, height: screenHeight, backgroundColor: '#000' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        nestedScrollEnabled={true}
      >
        {items.map((item, idx) => (
          <View key={idx} style={{ width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' }}>
            {item.type === 'video' ? (
              <Video
                source={{ uri: item.url }}
                style={{ width: screenWidth, height: screenHeight }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={idx === currentIdx}
                isLooping
                isMuted={isMuted}
              />
            ) : (
              <Image
                source={item.url}
                style={{ width: screenWidth, height: screenHeight }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={{
        position: 'absolute',
        bottom: hp('12%'),
        flexDirection: 'row',
        justifyContent: 'center',
        width: screenWidth,
      }}>
        {items.map((_, idx) => (
          <View
            key={idx}
            style={{
              width: idx === currentIdx ? 8 : 6,
              height: idx === currentIdx ? 8 : 6,
              borderRadius: 4,
              backgroundColor: idx === currentIdx ? '#fff' : 'rgba(255,255,255,0.4)',
              marginHorizontal: 3,
            }}
          />
        ))}
      </View>

      {/* Counter badge */}
      <View style={{
        position: 'absolute',
        top: hp('2%'),
        right: wp('4%'),
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: wp('3%'),
        paddingVertical: hp('0.5%'),
        borderRadius: wp('3%'),
      }}>
        <Text style={{ color: 'white', fontSize: wp('3.5%'), fontWeight: '600' }}>
          {currentIdx + 1}/{items.length}
        </Text>
      </View>
    </View>
  );
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const InstagramFullscreenVideo: React.FC<InstagramFullscreenVideoProps> = ({
  posts,
  users,
  initialIndex,
  visible,
  onClose,
  onDeletePost,
  onLoadMore,
  hasMore = true,
  loadingMore = false,
  onHashtagPress: onHashtagPressProp,
}) => {
  // Measure actual container height using onLayout (most reliable)
  const [containerHeight, setContainerHeight] = useState(0);

  // Fallback height while measuring
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fallbackHeight = windowHeight - insets.bottom;

  // Use measured height if available, otherwise fallback
  const VISIBLE_HEIGHT = containerHeight > 0 ? containerHeight : fallbackHeight;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState<Record<number, boolean>>({});
  const { isMuted: globalMuteState, toggleMute: toggleGlobalMute, setMuted } = useMute();
  const [videoLoading, setVideoLoading] = useState<Record<number, boolean>>({});
  const [videoCached, setVideoCached] = useState<Record<number, boolean>>({});
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [videoStates, setVideoStates] = useState<Record<number, { isLoaded: boolean; isPlaying: boolean; isBuffering: boolean }>>({});
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isReposted, setIsReposted] = useState<Record<string, boolean>>({});
  const repostAnimation = useRef<Record<string, Animated.Value>>({});
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [selectedPostForDelete, setSelectedPostForDelete] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportPost, setSelectedReportPost] = useState<any>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedGiftPost, setSelectedGiftPost] = useState<any>(null);
  const [showCoinPurchase, setShowCoinPurchase] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());

  // Caption expansion state - track per post
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [truncatedCaptions, setTruncatedCaptions] = useState<Record<string, boolean>>({});

  // Video progress state for progress bar
  const [videoProgress, setVideoProgress] = useState<Record<number, number>>({});
  const [videoDuration, setVideoDuration] = useState<Record<number, number>>({});
  const [isSeeking, setIsSeeking] = useState<Record<number, boolean>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [seekingIndex, setSeekingIndex] = useState<number | null>(null); // Track which video is being seeked
  const seekPositionRef = useRef<Record<number, number>>({});
  const wasPlayingBeforeSeek = useRef<Record<number, boolean>>({});

  // Format time for display (mm:ss)
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate position from pageX (absolute screen position)
  const calculateSeekPosition = useCallback((pageX: number, duration: number): number => {
    const clampedX = Math.max(0, Math.min(SCREEN_WIDTH, pageX));
    const percentage = clampedX / SCREEN_WIDTH;
    return Math.floor(percentage * duration);
  }, []);

  // Handle seek start - pause video and start tracking
  const handleSeekStart = useCallback((index: number, pageX: number) => {
    const duration = videoDuration[index];
    if (!duration || duration <= 0) return;

    const videoRef = videoRefs.current[index];
    if (videoRef) {
      videoRef.getStatusAsync().then((status: any) => {
        if (status.isLoaded) {
          wasPlayingBeforeSeek.current[index] = status.isPlaying;
          if (status.isPlaying) {
            videoRef.pauseAsync().catch(() => { });
          }
        }
      }).catch(() => { });
    }

    setIsSeeking(prev => ({ ...prev, [index]: true }));
    setSeekingIndex(index); // Track which video is being seeked

    const seekPositionMs = calculateSeekPosition(pageX, duration);
    seekPositionRef.current[index] = seekPositionMs;
    setVideoProgress(prev => ({ ...prev, [index]: seekPositionMs }));
  }, [videoDuration, calculateSeekPosition]);

  // Handle seek move - accepts index for reliability
  const handleSeekMove = useCallback((index: number, pageX: number) => {
    const duration = videoDuration[index];
    if (!duration || duration <= 0) return;

    const seekPositionMs = calculateSeekPosition(pageX, duration);
    seekPositionRef.current[index] = seekPositionMs;
    setVideoProgress(prev => ({ ...prev, [index]: seekPositionMs }));
  }, [videoDuration, calculateSeekPosition]);

  // Handle seek end - seek to final position and resume if was playing
  const handleSeekEnd = useCallback((index: number) => {
    const finalPosition = seekPositionRef.current[index];
    const videoRef = videoRefs.current[index];

    if (videoRef && finalPosition !== undefined && finalPosition >= 0) {
      videoRef.setPositionAsync(finalPosition).then(() => {
        if (wasPlayingBeforeSeek.current[index]) {
          videoRef.playAsync().catch(() => { });
        }
      }).catch(() => { });
    }

    setIsSeeking(prev => ({ ...prev, [index]: false }));
    setSeekingIndex(null);
  }, []);

  // Handle hashtag press - close modal first, then navigate
  const handleHashtagPress = useCallback((tag: string) => {
    if (onHashtagPressProp) {
      // Use custom handler from parent
      onHashtagPressProp(tag);
    } else {
      // Default: close this modal first, then navigate
      onClose();
      setTimeout(() => {
        router.push(`/hashtag/${tag}` as any);
      }, 100);
    }
  }, [onHashtagPressProp, onClose]);
  // Fetch user's previously reported posts
  useEffect(() => {
    const fetchReportedPosts = async () => {
      try {
        if (!authUser?.id) return;
        // Get posts this user has reported
        const { supabase } = await import('../utils/supabase');
        const { data: reports, error } = await supabase
          .from('user_reports')
          .select('content_id')
          .eq('reporter_id', authUser.id)
          .eq('content_type', 'post');
        if (error) {
          console.error('[InstagramFeed] Error fetching reported posts:', error);
          return;
        }
        if (reports && reports.length > 0) {
          const reportedIds = new Set(reports.map((r: { content_id: string }) => r.content_id));
          setReportedPosts(reportedIds);
        }
      } catch (error) {
        console.error('[InstagramFeed] Error in fetchReportedPosts:', error);
      }
    };
    if (visible) {
      fetchReportedPosts();
    }
    // @ts-ignore
  }, [authUser?.id, visible]);
  const videoRefs = useRef<Record<number, any>>({});
  const flatListRef = useRef<FlatList>(null);
  const pulsatingAnimation = useRef(new Animated.Value(0.3)).current;
  const lastTapRef = useRef<Record<number, number>>({});
  const viewTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const viewStartTimeRef = useRef<Record<string, number>>({});
  const viewTrackedRef = useRef<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { postStats, currentUser, upvotePost, downvotePost, sharePost, syncPostCommentCount, isLoading, repostPost, checkIsReposted, repostStatus } = usePostInteractions();
  const { user: authUser } = useAuth();  // Renamed to avoid shadowing with post author 'user'
  const isMounted = useIsMounted();
  const {
    registerPauseCallback,
    requestPlayback,
    releasePlayback,
    savePosition,
    getPosition,
    clearPosition,
  } = useVideoPlayback('InstagramFullscreenVideo', VIDEO_PRIORITY.FULLSCREEN_MODAL);
  const pauseAllVideos = useCallback(() => {
    Object.keys(videoRefs.current).forEach(key => {
      const ref = videoRefs.current[parseInt(key)];
      if (ref) {
        ref.setStatusAsync({ shouldPlay: false, isMuted: true, volume: 0 }).catch(() => { });
        ref.pauseAsync().catch(() => { });
      }
    });
  }, []);
  useEffect(() => {
    registerPauseCallback(pauseAllVideos);
  }, [registerPauseCallback, pauseAllVideos]);
  useEffect(() => {
    if (visible) {
      const backAction = () => {
        onClose();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => {
        backHandler.remove();
      };
    }
  }, [visible, onClose]);
  useEffect(() => {
    if (visible && currentUser) {
      loadFollowStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentUser, posts]);
  const isNavigatingAwayRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      isNavigatingAwayRef.current = false;
      return () => {
        isNavigatingAwayRef.current = true;
      };
    }, [])
  );
  useEffect(() => {
    if (visible) {
      requestPlayback();
    } else {
      releasePlayback();
      Object.keys(videoRefs.current).forEach(key => {
        const ref = videoRefs.current[parseInt(key)];
        if (ref) {
          ref.setStatusAsync({ shouldPlay: false, isMuted: true, volume: 0 }).catch(() => { });
          ref.pauseAsync().catch(() => { });
        }
      });
    }
  }, [visible, requestPlayback, releasePlayback]);

  const loadFollowStates = async () => {
    if (!currentUser) return;

    try {
      const followingIds = await followService.getFollowingIds(currentUser.id);
      if (!isMounted.current) return;

      const states: Record<string, boolean> = {};

      posts.forEach(post => {
        const userId = post.user_id;
        states[userId] = followingIds.includes(userId);
      });

      if (isMounted.current) {
        setFollowingStates(states);
      }
    } catch (error) {
      console.error('Error loading follow states:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFollowToggle = async (userId: string) => {
    if (!currentUser || processingFollow.has(userId) || currentUser.id === userId) {
      return;
    }

    if (isMounted.current) {
      setProcessingFollow(prev => new Set(prev).add(userId));
    }
    const isCurrentlyFollowing = followingStates[userId];

    try {
      let success;
      if (isCurrentlyFollowing) {
        success = await followService.unfollowUser(userId);
      } else {
        success = await followService.followUser(userId);
      }

      if (!isMounted.current) return;

      if (success) {
        if (isMounted.current) {
          setFollowingStates(prev => ({
            ...prev,
            [userId]: !isCurrentlyFollowing
          }));
          notifyFollowUpdate();
        }
      } else {
        Alert.alert('Error', `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user. Please try again.`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setProcessingFollow(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
  };

  useEffect(() => {
    const hasLoading = Object.values(videoLoading).some(loading => loading);
    if (hasLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulsatingAnimation, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulsatingAnimation, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulsatingAnimation.setValue(0.3);
    }
  }, [videoLoading, pulsatingAnimation]);

  const prefetchVideos = useCallback(() => {
    const prefetchIndices = [
      currentIndex - 1,
      currentIndex + 1,
      currentIndex + 2,
    ].filter(idx => idx >= 0 && idx < posts.length && idx !== currentIndex);

    prefetchIndices.forEach(index => {
      // Extract video URL from any media_urls format
      let prefetchMediaUrls = posts[index]?.media_urls;
      if (typeof prefetchMediaUrls === 'string') {
        try { prefetchMediaUrls = JSON.parse(prefetchMediaUrls); } catch { prefetchMediaUrls = null; }
      }
      let videoUrl: string | null = null;
      if (Array.isArray(prefetchMediaUrls) && prefetchMediaUrls.length > 0) {
        const firstItem = prefetchMediaUrls[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          videoUrl = firstItem.url || null;
        }
      } else if (prefetchMediaUrls && typeof prefetchMediaUrls === 'object') {
        videoUrl = prefetchMediaUrls.videoUrl || null;
      }
      if (videoUrl && !videoCached[index] && !videoLoading[index]) {
        const ref = videoRefs.current[index];
        if (ref && typeof ref.loadAsync === 'function') {
          ref.loadAsync(
            { uri: videoUrl },
            { shouldPlay: false, isMuted: true, volume: 0 }
          ).then(() => {
            if (isMounted.current) {
              setVideoCached(prev => ({ ...prev, [index]: true }));
            }
          }).catch(() => { });
        }
      }
    });
  }, [currentIndex, posts, videoCached, videoLoading, isMounted]);

  useEffect(() => {
    const initialPausedState: Record<number, boolean> = {};
    posts.forEach((_, index) => {
      initialPausedState[index] = index !== currentIndex;
    });
    setIsPaused(initialPausedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);
  useEffect(() => {
    if (visible && posts.length > 0) {
      const targetIndex = initialIndex >= 0 && initialIndex < posts.length ? initialIndex : 0;
      if (isMounted.current) {
        setCurrentIndex(targetIndex);
      }
      const timeoutId = setTimeout(() => {
        if (!isMounted.current) return;
        const ref = videoRefs.current[targetIndex];
        if (ref) {
          ref.setStatusAsync({
            shouldPlay: true,
            isMuted: globalMuteState,
            volume: globalMuteState ? 0 : 1.0,
            positionMillis: 0,
          }).then(() => {
            if (isMounted.current) {
              ref.playAsync().catch(() => { });
            }
          }).catch(() => { });
        }
        // Start view timer for initial post if it's not a video
        const initialPost = posts[targetIndex];
        if (initialPost && currentUser?.id && isMounted.current) {
          const contentType = initialPost.content_type;
          const hasVideoUrl = initialPost.media_urls?.videoUrl ||
            (Array.isArray(initialPost.media_urls) && initialPost.media_urls[0]?.type === 'video');
          const isVideoPost = contentType === 'video' || (contentType === 'mixed' && hasVideoUrl);
          if (!isVideoPost) {
            startViewTimer(initialPost);
          }
        }
      }, 150);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Cleanup timers when modal closes
    return () => {
      Object.keys(viewTimerRef.current).forEach(postId => {
        clearTimeout(viewTimerRef.current[postId]);
      });
      viewTimerRef.current = {};
      viewStartTimeRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // @ts-ignore
  }, [visible, initialIndex, posts.length, startViewTimer, currentUser?.id, globalMuteState, isMounted]);
  useEffect(() => {
    if (visible && hasMore && !loadingMore && onLoadMore) {
      if (currentIndex >= posts.length - 3) {
        onLoadMore();
      }
    }
  }, [currentIndex, posts.length, visible, hasMore, loadingMore, onLoadMore]);

  const handleDoubleTap = (index: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (
      lastTapRef.current[index] &&
      now - lastTapRef.current[index] < DOUBLE_TAP_DELAY
    ) {
      lastTapRef.current[index] = 0;
      return true;
    } else {
      lastTapRef.current[index] = now;

      setTimeout(() => {
        if (lastTapRef.current[index] === now) {
          togglePlayPause(index);
          lastTapRef.current[index] = 0;
        }
      }, DOUBLE_TAP_DELAY);

      return false;
    }
  };

  const handleDeletePost = () => {
    if (onDeletePost && selectedPostForDelete) {
      onDeletePost(selectedPostForDelete);
      setShowPostOptions(false);
      setSelectedPostForDelete('');
    }
  };

  const handleReportPost = () => {
    console.log('[InstagramFullscreenVideo] Report post tapped:', selectedReportPost?.id);
    setShowReportModal(true);
  };

  const handleProfileNavigation = (profileUser: any, visitorUserId: string) => {
    const loggedInUserId = authUser?.id || currentUser?.id;
    const isOwnProfile = loggedInUserId && (loggedInUserId === visitorUserId || loggedInUserId === profileUser?.id);
    if (!isOwnProfile && !isProfileViewable(profileUser, visitorUserId)) return;
    const didNavigate = navigateToUserProfile(profileUser, visitorUserId, loggedInUserId);
    if (didNavigate) {
      setTimeout(() => {
        Object.keys(videoRefs.current).forEach(key => {
          const ref = videoRefs.current[parseInt(key)];
          if (ref) {
            try {
              ref.setStatusAsync({ shouldPlay: false, isMuted: true, volume: 0 }).catch(() => { });
              ref.pauseAsync().catch(() => { });
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) { }
          }
        });
        setMuted(true);
        onClose();
      }, 100);
    }
  };

  const togglePlayPause = (index: number) => {
    setIsPaused((prev) => {
      const newState = { ...prev };
      newState[index] = !prev[index];

      if (videoRefs.current[index]) {
        if (newState[index]) {
          videoRefs.current[index].pauseAsync();
        } else {
          videoRefs.current[index].playAsync();
        }
      }

      return newState;
    });
  };

  const toggleMute = () => {
    toggleGlobalMute();
    const newMuteState = !globalMuteState;

    Object.values(videoRefs.current).forEach((ref) => {
      if (ref && typeof ref.setStatusAsync === 'function') {
        ref.setStatusAsync({ isMuted: newMuteState }).catch(() => { });
      }
    });
  };

  const startViewTimer = useCallback((post: any) => {
    if (!currentUser?.id || !post?.id) return;

    const postId = post.id;
    const contentType = post.content_type;
    const hasVideoInMedia = post.media_urls?.videoUrl ||
      (Array.isArray(post.media_urls) && post.media_urls[0]?.type === 'video');
    const isVideoPost = contentType === 'video' || (contentType === 'mixed' && hasVideoInMedia);
    if (isVideoPost) return;
    if (viewTrackedRef.current.has(postId)) return;
    if (viewTimerRef.current[postId]) {
      clearTimeout(viewTimerRef.current[postId]);
    }
    viewStartTimeRef.current[postId] = Date.now();
    // @ts-ignore
    viewTimerRef.current[postId] = setTimeout(async () => {
      if (!isMounted.current) return;
      const viewDuration = Date.now() - (viewStartTimeRef.current[postId] || 0);
      if (viewDuration >= 2000 && !viewTrackedRef.current.has(postId) && currentUser?.id) {
        try {
          const success = await trackPostView(postId, currentUser.id, viewDuration);
          if (success && isMounted.current) {
            viewTrackedRef.current.add(postId);
          }
        } catch (error) {
          console.error('[InstagramFullscreenVideo] Error tracking post view:', error);
        }
      }
    }, 2000);
  }, [currentUser?.id, isMounted]);
  const stopViewTimer = useCallback((postId: string) => {
    if (viewTimerRef.current[postId]) {
      clearTimeout(viewTimerRef.current[postId]);
      delete viewTimerRef.current[postId];
    }
    delete viewStartTimeRef.current[postId];
  }, []);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const sortedItems = [...viewableItems].sort(
        (a, b) => (b.percentVisible || 0) - (a.percentVisible || 0)
      );
      const mostVisibleItem = sortedItems[0];

      if (mostVisibleItem && mostVisibleItem.isViewable) {
        const visibleIndex = mostVisibleItem.index;
        const visiblePost = posts[visibleIndex];

        if (currentIndex !== visibleIndex) {
          // Stop timer for previous post
          if (posts[currentIndex]) {
            stopViewTimer(posts[currentIndex].id);
          }

          if (isMounted.current) {
            setCurrentIndex(visibleIndex);
            setIsPaused(prev => ({ ...prev, [visibleIndex]: false }));
          }
          const newRef = videoRefs.current[visibleIndex];
          if (newRef) {
            newRef.setStatusAsync({
              shouldPlay: true,
              isMuted: globalMuteState,
              volume: globalMuteState ? 0.0 : 1.0,
              positionMillis: 0,
            }).catch(() => { });
          }
          setTimeout(() => {
            if (isMounted.current) {
              prefetchVideos();
            }
          }, 50);
          if (visiblePost && isMounted.current) {
            startViewTimer(visiblePost);
          }
        }
      }
    }
  }, [currentIndex, globalMuteState, prefetchVideos, posts, startViewTimer, stopViewTimer, isMounted]);

  const extractHashtags = (content: any, tags: any): string[] => {
    if (tags) {
      let tagsArray: string[] = [];
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags);
          if (Array.isArray(parsed)) {
            tagsArray = parsed;
          }
        } catch {
          tagsArray = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
      }
      if (tagsArray.length > 0) {
        return tagsArray.slice(0, 4).map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      }
    }
    if (!content) return [];

    let textContent = '';
    if (typeof content === 'string') {
      textContent = content;
    } else if (typeof content === 'object' && content !== null) {
      textContent = content.text || content.content || content.body || '';
    }

    if (!textContent) return [];

    const hashtagMatches = textContent.match(/#\w+/g);
    if (hashtagMatches && hashtagMatches.length > 0) {
      return hashtagMatches.slice(0, 4);
    }

    return [];
  };

  const renderVideoItem = ({ item, index }: any) => {
    // Parse media_urls - handle all formats (legacy object, array of objects, string arrays, stringified JSON)
    let mediaUrls = item.media_urls;
    if (typeof mediaUrls === 'string') {
      try { mediaUrls = JSON.parse(mediaUrls); } catch { mediaUrls = null; }
    }

    // Extract video URL from any format
    let videoUrl = '';
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      const firstItem = mediaUrls[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        if (firstItem.type === 'video' || item.content_type === 'video') {
          videoUrl = firstItem.url || '';
        }
      }
    } else if (mediaUrls && typeof mediaUrls === 'object') {
      videoUrl = mediaUrls.videoUrl || '';
    }

    // Extract photo URL from any format
    let photoUrl: string | null = null;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      const firstItem = mediaUrls[0];
      if (typeof firstItem === 'string') {
        photoUrl = firstItem;
      } else if (typeof firstItem === 'object' && firstItem !== null) {
        if (firstItem.type !== 'video' || item.content_type !== 'video') {
          photoUrl = firstItem.url || firstItem.thumbnailUrl || null;
        }
      }
    } else if (mediaUrls && typeof mediaUrls === 'object') {
      photoUrl = mediaUrls.photoUrl || mediaUrls.imageUrl || null;
    }

    const user = users[item.user_id];
    const contentType = item.content_type;
    const isVideoPost = contentType === 'video' || (contentType === 'mixed' && videoUrl);
    const isValidVideo = videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
    const isPhotoPost = contentType === 'photo' || contentType === 'image' ||
      (contentType === 'mixed' && !isValidVideo && photoUrl);
    const isValidPhoto = photoUrl && typeof photoUrl === 'string' && photoUrl.trim() !== '' && photoUrl.startsWith('http');
    const isTextPost = contentType === 'text';
    const hasTextContent = item.content && (typeof item.content === 'string' ? item.content.trim() !== '' :
      (item.content.text || item.content.content || item.content.body));
    if (isVideoPost && !isValidVideo) {
      return (
        <View style={[styles.videoWrapper, { height: VISIBLE_HEIGHT }]}>
          <View style={[styles.videoContainer, { height: VISIBLE_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }]}>
            <Ionicons name="videocam-off-outline" size={64} color="#666" />
            <Text style={{ color: '#888', fontSize: 16, marginTop: 12 }}>Video not available</Text>
          </View>
        </View>
      );
    }
    if (isPhotoPost && !isValidPhoto) {
      return (
        <View style={[styles.videoWrapper, { height: VISIBLE_HEIGHT }]}>
          <View style={[styles.videoContainer, { height: VISIBLE_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }]}>
            <Ionicons name="image-outline" size={64} color="#666" />
            <Text style={{ color: '#888', fontSize: 16, marginTop: 12 }}>Image not available</Text>
          </View>
        </View>
      );
    }

    const currentStats = postStats[item.id] || {
      likesCount: item.likes_count || 0,
      commentsCount: item.comments_count || 0,
      sharesCount: item.shares_count || 0,
      isLiked: false,
      upvotesCount: item.upvotes_count || 0,
      downvotesCount: item.downvotes_count || 0,
      netVotes: item.net_votes || 0,
      userVoteType: null,
    };

    const hashtags = extractHashtags(item.content, item.tags);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isOwnVideo = currentUser?.id === item.user_id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isFollowing = followingStates[item.user_id];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isProcessingUser = processingFollow.has(item.user_id);

    if (!repostAnimation.current[item.id]) {
      repostAnimation.current[item.id] = new Animated.Value(1);
    }

    const postIsReposted = isReposted[item.id] || (checkIsReposted && checkIsReposted(item.id)) || false;
    const getTextContent = () => {
      if (!item.content) return '';
      if (typeof item.content === 'string') return item.content;
      if (typeof item.content === 'object' && item.content !== null) {
        return item.content.text || item.content.content || item.content.body || '';
      }
      return '';
    };
    const renderPostContent = () => {
      if (isVideoPost && isValidVideo) {
        // Check if this is a multi-item post (multiple videos or mixed video+photo)
        const isMultiItem = Array.isArray(mediaUrls) && mediaUrls.length > 1;

        if (isMultiItem) {
          // Multi-item post: use carousel for all items
          const carouselItems: CarouselMediaItem[] = [];
          mediaUrls.forEach((p: any) => {
            if (typeof p === 'string' && p.startsWith('http')) {
              carouselItems.push({ type: 'video', url: p });
            } else if (typeof p === 'object' && p !== null && p.url) {
              carouselItems.push({
                type: p.type === 'video' ? 'video' : 'photo',
                url: p.url,
                thumbnailUrl: p.thumbnailUrl,
              });
            }
          });

          if (carouselItems.length > 0) {
            return (
              <FullscreenCarousel
                items={carouselItems}
                screenWidth={SCREEN_WIDTH}
                screenHeight={SCREEN_HEIGHT - 4}
                isMuted={globalMuteState}
              />
            );
          }
        }

        // Single video: use full-featured player with progress bar, seeking, etc.
        return (
          <>
            <Video
              key={`fullscreen-${index}`}
              ref={(ref) => {
                if (ref) {
                  videoRefs.current[index] = ref;
                }
              }}
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls={false}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay={currentIndex === index && visible && !isPaused[index]}
              isMuted={currentIndex !== index || globalMuteState}
              rate={1.0}
              volume={currentIndex === index && !globalMuteState ? 1.0 : 0}
              progressUpdateIntervalMillis={100}
              onError={(error) => {
                const retryLoad = (attempt: number) => {
                  if (attempt > 5) return;

                  const ref = videoRefs.current[index];
                  if (ref && videoUrl) {
                    setTimeout(() => {
                      ref.loadAsync(
                        { uri: videoUrl },
                        { shouldPlay: currentIndex === index, isMuted: currentIndex !== index || globalMuteState }
                      ).catch(() => {
                        retryLoad(attempt + 1);
                      });
                    }, Math.min(500 * attempt, 2000));
                  }
                };

                retryLoad(1);
              }}
              onLoad={(status) => {
                setVideoLoading(prev => ({ ...prev, [index]: false }));
                setVideoCached(prev => ({ ...prev, [index]: true }));
                if (status.isLoaded && status.durationMillis) {
                  const savedPos = getPosition(item.id);
                  if (savedPos > 0 && savedPos < status.durationMillis - 1000) {
                    const ref = videoRefs.current[index];
                    if (ref) {
                      ref.setPositionAsync(savedPos).catch(() => { });
                    }
                  }
                }
              }}
              onLoadStart={() => {
                if (!videoCached[index]) {
                  setVideoLoading(prev => ({ ...prev, [index]: true }));
                }
              }}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  setVideoLoading(prev => ({ ...prev, [index]: false }));

                  // Track video progress for progress bar
                  if (status.positionMillis !== undefined) {
                    setVideoProgress(prev => ({ ...prev, [index]: status.positionMillis || 0 }));
                  }
                  if (status.durationMillis !== undefined && status.durationMillis > 0) {
                    setVideoDuration(prev => ({ ...prev, [index]: status.durationMillis || 0 }));
                  }

                  if (status.positionMillis && status.positionMillis > 500) {
                    savePosition(item.id, status.positionMillis);
                  }

                  if (status.didJustFinish) {
                    clearPosition(item.id);
                  }

                  if (currentIndex === index && !status.isPlaying && !isPaused[index] && visible) {
                    const ref = videoRefs.current[index];
                    if (ref) {
                      ref.playAsync().catch(() => { });
                    }
                  }
                }
              }}
              onReadyForDisplay={() => {
                setVideoLoading(prev => ({ ...prev, [index]: false }));
                setVideoCached(prev => ({ ...prev, [index]: true }));
              }}
            />

            {videoLoading[index] && index === currentIndex && (
              <View style={styles.loadingOverlay}>
                <Animated.View
                  style={[
                    styles.pulsatingBackground,
                    { opacity: pulsatingAnimation }
                  ]}
                />
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </>
        );
      }

      if (isPhotoPost && isValidPhoto) {
        // Parse all media items from any format for carousel support
        const carouselItems: CarouselMediaItem[] = [];
        if (Array.isArray(mediaUrls)) {
          mediaUrls.forEach((p: any) => {
            if (typeof p === 'string' && p.startsWith('http')) {
              carouselItems.push({ type: 'photo', url: p });
            } else if (typeof p === 'object' && p !== null && p.url) {
              carouselItems.push({
                type: p.type === 'video' ? 'video' : 'photo',
                url: p.url,
                thumbnailUrl: p.thumbnailUrl,
              });
            }
          });
        }
        if (carouselItems.length === 0 && photoUrl) {
          carouselItems.push({ type: 'photo', url: photoUrl as string });
        }

        return (
          <FullscreenCarousel
            items={carouselItems}
            screenWidth={SCREEN_WIDTH}
            screenHeight={SCREEN_HEIGHT - 4}
            isMuted={globalMuteState}
          />
        );
      }

      if (isTextPost || (!isVideoPost && !isPhotoPost && hasTextContent)) {
        const textContent = getTextContent();
        return (
          <View style={styles.textPostContainer}>
            <Text style={styles.textPostContent}>{textContent}</Text>
          </View>
        );
      }

      return (
        <View style={[styles.videoContainer, { height: VISIBLE_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }]}>
          <Ionicons name="document-outline" size={64} color="#666" />
          <Text style={{ color: '#888', fontSize: 16, marginTop: 12 }}>Content not available</Text>
        </View>
      );
    };

    // Determine if this is a multi-item carousel post (needs horizontal swipe, no TouchableWithoutFeedback)
    const isCarouselPost = Array.isArray(mediaUrls) && mediaUrls.length > 1;

    return (
      <View style={[styles.videoWrapper, { height: VISIBLE_HEIGHT }]}>
        {isCarouselPost ? (
          // Carousel posts: render without TouchableWithoutFeedback to allow horizontal swiping
          <View style={[styles.videoContainer, { height: VISIBLE_HEIGHT }]}>
            {renderPostContent()}
          </View>
        ) : (
          // Single-item posts: use TouchableWithoutFeedback for double-tap play/pause
          <TouchableWithoutFeedback onPress={() => handleDoubleTap(index)}>
            <View style={[styles.videoContainer, { height: VISIBLE_HEIGHT }]}>
              {renderPostContent()}
              {isPaused[index] && index === currentIndex && isVideoPost && isValidVideo && (
                <View style={styles.pauseIconContainer} pointerEvents="none">
                  <Ionicons name="play" size={70} color="#fff" style={{ marginLeft: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Seekable Progress Bar - OUTSIDE TouchableWithoutFeedback for independent touch handling */}
        {isVideoPost && isValidVideo && (videoDuration[index] || 0) > 0 && (
          <View style={styles.tiktokProgressContainer} pointerEvents="box-none">
            {/* Time indicator - shows when seeking */}
            {isSeeking[index] && (
              <View style={styles.seekTimeIndicator} pointerEvents="none">
                <View style={styles.seekTimeContainer}>
                  <Text style={styles.seekTimeText}>
                    {formatTime(videoProgress[index] || 0)} / {formatTime(videoDuration[index] || 0)}
                  </Text>
                </View>
              </View>
            )}
            {/* Progress bar track - expands when seeking */}
            <View
              style={[
                styles.progressBarTrack,
                isSeeking[index] && styles.progressBarTrackExpanded
              ]}
              pointerEvents="none"
            >
              <View
                style={[
                  styles.progressBarFill,
                  isSeeking[index] && styles.progressBarFillExpanded,
                  { width: `${((videoProgress[index] || 0) / (videoDuration[index] || 1)) * 100}%` }
                ]}
              />
              {/* Seek thumb/knob - visible when seeking */}
              {isSeeking[index] && (
                <View
                  style={[
                    styles.seekThumb,
                    { left: `${((videoProgress[index] || 0) / (videoDuration[index] || 1)) * 100}%` }
                  ]}
                />
              )}
            </View>
            {/* Touchable seek area - with Responder for reliable drag support */}
            <View
              style={styles.progressTouchArea}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onStartShouldSetResponderCapture={() => true}
              onMoveShouldSetResponderCapture={() => true}
              onResponderGrant={(e: GestureResponderEvent) => {
                handleSeekStart(index, e.nativeEvent.pageX);
              }}
              onResponderMove={(e: GestureResponderEvent) => {
                handleSeekMove(index, e.nativeEvent.pageX);
              }}
              onResponderRelease={() => {
                handleSeekEnd(index);
              }}
              onResponderTerminate={() => {
                handleSeekEnd(index);
              }}
            />
          </View>
        )}

        { }
        <View style={styles.topSection}>
          { }

          <View style={styles.userInfoRow}>
            <TouchableOpacity
              onPress={() => handleProfileNavigation(user, item.user_id)}
              disabled={!isProfileViewable(user, item.user_id) && item.user_id !== (authUser?.id || currentUser?.id)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                key={`profile-${item.user_id}-${user?.avatar_url || 'default'}`}
                source={user?.avatar_url || 'https://img.icons8.com/color/48/test-account.png'}
                style={styles.profilePic}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userTextContainer}
              onPress={() => handleProfileNavigation(user, item.user_id)}
              disabled={!isProfileViewable(user, item.user_id) && item.user_id !== (authUser?.id || currentUser?.id)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
            >
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  @{getUserDisplayName(user, item) || user?.username || 'James Dean'}
                </Text>
                {user?.is_verified && !item?.is_anonymous && (
                  <Ionicons name="checkmark-circle" size={16} color="#3b82f6" style={styles.verifiedIcon} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        { }
        <View style={[
          styles.bottomNav,
          (isTextPost || (!isVideoPost && !isPhotoPost && hasTextContent)) && styles.bottomNavCentered
        ]}>
          { }
          {isVideoPost && isValidVideo && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={toggleMute}
              activeOpacity={0.7}
            >
              <Ionicons
                name={globalMuteState ? "volume-mute" : "volume-medium"}
                size={36}
                color="white"
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
              />
            </TouchableOpacity>
          )}

          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const isTextOnlyPost = isTextPost || (!isVideoPost && !isPhotoPost && hasTextContent);
            // TikTok-style: Always use white icons with dark shadow for visibility on ANY background
            const iconShadowStyle = {
              textShadowColor: 'rgba(0, 0, 0, 0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            };

            return (
              <>
                { }
                <TouchableOpacity
                  style={styles.navButtonRow}
                  onPress={() => {
                    if (!user) {
                      Alert.alert('Error', 'Post author information not available.');
                      return;
                    }
                    setSelectedPost(item);
                    setSelectedUser(user);
                    setShowRepostModal(true);
                  }}
                  activeOpacity={0.7}
                  disabled={isLoading(item.id, 'share')}
                >
                  <Animated.View style={{ transform: [{ scale: repostAnimation.current[item.id] || 1 }] }}>
                    <Ionicons
                      name={postIsReposted ? "repeat" : "arrow-redo"}
                      size={36}
                      color={postIsReposted ? "#4CD4CA" : "white"}
                      style={iconShadowStyle}
                    />
                  </Animated.View>
                  <Text style={[
                    styles.navCountHorizontal,
                    postIsReposted && styles.repostedText
                  ]}>
                    {isLoading(item.id, 'share') ? '...' : formatCount(currentStats.sharesCount)}
                  </Text>
                </TouchableOpacity>

                { }
                <TouchableOpacity
                  style={styles.navButtonRow}
                  onPress={() => {
                    setSelectedPostId(item.id);
                    setShowCommentsModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses" size={36} color="white" style={iconShadowStyle} />
                  <Text style={styles.navCountHorizontal}>
                    {formatCount(currentStats.commentsCount)}
                  </Text>
                </TouchableOpacity>

                { }
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => {
                    setSelectedGiftPost(item);
                    setShowGiftModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="gift" size={36} color="white" style={iconShadowStyle} />
                </TouchableOpacity>

                { }
                <TouchableOpacity
                  style={[styles.navButton, isLoading(item.id, 'vote') && { opacity: 0.5 }]}
                  onPress={async () => {
                    if (!currentUser || isLoading(item.id, 'vote')) return;
                    try {
                      await upvotePost(item.id, item);
                    } catch (error) {
                      console.error('Error upvoting:', error);
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={isLoading(item.id, 'vote')}
                >
                  <Ionicons
                    name="arrow-up"
                    size={36}
                    color={currentStats.userVoteType === 'upvote' ? '#ff3856' : "white"}
                    style={iconShadowStyle}
                  />
                </TouchableOpacity>

                { }
                <View style={styles.voteCountContainer}>
                  <Text style={styles.voteCount}>
                    {formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}
                  </Text>
                </View>

                { }
                <TouchableOpacity
                  style={[styles.navButton, isLoading(item.id, 'vote') && { opacity: 0.5 }]}
                  onPress={async () => {
                    if (!currentUser || isLoading(item.id, 'vote')) return;
                    try {
                      await downvotePost(item.id, item);
                    } catch (error) {
                      console.error('Error downvoting:', error);
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={isLoading(item.id, 'vote')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={36}
                    color={currentStats.userVoteType === 'downvote' ? '#ff3856' : "white"}
                    style={iconShadowStyle}
                  />
                </TouchableOpacity>
              </>
            );
          })()}
        </View>

        {(() => {
          const caption = (() => {
            if (!item.content) return '';
            if (typeof item.content === 'string') return item.content;
            if (typeof item.content === 'object' && item.content !== null) {
              return item.content.text || item.content.content || item.content.body || '';
            }
            return '';
          })();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const showBottomContent = caption || hashtags.length > 0;
          const isTextOnlyPost = isTextPost || (!isVideoPost && !isPhotoPost && hasTextContent);

          // Check if caption is long enough to be truncated
          const isCaptionLong = caption && caption.length > 80;
          const isCaptionExpanded = expandedCaptions[item.id] || false;

          // Set truncated state if not already set
          if (isCaptionLong && truncatedCaptions[item.id] === undefined) {
            setTruncatedCaptions(prev => ({ ...prev, [item.id]: true }));
          }

          return (
            <View style={styles.bottomContentSection}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: wp('2%') }}>
                  {caption ? (
                    <View>
                      <HashtagText
                        style={[styles.captionText, isTextOnlyPost && styles.captionTextDark]}
                        hashtagStyle={[styles.clickableHashtagFullscreen, isTextOnlyPost && styles.clickableHashtagDark]}
                        numberOfLines={isCaptionExpanded ? undefined : 2}
                        onHashtagPress={handleHashtagPress}
                      >
                        {caption}
                      </HashtagText>
                      {isCaptionLong && (
                        <TouchableOpacity
                          onPress={() => {
                            setExpandedCaptions(prev => ({
                              ...prev,
                              [item.id]: !isCaptionExpanded
                            }));
                          }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={[styles.seeMoreText, isTextOnlyPost && styles.seeMoreTextDark]}>
                            {isCaptionExpanded ? 'See less' : 'See more'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}
                  {hashtags.length > 0 && (
                    <View style={styles.bottomHashtagContainer}>
                      {hashtags.map((tag, idx) => (
                        <HashtagChip
                          key={idx}
                          tag={tag}
                          style={[styles.bottomHashtagChip, isTextOnlyPost && styles.bottomHashtagChipDark]}
                          textStyle={[styles.bottomHashtag, isTextOnlyPost && styles.bottomHashtagPrimary]}
                          onPress={handleHashtagPress}
                        />
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={{ padding: wp('2%'), alignSelf: 'flex-start' }}
                  onPress={() => {
                    const isOwn = item.user_id === (authUser?.id || currentUser?.id);
                    console.log('[InstagramFullscreenVideo] 3 dots tapped! Opening options for post:', item.id);
                    console.log('[InstagramFullscreenVideo] isOwnPost:', isOwn);
                    setSelectedPostForDelete(item.id);
                    setSelectedReportPost(item);
                    setShowPostOptions(true);
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={wp('6%')}
                    color={isTextOnlyPost ? "#000" : "#FFF"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButtonTopRight}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <View style={styles.backButtonInnerResponsive}>
            <Ionicons name="close" size={Math.min(wp('6%'), 26)} color="white" />
          </View>
        </TouchableOpacity>

        <View
          style={{ flex: 1, width: '100%' }}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0 && height !== containerHeight) {
              setContainerHeight(height);
            }
          }}
        >
          {containerHeight > 0 ? (
            <FlatList
              ref={flatListRef}
              data={posts}
              keyExtractor={(item, index) => `fullscreen-${item.id}-${index}`}
              renderItem={renderVideoItem}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 60,
                minimumViewTime: 50,
              }}
              showsVerticalScrollIndicator={false}
              pagingEnabled={true}
              snapToInterval={VISIBLE_HEIGHT}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum={true}
              initialScrollIndex={initialIndex}
              getItemLayout={(data, index) => ({
                length: VISIBLE_HEIGHT,
                offset: VISIBLE_HEIGHT * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({
                    offset: Math.max(0, Math.min(info.index, posts.length - 1)) * VISIBLE_HEIGHT,
                    animated: false,
                  });
                }, 50);
              }}
              maxToRenderPerBatch={2}
              windowSize={3}
              initialNumToRender={2}
              removeClippedSubviews={true}
              scrollEventThrottle={16}
              directionalLockEnabled={true}
              bounces={false}
              alwaysBounceVertical={false}
              showsHorizontalScrollIndicator={false}
              overScrollMode="never"
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              onEndReached={() => {
                if (hasMore && !loadingMore && onLoadMore) {
                  onLoadMore();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? (
                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : null}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        <UnifiedCommentsModal
          visible={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          postId={selectedPostId}
          onCommentAdded={async () => {
            if (selectedPostId && syncPostCommentCount) {
              await new Promise(resolve => setTimeout(resolve, 100));
              await syncPostCommentCount(selectedPostId);
            }
          }}
          title="Comments"
        />

        {selectedPost && selectedUser && (
          <RepostOptionsModal
            visible={showRepostModal}
            onClose={() => {
              setShowRepostModal(false);
              setSelectedPost(null);
              setSelectedUser(null);
            }}
            post={selectedPost}
            user={selectedUser}
            onRepost={async (type, comment) => {
              if (!repostPost || !selectedUser) {
                Alert.alert('Error', 'Unable to repost at this time.');
                return;
              }

              try {
                await repostPost(selectedPost, selectedUser, type, comment);

                setIsReposted(prev => ({ ...prev, [selectedPost.id]: true }));

                if (repostAnimation.current[selectedPost.id]) {
                  Animated.sequence([
                    Animated.timing(repostAnimation.current[selectedPost.id], {
                      toValue: 1.3,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                    Animated.timing(repostAnimation.current[selectedPost.id], {
                      toValue: 1,
                      duration: 150,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }

                setShowRepostModal(false);
                setSelectedPost(null);
                setSelectedUser(null);
              } catch (error) {
                console.error('Error reposting:', error);
                Alert.alert('Error', 'Failed to repost. Please try again.');
              }
            }}
            onShare={async () => {
              if (!sharePost || !selectedUser) {
                Alert.alert('Error', 'Unable to share at this time.');
                return;
              }

              try {
                await sharePost(selectedPost, selectedUser);
                setShowRepostModal(false);
                setSelectedPost(null);
                setSelectedUser(null);
              } catch (error) {
                console.error('Error sharing:', error);
                Alert.alert('Error', 'Failed to share. Please try again.');
              }
            }}
            isLoading={isLoading(selectedPost.id, 'share')}
          />
        )}

        <PostOptionsModal
          visible={showPostOptions}
          onClose={() => {
            console.log('[InstagramFullscreenVideo] Closing PostOptionsModal');
            setShowPostOptions(false);
            setSelectedPostForDelete('');
            setSelectedReportPost(null);
          }}
          onDelete={handleDeletePost}
          onReport={handleReportPost}
          isOwnPost={selectedReportPost?.user_id === (authUser?.id || currentUser?.id)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
    position: 'relative',
  },
  videoContainer: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 4,
    backgroundColor: 'black',
  },
  video: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 4,
    backgroundColor: 'black',
  },
  pauseIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  // TikTok-style progress bar styles
  tiktokProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    // Border for visibility on all backgrounds
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    // Border for visibility on white backgrounds
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressTouchArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp('12%'), // Extra large touch area for easy drag initiation
  },
  // Expanded progress bar when seeking (TikTok style)
  progressBarTrackExpanded: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressBarFillExpanded: {
    backgroundColor: '#fff',
  },
  // Seek thumb/knob that appears when dragging - larger for easy grabbing
  seekThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: -10, // Center the thumb on the position
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  // Time indicator that shows current/total time when seeking
  seekTimeIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 101,
  },
  seekTimeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  seekTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seekingOverlay: {
    position: 'absolute',
    bottom: hp('8%'),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 101,
  },
  thumbnailPreview: {
    width: wp('30%'),
    height: hp('18%'),
    borderRadius: wp('2%'),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#000',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  seekingTimeText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontWeight: '700',
    marginTop: hp('1.5%'),
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,
  backButtonTopRight: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp('8%') : hp('6%'),
    right: wp('4%'),
    zIndex: 100003,
    minWidth: 36,
    minHeight: 36,
  },
  backButtonInnerResponsive: {
    width: Math.max(wp('9%'), 36),
    height: Math.max(wp('9%'), 36),
    maxWidth: 44,
    maxHeight: 44,
    borderRadius: Math.max(wp('4.5%'), 18),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  topSection: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp('6%') : hp('7%'),
    left: 0,
    right: 0,
    paddingHorizontal: wp('4%'),
    zIndex: 100001,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePic: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    marginRight: wp('3%'),
  },
  userTextContainer: {
    flex: 1,
    paddingRight: wp('2%'),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('0.5%'),
  },
  userName: {
    color: 'white',
    fontSize: wp('4.2%'),
    fontWeight: '700',
    marginRight: wp('2%'),
  },
  verifiedIcon: {
    flexShrink: 0,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('1.5%'),
  },
  hashtag: {
    color: 'white',
    fontSize: wp('3.2%'),
    fontWeight: '400',
    opacity: 0.9,
  },

  bottomNav: {
    position: 'absolute',
    bottom: Platform.OS === 'ios'
      ? hp('4%')
      : (SCREEN_HEIGHT / SCREEN_WIDTH >= 2.2 && PixelRatio.get() >= 2.5)
        ? hp('3%')
        : hp('2%'),
    left: 0,
    right: 0,
    height: hp('6%'),
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('1%'),
    zIndex: 100000,
  },
  bottomNavCentered: {
    justifyContent: 'center',
    gap: wp('4%'),
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp('12%'),
    minHeight: hp('7%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('1.5%'),
  },
  navButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp('15%'),
    minHeight: hp('7%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('1.5%'),
    gap: wp('1.5%'),
  },
  navCountHorizontal: {
    color: 'white',
    fontSize: wp('3%'),
    fontWeight: '300',
    // TikTok-style shadow for visibility on any background
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  voteCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp('4%'),
    paddingHorizontal: wp('0.5%'),
  },
  voteCount: {
    color: 'white',
    fontSize: wp('3.5%'),
    fontWeight: '300',
    // TikTok-style shadow for visibility on any background
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Kept for backwards compatibility - no longer used
  voteCountDark: {
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
  },
  navCountDark: {
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
  },
  repostedText: {
    color: '#4CD4CA',
    fontWeight: '700',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  errorContent: {
    alignItems: 'center',
    padding: wp('6%'),
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    borderRadius: wp('4%'),
    marginHorizontal: wp('5%'),
  },
  errorText: {
    color: 'white',
    fontSize: wp('4%'),
    fontWeight: 'bold',
    marginTop: hp('1.5%'),
    textAlign: 'center',
  },
  retryText: {
    color: '#ccc',
    fontSize: wp('3.5%'),
    marginTop: hp('0.8%'),
    textAlign: 'center',
  },
  pulsatingBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingText: {
    color: 'white',
    marginTop: hp('1%'),
    fontSize: wp('3.5%'),
    fontWeight: '500',
  },
  bottomContentSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios'
      ? hp('11%')
      : (SCREEN_HEIGHT / SCREEN_WIDTH >= 2.2 && PixelRatio.get() >= 2.5)
        ? hp('10%')
        : hp('8.5%'),
    left: 0,
    right: 0,
    paddingHorizontal: wp('4%'),
    zIndex: 99999,
  },
  captionText: {
    color: 'white',
    fontSize: wp('3.5%'),
    fontWeight: '400',
    lineHeight: wp('5%'),
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: hp('0.5%'),
  },
  captionTextDark: {
    color: '#000000',
    textShadowColor: 'transparent',
  },
  seeMoreText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: wp('3.5%'),
    fontWeight: '600',
    marginTop: hp('0.5%'),
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seeMoreTextDark: {
    color: 'rgba(0, 0, 0, 0.6)',
    textShadowColor: 'transparent',
  },
  bottomHashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  bottomHashtag: {
    color: colors.primary,
    fontSize: wp('3.2%'),
    fontWeight: '600',
    opacity: 1,
    // No shadow - clean text
  },
  bottomHashtagPrimary: {
    color: colors.primary,
    opacity: 1,
  },
  bottomHashtagChip: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginRight: wp('2%'),
    marginBottom: 0,
  },
  bottomHashtagChipDark: {
    backgroundColor: 'transparent',
  },
  clickableHashtagFullscreen: {
    color: colors.primary,
    fontWeight: '600',
  },
  clickableHashtagDark: {
    color: colors.primary,
  },
  // Photo post styles
  photoPostContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 4,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 4,
  },
  photoCountBadge: {
    position: 'absolute',
    top: hp('2%'),
    right: wp('4%'),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('3%'),
  },
  photoCountText: {
    color: 'white',
    fontSize: wp('3.5%'),
    fontWeight: '600',
  },
  // Text post styles
  textPostContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  textPostContent: {
    color: '#000000',
    fontSize: wp('6%'),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: wp('9%'),
  },
});

export default InstagramFullscreenVideo;