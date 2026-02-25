
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, getCachedSession } from "../utils/supabase";
import { Database } from "../database.types";

type CirclePost = Database["public"]["Tables"]["circle_posts"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

export enum FeedType {
  ForYou = "for_you",
  Following = "following",
}

interface UseFeedResult {
  posts: CirclePost[];
  users: Record<string, User>;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  fetchFeed: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  addLikedPost: (post: CirclePost) => void;
}
let feedCache: Record<string, {
  posts: CirclePost[];
  users: Record<string, User>;
  timestamp: number;
  offset: number;
  cursorCreatedAt: string | null;
  cursorPostId: string | null;
  hasMore: boolean;
}> = {};
let followingUsersCache: {
  ids: string[];
  timestamp: number;
  userId: string;
} | null = null;
let currentUserIdCache: string | null = null;

// Cache for user's circle and subcircle memberships (for visibility filtering)
let userCircleMembershipsCache: {
  circleIds: string[];
  subcircleIds: string[]; // User's current subcircle IDs
  mentorSubcircleIds: string[]; // Subcircles where user is a mentor
  timestamp: number;
  userId: string;
} | null = null;
const CIRCLE_MEMBERSHIP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const CACHE_DURATION = 3 * 60 * 1000;
const FOLLOWING_CACHE_DURATION = 2 * 60 * 1000;
const MAX_CACHED_POSTS = 50; // Limit posts in cache to prevent memory bloat
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MAX_CACHED_USERS = 100; // Limit users in cache

// FEED_FLAG: Set to true to use get_ranked_feed RPC (ranked/interleaved).
// Set to false to fall back to the 3-query chronological approach.
const USE_RANKED_FEED = true;

// Cache cleanup function to prevent memory leaks
const cleanupCache = () => {
  const now = Date.now();

  // Remove expired cache entries
  Object.keys(feedCache).forEach(key => {
    const cache = feedCache[key];
    if (now - cache.timestamp > CACHE_DURATION) {
      delete feedCache[key];
    } else if (cache.posts.length > MAX_CACHED_POSTS) {
      // Trim posts to max limit (keep most recent)
      cache.posts = cache.posts.slice(0, MAX_CACHED_POSTS);
      // Also trim users to only those in posts
      const postUserIds = new Set(cache.posts.map(p => p.user_id).filter(Boolean));
      const trimmedUsers: Record<string, User> = {};
      Object.entries(cache.users).forEach(([id, user]) => {
        if (postUserIds.has(id)) {
          trimmedUsers[id] = user;
        }
      });
      cache.users = trimmedUsers;
    }
  });

  // Clear following cache if expired
  if (followingUsersCache && now - followingUsersCache.timestamp > FOLLOWING_CACHE_DURATION) {
    followingUsersCache = null;
  }

  // Clear circle memberships cache if expired
  if (userCircleMembershipsCache && now - userCircleMembershipsCache.timestamp > CIRCLE_MEMBERSHIP_CACHE_DURATION) {
    userCircleMembershipsCache = null;
  }
};

// Run cleanup every 2 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
const startCacheCleanup = () => {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupCache, 2 * 60 * 1000);
  }
};
const stopCacheCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Export for manual cleanup if needed
export const clearAllCache = () => {
  feedCache = {};
  followingUsersCache = null;
  currentUserIdCache = null;
  userCircleMembershipsCache = null;
};

// Global function to invalidate following cache - can be called from anywhere
export const invalidateFollowingCache = () => {
  followingUsersCache = null;
  delete feedCache[FeedType.Following];
};

// Invalidate all feed caches - call this after creating a new post
export const invalidateFeedCache = () => {
  feedCache = {};
};

// Clear cache when user changes (login/logout) - called from auth listener
export const clearCacheForUserChange = (newUserId: string | null) => {
  // Only clear if user actually changed
  if (currentUserIdCache !== newUserId) {
    feedCache = {};
    followingUsersCache = null;
    userCircleMembershipsCache = null;
    currentUserIdCache = newUserId;
  }
};

// Global event emitter for follow updates
type FollowUpdateListener = () => void;
const followUpdateListeners: Set<FollowUpdateListener> = new Set();

export const subscribeToFollowUpdates = (listener: FollowUpdateListener) => {
  followUpdateListeners.add(listener);
  return () => followUpdateListeners.delete(listener);
};

export const notifyFollowUpdate = () => {
  invalidateFollowingCache();
  followUpdateListeners.forEach(listener => listener());
};

