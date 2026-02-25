
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  togglePostLike,
  getCurrentUser,
  getPostsLikes,
  togglePostVote,
  getPostsVoteStatus,
} from '../utils/postInteractions';
import { getActualCommentCount, createComment, CommentData } from '../utils/commentUtils';
import { dynamicSharePost, repostToProfile, removeRepost, getUserReposts, bulkCheckRepostStatus } from '../utils/shareUtils';
import { supabase, getCachedSession } from '../utils/supabase';
import { Database } from '../database.types';
import { Alert } from 'react-native';
// removed auraService

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface PostStats {
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  upvotesCount: number;
  downvotesCount: number;
  netVotes: number;
  userVoteType: 'upvote' | 'downvote' | null;
  lastUpdated: number;
}

interface AuraBreakdown {
  total_upvotes: number;
  total_downvotes: number;
  net_votes: number;
  aura_points: number;
}

interface PostInteractionsContextType {
  postStats: Record<string, PostStats>;
  currentUser: User | null;
  userAuraPoints: number;
  auraBreakdown: AuraBreakdown | null;

  likePost: (postId: string, post?: CirclePost) => Promise<void>;
  sharePost: (post: CirclePost, postUser: User) => Promise<void>;
  upvotePost: (postId: string, post?: CirclePost, sourceCircleId?: string | null) => Promise<void>;
  downvotePost: (postId: string, post?: CirclePost, sourceCircleId?: string | null) => Promise<void>;
  deletePost: (postId: string) => Promise<{ success: boolean; error?: string }>;

  repostPost: (post: CirclePost, user: User, type: 'simple' | 'quote', comment?: string) => Promise<void>;
  unrepostPost: (postId: string) => Promise<void>;
  checkIsReposted: (postId: string) => boolean;
  repostStatus: Record<string, boolean>;
  userReposts: any[];

  updatePostStats: (postId: string, stats: Partial<PostStats>) => void;
  loadPostsInteractions: (posts: CirclePost[]) => Promise<void>;

  syncLikeStatus: (postId: string, isLiked: boolean, likesCount?: number) => void;
  syncVoteStatus: (
    postId: string,
    voteType: 'upvote' | 'downvote' | null,
    counts?: { upvotes: number; downvotes: number; netVotes: number }
  ) => void;
  syncShareCount: (postId: string, newCount: number) => void;
  getPostLikeStatus: (postId: string) => boolean;
  getPostVoteStatus: (postId: string) => 'upvote' | 'downvote' | null;

  addComment: (commentData: CommentData) => Promise<{ success: boolean; commentId?: string; error?: string }>;
  syncPostCommentCount: (postId: string) => Promise<number>;
  refreshPostCommentCount: (postId: string) => Promise<void>;

  refreshUserAuraPoints: () => Promise<void>;
  getUserAuraBreakdown: () => Promise<any>;

  isLoading: (postId: string, action: 'like' | 'vote' | 'comment' | 'share' | 'repost') => boolean;
}

const PostInteractionsContext = createContext<PostInteractionsContextType | null>(null);

