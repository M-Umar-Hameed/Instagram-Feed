
import { AVPlaybackStatus, Video } from 'expo-av';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  FlatList,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { CrossPlatformImage as Image } from './ui/CrossPlatformImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import UnifiedCommentsModal from './UnifiedCommentsModal';
import RepostOptionsModal from './RepostOptionsModal';
import PostOptionsModal from './PostOptionsModal';
import HashtagText from './HashtagText';


import { Database } from '../database.types';
import { colors } from '../utils/theme';
import { navigateToUserProfile, isProfileViewable, getFormattedUsername } from '../utils/profileNavigation';
import { usePostInteractions } from '../contexts/PostInteractionsContext';
import { trackVideoView, trackPostView } from '../utils/postInteractions';
import { getCachedUser } from '../utils/supabase';
import { useFollow } from '../contexts/FollowContext';
import { useMute } from '../contexts/MuteContext';
import { useVideoPlayback, VIDEO_PRIORITY } from '../contexts/VideoPlaybackContext';
import { useIsMounted } from '../hooks/useIsMounted';

// Removed ReelsStyleAdComponent
import {
  TextPostRenderer,
  ImageCarouselRenderer,
  SingleImageRenderer,
  VideoPlayerRenderer,
} from './feed';
import { styles, RESPONSIVE, SCREEN_WIDTH } from './feed/feedStyles';

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

let savedScrollIndex = 0;

// Reset scroll position - call on login/logout so feed starts at top
export const resetSavedScrollIndex = () => {
  savedScrollIndex = 0;
};

interface InstagramReelsFeedProps {
  posts: CirclePost[];
  users: Record<string, User>;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  headerHeight?: number;
  isFullscreen?: boolean;
  showAuraPoints?: boolean;
  onSearchPress?: () => void;
  feedType?: 'following' | 'forYou';
  onSwitchToForYou?: () => void;
  onDeletePost?: (postId: string) => void;
  isExternallyPaused?: boolean; // Pause video from parent (e.g., when search modal opens)
  initialPostId?: string | null; // Shared post ID from parent for feed sync
  onCurrentPostChange?: (postId: string) => void; // Callback when current post changes
  shouldPauseOnUnmount?: boolean; // Whether to pause all videos when component unmounts
  showVideosOnly?: boolean; // Filter to show only video posts (default: true for world/following feeds)
  onHashtagPress?: (tag: string) => void; // Custom handler for hashtag navigation (used in modals)
  isWorldFeed?: boolean; // Whether this feed is the world feed (for notification routing)
}

interface VideoPostProps {
  post: CirclePost;
  index: number;
  currentIndex: number;
  isMuted: boolean;
  isScreenFocused: boolean;
  visibleIndexes: number[];
  videoRefs: React.MutableRefObject<Record<number, Video | null>>;
  users: Record<string, User>;
  handleToggleMute: () => void;
  onShowComments: (postId: string) => void;
  onShare: (post: CirclePost, user: User) => void;
  onGift: (post: CirclePost) => void;
  headerHeight: number;
  isFullscreen: boolean;
  loadedVideosCache: React.MutableRefObject<Set<string>>;
  videoLoadStates: React.MutableRefObject<
    Record<number, 'loading' | 'loaded' | 'error'>
  >;
  showAuraPoints: boolean;
  onSearchPress?: () => void;
  onDeletePost?: (postId: string) => void;
  onReportPost?: (post: CirclePost) => void;
  isExternallyPaused?: boolean;
  hasAlreadyReported?: boolean; // Whether user has already reported this post
  savePosition: (postId: string, positionMs: number) => void;
  getPosition: (postId: string) => number;
  clearPosition: (postId: string) => void;
  onHashtagPress?: (tag: string) => void; // Custom handler for hashtag navigation
  visibleHeight: number; // Height of visible area (screen height minus tab bar)
  isWorldFeed?: boolean; // Whether this post is being viewed on the world feed
}

// Helper function to extract video URL from either format (legacy or array)
const extractVideoUrl = (mediaUrls: any): string => {
  if (!mediaUrls) return '';

  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    // New format: array of objects { type, url, thumbnailUrl }
    const firstVideo = mediaUrls.find((item: any) =>
      typeof item === 'object' && item !== null && item.type === 'video'
    );
    if (firstVideo) {
      return firstVideo.url || '';
    }
  } else if (typeof mediaUrls === 'object' && !Array.isArray(mediaUrls)) {
    // Legacy format: { videoUrl, thumbnailUrl }
    return mediaUrls.videoUrl || '';
  }

  return '';
};