export const useFeed = (feedType: FeedType): UseFeedResult => {
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Cursor-based pagination refs (ranked path)
  const cursorCreatedAtRef = useRef<string | null>(null);
  const cursorPostIdRef = useRef<string | null>(null);
  // Session-level deduplication: all post IDs seen this session
  const seenPostIdsRef = useRef<Set<string>>(new Set());

  const POSTS_PER_PAGE = 20;
  const MAX_RETRIES = 2;

  // Start cache cleanup on mount, stop on unmount
  useEffect(() => {
    startCacheCleanup();
    return () => {
      stopCacheCleanup();
    };
  }, []);
  const INITIAL_FAST_LOAD = 12; // Load enough posts initially so PagerView doesn't rebuild mid-scroll

  const fetchFeed = useCallback(async (isLoadingMore = false, isBackgroundLoad = false, isRefresh = false) => {
    try {
      const cacheKey = feedType;
      const now = Date.now();
      const cachedData = feedCache[cacheKey];
      if (!isLoadingMore && !isBackgroundLoad && !isRefresh && cachedData && cachedData.posts.length > 0) {
        setPosts(cachedData.posts);
        setUsers(cachedData.users);
        setCurrentOffset(cachedData.offset);
        // Restore cursor state from cache so loadMore works after a cache hit
        cursorCreatedAtRef.current = cachedData.cursorCreatedAt ?? null;
        cursorPostIdRef.current = cachedData.cursorPostId ?? null;
        seenPostIdsRef.current = new Set(cachedData.posts.map(p => p.id));
        setHasMore(cachedData.hasMore);
        setLoading(false);
        if ((now - cachedData.timestamp) < CACHE_DURATION) {
          return;
        }
      }

      if (!isLoadingMore && !isBackgroundLoad) {
        if (!isRefresh && (!cachedData || cachedData.posts.length === 0)) {
          setLoading(true);
        }
        setCurrentOffset(0);
        setHasMore(true);
      } else if (isLoadingMore) {
        setLoadingMore(true);
      }
      // Background load doesn't show any loading state

      // Fast initial load: only 3 videos, then background loads more
      const batchSize = isLoadingMore ? POSTS_PER_PAGE : (isBackgroundLoad ? 12 : INITIAL_FAST_LOAD); 
      const offset = isLoadingMore ? currentOffset : 0;
      let userId: string | undefined;
      let followingUserIds: string[] = [];
      let userCircleIds: string[] = []; // For visibility filtering

      if (!currentUserIdCache) {
        const { session } = await getCachedSession();
        currentUserIdCache = session?.user?.id || null;
      }
      userId = currentUserIdCache || undefined;

      // For ForYou feed, we MUST have userId to exclude user's own posts
      // If userId is not available, try getting it fresh from session
      if (feedType === FeedType.ForYou && !userId) {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession?.user?.id) {
          userId = freshSession.user.id;
          currentUserIdCache = freshSession.user.id;
        }
      }

      // Fetch user's circle and subcircle memberships for visibility filtering
      let userSubcircleIds: string[] = [];
      let userMentorSubcircleIds: string[] = [];

      if (userId) {
        if (userCircleMembershipsCache &&
            userCircleMembershipsCache.userId === userId &&
            (now - userCircleMembershipsCache.timestamp) < CIRCLE_MEMBERSHIP_CACHE_DURATION) {
          userCircleIds = userCircleMembershipsCache.circleIds;
          userSubcircleIds = userCircleMembershipsCache.subcircleIds;
          userMentorSubcircleIds = userCircleMembershipsCache.mentorSubcircleIds;
        } else {
          const { data: membershipData } = await supabase
            .from("circle_members")
            .select("circle_id, current_subcircle_id, mentor_subcircle_ids")
            .eq("user_id", userId)
            .eq("status", "active");

          userCircleIds = membershipData?.map(m => m.circle_id) || [];
          // Collect all subcircle IDs where user is a current member
          userSubcircleIds = membershipData
            ?.filter(m => m.current_subcircle_id)
            .map(m => m.current_subcircle_id as string) || [];
          // Collect all subcircle IDs where user is a mentor
          userMentorSubcircleIds = membershipData
            ?.flatMap(m => (m.mentor_subcircle_ids as string[]) || []) || [];

          userCircleMembershipsCache = {
            circleIds: userCircleIds,
            subcircleIds: userSubcircleIds,
            mentorSubcircleIds: userMentorSubcircleIds,
            timestamp: now,
            userId: userId
          };
        }
      }

      if (USE_RANKED_FEED) {
        // ── RANKED PATH: single RPC call with server-side scoring ──

        if (!userId) {
          setLoading(false);
          return;
        }

        // Cap seenPostIds to prevent oversized RPC param
        if (seenPostIdsRef.current.size > 200) {
          const arr = Array.from(seenPostIdsRef.current);
          seenPostIdsRef.current = new Set(arr.slice(-150));
        }

        const rpcParams: Record<string, any> = {
          p_user_id: userId,
          p_feed_type: feedType as string,
          p_limit: batchSize,
          p_exclude_post_ids: Array.from(seenPostIdsRef.current),
          p_user_subcircle_ids: userSubcircleIds,
          p_user_mentor_subcircle_ids: userMentorSubcircleIds,
        };

        // Only send cursor for loadMore (null = first page)
        if (isLoadingMore && cursorCreatedAtRef.current && cursorPostIdRef.current) {
          rpcParams.p_cursor_created_at = cursorCreatedAtRef.current;
          rpcParams.p_cursor_post_id = cursorPostIdRef.current;
        }

        const { data: rankedData, error: rankedError } = await supabase.rpc(
          'get_ranked_feed',
          rpcParams
        );

        if (rankedError) throw rankedError;
        const rawCount = (rankedData ?? []).length;

        // Content validation filter (RPC handles visibility/moderation/self-post exclusion)
        const validPosts = (rankedData ?? []).filter((post: any) => {
          if (post.content_type === 'video') {
            let hasValidVideoUrl = false;
            const mediaUrls = post.media_urls;
            if (mediaUrls && typeof mediaUrls === 'object') {
              if (Array.isArray(mediaUrls)) {
                const firstItem = mediaUrls[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                  hasValidVideoUrl = !!(firstItem.url && firstItem.url.startsWith('http'));
                }
              } else {
                hasValidVideoUrl = !!(mediaUrls.videoUrl &&
                                      typeof mediaUrls.videoUrl === 'string' &&
                                      mediaUrls.videoUrl.trim() !== '' &&
                                      mediaUrls.videoUrl.startsWith("http"));
              }
            }
            return hasValidVideoUrl;
          } else if (post.content_type === 'image' || post.content_type === 'photo' || post.content_type === 'mixed') {
            let hasImageUrl = false;
            let mediaUrls = post.media_urls;
            if (typeof mediaUrls === 'string') {
              try {
                mediaUrls = JSON.parse(mediaUrls);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (e) {
                if (mediaUrls.startsWith('http')) {
                  hasImageUrl = true;
                }
              }
            }
            if (mediaUrls && !hasImageUrl) {
              if (Array.isArray(mediaUrls)) {
                const firstItem = mediaUrls[0];
                if (typeof firstItem === 'string') {
                  hasImageUrl = firstItem.startsWith('http');
                } else if (typeof firstItem === 'object' && firstItem !== null) {
                  hasImageUrl = !!(firstItem.url && firstItem.url.startsWith('http'));
                }
              } else if (typeof mediaUrls === 'object') {
                hasImageUrl = !!((mediaUrls as any).imageUrl || (mediaUrls as any).photoUrl || (mediaUrls as any).url);
              }
            }
            return hasImageUrl;
          } else if (post.content_type === 'text') {
            if (!post.content) return false;
            let textContent = '';
            if (typeof post.content === 'string') {
              textContent = post.content;
            } else if (typeof post.content === 'object' && post.content !== null) {
              textContent = (post.content as any).text || (post.content as any).content || (post.content as any).body || '';
            }
            return textContent.trim() !== '';
          }
          return false;
        }) as CirclePost[];

        // Update cursor and session dedup
        if (validPosts.length > 0) {
          validPosts.forEach(p => seenPostIdsRef.current.add(p.id));
          const lastPost = validPosts[validPosts.length - 1];
          cursorCreatedAtRef.current = lastPost.created_at;
          cursorPostIdRef.current = lastPost.id;
        }
        // Use rawCount (pre-filter) to avoid premature hasMore=false
        const newHasMore = rawCount >= batchSize;

        if (validPosts.length > 0) {
          // Fetch user metadata (including aura_points)
          const postUserIds = validPosts.map(post => post.user_id).filter(Boolean);
          const userIds = [...new Set(postUserIds)];

          const { data: usersData } = await supabase
            .from("users")
            .select("id, username, name, bio, avatar_url, aura_points")
            .in("id", userIds);

          let newUsersMap: Record<string, User> = {};
          if (usersData) {
            usersData.forEach((user) => {
              newUsersMap[user.id] = user as User;
            });
          }

          // Fetch circle names for posts that have circle_ids
          const allCircleIds = new Set<string>();
          validPosts.forEach((post: any) => {
            if (post.circle_ids && Array.isArray(post.circle_ids)) {
              post.circle_ids.forEach((id: string) => allCircleIds.add(id));
            }
          });

          let circlesMap: Record<string, { id: string; name: string }> = {};
          if (allCircleIds.size > 0) {
            const { data: circlesData } = await supabase
              .from("circles")
              .select("id, name")
              .in("id", Array.from(allCircleIds));

            if (circlesData) {
              circlesData.forEach((circle) => {
                circlesMap[circle.id] = { id: circle.id, name: circle.name };
              });
            }
          }

          // Attach circle info to posts
          const postsWithCircles = validPosts.map((post: any) => {
            if (post.visibility === 'public' && post.subcircle_id) {
              const isSubcircleMember = userSubcircleIds.includes(post.subcircle_id);
              const isSubcircleMentor = userMentorSubcircleIds.includes(post.subcircle_id);
              if (!isSubcircleMember && !isSubcircleMentor) {
                return post;
              }
              if (post.circle_ids && post.circle_ids.length > 0) {
                const memberCircleId = post.circle_ids.find((cid: string) => userCircleIds.includes(cid));
                if (memberCircleId) {
                  const circle = circlesMap[memberCircleId];
                  return { ...post, circle: circle || null };
                }
              }
              return post;
            }

            if (post.circle_ids && post.circle_ids.length > 0) {
              const memberCircleId = post.circle_ids.find((cid: string) => userCircleIds.includes(cid));
              if (memberCircleId) {
                const circle = circlesMap[memberCircleId];
                return { ...post, circle: circle || null };
              }
            }
            return post;
          });

          // Reset retry count on success
          setRetryCount(0);

          if (isLoadingMore) {
            setUsers(prev => ({ ...prev, ...newUsersMap }));
            setPosts(prev => [...prev, ...(postsWithCircles as CirclePost[])]);
            setHasMore(newHasMore);
            setLoadingMore(false);
          } else if (isBackgroundLoad) {
            setUsers(prev => ({ ...prev, ...newUsersMap }));
            setPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newPosts = (postsWithCircles as CirclePost[]).filter(p => !existingIds.has(p.id));
              const combined = [...prev, ...newPosts];
              feedCache[cacheKey] = {
                posts: combined,
                users: { ...feedCache[cacheKey]?.users, ...newUsersMap },
                timestamp: now,
                offset: 0,
                cursorCreatedAt: cursorCreatedAtRef.current,
                cursorPostId: cursorPostIdRef.current,
                hasMore: true
              };
              return combined;
            });
          } else {
            setUsers(newUsersMap);
            setPosts(postsWithCircles as CirclePost[]);
            setHasMore(newHasMore);
            setLoading(false);
            feedCache[cacheKey] = {
              posts: postsWithCircles as CirclePost[],
              users: newUsersMap,
              timestamp: now,
              offset: 0,
              cursorCreatedAt: cursorCreatedAtRef.current,
              cursorPostId: cursorPostIdRef.current,
              hasMore: newHasMore
            };
          }
        } else {
          // No valid posts from RPC
          if (!isLoadingMore) {
            setPosts([]);
            setUsers({});
            setHasMore(false);
            setLoading(false);
            feedCache[cacheKey] = {
              posts: [],
              users: {},
              timestamp: now,
              offset: 0,
              cursorCreatedAt: null,
              cursorPostId: null,
              hasMore: false
            };
          } else {
            setHasMore(false);
            setLoadingMore(false);
          }
        }

      } else {
      // ── FALLBACK PATH: 3-query chronological approach (unchanged) ──

      if (feedType === FeedType.Following) {
        if (!userId) {
          setLoading(false);
          return;
        }
        if (followingUsersCache &&
            followingUsersCache.userId === userId &&
            (now - followingUsersCache.timestamp) < FOLLOWING_CACHE_DURATION) {
          followingUserIds = followingUsersCache.ids;
        } else {
          const { data: followsData } = await supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", userId);

          followingUserIds = followsData?.map(f => f.following_id) || [];
          followingUsersCache = {
            ids: followingUserIds,
            timestamp: now,
            userId: userId
          };
        }

        if (followingUserIds.length === 0) {
          setPosts([]);
          setLoading(false);
          setLoadingMore(false);
          setHasMore(false);
          return;
        }
      }
      const essentialColumns = "id, user_id, content_type, media_urls, created_at, likes_count, comments_count, shares_count, views_count, content, visibility, circle_ids, subcircle_id, tags, hidden_from_feeds, hidden_from_for_you, under_review, review_tag";

      // World Feed queries - use is_published=true as the primary filter
      // Note: status field is optional - older posts might not have it set
      // Videos typically have status set after processing, but images/text might not
      let videoQuery = supabase
        .from("circle_posts")
        .select(essentialColumns)
        .eq("is_published", true)
        .eq("content_type", "video");

      // Image/Photo query - don't filter by status since existing photos may not have it
      // Include 'mixed' for legacy posts that have photos with captions
      let imageQuery = supabase
        .from("circle_posts")
        .select(essentialColumns)
        .eq("is_published", true)
        .in("content_type", ["image", "photo", "mixed"]);

      // Text query - don't filter by status since existing text posts may not have it
      let textQuery = supabase
        .from("circle_posts")
        .select(essentialColumns)
        .eq("is_published", true)
        .eq("content_type", "text");

      // For World Feed (ForYou), show public posts AND circle_only posts from user's circles
      // For Following feed, show all posts from followed users
      if (feedType === FeedType.ForYou) {
        // Include both public posts and circle_only posts (will filter circle_only by membership later)
        videoQuery = videoQuery.in("visibility", ["public", "circle_only"]);
        imageQuery = imageQuery.in("visibility", ["public", "circle_only"]);
        textQuery = textQuery.in("visibility", ["public", "circle_only"]);

        // Exclude user's own posts from World Feed - they can see them in Profile
        if (userId) {
          videoQuery = videoQuery.neq("user_id", userId);
          imageQuery = imageQuery.neq("user_id", userId);
          textQuery = textQuery.neq("user_id", userId);
        }
      }

      if (feedType === FeedType.Following && followingUserIds.length > 0) {
        videoQuery = videoQuery.in("user_id", followingUserIds);
        imageQuery = imageQuery.in("user_id", followingUserIds);
        textQuery = textQuery.in("user_id", followingUserIds);
        
        // Exclude user's own posts from Following feed
        if (userId) {
          videoQuery = videoQuery.neq("user_id", userId);
          imageQuery = imageQuery.neq("user_id", userId);
          textQuery = textQuery.neq("user_id", userId);
        }
      }

      let repostedPosts: CirclePost[] = [];
      // Skip reposts for initial fast load - load them in background
      if (isLoadingMore || isBackgroundLoad) {
        if (feedType === FeedType.Following && followingUserIds.length > 0) {

          const { data: repostsData } = await supabase
            .from("user_reposts")
            .select("post_id, user_id, created_at, repost_comment")
            .in("user_id", followingUserIds)
            .order("created_at", { ascending: false })
            .range(offset, offset + batchSize - 1);

          if (repostsData && repostsData.length > 0) {
            const repostedPostIds = repostsData.map(r => r.post_id);
            const { data: postsData } = await supabase
              .from("circle_posts")
              .select("*")
              .in("id", repostedPostIds)
              .eq("is_published", true);

            if (postsData) {
              repostedPosts = postsData.map(post => ({
                ...post,
                is_repost: true,
                reposted_by: repostsData.find(r => r.post_id === post.id)?.user_id,
                repost_comment: repostsData.find(r => r.post_id === post.id)?.repost_comment,
                repost_created_at: repostsData.find(r => r.post_id === post.id)?.created_at
              }));
            }
          }
        } else if (feedType === FeedType.ForYou) {

          const { data: repostsData } = await supabase
            .from("user_reposts")
            .select("post_id, user_id, created_at, repost_comment")
            .order("created_at", { ascending: false })
            .range(Math.floor(offset * 0.3), Math.floor(offset * 0.3) + Math.ceil(batchSize * 0.3) - 1);

          if (repostsData && repostsData.length > 0) {
            const repostedPostIds = repostsData.map(r => r.post_id);
            const { data: postsData } = await supabase
              .from("circle_posts")
              .select("*")
              .in("id", repostedPostIds)
              .eq("is_published", true);

            if (postsData) {
              repostedPosts = postsData.map(post => ({
                ...post,
                is_repost: true,
                reposted_by: repostsData.find(r => r.post_id === post.id)?.user_id,
                repost_comment: repostsData.find(r => r.post_id === post.id)?.repost_comment,
                repost_created_at: repostsData.find(r => r.post_id === post.id)?.created_at
              }));
            }
          }
        }
      }

      // Fetch ALL content types with SAME batch size (not reduced 30%)
      // This ensures photos and text posts are properly loaded alongside videos
      const [videoResponse, imageResponse, textResponse] = await Promise.all([
        videoQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1),

        imageQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1),

        textQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + batchSize - 1)
      ]);

      if (videoResponse.error) {
        throw videoResponse.error;
      }

      if ('error' in imageResponse && imageResponse.error) {
        console.error('Non-critical error loading images:', imageResponse.error);
      }
      if ('error' in textResponse && textResponse.error) {
        console.error('Non-critical error loading text:', textResponse.error);
      }

      // Include ALL content types (video, image, text) for ALL load scenarios
      // This fixes the bug where initial load only showed videos
      const allFetchedPosts = [
        ...(videoResponse.data || []),
        ...(imageResponse.data || []),
        ...(textResponse.data || []),
        ...repostedPosts
      ].sort((a, b) => {
        const aDate = (a as any).repost_created_at || a.created_at;
        const bDate = (b as any).repost_created_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }); 
      const validPosts = allFetchedPosts?.filter((post) => {
        // SAFETY: Client-side filter to exclude user's own posts from ForYou and Following feeds
        // This is a backup in case the query filter didn't work (e.g., userId was undefined)
        if (userId && post.user_id === userId) {
          if (feedType === FeedType.ForYou) {
            return false; // Exclude user's own posts from World Feed
          }
          if (feedType === FeedType.Following) {
            return false; // Exclude user's own posts from Following Feed
          }
        }

        // AURA SYSTEM: Visibility filtering for reported/under-review content
        // Per Venn Aura System spec:
        // - hidden_from_feeds=true: Posts from <500 Aura creators under review - hidden from ALL feeds
        // - hidden_from_for_you=true: Posts from >=500 Aura creators under review - hidden from For You only
        const hiddenFromFeeds = (post as any).hidden_from_feeds === true;
        const hiddenFromForYou = (post as any).hidden_from_for_you === true;

        // Exclude posts hidden from ALL feeds (creator has <500 Aura and is under review)
        if (hiddenFromFeeds) {
          return false;
        }

        // For ForYou feed: also exclude posts hidden from For You (creator has >=500 Aura and is under review)
        if (feedType === FeedType.ForYou && hiddenFromForYou) {
          return false;
        }

        // Visibility filtering based on circle and subcircle membership
        // - 'public' visibility: visible to everyone (World Feed posts)
        // - 'circle_only' visibility: only visible if user is member of circle/subcircle
        const postVisibility = (post as any).visibility || 'public';
        const postCircleIds: string[] = (post as any).circle_ids || [];
        const postSubcircleId: string | null = (post as any).subcircle_id || null;

        // PUBLIC posts are visible to everyone - no filtering needed
        // Even if they have a subcircle_id, public visibility means everyone can see them
        // (The subcircle_id is just metadata about where the post originated)
        // CIRCLE_ONLY posts need membership checks
        if (postVisibility === 'circle_only') {
          // If post has a subcircle_id, user must be in that subcircle or be a mentor
          if (postSubcircleId) {
            const isSubcircleMember = userSubcircleIds.includes(postSubcircleId);
            const isSubcircleMentor = userMentorSubcircleIds.includes(postSubcircleId);
            if (!isSubcircleMember && !isSubcircleMentor) {
              return false; // User is not in this subcircle and not a mentor, hide post
            }
          }
          // If no subcircle_id, check circle membership
          else if (postCircleIds.length > 0) {
            const isMember = postCircleIds.some(circleId => userCircleIds.includes(circleId));
            if (!isMember) {
              return false; // User is not a member, hide this post
            }
          }
        }

        // Content validation
        if (post.content_type === 'video') {
          let hasValidVideoUrl = false;
          const mediaUrls = post.media_urls;

          if (mediaUrls && typeof mediaUrls === 'object') {
            if (Array.isArray(mediaUrls)) {
              // Multiple videos format: [{ type: 'video', url: '...', thumbnailUrl: '...' }]
              const firstItem = mediaUrls[0];
              if (typeof firstItem === 'object' && firstItem !== null) {
                hasValidVideoUrl = !!(firstItem.url && firstItem.url.startsWith('http'));
              }
            } else {
              // Single video legacy format: { videoUrl: '...', thumbnailUrl: '...' }
              hasValidVideoUrl = !!(mediaUrls.videoUrl &&
                                    typeof mediaUrls.videoUrl === 'string' &&
                                    mediaUrls.videoUrl.trim() !== '' &&
                                    mediaUrls.videoUrl.startsWith("http"));
            }
          }
          return hasValidVideoUrl;
        } else if (post.content_type === 'image' || post.content_type === 'photo' || post.content_type === 'mixed') {
          let hasImageUrl = false;
          let mediaUrls = post.media_urls;

          // Handle stringified JSON (some posts have media_urls stored as string)
          if (typeof mediaUrls === 'string') {
            try {
              mediaUrls = JSON.parse(mediaUrls);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              // If it's a single URL string starting with http, treat as valid
              if (mediaUrls.startsWith('http')) {
                hasImageUrl = true;
              }
            }
          }

          if (mediaUrls && !hasImageUrl) {
            if (Array.isArray(mediaUrls)) {
              const firstItem = mediaUrls[0];
              // Handle both string URLs and object format { type, url, thumbnailUrl }
              if (typeof firstItem === 'string') {
                hasImageUrl = firstItem.startsWith('http');
              } else if (typeof firstItem === 'object' && firstItem !== null) {
                // New format: array of objects with url property
                hasImageUrl = !!(firstItem.url && firstItem.url.startsWith('http'));
              }
            } else if (typeof mediaUrls === 'object') {
              hasImageUrl = !!((mediaUrls as any).imageUrl || (mediaUrls as any).photoUrl || (mediaUrls as any).url);
            }
          }
          return hasImageUrl;
        } else if (post.content_type === 'text') {
          if (!post.content) return false;
          let textContent = '';
          if (typeof post.content === 'string') {
            textContent = post.content;
          } else if (typeof post.content === 'object' && post.content !== null) {
            textContent = post.content.text || post.content.content || post.content.body || '';
          }
          return textContent.trim() !== '';
        }
        return false;
      }) || [];

      if (validPosts.length > 0) {
        const finalPosts = validPosts;

        const postUserIds = finalPosts.map((post) => post.user_id).filter(Boolean);
        const repostedByIds = finalPosts
          .filter((post: any) => post.is_repost && post.reposted_by)
          .map((post: any) => post.reposted_by)
          .filter(Boolean);
        const userIds = [...new Set([...postUserIds, ...repostedByIds])];

        const { data: usersData } = await supabase
          .from("users")
          .select("id, username, name, bio, avatar_url, aura_points")
          .in("id", userIds);

        let newUsersMap: Record<string, User> = {};
        if (usersData) {
          usersData.forEach((user) => {
            newUsersMap[user.id] = user as User;
          });
        }

        // Fetch circle names for posts that have circle_ids
        const allCircleIds = new Set<string>();
        finalPosts.forEach((post: any) => {
          if (post.circle_ids && Array.isArray(post.circle_ids)) {
            post.circle_ids.forEach((id: string) => allCircleIds.add(id));
          }
        });

        let circlesMap: Record<string, { id: string; name: string }> = {};
        if (allCircleIds.size > 0) {
          const { data: circlesData } = await supabase
            .from("circles")
            .select("id, name")
            .in("id", Array.from(allCircleIds));

          if (circlesData) {
            circlesData.forEach((circle) => {
              circlesMap[circle.id] = { id: circle.id, name: circle.name };
            });
          }
        }

        // Attach circle info to posts (first/parent circle only)
        // Only show circle badge if:
        // 1. User is a member of that circle
        // 2. For public posts with subcircle_id: only show badge if user is member/mentor of that subcircle
        const postsWithCircles = finalPosts.map((post: any) => {
          // For public posts that originated from a subcircle:
          // Only show circle badge to users who are members or mentors of that subcircle
          if (post.visibility === 'public' && post.subcircle_id) {
            const isSubcircleMember = userSubcircleIds.includes(post.subcircle_id);
            const isSubcircleMentor = userMentorSubcircleIds.includes(post.subcircle_id);
            if (!isSubcircleMember && !isSubcircleMentor) {
              // User is not in the subcircle - don't show circle badge
              return post;
            }
            // User IS in the subcircle - show the circle badge
            if (post.circle_ids && post.circle_ids.length > 0) {
              const memberCircleId = post.circle_ids.find((cid: string) => userCircleIds.includes(cid));
              if (memberCircleId) {
                const circle = circlesMap[memberCircleId];
                return {
                  ...post,
                  circle: circle || null
                };
              }
            }
            return post;
          }

          if (post.circle_ids && post.circle_ids.length > 0) {
            // Find the first circle that the user is a member of
            const memberCircleId = post.circle_ids.find((cid: string) => userCircleIds.includes(cid));
            if (memberCircleId) {
              const circle = circlesMap[memberCircleId];
              return {
                ...post,
                circle: circle || null
              };
            }
          }
          return post;
        });

        // Reset retry count on successful fetch
        setRetryCount(0);

        if (isLoadingMore) {
          setUsers({ ...users, ...newUsersMap });
          setPosts([...posts, ...(postsWithCircles as CirclePost[])]);
          setCurrentOffset(currentOffset + batchSize);
          setHasMore(postsWithCircles.length >= POSTS_PER_PAGE);
          setLoadingMore(false);
        } else if (isBackgroundLoad) {
          // Background load: append to existing posts silently
          setUsers(prev => ({ ...prev, ...newUsersMap }));
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = (postsWithCircles as CirclePost[]).filter(p => !existingIds.has(p.id));
            const combined = [...prev, ...newPosts];
            // Update cache with combined posts
            feedCache[cacheKey] = {
              posts: combined,
              users: { ...feedCache[cacheKey]?.users, ...newUsersMap },
              timestamp: now,
              offset: combined.length,
              cursorCreatedAt: null,
              cursorPostId: null,
              hasMore: true
            };
            return combined;
          });
          setCurrentOffset(prev => prev + batchSize);
        } else {
          // Initial load — loads enough posts upfront so PagerView doesn't rebuild mid-scroll
          setUsers(newUsersMap);
          setPosts(postsWithCircles as CirclePost[]);
          setCurrentOffset(batchSize);
          setHasMore(postsWithCircles.length >= batchSize);
          setLoading(false);
          feedCache[cacheKey] = {
            posts: postsWithCircles as CirclePost[],
            users: newUsersMap,
            timestamp: now,
            offset: batchSize,
            cursorCreatedAt: null,
            cursorPostId: null,
            hasMore: postsWithCircles.length >= batchSize
          };
        }
      } else {
        setPosts([]);
        setUsers({});
        setHasMore(false);

        if (!isLoadingMore) {
          setLoading(false);
          feedCache[cacheKey] = {
            posts: [],
            users: {},
            timestamp: now,
            offset: 0,
            cursorCreatedAt: null,
            cursorPostId: null,
            hasMore: false
          };
        } else {
          setLoadingMore(false);
        }
      }
      } // end fallback path
    } catch (error) {
      console.error("Error in fetchFeed:", error);

      // Auto-retry on failure (max 2 retries)
      if (!isLoadingMore && !isBackgroundLoad && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchFeed(false, false);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
      } else {
        if (!isLoadingMore) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType, retryCount]); 

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Subscribe to follow updates for Following feed - instant refresh when user follows someone
  useEffect(() => {
    if (feedType !== FeedType.Following) return undefined;

    const handleFollowUpdate = () => {
      // Instantly refresh the following feed when user follows/unfollows someone
      console.log('[useFeed] Follow update detected - refreshing Following feed');
      fetchFeed(false);
    };

    const unsubscribe = subscribeToFollowUpdates(handleFollowUpdate);
    return () => {
      unsubscribe();
    };
  }, [feedType, fetchFeed]);

  // Real-time subscription for user_follows changes
  useEffect(() => {
    if (feedType !== FeedType.Following || !currentUserIdCache) return;

    const channel = supabase
      .channel('following-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT and DELETE
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${currentUserIdCache}`
        },
        (payload) => {
          console.log('[useFeed] user_follows change detected:', payload.eventType);
          // Invalidate cache and refresh
          invalidateFollowingCache();
          fetchFeed(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType, fetchFeed]);

  const addLikedPost = useCallback((post: CirclePost) => {

  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_posts',
          filter: 'is_published=eq.true'
        },
        (payload) => {
          const newPost = payload.new as CirclePost;
          const mediaUrls = newPost.media_urls as { videoUrl?: string; imageUrl?: string; photoUrl?: string; url?: string } | string[] | null;

          // Validate post based on content type (handle ALL types: video, image/photo, text)
          let isValidPost = false;

          if (newPost.content_type === 'video') {
            // Video: needs valid videoUrl - handle both legacy and array formats
            if (mediaUrls && typeof mediaUrls === 'object') {
              if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
                // New format: array of objects { type, url }
                const firstItem = mediaUrls[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                  isValidPost = !!((firstItem as any).url && (firstItem as any).url.startsWith('http'));
                }
              } else if (!Array.isArray(mediaUrls)) {
                // Legacy format: { videoUrl }
                isValidPost = !!((mediaUrls as any).videoUrl);
              }
            }
          } else if (newPost.content_type === 'image' || newPost.content_type === 'photo' || newPost.content_type === 'mixed') {
            // Image/Photo/Mixed: needs valid image URL
            let parsedUrls = mediaUrls;
            // Handle stringified JSON
            if (typeof parsedUrls === 'string') {
              try {
                parsedUrls = JSON.parse(parsedUrls);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (e) {
                // If it's a single URL string, treat as valid
                if ((parsedUrls as string).startsWith('http')) {
                  isValidPost = true;
                }
              }
            }
            if (parsedUrls && !isValidPost) {
              if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                const firstItem = parsedUrls[0];
                // Handle both string URLs and object format { type, url }
                if (typeof firstItem === 'string') {
                  isValidPost = firstItem.startsWith('http');
                } else if (typeof firstItem === 'object' && firstItem !== null) {
                  isValidPost = !!((firstItem as any).url && (firstItem as any).url.startsWith('http'));
                }
              } else if (typeof parsedUrls === 'object' && !Array.isArray(parsedUrls)) {
                isValidPost = !!((parsedUrls as any).imageUrl || (parsedUrls as any).photoUrl || (parsedUrls as any).url);
              }
            }
          } else if (newPost.content_type === 'text') {
            // Text: needs valid content
            const content = newPost.content;
            if (content) {
              if (typeof content === 'string') {
                isValidPost = content.trim() !== '';
              } else if (typeof content === 'object' && content !== null) {
                const textContent = (content as any).text || (content as any).content || (content as any).body || '';
                isValidPost = textContent.trim() !== '';
              }
            }
          }

          if (isValidPost) {
            // Don't add user's own posts in real-time to ForYou or Following feeds
            if (newPost.user_id === currentUserIdCache) {
              if (feedType === FeedType.ForYou) {
                return; // Skip user's own posts in World Feed
              }
              if (feedType === FeedType.Following) {
                return; // Skip user's own posts in Following Feed
              }
            }

            // AURA SYSTEM: Visibility filtering for reported/under-review content
            // Per Venn Aura System spec:
            // - hidden_from_feeds=true: Posts from <500 Aura creators under review - hidden from ALL feeds
            // - hidden_from_for_you=true: Posts from >=500 Aura creators under review - hidden from For You only
            const hiddenFromFeeds = (newPost as any).hidden_from_feeds === true;
            const hiddenFromForYou = (newPost as any).hidden_from_for_you === true;

            // Skip posts hidden from ALL feeds
            if (hiddenFromFeeds) {
              return;
            }

            // For ForYou feed: skip posts hidden from For You
            if (feedType === FeedType.ForYou && hiddenFromForYou) {
              return;
            }

            // Check visibility for circle_only posts
            const postVisibility = (newPost as any).visibility || 'public';
            const postSubcircleId = (newPost as any).subcircle_id;
            const postCircleIds: string[] = (newPost as any).circle_ids || [];

            if (postVisibility === 'circle_only') {
              // If membership cache is not available, block circle_only posts to be safe
              if (!userCircleMembershipsCache || userCircleMembershipsCache.userId !== currentUserIdCache) {
                return; // Cannot verify membership - don't show circle_only post
              }

              if (postSubcircleId) {
                // Must be in subcircle or be a mentor
                const isSubcircleMember = userCircleMembershipsCache.subcircleIds.includes(postSubcircleId);
                const isSubcircleMentor = userCircleMembershipsCache.mentorSubcircleIds.includes(postSubcircleId);
                if (!isSubcircleMember && !isSubcircleMentor) {
                  return; // User is not in this subcircle
                }
              } else if (postCircleIds.length > 0) {
                // Must be member of at least one circle
                const isMember = postCircleIds.some(cid => userCircleMembershipsCache!.circleIds.includes(cid));
                if (!isMember) {
                  return; // User is not a member of any of these circles
                }
              }
            }

            setPosts(prev => {
              if (prev.some(p => p.id === newPost.id)) return prev;
              return [newPost, ...prev];
            });
            seenPostIdsRef.current.add(newPost.id);
            if (newPost.user_id) {
              supabase
                .from('users')
                .select('id, username, name, bio, avatar_url, aura_points')
                .eq('id', newPost.user_id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setUsers(prev => ({ ...prev, [data.id]: data as User }));
                  }
                });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType]);

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastFetchTime < 1000 && lastFetchTime > 0) {
      return;
    }
    setRefreshing(true);
    setCurrentOffset(0);
    setHasMore(true);
    setLastFetchTime(now);
    // Reset cursor state for fresh ranked fetch
    cursorCreatedAtRef.current = null;
    cursorPostIdRef.current = null;
    seenPostIdsRef.current = new Set();
    const cacheKey = feedType;
    delete feedCache[cacheKey];

    const refreshStart = Date.now();
    await fetchFeed(false, false, true);
    // Ensure spinner shows for at least 800ms so user can feel the refresh
    const elapsed = Date.now() - refreshStart;
    if (elapsed < 800) {
      await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
    }
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    try {
      await fetchFeed(true);
    } catch (error) {
      console.error("Error in loadMore:", error);
      setLoadingMore(false);
    }
  };

  const forceRefresh = async () => {
    const cacheKey = feedType;
    delete feedCache[cacheKey];
    followingUsersCache = null;
    // Reset cursor state for fresh ranked fetch
    cursorCreatedAtRef.current = null;
    cursorPostIdRef.current = null;
    seenPostIdsRef.current = new Set();

    setLoading(true);
    setCurrentOffset(0);
    setHasMore(true);
    setLastFetchTime(0);
    setPosts([]);
    setUsers({});
    await fetchFeed(false);
    setLoading(false);
  };

  return {
    posts,
    users,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    fetchFeed,
    handleRefresh,
    forceRefresh,
    loadMore,
    addLikedPost,
  };
};

export default useFeed;
