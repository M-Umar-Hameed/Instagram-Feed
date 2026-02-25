
import { supabase, getCachedUser } from './supabase';
import { Database } from '../database.types';
// notificationService removed
const notificationService: Record<string, (...args: any[]) => Promise<void>> = {
  sendLikeNotification: async () => {},
  sendFollowNotification: async () => {},
  createVoteNotification: async () => {},
  createCommentNotification: async () => {},
  createLikeNotification: async () => {},
};

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export interface CommentData {
  id: string;
  post_id: string;
  user_id: string | null;
  username: string;
  profile_image?: string;
  content: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at?: string;
  is_liked: boolean;
  is_edited: boolean;
  is_anonymous?: boolean;
  parent_comment_id?: string | null;
  replies?: CommentData[];
}

export const togglePostVote = async (
  postId: string,
  userId: string,
  voteType: 'upvote' | 'downvote',
  sourceCircleId?: string | null
): Promise<{
  success: boolean;
  upvotes_count: number;
  downvotes_count: number;
  net_votes: number;
  user_vote_type: string | null;
  message?: string;
}> => {
  try {
    console.log(`Toggling ${voteType} for post ${postId} by user ${userId}`);

    if (!postId || !userId || !voteType) {
      return {
        success: false,
        upvotes_count: 0,
        downvotes_count: 0,
        net_votes: 0,
        user_vote_type: null,
        message: 'Missing required parameters'
      };
    }

    const { data, error } = await supabase
      .rpc('update_post_votes', {
        p_post_id: postId,
        p_user_id: userId,
        p_vote_type: voteType
      });

    if (error) {
      console.error('Error updating post vote:', error);
      return {
        success: false,
        upvotes_count: 0,
        downvotes_count: 0,
        net_votes: 0,
        user_vote_type: null,
        message: 'Failed to update vote'
      };
    }

    const result = data?.[0];
    if (result) {

      // Calculate engagement aura for POST OWNER (not the voter!)
      // Get post owner ID first
      const { data: postData } = await supabase
        .from('circle_posts')
        .select('user_id, circle_ids')
        .eq('id', postId)
        .single();

      if (postData?.user_id) {
        // Call edge function to calculate engagement aura for post owner
        // This is fire-and-forget - don't block the UI
        supabase.functions.invoke('calculate-engagement-aura', {
          body: JSON.stringify({
            post_id: postId,
            voter_id: userId,
            vote_type: result.user_vote_type || voteType
          })
        }).then(res => {
          if (res.error) {
            console.warn('Aura calculation failed (non-blocking):', res.error);
          } else {
            console.log('Engagement aura calculated:', res.data);
          }
        }).catch(err => {
          console.warn('Failed to calculate engagement aura (non-blocking):', err);
        });

        // Create notification for post owner (if upvoting and not own post)
        if (voteType === 'upvote' && result.user_vote_type === 'upvote' && postData.user_id !== userId) {
          // Get voter's name
          const { data: voterData } = await supabase
            .from('users')
            .select('name, username')
            .eq('id', userId)
            .single();

          const voterName = voterData?.name || voterData?.username || 'Someone';
          // Use sourceCircleId if explicitly provided (null = world feed, string = circle)
          // Otherwise fall back to post's circle_ids
          const circleId = sourceCircleId !== undefined
            ? (sourceCircleId || undefined)
            : (postData.circle_ids
              ? (Array.isArray(postData.circle_ids) ? postData.circle_ids[0] : postData.circle_ids)
              : undefined);
          notificationService.createVoteNotification(
            postData.user_id,
            userId,
            voterName,
            postId,
            'upvote',
            circleId
          ).catch(err => console.log('Vote notification error:', err));
        }
      }

      console.log(`Vote updated successfully:`, result);

      return {
        success: true,
        upvotes_count: result.upvotes_count || 0,
        downvotes_count: result.downvotes_count || 0,
        net_votes: result.net_votes || 0,
        user_vote_type: result.user_vote_type || null
      };
    }

    return {
      success: false,
      upvotes_count: 0,
      downvotes_count: 0,
      net_votes: 0,
      user_vote_type: null,
      message: 'No data returned'
    };

  } catch (error) {
    console.error('Network error updating vote:', error);
    return {
      success: false,
      upvotes_count: 0,
      downvotes_count: 0,
      net_votes: 0,
      user_vote_type: null,
      message: 'Network error'
    };
  }
};

