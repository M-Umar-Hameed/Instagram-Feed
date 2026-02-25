import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { uploadMediaToSupabase } from './mediaUpload';
import { invalidateFeedCache } from '../hooks/useFeed';

export type PostContentType = 'text' | 'photo' | 'video' | 'mixed';
export type PostVisibility = 'public' | 'circle_only' | 'private';

export interface PostMedia {
  uri: string;
  type: 'photo' | 'video';
  fileName?: string;
}

export interface PostData {
  circleIds: string[];
  userId: string | null;
  contentType: PostContentType;
  textContent?: string;
  media?: PostMedia[];
  tags?: string[] | null;
  visibility: PostVisibility;
  isAnonymous?: boolean;
  anonymousUsername?: string;
  worldFeedSelected?: boolean; // When true, post goes to World Feed (public)
}

const parseMentions = (text: string): Array<{start: number, end: number, userId: string, username: string}> => {
  const mentions: Array<{start: number, end: number, userId: string, username: string}> = [];
  const mentionRegex = /@(\w+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      start: match.index,
      end: match.index + match[0].length,
      userId: '',
      username: match[1]
    });
  }
  
  return mentions;
};

const parseHashtags = (text: string): Array<{start: number, end: number, tag: string}> => {
  const hashtags: Array<{start: number, end: number, tag: string}> = [];
  const hashtagRegex = /#(\w+)/g;
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push({
      start: match.index,
      end: match.index + match[0].length,
      tag: match[1]
    });
  }
  
  return hashtags;
};

const parseLinks = (text: string): Array<{start: number, end: number, url: string}> => {
  const links: Array<{start: number, end: number, url: string}> = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    links.push({
      start: match.index,
      end: match.index + match[0].length,
      url: match[0]
    });
  }
  
  return links;
};

export const createJSONBContent = (textContent: string) => {
  if (!textContent || typeof textContent !== 'string') {
    return null;
  }

  const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
  
  return {
    text: textContent,
    formatting: {
      mentions: parseMentions(textContent),
      hashtags: parseHashtags(textContent),
      links: parseLinks(textContent),
      bold: [],
      italic: [],
    },
    metadata: {
      wordCount: words.length,
      characterCount: textContent.length,
      language: 'en',
      sentiment: 'neutral' as const,
      topics: [],
    }
  };
};

export const extractTextFromJSONB = (content: any): string => {
  if (!content) return '';
  
  if (typeof content === 'object' && content.text) {
    return content.text;
  }
  
  if (typeof content === 'string') {
    return content;
  }
  
  return '';
};

export const pickMedia = async (
  type: 'photo' | 'video'
): Promise<PostMedia | null> => {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Permission Required',
      'Grant permission to access media library'
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:
      type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false, // Disabled: iOS forces 1:1 square crop when true. Duration validated in code below.
    quality: 1,
    ...(type === 'video' ? { videoMaxDuration: 60 } : {}),
  });

  if (!result.canceled && result.assets.length > 0) {
    const asset = result.assets[0];

    // Validate video duration - must be 60 seconds or less
    if (type === 'video' && asset.duration) {
      const durationInSeconds = asset.duration / 1000; // duration is in milliseconds
      if (durationInSeconds > 60) {
        Alert.alert(
          'Video Too Long',
          `Your video is ${Math.round(durationInSeconds)} seconds long. Please select a video that is 1 minute or less.`,
          [{ text: 'OK' }]
        );
        return null;
      }
    }

    return {
      uri: asset.uri,
      type,
      fileName: asset.uri.split('/').pop()!,
    };
  }
  return null;
};

// Pick multiple photos (not videos, not mix of video+photo)
export const pickMultiplePhotos = async (
  maxSelection: number = 10
): Promise<PostMedia[] | null> => {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Permission Required',
      'Grant permission to access media library'
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: maxSelection,
    quality: 1,
  });

  if (!result.canceled && result.assets.length > 0) {
    return result.assets.map((asset) => ({
      uri: asset.uri,
      type: 'photo' as const,
      fileName: asset.uri.split('/').pop()!,
    }));
  }
  return null;
};

