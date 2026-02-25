
import { supabase } from './supabase';
import { Share, Platform, Alert } from 'react-native';
import { Database } from '../database.types';
import Constants from 'expo-constants';

// App domain - from environment variable with fallback
const APP_DOMAIN = Constants.expoConfig?.extra?.appDomain || 'https://vennapp.com';

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export const repostToProfile = async (
  post: CirclePost,
  currentUser: User,
  repostType: 'simple' | 'quote' = 'simple',
  repostComment?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Starting repost:', { postId: post.id, userId: currentUser.id, type: repostType });

    if (!post?.id || !currentUser?.id) {
      return { success: false, error: 'Missing required data' };
    }

    const { data, error } = await supabase.rpc('record_post_repost', {
      p_post_id: post.id,
      p_user_id: currentUser.id,
      p_repost_comment: repostComment || null,
      p_repost_type: repostType
    });

    if (error) {
      console.error('RPC repost error:', error);

      if (error.message.includes('function') || error.message.includes('does not exist')) {
        console.log('RPC not found, using fallback method');
        return await fallbackRepost(post, currentUser, repostType, repostComment);
      }

      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return { success: false, error: 'You have already reposted this post' };
      }

      return { success: false, error: error.message };
    }

    console.log(`Post ${post.id} reposted successfully via RPC`);
    return { success: true };

  } catch (error) {
    console.error('Error reposting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to repost'
    };
  }
};

const fallbackRepost = async (
  post: CirclePost,
  currentUser: User,
  repostType: 'simple' | 'quote',
  repostComment?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Using fallback repost method');

    const { data: existing, error: checkError } = await supabase
      .from('user_reposts')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('post_id', post.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42P01' || checkError.code === 'PGRST205' || checkError.message?.includes('does not exist')) {
        console.log('[shareUtils] user_reposts table does not exist, cannot check status');
        return { success: false, error: 'Repost feature unavailable' };
      }
      console.error('Error checking existing repost:', checkError);
      return { success: false, error: 'Failed to check repost status' };
    }

    if (existing) {
      console.log('Post already reposted');
      return { success: false, error: 'You have already reposted this post' };
    }

    const repostData: any = {
      user_id: currentUser.id,
      post_id: post.id,
      repost_comment: repostComment || null,
      created_at: new Date().toISOString()
    };

    try {
      const { error: schemaError } = await supabase
        .from('user_reposts')
        .select('repost_type')
        .limit(0);

      if (!schemaError) {
        repostData.repost_type = repostType;
      }
    } catch {
      console.log('repost_type column not found, skipping');
    }

    const { error: insertError } = await supabase
      .from('user_reposts')
      .insert(repostData);

    if (insertError) {
      if (insertError.code === '42P01' || insertError.code === 'PGRST205' || insertError.message?.includes('does not exist')) {
        console.log('[shareUtils] user_reposts table does not exist, cannot insert');
        return { success: false, error: 'Repost feature unavailable' };
      }

      console.error('Error inserting repost:', insertError);

      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        return { success: false, error: 'You have already reposted this post' };
      }

      throw insertError;
    }

    console.log('Repost record inserted successfully');

    try {
      const { data: postData, error: fetchError } = await supabase
        .from('circle_posts')
        .select('reposts_count, shares_count')
        .eq('id', post.id)
        .single();

      if (!fetchError && postData) {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if ('reposts_count' in postData) {
          updateData.reposts_count = (postData.reposts_count || 0) + 1;
        }

        updateData.shares_count = (postData.shares_count || 0) + 1;

        await supabase
          .from('circle_posts')
          .update(updateData)
          .eq('id', post.id);

        console.log('Post counts updated');
      }
    } catch (error) {
      console.warn('Could not update post counts:', error);

    }

    return { success: true };

  } catch (error) {
    console.error('Fallback repost error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to repost'
    };
  }
};

