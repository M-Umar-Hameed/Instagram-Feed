
import { supabase, getCachedUser } from './supabase';
import { anonymousUserManager } from './anonymousUtils';
import { RealtimeChannel } from '@supabase/supabase-js';
// notificationService removed
const notificationService: Record<string, (...args: any[]) => Promise<void>> = {
  sendCommentNotification: async () => {},
  createCommentNotification: async () => {},
};
// Removed auraService

// Comment cache for fast loading
interface CommentCache {
  comments: Comment[];
  timestamp: number;
  postId: string;
}

const commentCache: Map<string, CommentCache> = new Map();
const COMMENT_CACHE_DURATION = 30 * 1000; // 30 seconds cache

// Debounce tracking for vote actions
const voteDebounceMap: Map<string, boolean> = new Map();
const VOTE_DEBOUNCE_TIME = 500; // 500ms debounce
// ... (rest of file) ...

export const toggleCommentVote = async (
  commentId: string,
  userId: string,
  voteType: 'upvote' | 'downvote'
): Promise<{
  success: boolean;
  upvotesCount: number;
  downvotesCount: number;
  netVotes: number;
  userVoteType: 'upvote' | 'downvote' | null;
  message?: string;
}> => {
  if (!userId) {
    return {
      success: false,
      upvotesCount: 0,
      downvotesCount: 0,
      netVotes: 0,
      userVoteType: null,
      message: 'User authentication required',
    };
  }

  // Debounce check - prevent rapid taps
  const debounceKey = `${commentId}-${userId}`;
  if (voteDebounceMap.get(debounceKey)) {
    console.log('[toggleCommentVote] Debounced - vote in progress');
    return {
      success: false,
      upvotesCount: 0,
      downvotesCount: 0,
      netVotes: 0,
      userVoteType: null,
      message: 'Vote already in progress',
    };
  }

  // Set debounce flag
  voteDebounceMap.set(debounceKey, true);
  setTimeout(() => voteDebounceMap.delete(debounceKey), VOTE_DEBOUNCE_TIME);

  try {
    console.log(`[toggleCommentVote] ${voteType} for comment ${commentId}`);

    // Check existing vote to determine action
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('comment_votes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', voteCheckError);
      throw voteCheckError;
    }

    let action: 'upvote' | 'downvote' | 'remove' = voteType;
    let expectedUserVoteType: 'upvote' | 'downvote' | null = voteType;

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Tapping same vote type = remove
        action = 'remove';
        expectedUserVoteType = null;
      } else {
        // Tapping different vote type = update (switch)
        action = voteType;
        expectedUserVoteType = voteType;
      }
    }

    console.log(`[toggleCommentVote] Determined action: ${action}`);

    // Removed Aura calculation
    const result = { success: true, message: 'Vote recorded', comment_stats: { upvotes: 0, downvotes: 0, net_votes: 0 } };

    console.log('[toggleCommentVote] Mock success:', result.message);
    const stats = result.comment_stats;
    return {
      success: true,
      upvotesCount: stats.upvotes,
      downvotesCount: stats.downvotes,
      netVotes: stats.net_votes,
      userVoteType: expectedUserVoteType,
      message: result.message
    };

  } catch (error) {
    console.error('toggleCommentVote error:', error);

    // Fallback? No, if edge function fails, we probably shouldn't fake it locally
    // but for UX maybe we should? For now, fail gracefully.
    return {
      success: false,
      upvotesCount: 0,
      downvotesCount: 0,
      netVotes: 0,
      userVoteType: null,
      message: 'Failed to process vote',
    };
  }
};
// Debounce tracking for like actions
const likeDebounceMap: Map<string, boolean> = new Map();
const LIKE_DEBOUNCE_TIME = 500; // 500ms debounce

// Real-time subscription channels per post
const postSubscriptions: Map<string, RealtimeChannel> = new Map();
const commentUpdateListeners: Map<string, ((comments: Comment[]) => void)[]> = new Map();

// Track comment_id to post_id mapping for vote updates
const commentToPostMap: Map<string, string> = new Map();

// Debounce refresh to prevent multiple rapid updates
const refreshDebounceMap: Map<string, ReturnType<typeof setTimeout>> = new Map();
const REFRESH_DEBOUNCE_TIME = 300; // 300ms debounce for refresh