// Pick multiple media (photos AND videos mixed) - up to 10 items
export const pickMultipleMedia = async (
  maxSelection: number = 10,
  currentCount: number = 0
): Promise<PostMedia[] | null> => {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Permission Required',
      'Grant permission to access media library'
    );
    return null;
  }

  const remainingSlots = maxSelection - currentCount;
  if (remainingSlots <= 0) {
    Alert.alert(
      'Maximum Reached',
      `You can only add up to ${maxSelection} media items per post.`
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both photos and videos
    allowsMultipleSelection: true,
    selectionLimit: remainingSlots,
    quality: 1,
    videoMaxDuration: 60, // 60 seconds max per video
  });

  if (!result.canceled && result.assets.length > 0) {
    const mediaItems: PostMedia[] = [];

    for (const asset of result.assets) {
      // Determine media type from asset
      const isVideo = asset.type === 'video' ||
                      asset.uri.toLowerCase().includes('.mp4') ||
                      asset.uri.toLowerCase().includes('.mov') ||
                      asset.uri.toLowerCase().includes('.avi') ||
                      (asset.duration && asset.duration > 0);

      // Validate video duration (max 60 seconds)
      if (isVideo && asset.duration) {
        const durationInSeconds = asset.duration / 1000;
        if (durationInSeconds > 60) {
          Alert.alert(
            'Video Too Long',
            `One of your videos is ${Math.round(durationInSeconds)} seconds. Videos must be 60 seconds or less. This video was skipped.`
          );
          continue; // Skip this video but continue with others
        }
      }

      mediaItems.push({
        uri: asset.uri,
        type: isVideo ? 'video' : 'photo',
        fileName: asset.uri.split('/').pop()!,
      });
    }

    return mediaItems.length > 0 ? mediaItems : null;
  }
  return null;
};

export const captureMedia = async (
  type: 'photo' | 'video'
): Promise<PostMedia | null> => {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert('Permission Required', 'Grant permission to access camera');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes:
      type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false, // Disabled: iOS forces 1:1 square crop when true. Duration validated in code below.
    quality: 1,
    ...(type === 'video' ? { videoMaxDuration: 60 } : {}),
  });

  if (!result.canceled && result.assets.length > 0) {
    const asset = result.assets[0];

    // Validate video duration - must be 60 seconds or less
    if (type === 'video' && asset.duration) {
      const durationInSeconds = asset.duration / 1000; // duration is in milliseconds
      if (durationInSeconds > 60) {
        Alert.alert(
          'Video Too Long',
          `Your video is ${Math.round(durationInSeconds)} seconds long. Please record a video that is 1 minute or less.`,
          [{ text: 'OK' }]
        );
        return null;
      }
    }

    return {
      uri: asset.uri,
      type,
      fileName: asset.uri.split('/').pop()!,
    };
  }
  return null;
};

export const uploadMedia = async (
  media: PostMedia,
  primaryCircleId: string,
  userId: string,
  visibility: PostVisibility = 'public',
  circleIds: string[] = []
): Promise<{
  videoId: string;
  thumbnailId: string;
  uploadInfo: {
    mp4Url: string;
    hlsUrl: string;
    thumbnailUrl: string;
    mimeType: string;
    fileSize: number;
    visibility: string;
  };
}> => {
  const uriToUpload = media.uri;

  // Upload video to Supabase Storage
  const videoUrl = await uploadMediaToSupabase(
    uriToUpload,
    'public-media',
    `circle_post/${primaryCircleId}`
  );

  // For thumbnail, use the same video URL as placeholder
  // (proper thumbnail generation would require server-side processing)
  const thumbnailUrl = videoUrl;

  return {
    videoId: `video_${Date.now()}`,
    thumbnailId: `thumb_${Date.now()}`,
    uploadInfo: {
      mp4Url: videoUrl,
      hlsUrl: videoUrl,
      thumbnailUrl: thumbnailUrl,
      mimeType: 'video/mp4',
      fileSize: 0,
      visibility: visibility === 'circle_only' ? 'private' : visibility,
    },
  };
};