export const PostInteractionsProvider: React.FC<{
  children: React.ReactNode;
  addLikedPost?: (post: CirclePost) => void;
}> = ({ children, addLikedPost }) => {
  const [postStats, setPostStats] = useState<Record<string, PostStats>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userAuraPoints, setUserAuraPoints] = useState<number>(0);
  const [auraBreakdown, setAuraBreakdown] = useState<AuraBreakdown | null>(null);
  const [repostStatus, setRepostStatus] = useState<Record<string, boolean>>({});
  const [userReposts, setUserReposts] = useState<any[]>([]);

  const [loadingStates, setLoadingStates] = useState<
    Record<string, Set<string>>
  >({
    like: new Set(),
    vote: new Set(),
    comment: new Set(),
    share: new Set(),
    repost: new Set(),
  });

  // Ref-based guard to prevent rapid vote double-taps (immune to React state batching)
  const voteInProgressRef = useRef<Set<string>>(new Set());
  const loadingPostsRef = useRef<Set<string>>(new Set());
  const lastLoadedPostsRef = useRef<string>('');
  const interactionCacheRef = useRef<{
    likes: Record<string, boolean>;
    votes: Record<string, 'upvote' | 'downvote' | null>;
    reposts: Record<string, boolean>;
  }>({
    likes: {},
    votes: {},
    reposts: {},
  });

  const isLoading = useCallback((postId: string, action: keyof typeof loadingStates): boolean => {
    return loadingStates[action]?.has(postId) ?? false;
  }, [loadingStates]);

  const updateLoadingState = useCallback((
    postId: string,
    action: keyof typeof loadingStates,
    loading: boolean
  ) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      if (!newStates[action]) newStates[action] = new Set();

      const newSet = new Set(newStates[action]);
      if (loading) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      newStates[action] = newSet;
      return newStates;
    });
  }, []);

  useEffect(() => {
    loadCurrentUser();
    loadUserReposts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time subscription for vote updates
  // Using refs to avoid re-subscription on every state change
  const postStatsRef = useRef(postStats);
  const isLoadingRef = useRef(isLoading);

  // Keep refs updated
  useEffect(() => {
    postStatsRef.current = postStats;
  }, [postStats]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const channel = supabase
      .channel('post_votes_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_posts',
          filter: 'upvotes_count,downvotes_count,net_votes'
        },
        (payload: any) => {
          if (payload.new && payload.new.id) {
            const postId = payload.new.id;
            const newUpvotes = payload.new.upvotes_count || 0;
            const newDownvotes = payload.new.downvotes_count || 0;
            const newNetVotes = payload.new.net_votes || 0;

            // Only update if we're tracking this post and not currently voting on it
            if (postStatsRef.current[postId] && !isLoadingRef.current(postId, 'vote')) {
              setPostStats(prev => ({
                ...prev,
                [postId]: {
                  ...prev[postId],
                  upvotesCount: newUpvotes,
                  downvotesCount: newDownvotes,
                  netVotes: Math.max(newNetVotes, 0),
                  lastUpdated: Date.now(),
                }
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Only subscribe once on mount, use refs for latest values
  }, []);

  const loadCurrentUser = async () => {
    try {
      // First check if there's an active session
      const { session } = await getCachedSession();
      if (!session) {
        // No session - user is logged out, this is expected
        setCurrentUser(null);
        setUserAuraPoints(0);
        return;
      }

      const user = await getCurrentUser();
      setCurrentUser(user);
      setUserAuraPoints(user?.aura_points || 0);
    } catch (error: any) {
      // Check if this is an auth error (user doesn't exist or session missing)
      if (error?.message?.includes('User from sub claim in JWT does not exist') ||
        error?.message?.includes('Auth session missing') ||
        error?.name === 'AuthApiError' ||
        error?.name === 'AuthSessionMissingError') {
        // User not authenticated - this is expected when logged out
        setCurrentUser(null);
        setUserAuraPoints(0);
        return;
      }
      console.error('PostInteractionsContext: Error loading current user:', error);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadUserReposts = async () => {
    if (!currentUser?.id) return;

    try {
      const reposts = await getUserReposts(currentUser.id);
      setUserReposts(reposts);

      const status: Record<string, boolean> = {};
      reposts.forEach((repost: any) => {
        if (repost.post?.id) {
          status[repost.post.id] = true;
        }
      });
      setRepostStatus(prev => ({ ...prev, ...status }));
    } catch (error) {
      console.error('Error loading user reposts:', error);
    }
  };

  const refreshUserAuraPoints = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // FIXED: Just READ aura from database instead of calling RPC that recalculates
      // The RPC 'update_user_aura_points' was overwriting manual aura changes
      // Aura updates now happen through Edge Functions when votes occur
      const { data: userData, error: auraError } = await supabase
        .from('users')
        .select('aura_points')
        .eq('id', currentUser.id)
        .single();

      if (auraError) {
        console.error('Error refreshing aura points:', auraError);
        return;
      }

      const newAuraPoints = userData?.aura_points ?? 250;
      setUserAuraPoints(newAuraPoints);

      setCurrentUser(prev => prev ? { ...prev, aura_points: newAuraPoints } : prev);

      const { data: postsData, error: postsError } = await supabase
        .from('circle_posts')
        .select('upvotes_count, downvotes_count, net_votes')
        .eq('user_id', currentUser.id);

      if (!postsError && postsData) {

        const totalUpvotes = postsData.reduce((sum, post) => sum + (post.upvotes_count || 0), 0);
        const totalDownvotes = postsData.reduce((sum, post) => sum + (post.downvotes_count || 0), 0);
        const netVotes = postsData.reduce((sum, post) => sum + (post.net_votes || 0), 0);

        const breakdown: AuraBreakdown = {
          total_upvotes: totalUpvotes,
          total_downvotes: totalDownvotes,
          net_votes: netVotes,
          aura_points: newAuraPoints,
        };
        setAuraBreakdown(breakdown);
        console.log(`Aura breakdown updated:`, breakdown);
      }

      console.log(`User aura points updated: ${newAuraPoints}`);
    } catch (error) {
      console.error('Error refreshing aura points:', error);
    }
  }, [currentUser?.id]);

  const getUserAuraBreakdown = useCallback(async () => {
    if (!currentUser?.id) return null;

    if (auraBreakdown) {
      console.log('Returning cached aura breakdown:', auraBreakdown);
      return auraBreakdown;
    }

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('circle_posts')
        .select('upvotes_count, downvotes_count, net_votes')
        .eq('user_id', currentUser.id);

      if (!postsError && postsData) {

        const totalUpvotes = postsData.reduce((sum, post) => sum + (post.upvotes_count || 0), 0);
        const totalDownvotes = postsData.reduce((sum, post) => sum + (post.downvotes_count || 0), 0);
        const netVotes = postsData.reduce((sum, post) => sum + (post.net_votes || 0), 0);

        const breakdown: AuraBreakdown = {
          total_upvotes: totalUpvotes,
          total_downvotes: totalDownvotes,
          net_votes: netVotes,
          aura_points: userAuraPoints,
        };
        setAuraBreakdown(breakdown);
        console.log('Fresh aura breakdown fetched:', breakdown);
        return breakdown;
      }

      return null;
    } catch (error) {
      console.error('Error getting aura breakdown:', error);
      return null;
    }
  }, [currentUser?.id, auraBreakdown, userAuraPoints]);

  const loadPostsInteractions = useCallback(
    async (posts: CirclePost[]) => {
      if (!currentUser?.id || posts.length === 0) return;

      const postIds = posts.map(p => p.id).sort().join(',');
      if (lastLoadedPostsRef.current === postIds) return;

      lastLoadedPostsRef.current = postIds;

      let postsToLoad: CirclePost[] = [];

      try {
        const validPosts = posts.filter(post =>
          post?.id &&
          !loadingPostsRef.current.has(post.id) &&
          !isLoadingRef.current(post.id, 'like') &&
          !isLoadingRef.current(post.id, 'vote')
        );

        if (validPosts.length === 0) return;

        const currentTime = Date.now();
        const currentPostStats = postStatsRef.current;
        postsToLoad = validPosts.filter(post => {
          const existingStat = currentPostStats[post.id];
          return !existingStat?.lastUpdated ||
            currentTime - existingStat.lastUpdated > 5000;
        });

        if (postsToLoad.length === 0) return;

        postsToLoad.forEach(post => loadingPostsRef.current.add(post.id));

        const newPostStats: Record<string, PostStats> = {};

        const commentCounts = await Promise.allSettled(
          postsToLoad.map(post => getActualCommentCount(post.id))
        );

        // Fetch fresh vote counts from database for ALL posts being loaded
        const postIdsToLoad = postsToLoad.map(p => p.id);
        const freshVoteCounts = await getPostsVoteStatus(postIdsToLoad, currentUser.id);

        postsToLoad.forEach((post, index) => {
          const commentCount = commentCounts[index].status === 'fulfilled'
            ? commentCounts[index].value as number
            : post.comments_count || 0;

          // Use fresh counts from database if available, otherwise use post data
          const freshData = freshVoteCounts[post.id];

          newPostStats[post.id] = {
            likesCount: post.likes_count || 0,
            commentsCount: commentCount,
            sharesCount: post.shares_count || 0,
            isLiked: interactionCacheRef.current.likes[post.id] ?? false,
            upvotesCount: freshData?.upvotes ?? post.upvotes_count ?? 0,
            downvotesCount: freshData?.downvotes ?? post.downvotes_count ?? 0,
            netVotes: freshData?.net_votes ?? post.net_votes ?? 0,
            userVoteType: (freshData?.vote_type as 'upvote' | 'downvote' | null) ?? interactionCacheRef.current.votes[post.id] ?? null,
            lastUpdated: currentTime,
          };

          // Update cache with fresh data
          if (freshData) {
            interactionCacheRef.current.votes[post.id] = freshData.vote_type as 'upvote' | 'downvote' | null;
          }
        });

        const uncachedLikeIds = postsToLoad
          .map(post => post.id)
          .filter(id => interactionCacheRef.current.likes[id] === undefined);

        if (uncachedLikeIds.length > 0) {
          try {
            const likedPostIds = await getPostsLikes(uncachedLikeIds, currentUser.id);
            uncachedLikeIds.forEach(postId => {
              const isLiked = likedPostIds.has(postId);
              interactionCacheRef.current.likes[postId] = isLiked;
              if (newPostStats[postId]) {
                newPostStats[postId].isLiked = isLiked;
              }
            });
          } catch (error) {
            console.error('Error loading like statuses:', error);
          }
        }

        // Vote data already fetched above with freshVoteCounts

        const uncachedRepostIds = postsToLoad
          .map(post => post.id)
          .filter(id => interactionCacheRef.current.reposts[id] === undefined);

        if (uncachedRepostIds.length > 0) {
          try {
            const repostStatuses = await bulkCheckRepostStatus(uncachedRepostIds, currentUser.id);
            Object.entries(repostStatuses).forEach(([postId, isReposted]) => {
              interactionCacheRef.current.reposts[postId] = isReposted;
              setRepostStatus(prev => ({ ...prev, [postId]: isReposted }));
            });
          } catch (error) {
            console.error('Error loading repost statuses:', error);
          }
        }

        setPostStats(prev => ({ ...prev, ...newPostStats }));
        console.log(`PostInteractionsContext: Loaded stats for ${postsToLoad.length} posts`);

      } catch (error) {
        console.error('Error loading posts interactions:', error);
      } finally {
        postsToLoad.forEach(post => loadingPostsRef.current.delete(post.id));
      }
    },
    [currentUser?.id]
  );

  const updatePostStats = useCallback((postId: string, stats: Partial<PostStats>) => {
    setPostStats(prev => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          isLiked: false,
          upvotesCount: 0,
          downvotesCount: 0,
          netVotes: 0,
          userVoteType: null,
          lastUpdated: Date.now(),
        }),
        ...stats,
        lastUpdated: Date.now(),
      },
    }));
  }, []);

  const syncLikeStatus = useCallback((
    postId: string,
    isLiked: boolean,
    likesCount?: number
  ) => {
    interactionCacheRef.current.likes[postId] = isLiked;

    setPostStats(prev => {
      const currentStats = prev[postId] || {
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        upvotesCount: 0,
        downvotesCount: 0,
        netVotes: 0,
        userVoteType: null,
        lastUpdated: Date.now(),
      };

      const newLikesCount = likesCount !== undefined
        ? likesCount
        : isLiked
          ? currentStats.likesCount + 1
          : Math.max(currentStats.likesCount - 1, 0);

      return {
        ...prev,
        [postId]: {
          ...currentStats,
          isLiked,
          likesCount: newLikesCount,
          lastUpdated: Date.now(),
        },
      };
    });
  }, []);

  const syncVoteStatus = useCallback((
    postId: string,
    voteType: 'upvote' | 'downvote' | null,
    counts?: { upvotes: number; downvotes: number; netVotes: number }
  ) => {

    interactionCacheRef.current.votes[postId] = voteType;

    setPostStats(prev => {
      const currentStats = prev[postId] || {
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        upvotesCount: 0,
        downvotesCount: 0,
        netVotes: 0,
        userVoteType: null,
        lastUpdated: Date.now(),
      };

      const newUpvotes = counts?.upvotes !== undefined ? counts.upvotes : currentStats.upvotesCount;
      const newDownvotes = counts?.downvotes !== undefined ? counts.downvotes : currentStats.downvotesCount;
      const newNetVotes = counts?.netVotes !== undefined ? counts.netVotes : Math.max(newUpvotes - newDownvotes, 0);

      const newState = {
        ...prev,
        [postId]: {
          ...currentStats,
          userVoteType: voteType,
          upvotesCount: newUpvotes,
          downvotesCount: newDownvotes,
          netVotes: Math.max(newNetVotes, 0),
          lastUpdated: Date.now(),
        },
      };

      // Sync ref immediately so next vote reads fresh counts (avoids stale closure issues)
      postStatsRef.current = newState;
      return newState;
    });

    refreshUserAuraPoints().catch(err =>
      console.warn('Failed to refresh aura points after vote:', err)
    );
  }, [refreshUserAuraPoints]);

  const syncShareCount = useCallback((postId: string, newCount: number) => {
    updatePostStats(postId, { sharesCount: newCount });
  }, [updatePostStats]);

  const getPostLikeStatus = useCallback((postId: string): boolean => {
    return postStats[postId]?.isLiked ?? interactionCacheRef.current.likes[postId] ?? false;
  }, [postStats]);

  const getPostVoteStatus = useCallback((postId: string): 'upvote' | 'downvote' | null => {
    return postStats[postId]?.userVoteType ?? interactionCacheRef.current.votes[postId] ?? null;
  }, [postStats]);

  const likePost = useCallback(async (postId: string, post?: CirclePost) => {
    if (!currentUser || isLoading(postId, 'like')) return;

    updateLoadingState(postId, 'like', true);

    const wasLiked = getPostLikeStatus(postId);
    const newLikedState = !wasLiked;

    syncLikeStatus(postId, newLikedState);

    try {
      const result = await togglePostLike(postId, currentUser.id);

      if (result && typeof result.liked === 'boolean') {
        syncLikeStatus(postId, result.liked, result.likes_count);

        if (result.liked && post && addLikedPost) {
          addLikedPost(post);
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      syncLikeStatus(postId, wasLiked);
    } finally {
      updateLoadingState(postId, 'like', false);
    }
  }, [currentUser, isLoading, getPostLikeStatus, syncLikeStatus, updateLoadingState, addLikedPost]);

  const upvotePost = useCallback(async (postId: string, post?: CirclePost, sourceCircleId?: string | null) => {
    if (!currentUser) return;

    // Ref-based guard: immune to React state batching — prevents rapid tap race conditions
    if (voteInProgressRef.current.has(postId)) {
      console.log('Vote already in progress, ignoring tap');
      return;
    }
    voteInProgressRef.current.add(postId);
    updateLoadingState(postId, 'vote', true);

    // Read vote status from cache ref (synchronous, never stale)
    const currentVote = interactionCacheRef.current.votes[postId] ?? null;
    const currentStats = postStatsRef.current[postId] || postStats[postId];

    const baseUpvotes = currentStats?.upvotesCount ?? post?.upvotes_count ?? 0;
    const baseDownvotes = currentStats?.downvotesCount ?? post?.downvotes_count ?? 0;

    let newUpvotes = baseUpvotes;
    let newDownvotes = baseDownvotes;
    let newVoteType: 'upvote' | 'downvote' | null = null;

    if (currentVote === 'upvote') {
      newUpvotes = Math.max(baseUpvotes - 1, 0);
      newVoteType = null;
    } else if (currentVote === 'downvote') {
      newDownvotes = Math.max(baseDownvotes - 1, 0);
      newUpvotes = baseUpvotes + 1;
      newVoteType = 'upvote';
    } else {
      newUpvotes = baseUpvotes + 1;
      newVoteType = 'upvote';
    }

    const newNetVotes = Math.max(newUpvotes - newDownvotes, 0);

    // Optimistic UI update — always show the vote change to the user
    syncVoteStatus(postId, newVoteType, {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      netVotes: newNetVotes
    });

    try {
      const result = await togglePostVote(postId, currentUser.id, 'upvote', sourceCircleId);

      if (result.success) {
        syncVoteStatus(postId, result.user_vote_type as 'upvote' | 'downvote' | null, {
          upvotes: result.upvotes_count,
          downvotes: result.downvotes_count,
          netVotes: Math.max(result.net_votes, 0)
        });
      } else {
        syncVoteStatus(postId, currentVote, {
          upvotes: currentStats?.upvotesCount || post?.upvotes_count || 0,
          downvotes: currentStats?.downvotesCount || post?.downvotes_count || 0,
          netVotes: Math.max((currentStats?.netVotes || post?.net_votes || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error upvoting post:', error);
      syncVoteStatus(postId, currentVote, {
        upvotes: currentStats?.upvotesCount || post?.upvotes_count || 0,
        downvotes: currentStats?.downvotesCount || post?.downvotes_count || 0,
        netVotes: Math.max((currentStats?.netVotes || post?.net_votes || 0), 0)
      });
    } finally {
      voteInProgressRef.current.delete(postId);
      updateLoadingState(postId, 'vote', false);
    }
  }, [currentUser, postStats, syncVoteStatus, updateLoadingState]);

  const downvotePost = useCallback(async (postId: string, post?: CirclePost, sourceCircleId?: string | null) => {
    if (!currentUser) return;

    // Ref-based guard: immune to React state batching — prevents rapid tap race conditions
    if (voteInProgressRef.current.has(postId)) {
      console.log('Vote already in progress, ignoring tap');
      return;
    }
    voteInProgressRef.current.add(postId);
    updateLoadingState(postId, 'vote', true);

    // Read vote status from cache ref (synchronous, never stale)
    const currentVote = interactionCacheRef.current.votes[postId] ?? null;
    const currentStats = postStatsRef.current[postId] || postStats[postId];

    const baseUpvotes = currentStats?.upvotesCount ?? post?.upvotes_count ?? 0;
    const baseDownvotes = currentStats?.downvotesCount ?? post?.downvotes_count ?? 0;

    let newUpvotes = baseUpvotes;
    let newDownvotes = baseDownvotes;
    let newVoteType: 'upvote' | 'downvote' | null = null;

    if (currentVote === 'downvote') {
      newDownvotes = Math.max(baseDownvotes - 1, 0);
      newVoteType = null;
    } else if (currentVote === 'upvote') {
      newUpvotes = Math.max(baseUpvotes - 1, 0);
      newDownvotes = baseDownvotes + 1;
      newVoteType = 'downvote';
    } else {
      newDownvotes = baseDownvotes + 1;
      newVoteType = 'downvote';
    }

    const newNetVotes = Math.max(newUpvotes - newDownvotes, 0);

    // Optimistic UI update — always show the vote change to the user
    syncVoteStatus(postId, newVoteType, {
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      netVotes: newNetVotes
    });

    try {
      const result = await togglePostVote(postId, currentUser.id, 'downvote', sourceCircleId);

      if (result.success) {
        syncVoteStatus(postId, result.user_vote_type as 'upvote' | 'downvote' | null, {
          upvotes: result.upvotes_count,
          downvotes: result.downvotes_count,
          netVotes: Math.max(result.net_votes, 0)
        });
      } else {
        syncVoteStatus(postId, currentVote, {
          upvotes: currentStats?.upvotesCount || post?.upvotes_count || 0,
          downvotes: currentStats?.downvotesCount || post?.downvotes_count || 0,
          netVotes: Math.max((currentStats?.netVotes || post?.net_votes || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error downvoting post:', error);
      syncVoteStatus(postId, currentVote, {
        upvotes: currentStats?.upvotesCount || post?.upvotes_count || 0,
        downvotes: currentStats?.downvotesCount || post?.downvotes_count || 0,
        netVotes: Math.max((currentStats?.netVotes || post?.net_votes || 0), 0)
      });
    } finally {
      voteInProgressRef.current.delete(postId);
      updateLoadingState(postId, 'vote', false);
    }
  }, [currentUser, postStats, syncVoteStatus, updateLoadingState]);

  const repostPost = useCallback(async (
    post: CirclePost,
    user: User,
    type: 'simple' | 'quote' = 'simple',
    comment?: string
  ) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to repost posts.');
      return;
    }

    updateLoadingState(post.id, 'repost', true);

    try {
      const result = await repostToProfile(post, currentUser, type, comment);

      if (result.success) {

        setRepostStatus(prev => ({ ...prev, [post.id]: true }));
        interactionCacheRef.current.reposts[post.id] = true;

        const currentSharesCount = postStats[post.id]?.sharesCount || post.shares_count || 0;
        updatePostStats(post.id, {
          sharesCount: currentSharesCount + 1
        });

        await loadUserReposts();

        console.log(`Post ${post.id} reposted successfully`);
      } else {
        if (!result.error?.includes('already reposted')) {
          Alert.alert('Error', result.error || 'Failed to repost');
        }
      }
    } catch (error) {
      console.error('Error reposting:', error);
      Alert.alert('Error', 'Failed to repost post');
    } finally {
      updateLoadingState(post.id, 'repost', false);
    }
  }, [currentUser, postStats, updatePostStats, updateLoadingState, loadUserReposts]);

  const unrepostPost = useCallback(async (postId: string) => {
    if (!currentUser) return;

    updateLoadingState(postId, 'repost', true);

    try {
      const result = await removeRepost(postId, currentUser.id);

      if (result.success) {

        setRepostStatus(prev => ({ ...prev, [postId]: false }));
        interactionCacheRef.current.reposts[postId] = false;

        const currentSharesCount = postStats[postId]?.sharesCount || 1;
        updatePostStats(postId, {
          sharesCount: Math.max(currentSharesCount - 1, 0)
        });

        await loadUserReposts();

        console.log(`Post ${postId} unreposted successfully`);
      } else {
        Alert.alert('Error', result.error || 'Failed to remove repost');
      }
    } catch (error) {
      console.error('Error removing repost:', error);
      Alert.alert('Error', 'Failed to remove repost');
    } finally {
      updateLoadingState(postId, 'repost', false);
    }
  }, [currentUser, postStats, updatePostStats, updateLoadingState, loadUserReposts]);

  const checkIsReposted = useCallback((postId: string): boolean => {
    return repostStatus[postId] || interactionCacheRef.current.reposts[postId] || false;
  }, [repostStatus]);

  const deletePost = useCallback(async (postId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data: post, error: fetchError } = await supabase
        .from('circle_posts')
        .select('user_id, media_urls, content_type')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        return { success: false, error: 'Post not found' };
      }

      if (post.user_id !== currentUser.id) {
        return { success: false, error: 'You can only delete your own posts' };
      }

      console.log('Deleting post:', postId);

      if (post.media_urls) {
        // Media cleanup: files in Supabase Storage can be cleaned up separately if needed
        console.log('Post has media_urls, skipping CDN cleanup (Bunny CDN removed)');
      }

      try {
        const { error: repostsError } = await supabase
          .from('user_reposts')
          .delete()
          .eq('post_id', postId);

        if (repostsError && repostsError.code !== 'PGRST205') {
          console.warn('Error deleting reposts:', repostsError);
        }
      } catch {
        // user_reposts table may not exist
      }

      const { error: likesError } = await supabase
        .from('user_liked_posts')
        .delete()
        .eq('post_id', postId);

      if (likesError) {
        console.warn('Error deleting likes:', likesError);
      }

      const { error: votesError } = await supabase
        .from('post_votes')
        .delete()
        .eq('post_id', postId);

      if (votesError) {
        console.warn('Error deleting votes:', votesError);
      }

      const { error: commentsError } = await supabase
        .from('post_comments')
        .delete()
        .eq('post_id', postId);

      if (commentsError) {
        console.warn('Error deleting comments:', commentsError);
      }

      const { error: deleteError } = await supabase
        .from('circle_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        console.error('Error deleting post:', deleteError);
        return { success: false, error: 'Failed to delete post' };
      }

      setPostStats(prev => {
        const newStats = { ...prev };
        delete newStats[postId];
        return newStats;
      });

      setRepostStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[postId];
        return newStatus;
      });

      console.log('Post deleted successfully:', postId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [currentUser]);

  const sharePost = useCallback(async (post: CirclePost, postUser: User) => {
    if (!currentUser || isLoading(post.id, 'share')) return;

    updateLoadingState(post.id, 'share', true);

    try {
      const result = await dynamicSharePost(
        post,
        postUser,
        currentUser,
        syncShareCount
      );

      if (result.success) {
        console.log(`Post ${post.id} shared successfully. New count: ${result.newSharesCount}`);
      } else {
        console.error('Share failed:', result.error);
        if (result.error !== 'Share cancelled') {
          Alert.alert('Share Failed', result.error || 'Unable to share at the moment');
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Unable to share at the moment');
    } finally {
      updateLoadingState(post.id, 'share', false);
    }
  }, [currentUser, isLoading, syncShareCount, updateLoadingState]);

  const syncPostCommentCount = useCallback(async (postId: string): Promise<number> => {
    try {
      const actualCount = await getActualCommentCount(postId);
      updatePostStats(postId, { commentsCount: actualCount });
      return actualCount;
    } catch (error) {
      console.error('Error syncing comment count:', error);
      return postStats[postId]?.commentsCount || 0;
    }
  }, [postStats, updatePostStats]);

  const refreshPostCommentCount = useCallback(async (postId: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const actualCount = await getActualCommentCount(postId);
      updatePostStats(postId, { commentsCount: actualCount });
    } catch (error) {
      console.error('Error refreshing comment count:', error);
    }
  }, [updatePostStats]);

  const addComment = useCallback(async (commentData: CommentData): Promise<{
    success: boolean;
    commentId?: string;
    error?: string
  }> => {
    if (!commentData.postId) {
      return { success: false, error: 'Post ID is required' };
    }

    // Removed AURA CHECK

    if (isLoading(commentData.postId, 'comment')) {
      return { success: false, error: 'Already posting comment for this post' };
    }

    updateLoadingState(commentData.postId, 'comment', true);

    try {
      const commentId = await createComment(commentData);

      if (commentId) {
        const currentStats = postStats[commentData.postId];
        if (currentStats) {
          updatePostStats(commentData.postId, {
            commentsCount: currentStats.commentsCount + 1,
          });
        }

        setTimeout(() => {
          refreshPostCommentCount(commentData.postId);
        }, 200);

        return { success: true, commentId };
      } else {
        return { success: false, error: 'Failed to create comment' };
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment'
      };
    } finally {
      updateLoadingState(commentData.postId, 'comment', false);
    }
  }, [isLoading, postStats, updatePostStats, refreshPostCommentCount, updateLoadingState, userAuraPoints]);

  const contextValue: PostInteractionsContextType = useMemo(() => ({
    postStats,
    currentUser,
    userAuraPoints,
    auraBreakdown,
    likePost,
    sharePost,
    upvotePost,
    downvotePost,
    deletePost,
    repostPost,
    unrepostPost,
    checkIsReposted,
    repostStatus,
    userReposts,
    updatePostStats,
    loadPostsInteractions,
    syncLikeStatus,
    getPostLikeStatus,
    syncVoteStatus,
    syncShareCount,
    getPostVoteStatus,
    addComment,
    syncPostCommentCount,
    refreshPostCommentCount,
    refreshUserAuraPoints,
    getUserAuraBreakdown,
    isLoading,
  }), [
    postStats,
    currentUser,
    userAuraPoints,
    auraBreakdown,
    likePost,
    sharePost,
    upvotePost,
    downvotePost,
    deletePost,
    repostPost,
    unrepostPost,
    checkIsReposted,
    repostStatus,
    userReposts,
    updatePostStats,
    loadPostsInteractions,
    syncLikeStatus,
    getPostLikeStatus,
    syncVoteStatus,
    syncShareCount,
    getPostVoteStatus,
    addComment,
    syncPostCommentCount,
    refreshPostCommentCount,
    refreshUserAuraPoints,
    getUserAuraBreakdown,
    isLoading,
  ]);

  return (
    <PostInteractionsContext.Provider value={contextValue}>
      {children}
    </PostInteractionsContext.Provider>
  );
};

export const usePostInteractions = () => {
  const context = useContext(PostInteractionsContext);
  if (!context) {
    throw new Error('usePostInteractions must be used within a PostInteractionsProvider');
  }
  return context;
};