// Helper to refresh comments for a post and notify listeners (debounced)
const refreshAndNotifyListeners = async (postId: string) => {
  // Clear existing debounce timer
  const existingTimer = refreshDebounceMap.get(postId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new debounce timer
  const timer = setTimeout(async () => {
    refreshDebounceMap.delete(postId);

    const listeners = commentUpdateListeners.get(postId);
    if (listeners && listeners.length > 0) {
      // Invalidate cache first
      commentCache.delete(postId);

      const { user } = await getCachedUser();
      const freshComments = await fetchComments(postId, user?.id, true); // force refresh

      console.log(`[Real-time] Notifying ${listeners.length} listeners for post ${postId}`);
      listeners.forEach(listener => listener(freshComments));
    }
  }, REFRESH_DEBOUNCE_TIME);

  refreshDebounceMap.set(postId, timer);
};

// Subscribe to real-time comment updates for a specific post
export const subscribeToCommentUpdates = (
  postId: string,
  onUpdate: (comments: Comment[]) => void
): (() => void) => {
  console.log(`[subscribeToCommentUpdates] Subscribing to post ${postId}`);

  // Add listener
  if (!commentUpdateListeners.has(postId)) {
    commentUpdateListeners.set(postId, []);
  }
  commentUpdateListeners.get(postId)!.push(onUpdate);

  // Create subscription for this specific post if not exists
  if (!postSubscriptions.has(postId)) {
    const channelName = `comments_${postId}_${Date.now()}`;
    console.log(`[Real-time] Creating channel: ${channelName}`);

    // Single handler for all post_comments changes
    const handlePostCommentsChange = async (payload: any) => {
      console.log(`[Real-time] post_comments change:`, payload.eventType);
      if (payload.new?.id) {
        commentToPostMap.set(payload.new.id, postId);
      }
      // For DELETE, check if it's our post
      if (payload.eventType === 'DELETE' && payload.old?.post_id !== postId) {
        return;
      }
      await refreshAndNotifyListeners(postId);
    };

    // Single handler for all comment_votes changes
    const handleCommentVotesChange = async (payload: any) => {
      console.log(`[Real-time] comment_votes change:`, payload.eventType);
      const commentId = payload.new?.comment_id || payload.old?.comment_id;
      if (!commentId) return;

      let affectedPostId = commentToPostMap.get(commentId);
      if (!affectedPostId && commentId) {
        try {
          const { data: comment } = await supabase
            .from('post_comments')
            .select('post_id')
            .eq('id', commentId)
            .single();
          if (comment?.post_id) {
            affectedPostId = comment.post_id;
            commentToPostMap.set(commentId, comment.post_id);
          }
        } catch (e) {
          console.log('[Real-time] Could not fetch post_id for comment');
          return;
        }
      }

      if (affectedPostId === postId) {
        console.log(`[Real-time] Vote change affects our post ${postId}`);
        await refreshAndNotifyListeners(postId);
      }
    };

    const channel = supabase
      .channel(channelName)
      // Listen to post_comments changes for this post (all events)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`,
        },
        handlePostCommentsChange
      )
      // Listen to comment_votes changes (all events)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_votes',
        },
        handleCommentVotesChange
      )
      .subscribe((status, err) => {
        console.log(`[Real-time] Channel ${channelName} status:`, status);
        if (err) {
          console.error(`[Real-time] Subscription error:`, err);
        }
        if (status === 'SUBSCRIBED') {
          console.log(`[Real-time] ✅ Successfully subscribed to post ${postId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Real-time] ❌ Channel error for post ${postId}`);
          postSubscriptions.delete(postId);
        } else if (status === 'TIMED_OUT') {
          console.error(`[Real-time] ⏰ Subscription timed out for post ${postId}`);
          postSubscriptions.delete(postId);
        } else if (status === 'CLOSED') {
          console.log(`[Real-time] Channel closed for post ${postId}`);
          postSubscriptions.delete(postId);
        }
      });

    postSubscriptions.set(postId, channel);
  } else {
    console.log(`[Real-time] Reusing existing subscription for post ${postId}`);
  }

  // Return unsubscribe function
  return () => {
    console.log(`[subscribeToCommentUpdates] Unsubscribing from post ${postId}`);

    const listeners = commentUpdateListeners.get(postId);
    if (listeners) {
      const index = listeners.indexOf(onUpdate);
      if (index > -1) {
        listeners.splice(index, 1);
      }

      // If no more listeners for this post, remove subscription
      if (listeners.length === 0) {
        commentUpdateListeners.delete(postId);

        const channel = postSubscriptions.get(postId);
        if (channel) {
          supabase.removeChannel(channel);
          postSubscriptions.delete(postId);
          console.log(`[Real-time] ✅ Removed subscription for post ${postId}`);
        }
      }
    }
  };
};