export const getPostsVoteStatus = async (
  postIds: string[],
  userId: string
): Promise<Record<string, { vote_type: string | null; upvotes: number; downvotes: number; net_votes: number; }>> => {
  try {
    if (!userId || !postIds || postIds.length === 0) {
      return {};
    }

    // Filter out ad post IDs (they start with "ad_") and ensure valid UUIDs
    const validPostIds = postIds.filter(id => id && typeof id === 'string' && !id.startsWith('ad_'));
    if (validPostIds.length === 0) {
      return {};
    }

    const { data: userVotes, error: votesError } = await supabase
      .from('post_votes')
      .select('post_id, vote_type')
      .eq('user_id', userId)
      .in('post_id', validPostIds);

    if (votesError) {
      console.error('Error fetching user votes:', votesError);
      return {};
    }

    const { data: postCounts, error: countsError } = await supabase
      .from('circle_posts')
      .select('id, upvotes_count, downvotes_count, net_votes')
      .in('id', validPostIds);

    if (countsError) {
      console.error('Error fetching post counts:', countsError);
      return {};
    }

    const result: Record<string, any> = {};

    postCounts?.forEach(post => {
      result[post.id] = {
        vote_type: null,
        upvotes: post.upvotes_count || 0,
        downvotes: post.downvotes_count || 0,
        net_votes: post.net_votes || 0
      };
    });

    userVotes?.forEach(vote => {
      if (result[vote.post_id]) {
        result[vote.post_id].vote_type = vote.vote_type;
      }
    });

    return result;

  } catch (error) {
    console.error('Error getting posts vote status:', error);
    return {};
  }
};

// DEPRECATED: This function used to call RPC that recalculated aura from votes
// Now just reads current aura from database. Aura updates happen via Edge Functions.
const updateUserAuraPoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('aura_points')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return data?.aura_points ?? 250;
  } catch (error) {
    console.error('Error fetching aura points:', error);
    return 250;
  }
};

