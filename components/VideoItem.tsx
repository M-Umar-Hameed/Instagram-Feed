
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { CrossPlatformImage as Image } from './ui/CrossPlatformImage';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/theme';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { usePostInteractions } from '../contexts/PostInteractionsContext';
import PostInteractions from './PostInteractions';
import PostOptionsModal from './PostOptionsModal';
import { getDisplayName, getAnonymousAvatarPlaceholder } from '@/utils/userDisplayUtils';
import { navigateToUserProfile, isProfileViewable } from '../utils/profileNavigation';
import { trackVideoView, trackPostView } from '../utils/postInteractions';
import { getCachedUser } from '../utils/supabase';
import { Database } from '../database.types';
import { HashtagChip } from './HashtagText';
import { ViewMode } from './FeedContainer';

// Feed event tracking stubs
const recordQualifiedView = (..._args: any[]) => { };
const accumulateWatchTime = (..._args: any[]) => { };
const recordImpression = (..._args: any[]) => { };

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

// Interface for parsed media items (unified format)
interface ParsedMediaItem {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
}

interface VideoItemProps {
  post: CirclePost;
  user: User | undefined;
  index: number;
  isCurrent: boolean;
  isScreenFocused: boolean;
  isPaused: Record<number, boolean>;
  globalMuteState: boolean;
  likedPosts: Record<string, boolean>;
  videoRefs: React.MutableRefObject<Record<number, Video | null>>;
  videoLoading: Record<number, boolean>;
  videoError: Record<number, string>;
  heartAnimations: React.MutableRefObject<Record<number, Animated.Value>>;
  prefetchedVideos: Set<number>;
  viewMode: ViewMode;
  onVideoLoad: (index: number) => void;
  onVideoError: (index: number, error: any) => void;
  onPressIn: (index: number) => void;
  onPressOut: (index: number) => void;
  onDoubleTap: (index: number) => void;
  onSmartRetry: (index: number) => void;
  onToggleLike: (index: number) => void;
  onToggleMute: () => void;
  onVideoClick?: (index: number) => void;
  onCarouselVideoClick?: (postIndex: number, mediaItemIndex: number, videoUrl: string, thumbnailUrl?: string) => void;
  loadedVideosCache: React.MutableRefObject<Set<string>>;
  videoLoadStates: React.MutableRefObject<Record<number, 'loading' | 'loaded' | 'error'>>;
  savePosition?: (postId: string, positionMs: number) => void;
  getPosition?: (postId: string) => number;
  clearPosition?: (postId: string) => void;
  onShowComments?: (postId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getTimeAgo = (createdAt: string): string => {
  try {
    const now = new Date();
    const postTime = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return 'unknown';
  }
};

const getPostContentText = (content: any): string => {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (typeof content === 'object' && content !== null) {
    if (content.text) return content.text;
    if (content.content) return content.content;
    if (content.body) return content.body;
    if (content.message) return content.message;

    if (Array.isArray(content)) {
      return content.join(' ');
    }

    try {
      return JSON.stringify(content);
    } catch {
      return '';
    }
  }

  return String(content || '');
};

const VideoItem: React.FC<VideoItemProps> = ({
  post,
  user,
  index,
  isCurrent,
  isScreenFocused,
  isPaused,
  globalMuteState,
  videoRefs,
  heartAnimations,
  viewMode,
  onVideoLoad,
  onVideoError,
  onPressIn,
  onPressOut,
  onDoubleTap,
  onToggleMute,
  onVideoClick,
  onCarouselVideoClick,
  savePosition,
  getPosition,
  clearPosition,
  onShowComments,
}) => {
  const contentType = post.content_type || 'video';
  const isVideoPost = contentType === 'video';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isImagePost = contentType === 'image' || contentType === 'photo' || contentType === 'mixed';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isTextPost = contentType === 'text';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { postStats, currentUser } = usePostInteractions();
  const [showPostOptions, setShowPostOptions] = useState(false);

  const [viewTracked, setViewTracked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewStartTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);

  const displayData = getDisplayName(post, user);
  const isOwnPost = currentUserId === post.user_id;

  // Carousel state for multi-media posts
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  // Parse media items from various formats
  const parseMediaItems = useCallback((): ParsedMediaItem[] => {
    if (!post.media_urls) return [];

    const mediaUrls = post.media_urls;

    // Format 1: Array of strings (photo URLs only)
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      // Check if it's array of objects with type/url
      if (typeof mediaUrls[0] === 'object' && mediaUrls[0] !== null) {
        // Format 2: Array of objects { type, url, thumbnailUrl }
        return mediaUrls.map((item: any) => ({
          type: item.type || 'photo',
          url: item.url || '',
          thumbnailUrl: item.thumbnailUrl,
        })).filter(item => item.url);
      }
      // Array of URL strings (photos)
      return mediaUrls.map((url: any) => ({
        type: 'photo' as const,
        url: String(url || ''),
      })).filter(item => item.url);
    }

    // Format 3: Object with single video { videoUrl, thumbnailUrl }
    if (typeof mediaUrls === 'object' && !Array.isArray(mediaUrls)) {
      const urlObj = mediaUrls as MediaUrls;

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

  const mediaItems = parseMediaItems();
  const hasMultipleMedia = mediaItems.length > 1;

  // Handle carousel scroll
  const handleCarouselScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentMediaIndex && newIndex >= 0 && newIndex < mediaItems.length) {
      setCurrentMediaIndex(newIndex);
    }
  }, [currentMediaIndex, mediaItems.length]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { user } = await getCachedUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleDeletePost = () => {
    console.log('[VideoItem] Delete post requested:', post.id);
  };

  const handleReportPost = () => {
    console.log('[VideoItem] Report post tapped:', post.id);
  };

  useEffect(() => {
    if (isVideoPost || viewTracked || !currentUserId) return;

    if (isCurrent && isScreenFocused) {
      viewStartTimeRef.current = Date.now();
      // @ts-ignore
      viewTimerRef.current = setTimeout(async () => {
        const viewDuration = Date.now() - viewStartTimeRef.current;
        if (viewDuration >= 2000) {
          const success = await trackPostView(post.id, currentUserId, viewDuration);
          if (success) {
            setViewTracked(true);
            // Record impression for feed algorithm
            recordImpression(post.id, currentUserId);
          }
        }
      }, 2000);
    } else {
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
  }, [isCurrent, isScreenFocused, isVideoPost, viewTracked, currentUserId, post.id]);

  useEffect(() => {
    return () => {
      const videoRef = videoRefs.current[index];
      if (videoRef) {
        videoRef.unloadAsync().catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        videoRefs.current[index] = null;
      }
    };
  }, [index, videoRefs]);

  const currentStats = postStats[post.id] || {
    likesCount: post.likes_count || 0,
    commentsCount: post.comments_count || 0,
    sharesCount: post.shares_count || 0,
    isLiked: false
  };

  const renderUserInfoHeader = () => (
    <View style={styles.spreadUserInfo}>
      <TouchableOpacity
        style={styles.spreadUserInfoTouchable}
        onPress={() => navigateToUserProfile(user ?? null, post.user_id ?? undefined, currentUserId ?? undefined)}
        disabled={displayData.isAnonymous || !isProfileViewable(user ?? null, post.user_id ?? undefined)}
        activeOpacity={0.7}
      >
        {displayData.isAnonymous ? (
          <View style={[styles.spreadProfilePic, {
            backgroundColor: getAnonymousAvatarPlaceholder(displayData.username),
            justifyContent: 'center',
            alignItems: 'center'
          }]}>
            <Ionicons name="person" size={wp('4%')} color="white" />
          </View>
        ) : (
          <Image
            source={displayData.profileImage || 'https://img.icons8.com/color/48/test-account.png'}
            style={styles.spreadProfilePic}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        )}
        <View style={styles.spreadUserDetails}>
          <Text style={[
            styles.spreadUserName,
            displayData.isAnonymous && { fontStyle: 'italic' },
            !displayData.isAnonymous && !isProfileViewable(user ?? null, post.user_id ?? undefined) && { opacity: 0.6 }
          ]}>
            {displayData.username}
          </Text>
          {displayData.isAnonymous && (
            <Text style={styles.anonymousBadge}>Anonymous</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp('2%') }}>
        {/* Under Review Badge - Per Venn Aura System spec */}
        {(post as any).under_review === true && (
          <View style={styles.underReviewBadge}>
            <Ionicons name="alert-circle" size={wp('3.5%')} color="#F59E0B" />
            <Text style={styles.underReviewBadgeText} numberOfLines={1}>
              {(post as any).review_tag || 'Under Review'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{ padding: wp('2%') }}
          onPress={() => {
            console.log('[VideoItem] 3 dots tapped! Opening options for post:', post.id);
            console.log('[VideoItem] isOwnPost:', isOwnPost);
            setShowPostOptions(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={wp('5%')} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTextPost = () => (
    <View style={styles.spreadTextPostContainer}>
      <Text style={styles.spreadTextPostContent}>
        {getPostContentText(post.content) || 'No content available'}
      </Text>
    </View>
  );

  // Render single media item (photo or video in carousel)
  const renderSingleMediaItem = (item: ParsedMediaItem, itemIndex: number) => {
    if (item.type === 'video') {
      return (
        <TouchableWithoutFeedback
          key={itemIndex}
          onPress={() => {
            if (onCarouselVideoClick) {
              onCarouselVideoClick(index, itemIndex, item.url, item.thumbnailUrl);
            }
          }}
        >
          <View style={styles.carouselItem}>
            <Video
              source={{ uri: item.url }}
              style={styles.carouselMedia}
              useNativeControls={false}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={true}
              shouldPlay={isCurrent && isScreenFocused && currentMediaIndex === itemIndex}
              isMuted={globalMuteState}
              volume={globalMuteState ? 0.0 : 1.0}
            />
            {/* Mute button for videos */}
            <TouchableOpacity
              style={styles.carouselMuteButton}
              onPress={onToggleMute}
            >
              <View style={styles.carouselMuteButtonInner}>
                <Ionicons
                  name={globalMuteState ? 'volume-mute' : 'volume-high'}
                  size={wp('5%')}
                  color="white"
                />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    return (
      <View key={itemIndex} style={styles.carouselItem}>
        <Image
          source={item.url}
          style={styles.carouselMedia}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
        />
      </View>
    );
  };

  // Render Instagram-style carousel for multiple media
  const renderMediaCarousel = () => {
    if (mediaItems.length === 0) {
      return (
        <View style={styles.spreadImagePostContainer}>
          <View style={styles.spreadImagePostPlaceholder}>
            <Ionicons name="image-outline" size={wp('15%')} color={colors.textSecondary} />
            <Text style={styles.spreadImagePostPlaceholderText}>Media not available</Text>
          </View>
        </View>
      );
    }

    // Single media item - render without carousel
    if (mediaItems.length === 1) {
      const item = mediaItems[0];
      return (
        <View style={styles.spreadImagePostContainer}>
          {item.type === 'video' ? (
            <TouchableWithoutFeedback
              onPressIn={() => onPressIn(index)}
              onPressOut={() => onPressOut(index)}
              onPress={() => onVideoClick ? onVideoClick(index) : onDoubleTap(index)}
            >
              <View style={styles.singleVideoContainer}>
                <Video
                  ref={(ref: Video | null) => { videoRefs.current[index] = ref; }}
                  source={{ uri: item.url }}
                  style={styles.spreadImagePost}
                  useNativeControls={false}
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={true}
                  shouldPlay={isCurrent && isScreenFocused}
                  isMuted={globalMuteState}
                  volume={globalMuteState ? 0.0 : 1.0}
                />
                <TouchableOpacity style={styles.homeMuteButton} onPress={onToggleMute}>
                  <View style={styles.homeMuteButtonInner}>
                    <Ionicons
                      name={globalMuteState ? 'volume-mute' : 'volume-high'}
                      size={wp('6%')}
                      color="white"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          ) : (
            <Image
              source={item.url}
              style={styles.spreadImagePost}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          )}
        </View>
      );
    }

    // Multiple media items - render carousel
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={carouselScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleCarouselScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.carouselScrollView}
        >
          {mediaItems.map((item, itemIndex) => renderSingleMediaItem(item, itemIndex))}
        </ScrollView>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          {mediaItems.map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.paginationDot,
                dotIndex === currentMediaIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        {/* Media counter badge */}
        <View style={styles.mediaCounterBadge}>
          <Text style={styles.mediaCounterText}>
            {currentMediaIndex + 1}/{mediaItems.length}
          </Text>
        </View>
      </View>
    );
  };

  const renderImagePost = () => {
    // Use new carousel renderer for all image/photo/mixed posts
    return renderMediaCarousel();
  };

  const renderInstagramVideoWithOverlay = () => {
    let videoUrl = '';

    if (post.media_urls) {
      if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
        // New format: array of objects { type, url, thumbnailUrl }
        const firstVideo = (post.media_urls as any[]).find((item: any) =>
          typeof item === 'object' && item !== null && item.type === 'video'
        );
        if (firstVideo && firstVideo.url) {
          videoUrl = firstVideo.url;
        }
      } else if (typeof post.media_urls === 'object' && !Array.isArray(post.media_urls)) {
        // Legacy format: { videoUrl, video_url, url }
        const mediaUrls = post.media_urls as MediaUrls;
        videoUrl = mediaUrls.videoUrl ||
          mediaUrls.video_url ||
          mediaUrls.url ||
          '';
      }
    }

    return (
      <TouchableWithoutFeedback
        onPressIn={() => onPressIn(index)}
        onPressOut={() => onPressOut(index)}
        onPress={() => {
          if (onVideoClick) {
            onVideoClick(index);
          } else {
            onDoubleTap(index);
          }
        }}
      >
        <View style={styles.spreadVideoContainer}>
          { }
          <Video
            ref={(ref: Video | null) => { videoRefs.current[index] = ref; }}
            source={{ uri: videoUrl }}
            usePoster={false}
            style={styles.spreadVideo}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={true}
            shouldPlay={isCurrent && !isPaused[index] && isScreenFocused}
            isMuted={globalMuteState}
            volume={globalMuteState ? 0.0 : 1.0}
            progressUpdateIntervalMillis={1000}
            rate={1.0}
            onError={(error) => onVideoError(index, error)}
            onLoad={(status: AVPlaybackStatus) => {
              onVideoLoad(index);
              if (isCurrent && isScreenFocused && !isPaused[index]) {
                const ref = videoRefs.current[index];
                if (ref) {
                  if (getPosition && status.isLoaded && status.durationMillis) {
                    const savedPos = getPosition(post.id);
                    if (savedPos > 0 && savedPos < status.durationMillis - 1000) {
                      ref.setPositionAsync(savedPos).catch(() => { });
                    }
                  }
                  ref.playAsync().catch(() => { });
                }
              }
            }}
            onReadyForDisplay={() => {
              if (isCurrent && isScreenFocused && !isPaused[index]) {
                const ref = videoRefs.current[index];
                if (ref) {
                  ref.setStatusAsync({
                    shouldPlay: true,
                    isMuted: globalMuteState,
                    volume: globalMuteState ? 0.0 : 1.0
                  }).catch(() => { });
                }
              }
            }}
            onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
              if (status.isLoaded) {
                if (status.positionMillis && status.positionMillis > 500 && savePosition) {
                  savePosition(post.id, status.positionMillis);
                }

                // Accumulate watch time for feed algorithm (delta-based)
                if (
                  status.isPlaying &&
                  status.positionMillis !== undefined &&
                  status.durationMillis &&
                  currentUserId &&
                  isCurrent &&
                  isScreenFocused
                ) {
                  const currentPos = status.positionMillis / 1000;
                  const lastPos = lastPositionRef.current / 1000;
                  const delta = currentPos - lastPos;
                  const durationSec = status.durationMillis / 1000;

                  if (delta > 0 && delta <= 2) {
                    accumulateWatchTime(post.id, currentUserId, delta, durationSec);
                  }
                  lastPositionRef.current = status.positionMillis;

                  recordQualifiedView(post.id, currentUserId, currentPos, durationSec);
                }

                if (status.didJustFinish && isCurrent) {
                  lastPositionRef.current = 0;
                  if (clearPosition) {
                    clearPosition(post.id);
                  }
                  videoRefs.current[index]?.replayAsync().catch((err) => {
                    console.warn('[VideoItem] Error replaying video:', err);
                  });
                }
              }

              if (
                status.isLoaded &&
                status.isPlaying &&
                status.positionMillis &&
                status.durationMillis &&
                currentUserId &&
                !viewTracked &&
                isCurrent &&
                isScreenFocused
              ) {
                const progressPercent = (status.positionMillis / status.durationMillis) * 100;

                if (progressPercent >= 30) {
                  trackVideoView(
                    post.id,
                    currentUserId,
                    status.positionMillis,
                    status.durationMillis
                  ).then((tracked) => {
                    if (tracked) {
                      setViewTracked(true);
                    }
                  }).catch(() => { });
                }
              }
            }}
          />

          { }
          <Animated.View
            style={[
              styles.heartAnimationContainer,
              {
                opacity: heartAnimations.current[index] || new Animated.Value(0),
                transform: [
                  {
                    scale:
                      heartAnimations.current[index]?.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.7, 1.2, 1],
                      }) || 1,
                  },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={wp('25%')} color="red" />
          </Animated.View>

          { }
          <TouchableOpacity
            style={styles.homeMuteButton}
            onPress={onToggleMute}
          >
            <View style={styles.homeMuteButtonInner}>
              <Ionicons
                name={globalMuteState ? 'volume-mute' : 'volume-high'}
                size={wp('6%')}
                color="white"
              />
            </View>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderMainContent = () => {
    // For posts with multiple media items, always use carousel
    // This handles mixed content (photos + videos) and multi-video posts
    if (hasMultipleMedia) {
      return renderMediaCarousel();
    }

    switch (contentType) {
      case 'video':
        // Check if it's using new format (array with type/url objects)
        if (mediaItems.length === 1 && mediaItems[0].type === 'video') {
          return renderMediaCarousel(); // Use unified carousel renderer
        }
        return renderInstagramVideoWithOverlay();
      case 'image':
      case 'photo':
      case 'mixed':
        return renderImagePost();
      case 'text':
        return renderTextPost();
      default:
        return (
          <View style={styles.spreadFallbackContainer}>
            <Ionicons name="document-text-outline" size={wp('15%')} color={colors.textSecondary} />
            <Text style={styles.spreadFallbackText}>Unsupported content type: {contentType}</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.spreadOutPostMain}>
      { }
      {renderUserInfoHeader()}

      { }
      {renderMainContent()}

      { }
      <View style={styles.spreadInteractionsWrapper}>
        <PostInteractions
          post={post}
          user={user}
          style={viewMode === ViewMode.Instagram ? 'instagram' : 'tiktok'}
          onCommentPress={() => onShowComments?.(post.id)}
        />
      </View>

      { }
      {viewMode === ViewMode.Instagram && (
        <View style={styles.spreadEngagement}>
          {currentStats.likesCount > 0 && (
            <Text style={styles.spreadLikesCountText}>
              {currentStats.likesCount} likes
            </Text>
          )}
          {post.content && (
            <View style={styles.spreadCaptionContainer}>
              <Text style={styles.spreadCaptionText}>
                <Text style={styles.spreadCaptionUsername}>{displayData.username}</Text>
                {'  '}
                {(() => {
                  const contentText = getPostContentText(post.content);
                  return contentText.substring(0, 100) + (contentText.length > 100 ? '...' : '');
                })()}
              </Text>
            </View>
          )}
          {(() => {
            let tagsArray: string[] = [];
            if (post.tags) {
              if (Array.isArray(post.tags)) {
                tagsArray = post.tags;
              } else if (typeof post.tags === 'string') {
                try {
                  const parsed = JSON.parse(post.tags);
                  if (Array.isArray(parsed)) {
                    tagsArray = parsed;
                  }
                } catch {
                  // If it's a comma-separated string
                  // @ts-ignore
                  tagsArray = post.tags.split(',').map(t => t.trim()).filter(Boolean);
                }
              }
            }
            return tagsArray.length > 0 ? (
              <View style={styles.spreadTagsContainer}>
                <View style={styles.spreadTagsRow}>
                  {tagsArray.map((tag) => tag.trim().split(/\s+/)[0]).filter(Boolean).map((tag, tagIndex) => (
                    <HashtagChip
                      key={`tag-${tagIndex}`}
                      tag={tag}
                      style={styles.spreadTagChip}
                      textStyle={styles.spreadTagChipText}
                    />
                  ))}
                </View>
              </View>
            ) : null;
          })()}
          {currentStats.commentsCount > 0 && (
            <TouchableOpacity onPress={() => onShowComments?.(post.id)}>
              <Text style={styles.spreadViewCommentsText}>
                View all {currentStats.commentsCount} comments
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.spreadTimeAgoText}>{getTimeAgo(post.created_at)}</Text>
        </View>
      )}

      { }
      <View style={styles.spreadSeparator} />

      {showPostOptions && (
        <PostOptionsModal
          visible={showPostOptions}
          onClose={() => {
            setShowPostOptions(false);
          }}
          onDelete={handleDeletePost}
          onReport={handleReportPost}
          isOwnPost={isOwnPost}
        />
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  spreadOutPostMain: {
    width: SCREEN_WIDTH,
    backgroundColor: '#fff',
    marginBottom: hp('2%'),
  },

  spreadUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    backgroundColor: '#fff',
  },

  spreadUserInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  spreadProfilePic: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('4.5%'),
    marginRight: wp('3%'),
  },

  spreadUserDetails: {
    flex: 1,
  },

  spreadUserName: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#000',
  },

  moreOptionsButton: {
    padding: wp('2%'),
  },

  moreOptionsText: {
    fontSize: wp('5%'),
    color: '#000',
  },

  spreadVideoContainer: {
    backgroundColor: '#000',
    width: SCREEN_WIDTH,
    height: hp('60%'),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  spreadVideo: {
    width: '100%',
    height: '100%',
  },

  spreadTextPostContainer: {
    width: SCREEN_WIDTH,
    minHeight: hp('30%'),
    padding: wp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },

  spreadTextPostContent: {
    fontSize: wp('4.5%'),
    color: '#000',
    lineHeight: wp('6.5%'),
    textAlign: 'center',
  },

  spreadImagePostContainer: {
    width: SCREEN_WIDTH,
    height: hp('50%'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  spreadImagePost: {
    width: '100%',
    height: '100%',
  },

  spreadImagePostPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },

  spreadImagePostPlaceholderText: {
    fontSize: wp('3.5%'),
    color: colors.textSecondary,
    marginTop: hp('1%'),
  },

  // Carousel styles for multi-media posts
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: hp('50%'),
    backgroundColor: '#000',
    position: 'relative',
  },

  carouselScrollView: {
    flex: 1,
  },

  carouselItem: {
    width: SCREEN_WIDTH,
    height: hp('50%'),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  carouselMedia: {
    width: '100%',
    height: '100%',
  },

  carouselVideoIndicator: {
    position: 'absolute',
    top: hp('1.5%'),
    left: wp('3%'),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: wp('3%'),
    padding: wp('1.5%'),
  },

  carouselMuteButton: {
    position: 'absolute',
    bottom: hp('2%'),
    right: wp('4%'),
    zIndex: 30,
  },

  carouselMuteButtonInner: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: wp('6%'),
    padding: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
  },

  paginationContainer: {
    position: 'absolute',
    bottom: hp('1.5%'),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp('1.5%'),
  },

  paginationDot: {
    width: wp('1.8%'),
    height: wp('1.8%'),
    borderRadius: wp('1%'),
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  paginationDotActive: {
    backgroundColor: '#fff',
    width: wp('2%'),
    height: wp('2%'),
  },

  mediaCounterBadge: {
    position: 'absolute',
    top: hp('1.5%'),
    right: wp('3%'),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: wp('3%'),
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.5%'),
  },

  mediaCounterText: {
    color: '#fff',
    fontSize: wp('3%'),
    fontWeight: '600',
  },

  singleVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },

  spreadFallbackContainer: {
    minHeight: hp('30%'),
    padding: wp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },

  spreadFallbackText: {
    fontSize: wp('3.5%'),
    color: colors.textSecondary,
    marginTop: hp('1%'),
    textAlign: 'center',
  },

  spreadInteractionsWrapper: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
    backgroundColor: '#fff',
  },

  spreadEngagement: {
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('1.5%'),
    backgroundColor: '#fff',
  },

  spreadLikesCountText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#000',
    marginBottom: hp('0.8%'),
  },

  spreadCaptionContainer: {
    marginBottom: hp('0.8%'),
  },

  spreadCaptionText: {
    fontSize: wp('3.5%'),
    color: '#000',
    lineHeight: wp('5%'),
  },

  spreadCaptionUsername: {
    fontWeight: '900',
  },

  spreadTagsContainer: {
    marginBottom: hp('0.8%'),
  },

  spreadTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  spreadTagChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    marginRight: wp('2%'),
    marginBottom: hp('0.3%'),
    borderWidth: 0,
  },

  spreadTagChipText: {
    fontSize: wp('3.5%'),
    color: '#00376b',
    fontWeight: '400',
  },

  spreadTagsText: {
    fontSize: wp('3.5%'),
    color: '#00376b',
    lineHeight: wp('5%'),
  },

  spreadViewCommentsText: {
    fontSize: wp('3.5%'),
    color: '#666',
    marginBottom: hp('0.5%'),
  },

  spreadTimeAgoText: {
    fontSize: wp('3%'),
    color: '#999',
  },

  spreadSeparator: {
    width: '100%',
    height: hp('1%'),
    backgroundColor: '#f0f0f0',
  },

  heartAnimationContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  homeMuteButton: {
    position: 'absolute',
    bottom: hp('2%'),
    right: wp('4%'),
    zIndex: 30,
  },
  homeMuteButtonInner: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: wp('8%'),
    padding: wp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp('12%'),
    minHeight: wp('12%'),
  },
  anonymousBadge: {
    fontSize: wp('2.5%'),
    color: '#666',
    marginTop: hp('0.3%'),
    fontStyle: 'italic',
  },
  anonymousCaptionUsername: {
    fontStyle: 'italic',
    color: '#666',
  },
  underReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.4%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  underReviewBadgeText: {
    color: '#D97706',
    fontSize: wp('2.8%'),
    fontWeight: '600',
    marginLeft: wp('1%'),
    maxWidth: wp('22%'),
  },
});

export default VideoItem;