// Invalidate cache for a post
export const invalidateCommentCache = (postId: string): void => {
  commentCache.delete(postId);
};

// Clear all comment caches
export const clearAllCommentCaches = (): void => {
  commentCache.clear();
};

export interface CommentData {
  postId: string;
  userId: string | null;
  content: string;
  parentCommentId?: string | null;
  isAnonymous?: boolean;
  anonymousUsername?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number | null;
  replies_count: number | null;
  parent_comment_id: string | null;
  is_anonymous: boolean | null;
  is_edited: boolean | null;
  anonymous_username: string | null;
  username?: string;
  profile_image?: string;
  is_liked?: boolean;
  upvotes_count?: number;
  downvotes_count?: number;
  net_votes?: number;
  user_vote_type?: 'upvote' | 'downvote' | null;
  replies?: Comment[];
  showReplies?: boolean;
  depth?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const createComment = async (commentData: CommentData): Promise<string | null> => {
  const { postId, userId, content, parentCommentId, isAnonymous, anonymousUsername } = commentData;

  try {
    console.log('Creating comment:', { postId, userId, isAnonymous, parentCommentId });

    const { data: comment, error: commentErr } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: isAnonymous ? null : userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
        is_anonymous: isAnonymous || false,
        anonymous_username: isAnonymous ? anonymousUsername : null,
        likes_count: 0,
        replies_count: 0,
      })
      .select('id')
      .single();

    if (commentErr || !comment) {
      console.error('Failed to create comment:', commentErr);
      throw commentErr || new Error('Comment creation failed');
    }

    try {
      await supabase.rpc('recalculate_post_comment_count', { target_post_id: postId });
    } catch (rpcError) {
      console.warn('RPC function not available, updating manually');

      const actualCount = await getActualCommentCount(postId);
      await supabase
        .from('circle_posts')
        .update({ comments_count: actualCount })
        .eq('id', postId);
    }

    // Create notification for post owner (if not commenting on own post and not anonymous)
    if (userId && !isAnonymous) {
      try {
        const { data: postData } = await supabase
          .from('circle_posts')
          .select('user_id, circle_ids')
          .eq('id', postId)
          .single();

        if (postData?.user_id && postData.user_id !== userId) {
          // Get commenter's name
          const { data: commenterData } = await supabase
            .from('users')
            .select('name, username')
            .eq('id', userId)
            .single();

          const commenterName = commenterData?.name || commenterData?.username || 'Someone';
          // circle_ids can be array or single value
          const circleId = postData.circle_ids
            ? (Array.isArray(postData.circle_ids) ? postData.circle_ids[0] : postData.circle_ids)
            : undefined;
          notificationService.createCommentNotification(
            postData.user_id,
            userId,
            commenterName,
            postId,
            content.trim(),
            circleId,
            comment.id
          ).catch(err => console.log('Comment notification error:', err));
        }
      } catch (notifError) {
        console.log('Error creating comment notification:', notifError);
      }
    }

    // Invalidate cache so next fetch gets fresh data
    invalidateCommentCache(postId);

    console.log('Comment created successfully:', comment.id);
    return comment.id;
  } catch (error) {
    console.error('createComment error:', error);
    throw new Error('Failed to create comment');
  }
};