export const removeRepost = async (
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Removing repost:', { postId, userId });

    const { error } = await supabase
      .from('user_reposts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.log('[shareUtils] user_reposts table does not exist, cannot remove repost');
        return { success: false, error: 'Feature unavailable' };
      }
      console.error('Error removing repost:', error);
      throw error;
    }

    try {
      const { data: post } = await supabase
        .from('circle_posts')
        .select('reposts_count, shares_count')
        .eq('id', postId)
        .single();

      if (post) {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if ('reposts_count' in post && post.reposts_count > 0) {
          updateData.reposts_count = post.reposts_count - 1;
        }

        if (post.shares_count > 0) {
          updateData.shares_count = post.shares_count - 1;
        }

        await supabase
          .from('circle_posts')
          .update(updateData)
          .eq('id', postId);
      }
    } catch {
      console.warn('Could not update post counts after removing repost');
    }

    console.log('Repost removed successfully');
    return { success: true };

  } catch (error) {
    console.error('Error removing repost:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove repost'
    };
  }
};

export const checkRepostStatus = async (
  postId: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!postId || !userId) return false;

    const { data, error } = await supabase
      .from('user_reposts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    // Handle table not existing error
    if (error && (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
      console.log('[shareUtils] user_reposts table does not exist');
      return false;
    }

    return !!data && !error;
  } catch (error) {
    console.error('Error checking repost status:', error);
    return false;
  }
};