const VideoPost = memo<VideoPostProps>(
  ({
    post,
    index,
    currentIndex,
    isMuted,
    isScreenFocused,
    visibleIndexes,
    videoRefs,
    users,
    handleToggleMute,
    onShowComments,
    onShare,
    onGift,
    headerHeight,
    isFullscreen,
    loadedVideosCache,
    videoLoadStates,
    showAuraPoints,
    onSearchPress,
    onDeletePost,
    onReportPost,
    isExternallyPaused = false,
    hasAlreadyReported = false,
    savePosition,
    getPosition,
    clearPosition,
    onHashtagPress,
    visibleHeight,
    isWorldFeed = false,
  }) => {
    const isMounted = useIsMounted();
    const mediaUrls = post.media_urls as MediaUrls | null;

    // Extract videoUrl - handle both legacy and array formats
    let videoUrl = '';
    if (mediaUrls) {
      if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
        // New format: array of objects { type, url }
        const firstVideo = mediaUrls.find((item: any) =>
          typeof item === 'object' && item !== null && item.type === 'video'
        );
        if (firstVideo) {
          videoUrl = firstVideo.url || '';
        }
      } else if (typeof mediaUrls === 'object' && !Array.isArray(mediaUrls)) {
        // Legacy format: { videoUrl }
        videoUrl = (mediaUrls as any).videoUrl || '';
      }
    }

    const [isPaused, setIsPaused] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0); // Current position in milliseconds
    const [videoDuration, setVideoDuration] = useState(0); // Total duration in milliseconds
    const [isSeeking, setIsSeeking] = useState(false); // Track if user is seeking via progress bar
    const wasPlayingBeforeSeek = useRef(false);
    const seekPositionRef = useRef(0); // Use ref for instant updates during drag
    const lastSeekUpdate = useRef(0);

    // Format time for display (mm:ss)
    const formatTime = useCallback((ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Calculate position from pageX (absolute screen position)
    const calculateSeekPosition = useCallback((pageX: number): number => {
      if (!videoDuration || videoDuration <= 0) return 0;
      // Clamp pageX between 0 and screen width
      const clampedX = Math.max(0, Math.min(SCREEN_WIDTH, pageX));
      const percentage = clampedX / SCREEN_WIDTH;
      return Math.floor(percentage * videoDuration);
    }, [videoDuration]);

    // Handle seek start - pause video and start tracking
    const handleSeekStart = useCallback((pageX: number) => {
      if (!videoDuration || videoDuration <= 0) return;

      // Remember if video was playing before seek
      const videoRef = videoRefs.current?.[index];
      if (videoRef) {
        videoRef.getStatusAsync().then((status: any) => {
          if (status.isLoaded) {
            wasPlayingBeforeSeek.current = status.isPlaying;
            // Pause video during seek
            if (status.isPlaying) {
              videoRef.pauseAsync().catch(() => { });
            }
          }
        }).catch(() => { });
      }

      setIsSeeking(true);

      // Calculate and set initial seek position
      const seekPositionMs = calculateSeekPosition(pageX);
      seekPositionRef.current = seekPositionMs;
      setVideoProgress(seekPositionMs);
      lastSeekUpdate.current = Date.now();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoDuration, index, calculateSeekPosition]);

    // Handle seek move - update visual position only (throttled for smooth experience)
    const handleSeekMove = useCallback((pageX: number) => {
      if (!videoDuration || videoDuration <= 0 || !isSeeking) return;

      // Throttle updates to 60fps for smooth visuals
      const now = Date.now();
      if (now - lastSeekUpdate.current < 16) return; // ~60fps
      lastSeekUpdate.current = now;

      const seekPositionMs = calculateSeekPosition(pageX);
      seekPositionRef.current = seekPositionMs;
      setVideoProgress(seekPositionMs);
    }, [videoDuration, isSeeking, calculateSeekPosition]);

    // Handle seek end - seek to final position and resume if was playing
    const handleSeekEnd = useCallback(() => {
      const videoRef = videoRefs.current?.[index];
      const finalPosition = seekPositionRef.current;

      if (videoRef && finalPosition >= 0) {
        // Seek to the final position
        videoRef.setPositionAsync(finalPosition).then(() => {
          // Resume playback if video was playing before seek
          if (wasPlayingBeforeSeek.current) {
            videoRef.playAsync().catch(() => { });
          }
        }).catch(() => { });
      }

      setIsSeeking(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    // Carousel state for multi-media posts
    // Carousel state for multi-media posts
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    // Parse media items from various formats
    interface ParsedMediaItem {
      type: 'photo' | 'video';
      url: string;
      thumbnailUrl?: string;
    }

    const parseMediaItems = useCallback((): ParsedMediaItem[] => {
      if (!post.media_urls) return [];

      const urls = post.media_urls;

      // Format 1: Array of strings (photo URLs) or array of objects
      if (Array.isArray(urls) && urls.length > 0) {
        // Check if it's array of objects with type/url
        if (typeof urls[0] === 'object' && urls[0] !== null) {
          return urls.map((item: any) => ({
            type: item.type || 'photo',
            url: item.url || '',
            thumbnailUrl: item.thumbnailUrl,
          })).filter((item: ParsedMediaItem) => item.url);
        }
        // Array of URL strings (photos)
        return urls.map((url: any) => ({
          type: 'photo' as const,
          url: String(url || ''),
        })).filter((item: ParsedMediaItem) => item.url && item.url.startsWith('http'));
      }

      // Format 2: Object with single video { videoUrl, thumbnailUrl }
      if (typeof urls === 'object' && !Array.isArray(urls)) {
        const urlObj = urls as any;

        // Single video format
        if (urlObj.videoUrl || urlObj.video_url) {
          return [{
            type: 'video' as const,
            url: urlObj.videoUrl || urlObj.video_url || '',
            thumbnailUrl: urlObj.thumbnailUrl,
          }];
        }

        // Single photo format
        if (urlObj.imageUrl || urlObj.photoUrl || urlObj.image_url || urlObj.url || urlObj.main_url) {
          return [{
            type: 'photo' as const,
            url: urlObj.imageUrl || urlObj.photoUrl || urlObj.image_url || urlObj.url || urlObj.main_url || '',
          }];
        }
      }

      return [];
    }, [post.media_urls]);

    const mediaItems = useMemo(() => parseMediaItems(), [parseMediaItems]);
    const hasMultipleMedia = mediaItems.length > 1;

    const [hasError, setHasError] = useState(false);
    const user = post.user_id ? users[post.user_id] : null;

    const [viewTracked, setViewTracked] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [showRepostModal, setShowRepostModal] = useState(false);
    const [isReposted, setIsReposted] = useState(false);
    const repostAnimation = useRef(new Animated.Value(1)).current;

    const [showPostOptions, setShowPostOptions] = useState(false);
    const isOwnPost = currentUserId === post.user_id;

    const { isFollowing: isFollowingGlobal, toggleFollow } = useFollow();
    const [processingFollow, setProcessingFollow] = useState(false);
    const [hideFollowBadge, setHideFollowBadge] = useState(false);
    const followBadgeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const justFollowedRef = useRef(false); // Track if user just tapped follow

    // Caption expansion state
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
    const [isCaptionTruncated, setIsCaptionTruncated] = useState(false);

    const {
      postStats,
      sharePost: sharePostAction,
      upvotePost,
      downvotePost,
      userAuraPoints,
      refreshUserAuraPoints,
      isLoading: contextIsLoading,
      repostPost,
      checkIsReposted,
      repostStatus
    } = usePostInteractions();

    const isFollowing = post.user_id ? isFollowingGlobal(post.user_id) : false;

    // Hide follow badge if already following (on mount or external change)
    // Skip state update if user just tapped follow - the timer in handleFollowToggle handles that
    useEffect(() => {
      if (justFollowedRef.current) {
        justFollowedRef.current = false;
      } else if (isFollowing) {
        setHideFollowBadge(true);
      } else {
        setHideFollowBadge(false);
      }
      // Always return cleanup to clear timer on unmount or dependency change
      return () => {
        if (followBadgeTimerRef.current) {
          clearTimeout(followBadgeTimerRef.current);
          followBadgeTimerRef.current = null;
        }
      };
    }, [isFollowing]);

    const currentStats = useMemo(() => {
      const stats = postStats?.[post.id];
      if (stats) return stats;

      return {
        likesCount: post.likes_count || 0,
        commentsCount: post.comments_count || 0,
        sharesCount: post.shares_count || 0,
        isLiked: false,
        upvotesCount: post.upvotes_count || 0,
        downvotesCount: post.downvotes_count || 0,
        netVotes: Math.max(post.net_votes || 0, 0),
        userVoteType: null as 'upvote' | 'downvote' | null,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postStats, post.id, post.upvotes_count, post.downvotes_count, post.net_votes, post.likes_count, post.comments_count]);

    const heartAnimation = useRef(new Animated.Value(0)).current;
    const auraAnimation = useRef(new Animated.Value(0)).current;
    const lastTap = useRef<number | null>(null);
    const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const viewStartTimeRef = useRef<number>(0);
    const isVisible = visibleIndexes?.includes(index) ?? false;

    useEffect(() => {
      const fetchCurrentUser = async () => {
        const { user } = await getCachedUser();
        if (user && isMounted.current) {
          setCurrentUserId(user.id);
        }
      };
      fetchCurrentUser();
    }, [isMounted]);

    // Track views for text/photo posts after 2 seconds of viewing
    const contentType = post.content_type;
    const isVideoContent = contentType === 'video' || (contentType === 'mixed' && videoUrl);
    // Note: We need an early check for active state for view tracking
    // The full isActive is defined later with more conditions
    const isActiveForTracking = isScreenFocused && currentIndex === index && isVisible && !isExternallyPaused;

    useEffect(() => {
      // Only for non-video posts
      if (isVideoContent || viewTracked || !currentUserId) return;

      if (isActiveForTracking && isVisible) {
        // Start timer
        viewStartTimeRef.current = Date.now();
        viewTimerRef.current = setTimeout(async () => {
          if (!isMounted.current) return;
          const viewDuration = Date.now() - viewStartTimeRef.current;
          if (viewDuration >= 2000) {
            try {
              const success = await trackPostView(post.id, currentUserId, viewDuration);
              if (success && isMounted.current) {
                setViewTracked(true);
              }
            } catch (error) {
              console.error('[InstagramReelsFeed] Error tracking post view:', error);
            }
          }
        }, 2000);
      } else {
        // Clear timer when not active/visible
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      }

      return () => {
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActiveForTracking, isVisible, isVideoContent, viewTracked, currentUserId, post.id]);

    useEffect(() => {
      if (currentUserId && checkIsReposted) {
        const status = checkIsReposted(post.id);
        setIsReposted(status);
      } else if (repostStatus && repostStatus[post.id]) {
        setIsReposted(repostStatus[post.id]);
      }
    }, [post.id, currentUserId, checkIsReposted, repostStatus]);

    useEffect(() => {
      if (isReposted) {
        Animated.sequence([
          Animated.timing(repostAnimation, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(repostAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReposted]);

    const handleVideoPress = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;

      if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
        handleUpvote();
        showHeartAnimation();
        lastTap.current = null;
      } else {
        const videoRef = videoRefs.current?.[index];
        const newPauseState = !isPaused;
        setIsPaused(newPauseState);

        if (videoRef) {
          if (newPauseState) {
            videoRef.pauseAsync().catch(() => { });
          } else if (isActive) {
            videoRef.playAsync().catch(() => { });
          }
        }

        lastTap.current = now;
        setTimeout(() => {
          if (lastTap.current === now) {
            lastTap.current = null;
          }
        }, DOUBLE_PRESS_DELAY);
      }
    };

    const handleUpvote = async () => {

      upvotePost(post.id, post, isWorldFeed ? null : undefined).catch(error => {
        console.error('Error upvoting post:', error);
      });

      if (showAuraPoints && post.user_id === user?.id) {
        showAuraAnimation();
        setTimeout(() => {
          refreshUserAuraPoints();
        }, 1000);
      }
    };

    const handleDownvote = async () => {

      downvotePost(post.id, post, isWorldFeed ? null : undefined).catch(error => {
        console.error('Error downvoting post:', error);
      });

      if (showAuraPoints && post.user_id === user?.id) {
        setTimeout(() => {
          refreshUserAuraPoints();
        }, 1000);
      }
    };

    const handleFollowToggle = async () => {
      if (!currentUserId) {
        Alert.alert('Login Required', 'Please login to follow users.');
        return;
      }

      if (currentUserId === post.user_id || !post.user_id) {
        return;
      }

      // Clear any existing timer
      if (followBadgeTimerRef.current) {
        clearTimeout(followBadgeTimerRef.current);
        followBadgeTimerRef.current = null;
      }

      setProcessingFollow(true);
      setHideFollowBadge(false);

      try {
        const wasFollowing = isFollowing;
        justFollowedRef.current = !wasFollowing; // Mark as user-initiated follow
        const success = await toggleFollow(post.user_id);

        if (!success) {
          Alert.alert('Error', 'Failed to update follow status');
        } else if (!wasFollowing) {
          // Just followed - show checkmark briefly then hide badge
          // @ts-ignore
          followBadgeTimerRef.current = setTimeout(() => {
            setHideFollowBadge(true);
          }, 2000);
        } else {
          // Unfollowed - show the + button again
          setHideFollowBadge(false);
        }
      } catch (error) {
        console.error('Error toggling follow:', error);
        Alert.alert('Error', 'Failed to update follow status');
      } finally {
        setProcessingFollow(false);
      }
    };

    const handleShare = () => {
      if (!currentUserId) {
        Alert.alert('Login Required', 'Please login to share posts.');
        return;
      }

      if (contextIsLoading?.(post.id, 'share')) {
        return;
      }

      setShowRepostModal(true);
    };

    const handleDeletePost = () => {
      if (onDeletePost) {
        onDeletePost(post.id);
      }
    };

    const handleReportPost = () => {
      if (onReportPost) {
        onReportPost(post);
      }
    };

    const handleRepost = async (type: 'simple' | 'quote', comment?: string) => {
      if (!repostPost || !user) return;

      try {
        await repostPost(post, user, type, comment);
        setIsReposted(true);

        Animated.sequence([
          Animated.timing(repostAnimation, {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(repostAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('Error reposting:', error);
      }
    };

    const handleExternalShare = async () => {
      if (!sharePostAction || !user) return;

      const shareUser = user || {
        id: post.user_id || 'anonymous',
        username: 'anonymous_user',
        name: 'Anonymous User',
        email: '',
        aura_points: 0,
      } as User;

      try {
        await sharePostAction(post, shareUser);
      } catch (error) {
        console.error('Error sharing:', error);
        Alert.alert('Share Error', 'Unable to share this post at the moment.');
      }
    };

    const isActive = isScreenFocused && currentIndex === index && isVisible && !isExternallyPaused;

    // Reset pause state when user swipes to this video (isActive becomes true)
    useEffect(() => {
      if (isActive) {
        setIsPaused(false);
      }
    }, [isActive]);

    const showHeartAnimation = () => {
      heartAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(heartAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(heartAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const showAuraAnimation = () => {
      auraAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(auraAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(auraAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const formatCount = (count: number): string => {
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
      }
      return count.toString();
    };

    const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        if (videoUrl && status.playableDurationMillis && status.playableDurationMillis > 0) {
          loadedVideosCache.current?.add(videoUrl);
          if (videoLoadStates.current) {
            videoLoadStates.current[index] = 'loaded';
          }
        }

        // Track video progress for progress bar
        if (status.positionMillis !== undefined) {
          setVideoProgress(status.positionMillis);
        }
        if (status.durationMillis !== undefined && status.durationMillis > 0) {
          setVideoDuration(status.durationMillis);
        }

        // Save video position for resuming later
        if (status.positionMillis && status.positionMillis > 500) {
          savePosition(post.id, status.positionMillis);
        }

        if (
          status.isPlaying &&
          status.positionMillis &&
          status.durationMillis &&
          currentUserId &&
          !viewTracked &&
          isActive
        ) {
          const progressPercent = (status.positionMillis / status.durationMillis) * 100;

          if (progressPercent >= 30) {
            trackVideoView(
              post.id,
              currentUserId,
              status.positionMillis,
              status.durationMillis
            ).then((tracked) => {
              if (tracked && isMounted.current) {
                setViewTracked(true);
              }
            }).catch((error) => {
              console.error('[InstagramReelsFeed] Error tracking view:', error);
            });
          }
        }

        if (status.didJustFinish && !isPaused && isActive) {
          // Clear saved position when video finishes
          clearPosition(post.id);
          const videoRef = videoRefs.current?.[index];
          if (videoRef) {
            videoRef.replayAsync().catch(() => { });
          }
        }
      } else if (status.error) {
        if (videoLoadStates.current) {
          videoLoadStates.current[index] = 'error';
        }
      }
    };

    useEffect(() => {
      if (!isActive || isPaused || hasError) return;

      const ref = videoRefs.current?.[index];
      if (ref && videoUrl && typeof ref.getStatusAsync === 'function') {
        const timer = setTimeout(() => {
          ref.getStatusAsync().then((status: any) => {
            if (status.isLoaded && !status.isPlaying && isActive && !isPaused) {
              ref.playAsync().catch(() => { });
            }
          }).catch(() => { });
        }, 50);

        return () => clearTimeout(timer);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, isPaused, hasError, index, videoUrl]);

    // Determine content type and handle accordingly
    const isTextPost = contentType === 'text';
    const isImagePost = contentType === 'photo' || contentType === 'image' || contentType === 'mixed';

    // Extract text content if present
    let textContent = '';
    if (isTextPost || contentType === 'mixed') {
      if (typeof post.content === 'string') {
        textContent = post.content;
      } else if (typeof post.content === 'object' && post.content !== null) {
        textContent = (post.content as any).text || (post.content as any).content || (post.content as any).body || '';
      }
    }

    // Extract image URL if present
    // Note: Photo posts store media_urls as array of URLs: ["https://..."]
    let imageUrl = '';
    if (isImagePost) {
      // First check if media_urls is an array (most common format for photos)
      if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
        const firstItem = post.media_urls[0];
        if (typeof firstItem === 'string' && firstItem.startsWith('http')) {
          imageUrl = firstItem;
        }
      } else if (mediaUrls && typeof mediaUrls === 'object' && !Array.isArray(mediaUrls)) {
        // Handle object format with various property names
        imageUrl = mediaUrls.imageUrl || mediaUrls.photoUrl || mediaUrls.url || mediaUrls.image_url || mediaUrls.main_url || '';
      }
    }

    // Extract caption for image posts (content field is the caption)
    let captionText = '';
    if (!isTextPost && post.content) {
      if (typeof post.content === 'string') {
        captionText = post.content;
      } else if (typeof post.content === 'object' && post.content !== null) {
        captionText = (post.content as any).text || (post.content as any).content || (post.content as any).body || '';
      }
    }

    // Check if caption text is truncated (rough estimate: 2 lines ≈ 80-100 characters)
    // This will show "...more" button if caption is longer than ~2 lines
    useEffect(() => {
      if (captionText && captionText.length > 80) {
        setIsCaptionTruncated(true);
      } else {
        setIsCaptionTruncated(false);
      }
    }, [captionText]);

    // Get tags
    const postTags = (post as any).tags && Array.isArray((post as any).tags) ? (post as any).tags : [];

    // Get circle info (if post belongs to a circle)
    const postCircle = (post as any).circle as { id: string; name: string } | null | undefined;

    // Common overlay components for text and image posts
    // Reels-style text shadow for bottom content visibility on any background
    const bottomTextShadowStyle = {
      textShadowColor: 'rgba(0, 0, 0, 0.9)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    };

    const renderBottomLeftContent = (isDarkBackground: boolean) => (
      <View style={styles.bottomLeftContent}>
        {/* Repost indicator */}
        {(post as any).is_repost && (post as any).reposted_by && (
          <View style={styles.repostIndicator}>
            <Ionicons name="repeat" size={RESPONSIVE.iconSmall} color="rgba(255, 255, 255, 0.9)" style={bottomTextShadowStyle} />
            <Text style={[styles.repostText, bottomTextShadowStyle]}>
              {users[(post as any).reposted_by]?.username || 'Someone'} reposted
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={styles.usernameContainer}
            onPressOut={() => {
              if (isProfileViewable(user, post.user_id ?? undefined)) {
                navigateToUserProfile(user, post.user_id ?? undefined, currentUserId ?? undefined);
              }
            }}
            disabled={!isProfileViewable(user, post.user_id ?? undefined)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[
                styles.videoUsername,
                !isProfileViewable(user, post.user_id ?? undefined) && styles.disabledUsername
              ]}>
                {getFormattedUsername(user, post)}
              </Text>
              {/* Aura badge removed */}
            </View>
          </TouchableOpacity>
        </View>

        {/* Circle badge - shows which circle the post belongs to */}
        {postCircle && postCircle.name && (
          <TouchableOpacity
            style={styles.circleBadge}
            onPress={() => router.push(`/circle/${postCircle.id}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={RESPONSIVE.iconSmall} color="#fff" style={bottomTextShadowStyle} />
            <Text style={styles.circleBadgeText} numberOfLines={1}>
              {postCircle.name}
            </Text>
          </TouchableOpacity>
        )}

        {/* Caption - with clickable hashtags and expandable "...more" */}
        {captionText && (
          <View>
            <HashtagText
              style={styles.videoCaption}
              hashtagStyle={styles.clickableHashtag}
              numberOfLines={isCaptionExpanded ? undefined : 2}
              onHashtagPress={onHashtagPress}
            >
              {captionText}
            </HashtagText>
            {/* Show "...more" or "Show less" button if text is truncated */}
            {isCaptionTruncated && (
              <TouchableOpacity
                onPress={() => setIsCaptionExpanded(!isCaptionExpanded)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.readMoreText}>
                  {isCaptionExpanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tags - Clickable hashtags */}
        {postTags.length > 0 && (
          <HashtagText
            style={styles.videoTags}
            hashtagStyle={styles.clickableHashtag}
            numberOfLines={1}
            onHashtagPress={onHashtagPress}
          >
            {postTags.map((tag: string) => `#${tag.trim().split(/\s+/)[0]}`).filter((h: string) => h !== '#').join(' ')}
          </HashtagText>
        )}

        {/* Aura display */}
        {showAuraPoints && user && (
          <View style={styles.userAuraDisplayContainer}>
            <View style={styles.userAuraDisplay}>
              <Ionicons name="star" size={RESPONSIVE.iconSmall} color="#FFD700" style={bottomTextShadowStyle} />
              <Text style={styles.userAuraText}>
                {user.aura_points || 0} Aura Points
              </Text>
            </View>
          </View>
        )}
      </View>
    );

    // Reels-style icon shadow for visibility on ANY background (light or dark)
    // Always use white icons with dark shadow/glow effect
    const iconShadowStyle = {
      textShadowColor: 'rgba(0, 0, 0, 0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    };

    // Double shadow effect for better visibility on white backgrounds
    const iconContainerShadowStyle = {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
      elevation: 5,
    };

    // Legacy style kept for backwards compatibility


    const renderRightSideActions = (isDarkBackground: boolean, showVolumeButton: boolean = false) => (
      <View style={styles.rightSideActions}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileButtonWrapper}
            onPress={() => {
              if (isProfileViewable(user, post.user_id ?? undefined)) {
                navigateToUserProfile(user, post.user_id ?? undefined, currentUserId ?? undefined);
              }
            }}
            disabled={!isProfileViewable(user, post.user_id ?? undefined)}
            activeOpacity={0.7}
          >
            <Image
              source={user?.avatar_url || 'https://img.icons8.com/color/48/test-account.png'}
              style={styles.profileImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
            />
          </TouchableOpacity>
          {/* Follow badge - hidden after follow confirmed */}
          {currentUserId && currentUserId !== post.user_id && !(isFollowing && hideFollowBadge) && (
            <TouchableOpacity
              style={styles.followBadge}
              onPress={handleFollowToggle}
              disabled={processingFollow}
              activeOpacity={0.7}
            >
              {processingFollow ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={isFollowing ? "checkmark-circle" : "add-circle-sharp"}
                  size={RESPONSIVE.iconTiny}
                  color={isFollowing ? "#4CD4CA" : colors.primary}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Upvote */}
        <View style={styles.actionItem}>
          <TouchableOpacity
            onPress={handleUpvote}
            style={[styles.actionButton, iconContainerShadowStyle, contextIsLoading?.(post.id, 'vote') && { opacity: 0.5 }]}
            disabled={contextIsLoading?.(post.id, 'vote')}
          >
            <Ionicons
              name="arrow-up"
              size={RESPONSIVE.iconLarge}
              color={currentStats.userVoteType === 'upvote' ? '#ff3856' : 'white'}
              style={iconShadowStyle}
            />
          </TouchableOpacity>
          <Text style={styles.actionCount}>
            {formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}
          </Text>
        </View>

        {/* Downvote */}
        <View style={styles.actionItem}>
          <TouchableOpacity
            onPress={handleDownvote}
            style={[styles.actionButton, iconContainerShadowStyle, contextIsLoading?.(post.id, 'vote') && { opacity: 0.5 }]}
            disabled={contextIsLoading?.(post.id, 'vote')}
          >
            <Ionicons
              name="arrow-down"
              size={RESPONSIVE.iconLarge}
              color={currentStats.userVoteType === 'downvote' ? '#ff3856' : 'white'}
              style={iconShadowStyle}
            />
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.actionItem}>
          <TouchableOpacity
            onPress={() => onShowComments(post.id)}
            style={[styles.actionButton, iconContainerShadowStyle]}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={RESPONSIVE.iconLarge}
              color="white"
              style={iconShadowStyle}
            />
          </TouchableOpacity>
          <Text style={styles.actionCount}>{formatCount(currentStats.commentsCount)}</Text>
        </View>

        {/* Share */}
        <View style={styles.actionItem}>
          <TouchableOpacity
            onPress={handleShare}
            disabled={contextIsLoading?.(post.id, 'share')}
            style={[styles.actionButton, iconContainerShadowStyle]}
          >
            <Animated.View style={{ transform: [{ scale: repostAnimation }] }}>
              <Ionicons
                name={isReposted ? "repeat" : "arrow-redo"}
                size={RESPONSIVE.iconLarge}
                color={isReposted ? "#4CD4CA" : "white"}
                style={iconShadowStyle}
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.actionCount, isReposted && styles.repostedText]}>
            {contextIsLoading?.(post.id, 'share') ? '...' : formatCount(currentStats.sharesCount)}
          </Text>
        </View>

        {/* Volume Button - only for video posts */}
        {showVolumeButton && (
          <View style={styles.actionItem}>
            <TouchableOpacity
              onPress={handleToggleMute}
              style={[styles.actionButton, iconContainerShadowStyle]}
            >
              <Ionicons
                name={isMuted ? "volume-mute" : "volume-high"}
                size={RESPONSIVE.iconLarge}
                color="white"
                style={iconShadowStyle}
              />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{isMuted ? 'Muted' : 'Sound'}</Text>
          </View>
        )}

        {/* Aura Points button */}
        {showAuraPoints && (
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[styles.actionButton, iconContainerShadowStyle]}
              onPress={() => {
                Alert.alert(
                  'Your Aura Points',
                  `You have ${userAuraPoints} aura points!\n\nEarn more by getting upvotes on your posts.`,
                  [{ text: 'Nice!', style: 'default' }]
                );
              }}
            >
              <View style={styles.auraButtonCompact}>
                <Ionicons name="star" size={RESPONSIVE.iconMedium} color="#FFD700" style={iconShadowStyle} />
              </View>
            </TouchableOpacity>
            <Text style={styles.actionCount}>{userAuraPoints}</Text>
          </View>
        )}

        {/* 3-dots menu */}
        <View style={styles.actionItem}>
          <TouchableOpacity
            style={[styles.actionButton, iconContainerShadowStyle]}
            onPress={() => {
              console.log('[ReelsFeed] 3 dots tapped! Opening options for post:', post.id);
              console.log('[ReelsFeed] isOwnPost:', isOwnPost);
              setShowPostOptions(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={RESPONSIVE.iconLarge}
              color="white"
              style={iconShadowStyle}
            />
          </TouchableOpacity>
        </View>
      </View>
    );

    const renderModals = () => (
      <>
        {showRepostModal && (
          <RepostOptionsModal
            visible={showRepostModal}
            onClose={() => setShowRepostModal(false)}
            post={post}
            user={user || ({} as User)}
            onRepost={handleRepost}
            onShare={handleExternalShare}
            isLoading={contextIsLoading?.(post.id, 'share')}
          />
        )}
        {showPostOptions && (
          <PostOptionsModal
            visible={showPostOptions}
            onClose={() => {
              setShowPostOptions(false);
            }}
            onDelete={handleDeletePost}
            onReport={handleReportPost}
            isOwnPost={isOwnPost}
            hasAlreadyReported={hasAlreadyReported}
          />
        )}
      </>
    );

    // Reusable animation overlays (heart and aura animations on double-tap)
    const renderAnimationOverlays = () => (
      <>
        {/* Heart animation on double-tap upvote */}
        <Animated.View
          style={[
            styles.heartAnimationContainer,
            {
              opacity: heartAnimation,
              transform: [
                {
                  scale: heartAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.7, 1.2, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="arrow-up" size={RESPONSIVE.iconHeart} color="#ff3856" />
        </Animated.View>

        {/* Aura animation */}
        {showAuraPoints && (
          <Animated.View
            style={[
              styles.auraAnimationContainer,
              {
                opacity: auraAnimation,
                transform: [
                  {
                    scale: auraAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.3, 1],
                    }),
                  },
                  {
                    translateY: auraAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -50],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.auraContainer}>
              <Ionicons name="star" size={RESPONSIVE.iconLarge} color="#FFD700" />
              <Text style={styles.auraText}>+0.01 Aura</Text>
            </View>
          </Animated.View>
        )}
      </>
    );

    // Handle text-only posts
    if (isTextPost && (!videoUrl || videoUrl.trim() === '')) {
      return (
        <View style={[styles.videoContainer, { height: visibleHeight }]}>
          <View style={[styles.videoWrapperFullscreen, { height: visibleHeight, bottom: undefined }]}>
            <TextPostRenderer
              textContent={textContent}
              visibleHeight={visibleHeight}
              onPress={handleVideoPress}
            />
            {renderAnimationOverlays()}
          </View>
          {renderBottomLeftContent(false)}
          {renderRightSideActions(false)}
          {renderModals()}
        </View>
      );
    }

    // Handle posts with media items - use carousel for multiple media (photos, videos, or mixed)
    if (mediaItems.length > 0 && (isImagePost || hasMultipleMedia)) {
      if (hasMultipleMedia) {
        return (
          <View style={[styles.videoContainer, { height: visibleHeight }]}>
            <View style={[styles.videoWrapperFullscreen, { backgroundColor: '#000', height: visibleHeight, bottom: undefined }]}>
              <ImageCarouselRenderer
                mediaItems={mediaItems}
                visibleHeight={visibleHeight}
                onPress={handleVideoPress}
              />
              {renderAnimationOverlays()}
            </View>
            {renderBottomLeftContent(true)}
            {renderRightSideActions(true, mediaItems.some(item => item.type === 'video'))}
            {renderModals()}
          </View>
        );
      }

      // Single media item
      const singleImageUrl = mediaItems[0]?.url || imageUrl;
      if (singleImageUrl && singleImageUrl.startsWith('http')) {
        return (
          <View style={[styles.videoContainer, { height: visibleHeight }]}>
            <View style={[styles.videoWrapperFullscreen, { backgroundColor: '#000', height: visibleHeight, bottom: undefined }]}>
              <SingleImageRenderer
                imageUrl={singleImageUrl}
                visibleHeight={visibleHeight}
                onPress={handleVideoPress}
              />
              {renderAnimationOverlays()}
            </View>
            {renderBottomLeftContent(true)}
            {renderRightSideActions(true)}
            {renderModals()}
          </View>
        );
      }
    }

    // Handle video posts or fallback for missing media
    if (!videoUrl || videoUrl.trim() === '' || !videoUrl.startsWith('http')) {
      if (isImagePost) {
        return (
          <View style={[styles.videoContainer, { height: visibleHeight }]}>
            <View style={[styles.videoWrapperFullscreen, { backgroundColor: '#1a1d3a', justifyContent: 'center', alignItems: 'center', height: visibleHeight, bottom: undefined }]}>
              <Ionicons name="image-outline" size={48} color="#666" />
              <Text style={{ color: '#999', fontSize: 16, marginTop: 8 }}>
                Image not available
              </Text>
              <Pressable style={styles.tapArea} onPress={handleVideoPress} />
              {renderAnimationOverlays()}
            </View>
            {renderBottomLeftContent(false)}
            {renderRightSideActions(false)}
            {renderModals()}
          </View>
        );
      }
      return (
        <View style={[styles.videoContainer, { height: visibleHeight }]}>
          <View style={[styles.videoWrapperFullscreen, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', height: visibleHeight, bottom: undefined }]}>
            <Text style={{ color: '#fff', fontSize: 16 }}>
              {isTextPost ? (textContent || 'Text content not available') : 'Content not available'}
            </Text>
            <Pressable style={styles.tapArea} onPress={handleVideoPress} />
            {renderAnimationOverlays()}
          </View>
          {renderBottomLeftContent(true)}
          {renderRightSideActions(true)}
          {renderModals()}
        </View>
      );
    }

    // Video post - delegate to VideoPlayerRenderer
    return (
      <View style={[styles.videoContainer, { height: visibleHeight }]}>
        <View style={[styles.videoWrapperFullscreen, { height: visibleHeight, bottom: undefined }]}>
          <VideoPlayerRenderer
            videoUrl={videoUrl}
            visibleHeight={visibleHeight}
            index={index}
            postId={post.id}
            isActive={isActive}
            isPaused={isPaused}
            isMuted={isMuted}
            onPress={handleVideoPress}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            videoRefs={videoRefs}
            loadedVideosCache={loadedVideosCache}
            videoLoadStates={videoLoadStates}
            savePosition={savePosition}
            getPosition={getPosition}
            setHasError={setHasError}
            videoProgress={videoProgress}
            videoDuration={videoDuration}
            isSeeking={isSeeking}
            formatTime={formatTime}
            handleSeekStart={handleSeekStart}
            handleSeekMove={handleSeekMove}
            handleSeekEnd={handleSeekEnd}
          />
          {renderAnimationOverlays()}
        </View>
        {renderBottomLeftContent(true)}
        {renderRightSideActions(true, true)}
        {renderModals()}
      </View>
    );
  }
);

VideoPost.displayName = 'VideoPost';

const InstagramReelsFeed: React.FC<InstagramReelsFeedProps> = ({
  posts,
  users,
  refreshing,
  onRefresh,
  onLoadMore,
  onFullscreenChange,
  headerHeight = 0,
  isFullscreen = false,
  showAuraPoints = false,
  onSearchPress,
  feedType = 'forYou',
  onSwitchToForYou,
  onDeletePost,
  isExternallyPaused = false,
  initialPostId = null,
  onCurrentPostChange,
  shouldPauseOnUnmount = false,
  showVideosOnly = false, // Changed to false to show all content types (text, photo, video) in World Feed
  onHashtagPress: onHashtagPressProp, // Custom handler from parent (e.g., for closing modal first)
  isWorldFeed = false,
}) => {
  // Measure actual container height using onLayout (most reliable method)
  // Parent container (Home.tsx reelsContainer) is already correctly sized to not extend behind tab bar
  const [containerHeight, setContainerHeight] = useState(0);

  // Fallback height while measuring - just use window dimensions as approximation
  // The actual height will be set by onLayout immediately after first render
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Parent already accounts for tab bar, so just subtract a safe estimate
  const TAB_BAR_ESTIMATE = 45 + insets.bottom;
  const fallbackHeight = windowHeight - TAB_BAR_ESTIMATE;

  // Use measured height if available, otherwise fallback
  // Once onLayout fires, containerHeight will have the exact correct value
  const VISIBLE_HEIGHT = containerHeight > 0 ? containerHeight : fallbackHeight;

  // Track if we're in the process of initial scroll to prevent reporting wrong post ID
  const isInitialScrollPending = useRef(!!initialPostId);
  const hasScrolledToInitial = useRef(false);
  const lastReportedPostId = useRef<string | null>(null);
  const mountedInitialPostId = useRef(initialPostId); // Track initial postId to detect changes

  // Calculate initial index from initialPostId if provided, otherwise use saved index
  const getInitialIndex = () => {
    if (!posts || posts.length === 0) return 0;

    // If we have an initialPostId (from toggle sync or profile navigation), use it
    if (initialPostId) {
      const filteredPosts = (posts ?? []).filter((post) =>
        post.content_type === 'video' ||
        post.content_type === 'photo' ||
        post.content_type === 'image' ||
        post.content_type === 'text' ||
        post.content_type === 'mixed'
      );
      const idx = filteredPosts.findIndex(post => post.id === initialPostId);
      if (idx >= 0) return idx;
    }

    // No initialPostId or not found - use saved scroll index (returning to same feed)
    return savedScrollIndex;
  };

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const videoRefs = useRef<Record<number, Video | null>>({});
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([]);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef(0); // Track when app went to background
  const onRefreshRef = useRef(onRefresh); // Ref to avoid stale closure in AppState handler
  const pathname = usePathname();
  const { isMuted, toggleMute } = useMute();
  const flatListRef = useRef<FlatList | null>(null);
  const pagerViewRef = useRef<PagerView | null>(null);

  // Global video playback control - ensures only one video plays at a time across the app
  const {
    registerPauseCallback,
    requestPlayback,
    releasePlayback,
    savePosition,
    getPosition,
    clearPosition,
  } = useVideoPlayback('InstagramReelsFeed', VIDEO_PRIORITY.FEED);

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

  // Keep onRefresh ref in sync so AppState handler can call fresh version
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // Keep isMuted ref in sync so AppState handler uses fresh mute state
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // LRU cache with max 50 entries to prevent memory leaks
  const loadedVideosCache = useRef<Set<string>>(new Set());
  const videoLoadStates = useRef<
    Record<number, 'loading' | 'loaded' | 'error'>
  >({});
  const MAX_CACHE_SIZE = 50;

  // Helper to limit cache size (LRU eviction)
  const limitCacheSize = useCallback(() => {
    if (loadedVideosCache.current.size > MAX_CACHE_SIZE) {
      const itemsToRemove = loadedVideosCache.current.size - MAX_CACHE_SIZE;
      const iterator = loadedVideosCache.current.values();
      for (let i = 0; i < itemsToRemove; i++) {
        const firstItem = iterator.next().value;
        if (firstItem) {
          loadedVideosCache.current.delete(firstItem);
        }
      }
    }
  }, []);

  const currentIndexRef = useRef(currentIndex);
  const dragStartOffsetRef = useRef<number>(0);
  const pendingMuteSyncRef = useRef<NodeJS.Timeout | null>(null);
  const videoOnlyPostsLengthRef = useRef(0);

  const isUserScrolling = useRef(false);
  const lastScrollEndTime = useRef(0); // Track when last scroll ended
  const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const lastBounceCorrectionTimeRef = useRef(0);
  const lastViewableUpdateTime = useRef(0);
  const pendingViewableUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pendingPageIndex = useRef<number | null>(null); // Deferred page index — committed to state on idle
  // Stable initialNumToRender - prevents FlatList re-renders when currentIndex changes


  // Stable viewability config - must be outside component or in ref to prevent FlatList issues
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loadPostsInteractions, syncPostCommentCount, sharePost } = usePostInteractions();

  // Handler for hashtag press - use custom handler if provided (for modals), otherwise navigate to hashtag page
  const onHashtagPress = useCallback((tag: string) => {
    if (onHashtagPressProp) {
      // Use custom handler from parent (e.g., close modal first then navigate)
      onHashtagPressProp(tag);
    } else {
      // Default: navigate to hashtag page
      router.push(`/hashtag/${tag}`);
    }
  }, [onHashtagPressProp]);

  const safeSetStatusAsync = (ref: Video | null, status: any) => {
    if (!ref || typeof ref.setStatusAsync !== 'function') {
      return Promise.resolve();
    }
    try {
      return ref.setStatusAsync(status).catch((error: any) => {
        if (error?.message?.includes('Invalid view') || error?.message?.includes('registry')) {
          return;
        }
        return Promise.resolve();
      });
    } catch (error: any) {
      if (error?.message?.includes('Invalid view') || error?.message?.includes('registry')) {
        return Promise.resolve();
      }
      return Promise.resolve();
    }
  };

  const syncMuteState = useCallback((targetIndex: number) => {
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key, 10);
      const ref = videoRefs.current[idx];
      if (!ref) return;

      if (idx === targetIndex) {
        safeSetStatusAsync(ref, {
          shouldPlay: true,
          isMuted: isMutedRef.current,
          volume: isMutedRef.current ? 0 : 1.0,
        });
      } else {
        safeSetStatusAsync(ref, {
          shouldPlay: false,
          isMuted: true,
          volume: 0,
        });
      }
    });

    // Note: We leave global requestPlayback out since it might need videoOnlyPosts access, 
    // but we can add it later if video focus breaks.
  }, []);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportPost, setSelectedReportPost] = useState<any>(null);
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set()); // Track posts user has reported

  // Fetch user's previously reported posts on mount
  useEffect(() => {
    const fetchReportedPosts = async () => {
      try {
        const { user } = await getCachedUser();
        if (!user) return;

        // Get posts this user has reported (regardless of status)
        const { supabase } = await import('../utils/supabase');
        const { data: reports, error } = await supabase
          .from('user_reports')
          .select('content_id')
          .eq('reporter_id', user.id)
          .eq('content_type', 'post');

        if (error) {
          console.error('[ReelsFeed] Error fetching reported posts:', error);
          return;
        }

        if (reports && reports.length > 0) {
          const reportedIds = new Set(reports.map((r: { content_id: string }) => r.content_id));
          setReportedPosts(reportedIds);
          console.log('[ReelsFeed] Loaded', reports.length, 'previously reported posts');
        }
      } catch (error) {
        console.error('[ReelsFeed] Error in fetchReportedPosts:', error);
      }
    };

    fetchReportedPosts();
  }, []);

  // Filter posts based on showVideosOnly prop
  // Note: showVideosOnly is now false by default to show ALL content types (text, photo, video, mixed) in World Feed
  const videoOnlyPostsWithoutAds = useMemo(() => {
    const allPosts = posts ?? [];

    if (showVideosOnly) {
      // When explicitly set to true: show only video posts (e.g., for specific use cases)
      return allPosts.filter((post) => post.content_type === 'video');
    } else {
      // Default: show all post types (video, photo, image, text, mixed) in World/Following feeds
      // Note: 'mixed' posts contain both images and text, so they should be included
      return allPosts.filter((post) =>
        post.content_type === 'video' ||
        post.content_type === 'photo' ||
        post.content_type === 'image' ||
        post.content_type === 'text' ||
        post.content_type === 'mixed'
      );
    }
  }, [posts, showVideosOnly]);

  // Ad injection removed - use posts directly
  const videoOnlyPosts = videoOnlyPostsWithoutAds;

  useEffect(() => {
    if (videoOnlyPosts.length > 0 && loadPostsInteractions) {
      // Load interactions for video posts
      loadPostsInteractions(videoOnlyPosts);
    }
  }, [videoOnlyPosts, loadPostsInteractions]);

  // Periodically limit cache size to prevent memory leaks
  useEffect(() => {
    limitCacheSize();
  }, [currentIndex, limitCacheSize]);

  // Keep currentIndexRef in sync with currentIndex state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keep videoOnlyPostsLengthRef in sync without triggering useFocusEffect cleanup cycle
  // Also stabilize PagerView position when content changes (loadMore, real-time updates)
  const prevPostsLengthRef = useRef(0);
  useEffect(() => {
    const prevLength = prevPostsLengthRef.current;
    const newLength = videoOnlyPosts.length;
    videoOnlyPostsLengthRef.current = newLength;
    prevPostsLengthRef.current = newLength;

    // When posts are added while PagerView already has content, restore current page
    // This prevents PagerView from resetting scroll position during loadMore/real-time updates
    if (prevLength > 0 && newLength > prevLength && pagerViewRef.current) {
      const currentPage = currentIndexRef.current;
      if (currentPage >= 0 && currentPage < newLength) {
        requestAnimationFrame(() => {
          pagerViewRef.current?.setPageWithoutAnimation(currentPage);
        });
      }
    }
  }, [videoOnlyPosts.length]);

  // Reset scroll tracking when initialPostId changes (new post selected from Profile)
  useEffect(() => {
    if (initialPostId !== mountedInitialPostId.current) {
      hasScrolledToInitial.current = false;
      mountedInitialPostId.current = initialPostId;
    }
  }, [initialPostId]);

  // Scroll to initialPostId when opening from Profile or switching feeds
  useEffect(() => {
    // Skip if no initialPostId
    if (!initialPostId) {
      isInitialScrollPending.current = false;
      return;
    }

    // Skip if we've already scrolled to this post
    if (hasScrolledToInitial.current && lastReportedPostId.current === initialPostId) {
      isInitialScrollPending.current = false;
      return;
    }

    // Only scroll if we have posts and PagerView is ready
    if (videoOnlyPosts.length > 0 && pagerViewRef.current) {
      // Find the index of the post with the matching ID
      const targetIndex = videoOnlyPosts.findIndex((post: CirclePost) => post.id === initialPostId);

      if (targetIndex >= 0) {
        hasScrolledToInitial.current = true;

        // Use setTimeout to ensure PagerView is ready
        setTimeout(() => {
          pagerViewRef.current?.setPageWithoutAnimation(targetIndex);
          currentIndexRef.current = targetIndex;
          setCurrentIndex(targetIndex);
          setVisibleIndexes([targetIndex]);
          savedScrollIndex = targetIndex;
          lastReportedPostId.current = initialPostId;

          // Clear the pending flag after page set completes
          setTimeout(() => {
            isInitialScrollPending.current = false;
          }, 100);
        }, 150);
      } else {
        isInitialScrollPending.current = false;
      }
    }
  }, [initialPostId, videoOnlyPosts]);

  // Notify parent when current post changes
  useEffect(() => {
    // Don't report during initial scroll to prevent overwriting initialPostId
    if (isInitialScrollPending.current) return;

    if (onCurrentPostChange && currentIndex >= 0 && videoOnlyPosts[currentIndex]) {
      const currentPostId = videoOnlyPosts[currentIndex].id;
      // Only report if post ID changed to avoid duplicate calls
      if (currentPostId !== lastReportedPostId.current) {
        lastReportedPostId.current = currentPostId;
        onCurrentPostChange(currentPostId);
      }
      savedScrollIndex = currentIndex; // Also update local cache
    }
  }, [currentIndex, onCurrentPostChange, videoOnlyPosts]);

  // Scroll to top when refresh is triggered (e.g. double-tap Home tab)
  const prevRefreshing = useRef(refreshing);
  useEffect(() => {
    if (refreshing && !prevRefreshing.current) {
      savedScrollIndex = 0;
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      setVisibleIndexes([0]);
      try {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      } catch { }
    }
    prevRefreshing.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (videoOnlyPosts.length > 0 && isScreenFocused && currentIndex === 0) {
      if (visibleIndexes.length === 0) {
        setVisibleIndexes([0]);
      }

      const timer = setTimeout(() => {
        const firstVideoRef = videoRefs.current?.[0];
        if (firstVideoRef && typeof firstVideoRef.playAsync === 'function') {
          safeSetStatusAsync(firstVideoRef, {
            shouldPlay: true,
            isMuted: isMuted,
            volume: isMuted ? 0 : 1.0,
          }).then(() => {
            firstVideoRef.playAsync().catch(() => { });
          }).catch(() => { });
        }
      }, 200);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoOnlyPosts.length, isScreenFocused, currentIndex]);

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
    Object.entries(videoRefs.current || {}).forEach(([key, ref]) => {
      const idx = Number(key);
      if (ref) {
        if (idx === currentIndex) {
          safeSetStatusAsync(ref, {
            isMuted: isMuted,
            volume: isMuted ? 0 : 1.0,
          });
        } else {
          safeSetStatusAsync(ref, {
            isMuted: true,
            volume: 0,
          });
        }
      }
    });
  }, [currentIndex, isMuted]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      // Record when app went to background
      backgroundTimestamp.current = Date.now();
      pauseAllVideos();
    } else if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // Check how long app was in background
      const timeInBackground = backgroundTimestamp.current > 0
        ? Date.now() - backgroundTimestamp.current
        : 0;

      // If app was in background for 30+ seconds, refresh feed and scroll to top
      if (timeInBackground > 30000) {
        savedScrollIndex = 0;
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setVisibleIndexes([0]);

        // Scroll FlatList to top
        try {
          flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        } catch {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }

        // Trigger feed refresh to fetch newest content
        onRefreshRef.current?.();
      }

      // Use refs to avoid stale closure values (this handler is captured in useEffect with [] deps)
      const activeIndex = currentIndexRef.current;
      const muted = isMutedRef.current;

      Object.entries(videoRefs.current || {}).forEach(([key, ref]) => {
        const idx = Number(key);
        if (ref && idx !== activeIndex) {
          safeSetStatusAsync(ref, {
            isMuted: true,
            volume: 0,
          });
        }
      });
      const videoRef = videoRefs.current?.[activeIndex];
      if (videoRef) {
        safeSetStatusAsync(videoRef, {
          isMuted: muted,
          volume: muted ? 0 : 1.0,
          shouldPlay: true,
        }).then(() => {
          if (videoRef && typeof videoRef.playAsync === 'function') {
            videoRef.playAsync().catch(() => { });
          }
        }).catch(() => { });
      }
    }
    appState.current = nextAppState;
  };

  const handleToggleMute = () => {
    toggleMute();
    const next = !isMuted;
    const currentRef = videoRefs.current?.[currentIndex];
    if (currentRef) {
      safeSetStatusAsync(currentRef, {
        isMuted: next,
        volume: next ? 0 : 1.0,
      });
    }
    Object.entries(videoRefs.current || {}).forEach(([key, ref]) => {
      const idx = Number(key);
      if (ref && idx !== currentIndex) {
        safeSetStatusAsync(ref, {
          isMuted: true,
          volume: 0,
        });
      }
    });
  };
  const handleShowComments = (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentsModal(true);
    // Don't pause video - keep current play/pause state unchanged
    // Video will continue playing behind the half-screen comments modal
  };
  const handleCloseComments = () => {
    setShowCommentsModal(false);
    setSelectedPostId('');
    // Video state remains unchanged - no need to restore anything
    // since we didn't pause it when opening comments
  };
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      if (currentIndexRef.current === 0 && visibleIndexes.length === 0) {
        setVisibleIndexes([0]);
      }

      // Only restore scroll position if NOT actively scrolling (prevents jump-back during fast scroll)
      // Check both platforms - scroll guard must protect iOS and Android equally
      const timeSinceScrollEnd = Date.now() - lastScrollEndTime.current;
      const recentlyScrolled = timeSinceScrollEnd < 500;

      if (pagerViewRef.current && savedScrollIndex > 0 && savedScrollIndex < videoOnlyPostsLengthRef.current && !isUserScrolling.current && !recentlyScrolled) {
        setTimeout(() => {
          if (isUserScrolling.current) return;
          if (Date.now() - lastScrollEndTime.current < 500) return;
          pagerViewRef.current?.setPageWithoutAnimation(savedScrollIndex);
        }, 100);
      }

      // Claim exclusive playback when screen gains focus (only once)
      requestPlayback();

      const targetIndex = savedScrollIndex > 0 ? savedScrollIndex : currentIndexRef.current;
      setTimeout(() => {
        if (isUserScrolling.current) return;
        // Skip if user scrolled recently (prevents interference on both platforms)
        if (Date.now() - lastScrollEndTime.current < 500) return;
        const videoRef = videoRefs.current?.[targetIndex];
        if (videoRef && !isExternallyPaused) {
          safeSetStatusAsync(videoRef, {
            isMuted: isMuted,
            volume: isMuted ? 0 : 1.0,
            shouldPlay: true,
          }).then(() => {
            if (typeof videoRef.playAsync === 'function') {
              videoRef.playAsync().catch(() => { });
            }
          }).catch(() => { });
        }
      }, 150);

      return () => {
        setIsScreenFocused(false);
        releasePlayback();
        pauseAllVideos();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMuted, isExternallyPaused])
  );
  const pauseAllVideos = useCallback(() => {
    Object.values(videoRefs.current || {}).forEach((ref) => {
      if (ref) {
        ref.pauseAsync().catch(() => { });
      }
    });
  }, []);

  // Register pause callback with global video playback context
  // This allows other video components to pause this feed when they start playing
  useEffect(() => {
    registerPauseCallback(pauseAllVideos);
  }, [registerPauseCallback, pauseAllVideos]);

  // Pause videos when externally paused (e.g., search modal opens)
  useEffect(() => {
    if (isExternallyPaused) {
      pauseAllVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternallyPaused]);

  useEffect(() => {
    return () => {
      // Pause all videos if shouldPauseOnUnmount is true
      if (shouldPauseOnUnmount) {
        pauseAllVideos();
      }
      // Always unload videos on unmount - capture refs to avoid stale closure
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const videoRefsCopy = videoRefs.current || {};
      Object.values(videoRefsCopy).forEach((ref) => {
        if (ref) {
          ref.unloadAsync().catch(() => { });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPauseOnUnmount]);

  // Track the last momentumScrollEnd offset to detect dual-fire bounce pattern
  const lastMomentumEndOffsetRef = useRef(-1);
  const lastMomentumEndTimeRef = useRef(0);



  const momentumScrollEnd = (e?: any) => {
    const offset = e?.nativeEvent?.contentOffset?.y ?? 0;
    console.log(
      `[ReelsFeed Scroll] momentumScrollEnd called. Current index ref: ${currentIndexRef.current}, Offset: ${offset}`,
    );
    lastScrollEndTime.current = Date.now();

    // Calculate the actual settled index from the scroll offset.
    const settledIndex =
      VISIBLE_HEIGHT > 0
        ? Math.round(offset / VISIBLE_HEIGHT)
        : currentIndexRef.current;
    const clampedIndex = Math.max(
      0,
      Math.min(settledIndex, (videoOnlyPosts?.length ?? 1) - 1),
    );

    // BOUNCE-BACK CORRECTION: Android's pagingEnabled fires momentumScrollEnd twice
    // on bounces: first at the forward page (correct), then at the original page (bounce).
    // Pattern: momentumScrollEnd(3381) then momentumScrollEnd(2536) within ~50ms.
    // If this second fire went BACKWARD from the previous one, and both happened within
    // 150ms, the native pager bounced — correct with scrollToOffset to the forward page.
    const now = Date.now();
    const timeSinceLastEnd = now - lastMomentumEndTimeRef.current;
    const timeSinceLastCorrection =
      now - (lastBounceCorrectionTimeRef.current ?? 0);

    if (
      Platform.OS !== 'ios' &&
      VISIBLE_HEIGHT > 0 &&
      timeSinceLastEnd < 150 &&
      lastMomentumEndOffsetRef.current >= 0 &&
      timeSinceLastCorrection > 500
    ) {
      const dragStart = dragStartOffsetRef.current;
      const firstEnd = lastMomentumEndOffsetRef.current;
      const secondEnd = offset;

      const dragDelta = firstEnd - dragStart;
      const bounceDelta = secondEnd - firstEnd;

      // Ensure the drag was significant enough to legally trigger a page turn (> 20% of screen)
      const isSignificantDrag = Math.abs(dragDelta) > VISIBLE_HEIGHT * 0.2;

      // A genuine native bounce usually throws you a significant distance backward.
      // Small bounce values (< 25px) are usually just sub-pixel settling.
      const isSignificantBounce = Math.abs(bounceDelta) > 25;

      if (
        isSignificantDrag &&
        isSignificantBounce &&
        Math.sign(dragDelta) !== Math.sign(bounceDelta)
      ) {
        // Enforce intended target based on drag direction directly to override
        // the native engine's failed origin calculation.
        let intendedPage;
        if (dragDelta < 0) {
          intendedPage = Math.floor(firstEnd / VISIBLE_HEIGHT); // Swiping UP
        } else {
          intendedPage = Math.ceil(firstEnd / VISIBLE_HEIGHT); // Swiping DOWN
        }

        // Clamp the intended page
        intendedPage = Math.max(
          0,
          Math.min(intendedPage, (videoOnlyPosts?.length ?? 1) - 1),
        );
        const targetOffset = intendedPage * VISIBLE_HEIGHT;

        console.log(
          `[ReelsFeed Scroll] NATIVE BOUNCE INTERCEPTED! Dragged ${dragDelta.toFixed(
            0,
          )}px, snapped back ${bounceDelta.toFixed(
            0,
          )}px. Correcting smoothly to page ${intendedPage}.`,
        );

        flatListRef.current?.scrollToOffset({
          offset: targetOffset,
          // Smooth glide for iOS to seamlessly mask the jitter, instant pop for Android
          // @ts-ignore
          animated: Platform.OS === 'ios',
        });

        lastMomentumEndOffsetRef.current = targetOffset;
        lastMomentumEndTimeRef.current = now;
        lastBounceCorrectionTimeRef.current = now; // Cooldown: prevent cascading corrections
        // Don't sync mute state yet — let the correction scroll trigger another momentumScrollEnd
        return;
      }
    }



    // The single source of truth for loading and playing videos is the debounced syncMuteState
    if (pendingMuteSyncRef.current) {
      clearTimeout(pendingMuteSyncRef.current);
    }
    // @ts-ignore
    pendingMuteSyncRef.current = setTimeout(() => {
      syncMuteState(clampedIndex);
      pendingMuteSyncRef.current = null;
    }, 200); // 200ms debounce
  };

  const onScrollBeginDrag = (e?: any) => {
    isUserScrolling.current = true;
    const offset = e?.nativeEvent?.contentOffset?.y ?? 0;
    console.log(`[ReelsFeed Scroll] onScrollBeginDrag. Offset: ${offset}`);
    lastScrollEndTime.current = 0; // Reset so we know user is actively scrolling
    dragStartOffsetRef.current = offset; // Track for bounce correction in momentumScrollEnd

    // Reset direction guard — user is initiating a NEW scroll gesture,
    // so any direction change from here is intentional, not a native bounce.
    lastScrollDirectionRef.current = null;
    lastBounceCorrectionTimeRef.current = 0; // Clear cooldown on new physical touch

    // Defer the video pause by 100ms so it doesn't stutter the native scroll
    // animation's first frame (which was causing slow-scroll bounce-back).
    // But we do need to pause — leaving the video playing causes permanent
    // buffering spinners (handlePlaybackStatusUpdate sets isBuffering from native status).
    setTimeout(() => {
      const ci = currentIndexRef.current;
      const item = videoOnlyPosts[ci];
      const pid = item ? (item as CirclePost).id : '';
      // @ts-ignore
      const activeVideoRef = pid ? videoRefs.current?.[pid] : null;
      if (activeVideoRef) {
        safeSetStatusAsync(activeVideoRef, {
          shouldPlay: false,
          isMuted: true,
          volume: 0,
        });
      }
    }, 100);
  };

  const onMomentumScrollBegin = () => {
    // Momentum scroll started
  };

  useEffect(() => {
    if (!pathname?.includes('Home')) {
      pauseAllVideos();
      return;
    }

    const preloadAdjacentVideos = async () => {
      const indicesToPreload = [
        currentIndex + 1, // Next video (highest priority)
        currentIndex + 2,
        currentIndex - 1, // Previous (for scroll back)
      ].filter(idx => idx >= 0 && idx < videoOnlyPosts.length && idx !== currentIndex);

      // Parallel preloading - all videos load at same time
      const preloadPromises = indicesToPreload.map(async (idx) => {
        const videoPost = videoOnlyPosts[idx];
        const videoUrl = extractVideoUrl(videoPost?.media_urls);

        if (!videoUrl) return;

        const ref = videoRefs.current?.[idx];
        if (!ref || typeof ref.getStatusAsync !== 'function') return;

        try {
          const status = await ref.getStatusAsync();
          if (!status.isLoaded && typeof ref.loadAsync === 'function') {
            await Promise.race([
              ref.loadAsync(
                { uri: videoUrl },
                { shouldPlay: false, isMuted: true, volume: 0, positionMillis: 0 }
              ),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Preload timeout')), 1500) // Increased timeout
              ),
            ]);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Silently handle preload failures
        }
      });

      // Execute all preloads in parallel
      await Promise.allSettled(preloadPromises);
    };

    preloadAdjacentVideos();

    Object.entries(videoRefs.current || {}).forEach(([key, ref]) => {
      const idx = Number(key);
      if (ref) {
        const distance = Math.abs(idx - currentIndex);
        const videoPost = videoOnlyPosts[idx];
        const videoUrl = extractVideoUrl(videoPost?.media_urls);

        if (idx <= 4) {
          return;
        }

        if (distance > 5) {
          ref.unloadAsync().catch(() => { });
          if (videoUrl) {
            loadedVideosCache.current?.delete(videoUrl);
            if (videoLoadStates.current) {
              delete videoLoadStates.current[idx];
            }
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, videoOnlyPosts, pathname, isScreenFocused]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    // Don't update currentIndex during initial scroll to target post
    if (isInitialScrollPending.current) {
      return;
    }

    if (viewableItems?.length > 0) {
      // Find the most visible item
      const sortedItems = [...viewableItems].sort(
        (a, b) => (b.percentVisible || 0) - (a.percentVisible || 0)
      );

      const mostVisibleItem = sortedItems[0];

      if (mostVisibleItem && mostVisibleItem.isViewable) {
        const newIndex = mostVisibleItem.index;

        // Skip if same index
        if (newIndex === currentIndexRef.current) {
          return;
        }

        // Android-specific throttling to prevent rapid updates during fast scrolling
        if (Platform.OS === 'android') {
          const now = Date.now();
          const timeSinceLastUpdate = now - lastViewableUpdateTime.current;

          // Clear any pending update
          if (pendingViewableUpdate.current) {
            clearTimeout(pendingViewableUpdate.current);
            pendingViewableUpdate.current = null;
          }

          // If user is actively scrolling and updates are coming too fast, debounce
          if (isUserScrolling.current && timeSinceLastUpdate < 150) {
            // Schedule a delayed update - will be cancelled if another comes in quickly
            pendingViewableUpdate.current = setTimeout(() => {
              if (newIndex !== currentIndexRef.current) {
                currentIndexRef.current = newIndex;
                setCurrentIndex(newIndex);
                savedScrollIndex = newIndex;
                lastViewableUpdateTime.current = Date.now();

                const visibleIndices = viewableItems
                  .filter((item: any) => item.isViewable)
                  .map((item: any) => item.index);
                setVisibleIndexes(visibleIndices);
              }
              pendingViewableUpdate.current = null;
            }, 100);
            return;
          }

          lastViewableUpdateTime.current = now;
        }

        // Update ref immediately before state to prevent stale values
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
        savedScrollIndex = newIndex;

        const visibleIndices = viewableItems
          .filter((item: any) => item.isViewable)
          .map((item: any) => item.index);
        setVisibleIndexes(visibleIndices);
      }
    }
  }, []);



  const renderItem = useCallback(
    ({ item, index }: { item: CirclePost; index: number }) => {
      // Regular video/image post
      const post = item;
      return (
        <VideoPost
          post={post}
          index={index}
          currentIndex={currentIndex}
          isMuted={isMuted}
          isScreenFocused={isScreenFocused}
          visibleIndexes={visibleIndexes}
          videoRefs={videoRefs}
          users={users || {}}
          handleToggleMute={handleToggleMute}
          onShowComments={handleShowComments}
          onShare={(post, user) => {
            console.log('Legacy onShare called');
          }}
          onGift={(post) => {
            console.log('[ReelsFeed] onGift disabled in open source template');
          }}
          headerHeight={headerHeight}
          isFullscreen={isFullscreen}
          loadedVideosCache={loadedVideosCache}
          videoLoadStates={videoLoadStates}
          showAuraPoints={showAuraPoints}
          onSearchPress={onSearchPress}
          onDeletePost={onDeletePost}
          onReportPost={(post) => {
            console.log('[ReelsFeed] onReportPost called with post:', post.id);
            // Add slight delay to ensure PostOptionsModal closes first
            setTimeout(() => {
              setSelectedReportPost(post);
              setShowReportModal(true);
              console.log('[ReelsFeed] Report modal opened');
            }, 250);
          }}
          isExternallyPaused={isExternallyPaused}
          hasAlreadyReported={reportedPosts.has(post.id)}
          savePosition={savePosition}
          getPosition={getPosition}
          clearPosition={clearPosition}
          onHashtagPress={onHashtagPress}
          visibleHeight={VISIBLE_HEIGHT}
          isWorldFeed={isWorldFeed}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentIndex,
      isMuted,
      isScreenFocused,
      visibleIndexes,
      users,
      headerHeight,
      isFullscreen,
      showAuraPoints,
      isExternallyPaused,
      onSearchPress,
      onDeletePost,
      savePosition,
      getPosition,
      clearPosition,
      onHashtagPress,
      VISIBLE_HEIGHT,
      feedType,
      appState.current,
      videoOnlyPosts,
      isWorldFeed,
    ],
  );

  return (
    <>
      {/* Container measures its own height - most reliable for Reels-style */}
      <View
        style={{ flex: 1, width: '100%', backgroundColor: '#000' }}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          if (height > 0 && height !== containerHeight) {
            setContainerHeight(height);
          }
        }}
      >
        {containerHeight === 0 ? (
          // Loading placeholder while measuring
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : videoOnlyPosts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 }}>
              No posts yet. Pull down to refresh!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={videoOnlyPosts}
            renderItem={renderItem}
            keyExtractor={(item: CirclePost) =>
              item.id
            }
            // Fixed-height layout - skips measurement, enables instant scrollToIndex
            getItemLayout={(_data, index) => ({
              length: VISIBLE_HEIGHT,
              offset: Math.round(VISIBLE_HEIGHT * index),
              index,
            })}
            // Use native paging on all platforms to strictly enforce one post at a time
            pagingEnabled={true}
            // Allow bounce only at top (index 0) to enable pull-to-refresh
            bounces={currentIndex === 0}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
            // Pull-to-refresh when swiping down from the top
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
                colors={['#fff']}
                progressBackgroundColor="#333"
              />
            }
            // Infinite scroll
            onEndReached={() => {
              if (onLoadMore) onLoadMore();
            }}
            onEndReachedThreshold={0.5}
            // Scroll callbacks
            onScrollBeginDrag={onScrollBeginDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={momentumScrollEnd}
            // Performance - limit initial render to prevent video decoder overload on Android
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={true}
            // Scroll behavior
            scrollEventThrottle={16}
            directionalLockEnabled={true}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          />
        )}
      </View>

      {showCommentsModal && (
        <UnifiedCommentsModal
          visible={showCommentsModal}
          onClose={handleCloseComments}
          postId={selectedPostId}
          onCommentAdded={async () => {
            if (selectedPostId && syncPostCommentCount) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              await syncPostCommentCount(selectedPostId);
            }
          }}
          title="Comments"
        />
      )}

      {/* Gift Modals Removed */}
      {/* ReportPostModal removed */}
    </>
  );
};

export default InstagramReelsFeed;