export const fetchComments = async (postId: string, currentUserId?: string, forceRefresh: boolean = false): Promise<Comment[]> => {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = commentCache.get(postId);
      if (cached && (Date.now() - cached.timestamp) < COMMENT_CACHE_DURATION) {
        console.log(`[fetchComments] Using cached comments for post ${postId}`);
        return cached.comments;
      }
    }

    console.log(`[fetchComments] Fetching fresh comments for post ${postId}`);

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        likes_count,
        replies_count,
        parent_comment_id,
        is_anonymous,
        is_edited,
        anonymous_username,
        created_at,
        updated_at,
        is_deleted,
        upvotes_count,
        downvotes_count,
        net_votes,
        users (
          id,
          username,
          name,
          email,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .neq('is_deleted', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    if (!comments || comments.length === 0) {
      console.log(`No comments found for post ${postId}`);
      return [];
    }

    // Populate comment to post mapping for real-time vote updates
    comments.forEach(c => {
      commentToPostMap.set(c.id, postId);
    });

    let userLikedComments = new Set<string>();
    let userVotes = new Map<string, 'upvote' | 'downvote'>();

    if (currentUserId) {
      const commentIds = comments.map(c => c.id);

      const { data: likedData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .in('comment_id', commentIds);

      userLikedComments = new Set(likedData?.map(l => l.comment_id) || []);

      const { data: voteData } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', currentUserId)
        .in('comment_id', commentIds);

      if (voteData) {
        voteData.forEach(vote => {
          userVotes.set(vote.comment_id, vote.vote_type as 'upvote' | 'downvote');
        });
      }
    }

    console.log(`fetchComments for post ${postId}: Found ${comments.length} comments from database`);

    comments.forEach(comment => {
      console.log(`Comment ${comment.id} raw vote data:`, {
        upvotes_count: comment.upvotes_count,
        downvotes_count: comment.downvotes_count,
        net_votes: comment.net_votes
      });
    });

    const transformedComments: Comment[] = comments.map(comment => {
      const user = Array.isArray(comment.users) ? comment.users[0] : comment.users;

      // Default avatar - consistent blue icon used across the app
      const DEFAULT_AVATAR = 'https://img.icons8.com/color/96/test-account.png';

      let displayName = 'Anonymous';
      let profileImage = DEFAULT_AVATAR;

      if (comment.is_anonymous) {
        displayName = comment.anonymous_username || 'Anonymous';
      } else if (user) {
        displayName = user.username || user.name || user.email?.split('@')[0] || 'Anonymous';
        // Use user's real avatar_url, fallback to default if not available
        profileImage = user.avatar_url || DEFAULT_AVATAR;
      }

      const canEdit = !!(currentUserId && comment.user_id === currentUserId && !comment.is_anonymous);
      const canDelete = !!(currentUserId && comment.user_id === currentUserId);

      let finalUpvotes = comment.upvotes_count || 0;
      let finalDownvotes = comment.downvotes_count || 0;
      let finalNetVotes = comment.net_votes || 0;

      if (finalNetVotes === 0 && userVotes.has(comment.id)) {
        console.log(`Comment ${comment.id} has vote but counts are 0, triggering recalculation`);

        recalculateCommentVoteCounts(comment.id);

        if (userVotes.get(comment.id) === 'upvote') {
          finalNetVotes = 1;
          finalUpvotes = 1;
        } else if (userVotes.get(comment.id) === 'downvote') {
          finalNetVotes = -1;
          finalDownvotes = 1;
        }
      }

      return {
        ...comment,
        username: displayName,
        profile_image: profileImage,
        is_liked: userLikedComments.has(comment.id),
        upvotes_count: finalUpvotes,
        downvotes_count: finalDownvotes,
        net_votes: finalNetVotes,
        user_vote_type: userVotes.get(comment.id) || null,
        replies: [],
        showReplies: true,
        depth: 0,
        canEdit,
        canDelete,
      };
    });

    const nestedComments = buildNestedCommentStructure(transformedComments);

    // Cache the results
    commentCache.set(postId, {
      comments: nestedComments,
      timestamp: Date.now(),
      postId,
    });

    console.log(`[fetchComments] Cached ${nestedComments.length} comments for post ${postId}`);
    return nestedComments;
  } catch (error) {
    console.error('fetchComments error:', error);
    return [];
  }
};

const buildNestedCommentStructure = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const topLevelComments: Comment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;

    if (comment.parent_comment_id) {

      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        commentWithReplies.depth = (parent.depth || 0) + 1;
        parent.replies?.push(commentWithReplies);
      } else {

        commentWithReplies.depth = 0;
        topLevelComments.push(commentWithReplies);
      }
    } else {

      commentWithReplies.depth = 0;
      topLevelComments.push(commentWithReplies);
    }
  });

  topLevelComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const sortReplies = (comment: Comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      comment.replies.forEach(sortReplies);
    }
  };

  topLevelComments.forEach(sortReplies);

  return topLevelComments;
};