export const createPost = async (
  postData: PostData
): Promise<string | null> => {
  const { media, circleIds, userId, visibility, isAnonymous, anonymousUsername } = postData;

  try {
    // AURA RESTRICTION CHECK: Users with aura 0-49 cannot post
    // Defense-in-depth: UI already blocks this, but validate here too
    let actualUserId = userId;
    if (!actualUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      actualUserId = session?.user?.id || null;
    }

    if (actualUserId) {
      const { data: userData } = await supabase
        .from('users')
        .select('aura_points')
        .eq('id', actualUserId)
        .single();

      const auraPoints = userData?.aura_points ?? 250;
      if (auraPoints < 50) {
        Alert.alert(
          'Posting Restricted',
          'Your aura is too low to create posts. You need at least 50 aura points.'
        );
        return null;
      }
    }

    let videoId: string | null = null;
    let thumbnailId: string | null = null;
    let mediaUrls: any = null;
    let media_metadata: any = null;

    // Handle mixed media uploads (photos AND videos together)
    const photoMedia = media?.filter(m => m.type === 'photo') || [];
    const videoMedia = media?.filter(m => m.type === 'video') || [];

    // Combined media array to maintain order
    const allMediaItems: Array<{
      type: 'photo' | 'video';
      id: string;
      url: string;
      thumbnailUrl?: string;
      mimeType: string;
      fileSize: number;
      originalIndex: number;
    }> = [];

    // Upload all photos
    if (photoMedia.length > 0) {
      try {
        const mappedVisibility = visibility === 'circle_only' ? 'private' : visibility;

        for (let i = 0; i < photoMedia.length; i++) {
          const photo = photoMedia[i];
          const photoName = photo.fileName || `photo_${Date.now()}_${i}.jpg`;
          const originalIndex = media?.findIndex(m => m.uri === photo.uri) ?? i;

          // Upload photo to Supabase Storage
          const photoUrl = await uploadMediaToSupabase(
            photo.uri,
            'public-media',
            `circle_post/${circleIds[0] || 'general'}`
          );

          allMediaItems.push({
            type: 'photo',
            id: `photo_${Date.now()}_${i}`,
            url: photoUrl,
            mimeType: 'image/jpeg',
            fileSize: 0,
            originalIndex,
          });
        }
      } catch (uploadError) {
        Alert.alert('Upload Error', 'Failed to upload photo(s). Please try again.');
        throw uploadError;
      }
    }

    // Handle ALL videos (multiple videos support)
    if (videoMedia.length > 0) {
      try {
        for (let i = 0; i < videoMedia.length; i++) {
          const video = videoMedia[i];
          const originalIndex = media?.findIndex(m => m.uri === video.uri) ?? i;

          const {
            videoId: vid,
            thumbnailId: tid,
            uploadInfo,
          } = await uploadMedia(
            video,
            circleIds[0] || 'world-feed',
            userId || 'anonymous',
            visibility,
            circleIds
          );

          // Track first video's IDs for legacy processing
          if (i === 0) {
            videoId = vid;
            thumbnailId = tid;
          }

          allMediaItems.push({
            type: 'video',
            id: vid,
            url: uploadInfo.mp4Url,
            thumbnailUrl: uploadInfo.thumbnailUrl,
            mimeType: uploadInfo.mimeType,
            fileSize: uploadInfo.fileSize,
            originalIndex,
          });
        }
      } catch (uploadError) {
        Alert.alert('Upload Error', 'Failed to upload video(s). Please try again.');
        throw uploadError;
      }
    }

    // Sort by original index to maintain user's selected order
    allMediaItems.sort((a, b) => a.originalIndex - b.originalIndex);

    // Build media_urls and media_metadata based on content
    if (allMediaItems.length > 0) {
      const hasVideos = videoMedia.length > 0;
      const hasPhotos = photoMedia.length > 0;

      if (hasVideos && hasPhotos) {
        // Mixed content - store as array with type info
        mediaUrls = allMediaItems.map(item => ({
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
        }));
        media_metadata = {
          mediaType: 'mixed',
          items: allMediaItems.map(item => ({
            type: item.type,
            id: item.id,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
          })),
        };
      } else if (hasVideos && videoMedia.length === 1) {
        // Single video - keep legacy format for backward compatibility
        const videoItem = allMediaItems.find(m => m.type === 'video')!;
        mediaUrls = {
          videoUrl: videoItem.url,
          thumbnailUrl: videoItem.thumbnailUrl,
        };
        media_metadata = {
          [videoItem.id]: {
            thumbnail: thumbnailId,
          },
        };
      } else if (hasVideos && videoMedia.length > 1) {
        // Multiple videos only
        mediaUrls = allMediaItems.map(item => ({
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
        }));
        media_metadata = {
          mediaType: 'multi_video',
          items: allMediaItems.map(item => ({
            type: item.type,
            id: item.id,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
          })),
        };
      } else if (hasPhotos) {
        // Photos only (single or multiple)
        mediaUrls = allMediaItems.map(p => p.url);
        media_metadata = {
          photos: allMediaItems.map(item => ({
            id: item.id,
            url: item.url,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
          }))
        };
      }
    }

    // Determine content type based on media composition
    const hasVideos = videoMedia.length > 0;
    const hasPhotos = photoMedia.length > 0;
    const isMixedMedia = hasVideos && hasPhotos;
    const isMultipleVideos = videoMedia.length > 1;
    const isSingleVideo = videoMedia.length === 1 && !hasPhotos;
    const isPhotoOnly = hasPhotos && !hasVideos;

    // Check if we have valid media URLs
    const hasMediaUrls = mediaUrls && (
      isSingleVideo ?
        (mediaUrls?.videoUrl && mediaUrls?.thumbnailUrl) :
        (Array.isArray(mediaUrls) ? mediaUrls.length > 0 : true)
    );

    const jsonbContent = postData.textContent ? createJSONBContent(postData.textContent) : null;

    const tagsToInsert = postData.tags && Array.isArray(postData.tags) && postData.tags.length > 0
      ? postData.tags
      : null;

    let subcircleId: string | null = null;
    if (circleIds.length > 0) {
      try {
        // For anonymous posts, userId is null but we still need the subcircle_id
        // Get the actual logged-in user's subcircle membership
        let actualUserId = userId;
        if (!actualUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          actualUserId = session?.user?.id || null;
        }

        if (actualUserId) {
          const { data: membership } = await supabase
            .from('circle_members')
            .select('current_subcircle_id')
            .eq('user_id', actualUserId)
            .eq('circle_id', circleIds[0])
            .maybeSingle();

          if (membership?.current_subcircle_id) {
            subcircleId = membership.current_subcircle_id;
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        // User might not be member of this circle
      }
    }

    // All posts are published immediately (no Bunny CDN processing pipeline)
    const postInserts = [];

    // Base post data shared by all posts
    const basePostData = {
      user_id: userId,
      content_type: postData.contentType,
      content: jsonbContent,
      media_metadata: media_metadata,
      media_urls: mediaUrls,
      tags: tagsToInsert,
      is_anonymous: isAnonymous || false,
      anonymous_username: isAnonymous ? anonymousUsername : null,
      is_published: true,
      status: 'published',
      processing_status: hasMediaUrls ? 'completed' : null,
    };

    // If visibility is 'public', create a world feed post (no circles)
    if (visibility === 'public') {
      postInserts.push({
        ...basePostData,
        circle_ids: null,
        subcircle_id: null,
        visibility: 'public',
      });
    }

    // Create separate post for EACH circle
    if (circleIds && circleIds.length > 0) {
      for (const circleId of circleIds) {
        postInserts.push({
          ...basePostData,
          circle_ids: [circleId],  // Single circle only
          subcircle_id: subcircleId,
          visibility: 'circle_only',  // Circle posts are private to circle members
        });
      }
    }

    // Insert all posts at once
    const { data: posts, error: postErr } = await supabase
      .from('circle_posts')
      .insert(postInserts)
      .select('id');

    if (postErr || !posts || posts.length === 0) {
      throw postErr || new Error('Post insert failed');
    }

    // Use first post as primary
    const post = posts[0];

    // Invalidate feed cache so new post shows up when user navigates to Home
    invalidateFeedCache();

    return post.id;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    throw err;
  }
};

export const isPostReady = async (postId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('circle_posts')
      .select('processing_status, is_published, content_type')
      .eq('id', postId)
      .single();

    if (error || !data) return false;

    if (data.content_type === 'text') return true;

    return data.is_published === true || data.processing_status === 'completed';
  } catch (error) {
    return false;
  }
};

export const publishPost = async (postId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('circle_posts')
      .update({
        is_published: true,
        processing_status: 'completed',
        processing_updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    return !error;
  } catch (error) {
    console.error('Error publishing post:', error);
    return false;
  }
};

export const validatePostData = (
  postData: Partial<PostData>
): string | null => {
  // Circle selection is now optional - empty circleIds means "Main Feed" (public)
  // if (!postData.circleIds?.length) return 'Please select at least one circle';
  if (!postData.contentType) return 'Content type must be specified';
  if (postData.contentType === 'text' && !postData.textContent?.trim())
    return 'Please enter some text';
  if (
    (postData.contentType === 'photo' || postData.contentType === 'video') &&
    !postData.media?.length
  )
    return 'Please select media';
  return null;
};