export const getUserReposts = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('user_reposts')
      .select(`
        id,
        repost_comment,
        created_at,
        post:circle_posts(
          id,
          content,
          content_type,
          media_urls,
          media_metadata,
          likes_count,
          comments_count,
          shares_count,
          views_count,
          created_at,
          visibility,
          user_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.log('[shareUtils] user_reposts table does not exist');
        return [];
      }
      console.error('Error fetching user reposts:', error);
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error('Error fetching reposts:', error);
    return [];
  }
};

export const dynamicSharePost = async (
  post: CirclePost,
  user: User,
  currentUser: User,
  onShareCountUpdate?: (postId: string, newCount: number) => void
): Promise<{ success: boolean; newSharesCount?: number; error?: string }> => {
  try {
    if (!post || !user || !currentUser) {
      return { success: false, error: 'Missing required data' };
    }

    const username = user.username || user.name || 'User';
    const content = typeof post.content === 'string'
      ? post.content
      : (post.content as any)?.text || '';

    const isVideo = post.content_type === 'video';
    const mediaUrls = post.media_urls as any;
    const mediaUrl = mediaUrls?.videoUrl ||
      mediaUrls?.imageUrl ||
      (Array.isArray(mediaUrls) ? mediaUrls[0] : '');

    let shareMessage = `Check out this ${isVideo ? 'video' : 'post'} by @${username}`;

    if (content) {
      const contentPreview = content.length > 100
        ? content.substring(0, 97) + '...'
        : content;
      shareMessage += `\n\n"${contentPreview}"`;
    }

    const appLink = `${APP_DOMAIN}/post/${post.id}`;
    shareMessage += `\n\nShared via Venn\n${appLink}`;

    const shareOptions = {
      message: Platform.OS === 'android' ? shareMessage : undefined,
      url: Platform.OS === 'ios' ? (mediaUrl || appLink) : undefined,
      title: `${isVideo ? 'Video' : 'Post'} by @${username}`,
    };

    const result = await Share.share(
      Platform.OS === 'android'
        ? { message: `${shareMessage}${mediaUrl ? `\n\n${mediaUrl}` : ''}` }
        : shareOptions
    );

    if (result.action === Share.sharedAction) {

      const shareResult = await recordDynamicShare(post.id, currentUser.id, {
        platform: result.activityType || 'native',
        // @ts-ignore
        shared_to: result.activityType,
        content_type: post.content_type,
        share_method: 'external_share'
      });

      if (shareResult.success && shareResult.newSharesCount !== undefined) {
        if (onShareCountUpdate) {
          onShareCountUpdate(post.id, shareResult.newSharesCount);
        }
        return {
          success: true,
          newSharesCount: shareResult.newSharesCount
        };
      }

      return { success: true };
    } else if (result.action === Share.dismissedAction) {
      return { success: false, error: 'Share cancelled' };
    }

    return { success: false, error: 'Share action unclear' };

  } catch (error) {
    console.error('Error sharing post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed'
    };
  }
};

export const recordDynamicShare = async (
  postId: string,
  userId: string,
  shareMetadata?: {
    platform?: string;
    shared_to?: string;
    content_type?: string;
    share_method?: string;
  }
): Promise<{ success: boolean; newSharesCount?: number; error?: string }> => {
  try {

    const { data, error } = await supabase.rpc('record_post_share', {
      p_post_id: postId,
      p_user_id: userId,
      p_metadata: shareMetadata || {}
    });

    if (!error && data) {
      return {
        success: true,
        newSharesCount: data?.[0]?.shares_count || 0
      };
    }

    return await fallbackShareUpdate(postId, userId, shareMetadata);

  } catch (error) {
    console.error('Error recording share:', error);
    return await fallbackShareUpdate(postId, userId, shareMetadata);
  }
};

const fallbackShareUpdate = async (
  postId: string,
  userId: string,
  shareMetadata?: any
): Promise<{ success: boolean; newSharesCount?: number; error?: string }> => {
  try {

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
      .update({
        shares_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      throw updateError;
    }

    try {
      await supabase
        .from('post_interactions')
        .insert({
          post_id: postId,
          user_id: userId,
          interaction_type: 'share',
          metadata: shareMetadata || {},
          created_at: new Date().toISOString(),
        });
    } catch {

    }

    return {
      success: true,
      newSharesCount: newCount
    };

  } catch (error) {
    console.error('Fallback share update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update share count'
    };
  }
};

export const getPostShareStats = async (postId: string): Promise<{
  totalShares: number;
  totalReposts: number;
  externalShares: number;
  platformBreakdown: Record<string, number>;
  recentActivity: any[];
}> => {
  try {

    const { data: postData } = await supabase
      .from('circle_posts')
      .select('shares_count, reposts_count')
      .eq('id', postId)
      .single();

    const { data: interactions } = await supabase
      .from('post_interactions')
      .select('metadata, created_at')
      .eq('post_id', postId)
      .eq('interaction_type', 'share')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: reposts } = await supabase
      .from('user_reposts')
      .select('created_at, repost_comment, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50);

    const platformBreakdown: Record<string, number> = {};
    let externalShares = 0;

    interactions?.forEach(interaction => {
      const platform = interaction.metadata?.platform || 'unknown';
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;

      if (interaction.metadata?.share_method === 'external_share') {
        externalShares++;
      }
    });

    const recentActivity = [
      ...(interactions || []).map(i => ({ ...i, type: 'share' })),
      ...(reposts || []).map(r => ({ ...r, type: 'repost' }))
    ].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50);

    return {
      totalShares: postData?.shares_count || 0,
      totalReposts: postData?.reposts_count || reposts?.length || 0,
      externalShares,
      platformBreakdown,
      recentActivity
    };

  } catch (error) {
    console.error('Error getting share stats:', error);
    return {
      totalShares: 0,
      totalReposts: 0,
      externalShares: 0,
      platformBreakdown: {},
      recentActivity: []
    };
  }
};

export const bulkCheckRepostStatus = async (
  postIds: string[],
  userId: string
): Promise<Record<string, boolean>> => {
  try {
    if (!postIds.length || !userId) return {};

    const { data, error } = await supabase
      .from('user_reposts')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    // Handle table not existing error
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.log('[shareUtils] user_reposts table does not exist, returning empty status');
        return {};
      }
      throw error;
    }

    const repostStatus: Record<string, boolean> = {};
    postIds.forEach(id => {
      repostStatus[id] = false;
    });

    data?.forEach(item => {
      repostStatus[item.post_id] = true;
    });

    return repostStatus;

  } catch (error) {
    console.error('Error bulk checking repost status:', error);
    // Return empty object instead of crashing
    return {};
  }
};

export const bulkUpdateShareCounts = async (
  postIds: string[]
): Promise<Record<string, { shares: number; reposts: number; total: number }>> => {
  try {
    if (!postIds || postIds.length === 0) {
      return {};
    }

    const { data: posts, error } = await supabase
      .from('circle_posts')
      .select('id, shares_count, reposts_count')
      .in('id', postIds);

    if (error) throw error;

    const counts: Record<string, { shares: number; reposts: number; total: number }> = {};

    posts?.forEach(post => {
      const shares = post.shares_count || 0;
      const reposts = post.reposts_count || 0;
      counts[post.id] = {
        shares,
        reposts,
        total: shares + reposts
      };
    });

    return counts;

  } catch (error) {
    console.error('Error bulk updating share counts:', error);
    return {};
  }
};