export const toggleCommentLike = async (
  commentId: string,
  userId: string
): Promise<{ success: boolean; liked: boolean; likesCount: number }> => {
  // Debounce check - prevent rapid taps
  const debounceKey = `like-${commentId}-${userId}`;
  if (likeDebounceMap.get(debounceKey)) {
    console.log('[toggleCommentLike] Debounced - like in progress');
    return { success: false, liked: false, likesCount: 0 };
  }

  // Set debounce flag
  likeDebounceMap.set(debounceKey, true);
  setTimeout(() => likeDebounceMap.delete(debounceKey), LIKE_DEBOUNCE_TIME);

  try {
    console.log(`toggleCommentLike: ${commentId} by user ${userId}`);

    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking like status:', checkError);
      return { success: false, liked: false, likesCount: 0 };
    }

    const isCurrentlyLiked = !!existingLike;

    if (isCurrentlyLiked) {

      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error unliking comment:', deleteError);
        return { success: false, liked: true, likesCount: 0 };
      }
    } else {

      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId
        });

      if (insertError) {
        console.error('Error liking comment:', insertError);
        return { success: false, liked: false, likesCount: 0 };
      }
    }

    const { data: updatedComment, error: fetchError } = await supabase
      .from('post_comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated likes count:', fetchError);
      return { success: true, liked: !isCurrentlyLiked, likesCount: 0 };
    }

    const newLikesCount = updatedComment.likes_count || 0;
    const newLikedStatus = !isCurrentlyLiked;

    console.log(`toggleCommentLike success: liked=${newLikedStatus}, count=${newLikesCount}`);
    return { success: true, liked: newLikedStatus, likesCount: newLikesCount };

  } catch (error) {
    console.error('toggleCommentLike error:', error);
    return { success: false, liked: false, likesCount: 0 };
  }
};

export const likeComment = async (commentId: string, userId: string | null): Promise<boolean> => {
  if (!userId) {
    console.log('Anonymous users cannot like comments');
    return false;
  }

  const result = await toggleCommentLike(commentId, userId);
  return result.success;
};

export const deleteComment = async (
  commentId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log(`deleteComment: ${commentId} by user ${userId}`);

    const { error } = await supabase
      .from('post_comments')
      .update({
        is_deleted: true,
        content: '[deleted]',
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting comment:', error);
      return { success: false, message: 'Failed to delete comment' };
    }

    console.log(`deleteComment: Successfully deleted comment ${commentId}`);
    return { success: true };

  } catch (error) {
    console.error('deleteComment error:', error);
    return { success: false, message: 'Failed to delete comment' };
  }
};

export const generateAnonymousCommentData = async (
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<CommentData> => {
  const anonymousUser = await anonymousUserManager.getOrCreateAnonymousUser();

  return {
    postId,
    userId: null,
    content: content.trim(),
    parentCommentId: parentCommentId || null,
    isAnonymous: true,
    anonymousUsername: anonymousUser.username,
  };
};

export const validateCommentData = (commentData: Partial<CommentData>): string | null => {
  if (!commentData.postId) return 'Post ID is required';
  if (!commentData.content?.trim()) return 'Comment content cannot be empty';
  if (commentData.content.trim().length > 1000) return 'Comment is too long (max 1000 characters)';
  if (!commentData.isAnonymous && !commentData.userId) return 'User authentication required';
  return null;
};

export const getActualCommentCount = async (postId: string): Promise<number> => {
  try {
    // Skip ad posts (they don't have comments in database)
    if (postId.startsWith('ad_')) {
      return 0;
    }

    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .neq('is_deleted', true);

    if (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('getActualCommentCount error:', error);
    return 0;
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
  return `${Math.floor(diffInSeconds / 31536000)}y`;
};

export const getMaxCommentDepth = (): number => {
  return 5;
};

export const canUserDeleteComment = (comment: Comment, userId: string | null): boolean => {
  return !!(userId && comment.user_id === userId);
};

export const recalculateCommentVoteCounts = async (commentId: string): Promise<void> => {
  try {

    const { data: voteCounts, error: countError } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId);

    if (countError) {
      console.error('Error getting vote counts for recalculation:', countError);
      return;
    }

    const upvotesCount = voteCounts?.filter(v => v.vote_type === 'upvote').length || 0;
    const downvotesCount = voteCounts?.filter(v => v.vote_type === 'downvote').length || 0;
    const netVotes = upvotesCount - downvotesCount;

    console.log(`Recalculating vote counts for comment ${commentId}:`, {
      upvotesCount,
      downvotesCount,
      netVotes
    });

    const { error: updateError } = await supabase
      .from('post_comments')
      .update({
        upvotes_count: upvotesCount,
        downvotes_count: downvotesCount,
        net_votes: netVotes,
      })
      .eq('id', commentId);

    if (updateError) {
      console.error('Error updating comment vote counts during recalculation:', updateError);
    } else {
      console.log('Successfully recalculated and updated vote counts');
    }
  } catch (error) {
    console.error('recalculateCommentVoteCounts error:', error);
  }
};