export const getPostComments = async (postId: string, userId?: string): Promise<CommentData[]> => {
  try {
    if (!postId) {
      return [];
    }

    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        likes_count,
        replies_count,
        created_at,
        updated_at,
        is_edited,
        parent_comment_id,
        is_anonymous,
        anonymous_username,
        users (
          id,
          username,
          name,
          email
        )
      `)
      .eq('post_id', postId)
      .neq('is_deleted', true)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (commentsError) {
      return [];
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    let userLikedComments = new Set<string>();
    if (userId) {
      const commentIds = comments.map(c => c.id);
      const { data: likedData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', commentIds);

      userLikedComments = new Set(likedData?.map(l => l.comment_id) || []);
    }

    const transformedComments: CommentData[] = [];

    for (const comment of comments) {
      const user = Array.isArray(comment.users) ? comment.users[0] : comment.users;

      let displayName = 'Anonymous';
      let isAnonymous = comment.is_anonymous || false;

      if (isAnonymous) {
        displayName = comment.anonymous_username || 'Anonymous';
      } else if (user) {
        displayName = user.username || user.name || user.email?.split('@')[0] || 'Anonymous';
      }

      const replies = await getCommentReplies(comment.id, userId);

      const transformedComment: CommentData = {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        username: displayName,
        profile_image: undefined,
        is_anonymous: isAnonymous,
        content: comment.content,
        likes_count: comment.likes_count || 0,
        replies_count: comment.replies_count || 0,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_liked: userLikedComments.has(comment.id),
        is_edited: comment.is_edited || false,
        parent_comment_id: comment.parent_comment_id,
        replies: replies
      };

      transformedComments.push(transformedComment);
    }

    return transformedComments;

  } catch (error) {
    return [];
  }
};

export const getCommentReplies = async (parentCommentId: string, userId?: string): Promise<CommentData[]> => {
  try {
    const { data: replies, error: repliesError } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        likes_count,
        replies_count,
        created_at,
        updated_at,
        is_edited,
        parent_comment_id,
        is_anonymous,
        anonymous_username,
        users (
          id,
          username,
          name,
          email
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .neq('is_deleted', true)
      .order('created_at', { ascending: true });

    if (repliesError) {
      return [];
    }

    if (!replies || replies.length === 0) {
      return [];
    }

    let userLikedReplies = new Set<string>();
    if (userId) {
      const replyIds = replies.map(r => r.id);
      const { data: likedData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', replyIds);

      userLikedReplies = new Set(likedData?.map(l => l.comment_id) || []);
    }

    const transformedReplies: CommentData[] = replies.map((reply: any) => {
      const user = Array.isArray(reply.users) ? reply.users[0] : reply.users;

      let displayName = 'Anonymous';
      let isAnonymous = reply.is_anonymous || false;

      if (isAnonymous) {
        displayName = reply.anonymous_username || 'Anonymous';
      } else if (user) {
        displayName = user.username || user.name || user.email?.split('@')[0] || 'Anonymous';
      }

      return {
        id: reply.id,
        post_id: reply.post_id,
        user_id: reply.user_id,
        username: displayName,
        profile_image: undefined,
        is_anonymous: isAnonymous,
        content: reply.content,
        likes_count: reply.likes_count || 0,
        replies_count: reply.replies_count || 0,
        created_at: reply.created_at,
        updated_at: reply.updated_at,
        is_liked: userLikedReplies.has(reply.id),
        is_edited: reply.is_edited || false,
        parent_comment_id: reply.parent_comment_id,
        replies: []
      };
    });

    return transformedReplies;

  } catch (error) {
    return [];
  }
};

export const addPostComment = async (
  postId: string,
  userId: string,
  content: string,
  parentCommentId?: string | null
): Promise<{ success: boolean; comment?: CommentData; message?: string }> => {
  try {
    if (!postId || !userId || !content.trim()) {
      return { success: false, message: 'Missing required fields' };
    }

    if (content.trim().length > 1000) {
      return { success: false, message: 'Comment too long (max 1000 characters)' };
    }

    const { data: newComment, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null
      })
      .select(`
        id,
        post_id,
        user_id,
        content,
        likes_count,
        replies_count,
        created_at,
        updated_at,
        is_edited,
        parent_comment_id,
        users!inner (
          id,
          username,
          name,
          email
        )
      `)
      .single();

    if (insertError) {
      return { success: false, message: 'Failed to add comment' };
    }

    const user = Array.isArray(newComment.users) ? newComment.users[0] : newComment.users;

    let displayName = 'Anonymous';
    if (user) {
      displayName = user.username || user.name || user.email?.split('@')[0] || 'Anonymous';
    }

    const transformedComment: CommentData = {
      id: newComment.id,
      post_id: newComment.post_id,
      user_id: newComment.user_id,
      username: displayName,
      profile_image: undefined,
      content: newComment.content,
      likes_count: newComment.likes_count || 0,
      replies_count: newComment.replies_count || 0,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      is_liked: false,
      is_edited: newComment.is_edited || false,
      parent_comment_id: newComment.parent_comment_id,
      replies: []
    };

    // Create notification for post owner (if not commenting on own post)
    const { data: postData } = await supabase
      .from('circle_posts')
      .select('user_id, circle_ids')
      .eq('id', postId)
      .single();

    if (postData?.user_id && postData.user_id !== userId) {
      // circle_ids can be array or single value
      const circleId = postData.circle_ids
        ? (Array.isArray(postData.circle_ids) ? postData.circle_ids[0] : postData.circle_ids)
        : undefined;
      notificationService.createCommentNotification(
        postData.user_id,
        userId,
        displayName,
        postId,
        content,
        circleId,
        newComment.id
      ).catch(err => console.log('Comment notification error:', err));
    }

    return { success: true, comment: transformedComment };

  } catch (error) {
    return { success: false, message: 'Failed to add comment' };
  }
};

export const toggleCommentLike = async (
  commentId: string,
  userId: string
): Promise<{ success: boolean; liked: boolean; likes_count: number; message?: string }> => {
  try {
    if (!commentId || !userId) {
      return { success: false, liked: false, likes_count: 0, message: 'Missing required fields' };
    }

    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return { success: false, liked: false, likes_count: 0, message: 'Failed to check like status' };
    }

    const isCurrentlyLiked = !!existingLike;

    if (isCurrentlyLiked) {

      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (deleteError) {
        return { success: false, liked: true, likes_count: 0, message: 'Failed to unlike comment' };
      }
    } else {

      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId
        });

      if (insertError) {
        return { success: false, liked: false, likes_count: 0, message: 'Failed to like comment' };
      }
    }

    const { data: updatedComment, error: fetchError } = await supabase
      .from('post_comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      return { success: false, liked: !isCurrentlyLiked, likes_count: 0, message: 'Action completed but failed to get count' };
    }

    const newLikesCount = updatedComment.likes_count || 0;
    const newLikedStatus = !isCurrentlyLiked;

    return { success: true, liked: newLikedStatus, likes_count: newLikesCount };

  } catch (error) {
    return { success: false, liked: false, likes_count: 0, message: 'Failed to toggle like' };
  }
};

export const deleteComment = async (commentId: string, userId: string): Promise<{ success: boolean; message?: string }> => {
  try {

    const { error: deleteError } = await supabase
      .from('post_comments')
      .update({
        is_deleted: true,
        content: '[deleted]',
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (deleteError) {
      return { success: false, message: 'Failed to delete comment' };
    }

    return { success: true };

  } catch (error) {
    return { success: false, message: 'Failed to delete comment' };
  }
};

export const togglePostLike = async (postId: string, userId: string) => {
  try {

    const { data: existingLike, error: checkError } = await supabase
      .from('user_liked_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return await toggleLikeViaEdgeFunction(postId, userId);
    }

    const isCurrentlyLiked = !!existingLike;

    if (isCurrentlyLiked) {

      const { error: deleteError } = await supabase
        .from('user_liked_posts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      const { data: postData, error: fetchError } = await supabase
        .from('circle_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const newCount = Math.max((postData?.likes_count || 1) - 1, 0);

      const { error: updateError } = await supabase
        .from('circle_posts')
        .update({ likes_count: newCount })
        .eq('id', postId);

      if (updateError) {
        await supabase
          .from('user_liked_posts')
          .insert({
            post_id: postId,
            user_id: userId,
            liked_at: new Date().toISOString(),
          });
        throw updateError;
      }

      return {
        liked: false,
        action: 'unliked',
        likes_count: newCount
      };

    } else {

      const { error: insertError } = await supabase
        .from('user_liked_posts')
        .insert({
          post_id: postId,
          user_id: userId,
          liked_at: new Date().toISOString(),
          interaction_context: 'feed',
          device_type: 'mobile'
        });

      if (insertError) {
        throw insertError;
      }

      const { data: postData, error: fetchError } = await supabase
        .from('circle_posts')
        .select('likes_count, user_id, circle_ids')
        .eq('id', postId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const newCount = (postData?.likes_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('circle_posts')
        .update({ likes_count: newCount })
        .eq('id', postId);

      if (updateError) {
        await supabase
          .from('user_liked_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        throw updateError;
      }

      // Create notification for post owner (if not liking own post)
      if (postData?.user_id && postData.user_id !== userId) {
        const { data: likerData } = await supabase
          .from('users')
          .select('name, username')
          .eq('id', userId)
          .single();

        const likerName = likerData?.name || likerData?.username || 'Someone';
        // Get circle_id for proper navigation
        const circleId = postData.circle_ids
          ? (Array.isArray(postData.circle_ids) ? postData.circle_ids[0] : postData.circle_ids)
          : undefined;
        notificationService.createLikeNotification(
          postData.user_id,
          userId,
          likerName,
          postId,
          circleId
        ).catch(err => console.log('Like notification error:', err));
      }

      return {
        liked: true,
        action: 'liked',
        likes_count: newCount
      };
    }

  } catch (error) {
    try {
      return await toggleLikeViaEdgeFunction(postId, userId);
    } catch (fallbackError) {
      throw new Error('Failed to update like status. Please check your connection and try again.');
    }
  }
};

const toggleLikeViaEdgeFunction = async (postId: string, userId: string) => {
  try {
    const { data: statusData, error: statusError } = await supabase.functions.invoke('manage-liked-posts', {
      body: {
        user_id: userId,
        post_id: postId,
        action: 'get_status'
      }
    });

    if (statusError) {
      throw statusError;
    }

    const isCurrentlyLiked = statusData?.is_liked || false;
    const action = isCurrentlyLiked ? 'unlike' : 'like';

    const { data: actionData, error: actionError } = await supabase.functions.invoke('manage-liked-posts', {
      body: {
        user_id: userId,
        post_id: postId,
        action: action,
        metadata: {
          interaction_context: 'feed',
          device_type: 'mobile'
        }
      }
    });

    if (actionError) {
      throw actionError;
    }

    return {
      liked: actionData.is_liked,
      action: action + 'd',
      likes_count: actionData.likes_count
    };

  } catch (error) {
    throw error;
  }
};

export const getPostsLikes = async (postIds: string[], userId: string) => {
  try {
    if (!userId || !postIds || postIds.length === 0) {
      return new Set<string>();
    }

    const validPostIds = postIds.filter(id => id && typeof id === 'string');

    if (validPostIds.length === 0) {
      return new Set<string>();
    }

    const { data, error } = await supabase
      .from('user_liked_posts')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', validPostIds);

    if (error) {
      return new Set<string>();
    }

    const likedPostIds = new Set(data?.map(item => item.post_id) || []);

    return likedPostIds;
  } catch (error) {
    return new Set<string>();
  }
};

export const recordPostShare = async (postId: string, userId: string, shareData?: any) => {
  try {

    try {
      const { error: insertError } = await supabase
        .from('post_interactions')
        .insert({
          post_id: postId,
          user_id: userId,
          interaction_type: 'share',
          metadata: shareData || null,
          created_at: new Date().toISOString(),
        });

      if (insertError) {

      }
    } catch (interactionError) {

    }

    const { data: currentPost, error: fetchError } = await supabase
      .from('circle_posts')
      .select('shares_count')
      .eq('id', postId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const newCount = (currentPost?.shares_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({ shares_count: newCount })
      .eq('id', postId);

    if (updateError) {
      throw updateError;
    }

    return { success: true, shares_count: newCount };
  } catch (error) {
    throw error;
  }
};

// Profile cache for getCurrentUser to prevent redundant DB calls
let cachedProfile: any = null;
let lastProfileFetch = 0;
const PROFILE_CACHE_TTL_MS = 30000; // 30 seconds

export const getCurrentUser = async (forceRefresh = false) => {
  try {
    const now = Date.now();

    // Return cached profile if valid
    if (!forceRefresh && cachedProfile && (now - lastProfileFetch) < PROFILE_CACHE_TTL_MS) {
      return cachedProfile;
    }

    const { user, error } = await getCachedUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return null; // No authenticated user - return null instead of throwing
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, username, name, email, bio, aura_points')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Handle "no rows found" gracefully - user exists in auth but not in users table
      if (profileError.code === 'PGRST116') {
        console.warn('User profile not found in database. User may need to complete signup.');
        return null;
      }
      throw profileError;
    }

    // Cache the profile
    cachedProfile = profile;
    lastProfileFetch = Date.now();

    return profile;
  } catch (error) {
    throw error;
  }
};

// Clear profile cache (call on sign out)
export const clearProfileCache = () => {
  cachedProfile = null;
  lastProfileFetch = 0;
};

export const trackVideoView = async (
  postId: string,
  userId: string,
  videoProgress: number = 0,
  videoDuration: number = 0
): Promise<boolean> => {
  try {
    if (!postId || !userId) {
      return false;
    }

    const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0;

    if (progressPercent < 30) {
      return false;
    }

    const { data: existingView, error: checkError } = await supabase
      .from('post_interactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .single();

    if (existingView) {
      return false;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // Silently handle missing table
      if (checkError.code === 'PGRST205' || checkError.code === '42P01') {
        return false;
      }
      console.error('Error checking existing view:', checkError);
      return false;
    }

    const { error: insertError } = await supabase
      .from('post_interactions')
      .insert({
        post_id: postId,
        user_id: userId,
        interaction_type: 'view',
        metadata: {
          progress_percent: progressPercent,
          video_duration: videoDuration,
          video_progress: videoProgress,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      // Ignore duplicate key errors (23505) - view already tracked
      if (insertError.code === '23505') {
        console.log('View already tracked for this post');
        return false;
      }
      console.error('Error inserting view:', insertError);
      return false;
    }

    const { data: currentPost, error: fetchError } = await supabase
      .from('circle_posts')
      .select('views_count')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching current post:', fetchError);
      return false;
    }

    const newViewCount = (currentPost?.views_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({ views_count: newViewCount })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating view count:', updateError);
      return false;
    }

    console.log(`View tracked for post ${postId}: ${progressPercent.toFixed(1)}% watched`);
    return true;

  } catch (error) {
    console.error('Error tracking video view:', error);
    return false;
  }
};



// Track view for non-video posts (text/photo) - simpler logic, just needs 2 seconds viewing time
export const trackPostView = async (
  postId: string,
  userId: string,
  viewDurationMs: number = 2000
): Promise<boolean> => {
  try {
    if (!postId || !userId) {
      return false;
    }

    // Require at least 2 seconds of viewing
    if (viewDurationMs < 2000) {
      return false;
    }

    // Check if view already exists
    const { data: existingView, error: checkError } = await supabase
      .from('post_interactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .single();

    if (existingView) {
      return false;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === 'PGRST205' || checkError.code === '42P01') {
        return false;
      }
      console.error('Error checking existing view:', checkError);
      return false;
    }

    // Insert the view interaction
    const { error: insertError } = await supabase
      .from('post_interactions')
      .insert({
        post_id: postId,
        user_id: userId,
        interaction_type: 'view',
        metadata: {
          view_duration_ms: viewDurationMs,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      // Ignore duplicate key errors (23505) - view already tracked
      if (insertError.code === '23505') {
        return false;
      }
      console.error('Error inserting view:', insertError);
      return false;
    }

    // Update the views_count on the post
    const { data: currentPost, error: fetchError } = await supabase
      .from('circle_posts')
      .select('views_count')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching current post:', fetchError);
      return false;
    }

    const newViewCount = (currentPost?.views_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({ views_count: newViewCount })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating view count:', updateError);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error tracking post view:', error);
    return false;
  }
};

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

/**
 * Edit a post's content and tags
 * Saves edit history for moderation
 */
export const editPost = async (
  postId: string,
  userId: string,
  newContent: string,
  newTags: string[],
  editReason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, fetch the current post data
    const { data: currentPost, error: fetchError } = await supabase
      .from('circle_posts')
      .select('content, media_urls, tags, user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !currentPost) {
      console.error('Error fetching post for edit:', fetchError);
      return { success: false, error: 'Post not found' };
    }

    // Verify ownership
    if (currentPost.user_id !== userId) {
      return { success: false, error: 'You can only edit your own posts' };
    }

    // Prepare content - keep same format as original
    let updatedContent: any;
    if (typeof currentPost.content === 'object' && currentPost.content !== null) {
      // If content was an object, update the text field
      updatedContent = { ...currentPost.content, text: newContent };
    } else {
      // If content was a string, keep it as string
      updatedContent = newContent;
    }

    // Save to edit history first
    const { error: historyError } = await supabase
      .from('post_edit_history')
      .insert({
        post_id: postId,
        user_id: userId,
        previous_content: currentPost.content,
        previous_media_urls: currentPost.media_urls,
        previous_tags: currentPost.tags,
        new_content: updatedContent,
        new_media_urls: currentPost.media_urls, // Media stays same
        new_tags: newTags,
        edit_reason: editReason || null,
        edited_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('Error saving edit history:', historyError);
      // Continue anyway - history is for moderation, not critical
    }

    // Update the post
    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({
        content: updatedContent,
        tags: newTags,
        is_edited: true,
        last_edited_at: new Date().toISOString(),
        edit_count: (currentPost as any).edit_count ? (currentPost as any).edit_count + 1 : 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId); // Extra safety check

    if (updateError) {
      console.error('Error updating post:', updateError);
      return { success: false, error: 'Failed to update post' };
    }

    console.log('Post edited successfully:', postId);
    return { success: true };
  } catch (error) {
    console.error('Error in editPost:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get edit history for a post (for moderation)
 */
export const getPostEditHistory = async (
  postId: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('post_edit_history')
      .select('*')
      .eq('post_id', postId)
      .order('edited_at', { ascending: false });

    if (error) {
      console.error('Error fetching edit history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPostEditHistory:', error);
    return [];
  }
};

/**
 * Format edited timestamp for display
 */
export const formatEditedTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Edited just now";
  if (diffInSeconds < 3600) return `Edited ${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `Edited ${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `Edited ${Math.floor(diffInSeconds / 86400)}d ago`;
  return `Edited ${date.toLocaleDateString()}`;
};