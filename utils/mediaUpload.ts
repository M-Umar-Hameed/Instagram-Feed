
import { supabase, getCachedUser, getSupabaseUrl } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
// isFallbackId stub (Bunny CDN removed)
const isFallbackId = (_id: string) => false;
// videoConverter removed
const processVideoForUpload = async (uri: string): Promise<string> => uri;
const needsConversion = (_uri?: string) => false;

export const getFileExtension = (path: string): string => {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

export const getMimeType = (fileExt: string): string => {
  switch (fileExt) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
};

export const uploadMediaToSupabase = async (
  uri: string,
  bucket: string = 'circle-media',
  folder: string = 'posts'
): Promise<string> => {
  try {

    const fileExt = getFileExtension(uri) || 'mp4';
    const filePath = `${folder}/${uuidv4()}.${fileExt}`;
    const mimeType = getMimeType(fileExt);

    try {
      // Use FormData for more robust file uploads in React Native
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: filePath.split('/').pop(),
        type: mimeType,
      } as any);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, formData, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading to Supabase:', error);
        
        if (error.message?.includes('403') || error.message?.includes('permission denied')) {
          throw new Error('Access denied. Check authentication and bucket permissions.');
        } else if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw new Error(`Bucket '${bucket}' not found. Please create it in your Supabase dashboard.`);
        } else if (error.message?.includes('413') || error.message?.includes('too large')) {
          throw new Error('File too large. Try uploading a smaller file.');
        } else {
          throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
        }
      }

      const publicUrl = `${getSupabaseUrl()}/storage/v1/object/public/${bucket}/${filePath}`;
      return publicUrl;
    } catch (uploadError: any) {
      console.error('Error in storage.upload:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message || 'Network request failed'}`);
    }
  } catch (error) {
    console.error('Error in uploadMediaToSupabase:', error);
    throw error;
  }
};

export const getSignedUrl = async (
  bucket: string,
  filePath: string,
  expiresIn: number = 60 * 60
): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    throw error;
  }
};

export const uploadMultipleMedia = async (
  uris: string[],
  bucket: string = 'circle-media',
  folder: string = 'posts'
): Promise<string[]> => {
  try {
    const uploadPromises = uris.map((uri) =>
      uploadMediaToSupabase(uri, bucket, folder)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple media:', error);
    throw error;
  }
};

export const pickVideo =
  async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    try {

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error('Permission to access media library was denied');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false, // Disabled: iOS forces 1:1 square crop when true
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error picking video:', error);
      throw error;
    }
  };

export const recordVideo =
  async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    try {

      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error('Permission to access camera was denied');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false, // Disabled: iOS forces 1:1 square crop when true
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error recording video:', error);
      throw error;
    }
  };

export const registerPostMedia = async (
  postId: string,
  videoAsset: ImagePicker.ImagePickerAsset,
  thumbnailAsset: ImagePicker.ImagePickerAsset,
  circleIds: string[]
): Promise<{
  fileIds: { videoId: string; thumbnailId: string };
  mediaUrls: { videoUrl: string; thumbnailUrl: string };
  mediaMetadata: any;
}> => {
  try {
    const primaryCircleId = circleIds[0];

    const { user } = await getCachedUser();
    const userId = user?.id;

    if (!userId) {
      console.warn('No authenticated user found for file registration');
    }

    // Process video - convert ALL video formats to MP4 for maximum compatibility
    let processedVideoUri = videoAsset.uri;
    let videoExt = getFileExtension(videoAsset.uri);

    // Always convert non-MP4 videos to MP4
    if (needsConversion(videoAsset.uri)) {
      console.log('[mediaUpload] Converting video to MP4 for compatibility...', videoExt);
      try {
        processedVideoUri = await processVideoForUpload(videoAsset.uri);
        videoExt = 'mp4'; // Update extension since we converted to MP4
        console.log('[mediaUpload] Video conversion complete');
      } catch (conversionError) {
        console.warn('[mediaUpload] Video conversion failed, using original:', conversionError);
        // Continue with original file - it may still work on some devices
      }
    } else {
      console.log('[mediaUpload] Video is already MP4, no conversion needed');
    }

    const videoMimeType = getMimeType(videoExt);
    const videoFileName =
      Date.now() +
      '-' +
      Math.random().toString(36).substring(2, 10) +
      '.' +
      videoExt;
    const videoPath = `circle_post/${primaryCircleId}/${videoFileName}`;

    const thumbExt = getFileExtension(thumbnailAsset.uri);
    const thumbMimeType = getMimeType(thumbExt);
    const thumbFileName =
      Date.now() +
      '-' +
      Math.random().toString(36).substring(2, 10) +
      '.' +
      thumbExt;
    const thumbPath = `circle_post_thumbnail/${primaryCircleId}/${thumbFileName}`;

    let actualVideoPath = videoPath;
    let actualThumbPath = thumbPath;

    try {
      // Use FormData for video upload
      const videoFormData = new FormData();
      videoFormData.append('file', {
        uri: processedVideoUri,
        name: videoFileName,
        type: videoMimeType,
      } as any);

      const videoUploadResult = await supabase.storage
        .from('public-media')
        .upload(videoPath, videoFormData, { 
          contentType: videoMimeType,
          upsert: true
        });

      if (videoUploadResult.error) {
        throw new Error(`Failed to upload video: ${videoUploadResult.error.message}`);
      }

      // Use FormData for thumbnail upload
      const thumbFormData = new FormData();
      thumbFormData.append('file', {
        uri: thumbnailAsset.uri,
        name: thumbFileName,
        type: thumbMimeType,
      } as any);

      const thumbUploadResult = await supabase.storage
        .from('public-media')
        .upload(thumbPath, thumbFormData, { 
          contentType: thumbMimeType,
          upsert: true
        });

      if (thumbUploadResult.error) {
        throw new Error(`Failed to upload thumbnail: ${thumbUploadResult.error.message}`);
      }

      actualVideoPath = videoUploadResult.data?.path || videoPath;
      actualThumbPath = thumbUploadResult.data?.path || thumbPath;
    } catch (uploadError: any) {
      console.error('[mediaUpload] Binary upload failed:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
    }

    console.log('ACTUAL PATHS FROM SUPABASE UPLOAD:', {
      videoPath: actualVideoPath,
      thumbnailPath: actualThumbPath,
    });

    console.log('Registering video file via direct insert');
    const videoMetadata = {
      uploadedBy: userId,
      contentType: 'video',
      originalName: videoAsset.fileName || videoFileName,
      uploadEnvironment: 'development-build',
    };

    const { data: videoData, error: videoError } = await supabase
      .from('storage_files')
      .insert({
        bucket_name: 'public-media',
        storage_path: actualVideoPath,
        original_name: videoFileName,
        mime_type: videoMimeType,
        size_bytes: videoAsset.fileSize || 0,
        visibility: 'public',
        context_type: 'circle_post',
        circle_ids: circleIds,
        metadata: videoMetadata,
        created_by: userId,
      })
      .select();

    if (videoError) {
      console.error('Video registration error:', videoError);
      throw new Error(`Failed to register video: ${videoError.message}`);
    }

    if (!videoData || videoData.length === 0) {
      throw new Error('Failed to get video file data');
    }

    const videoFile = videoData[0].id;
    console.log('Successfully registered video with ID:', videoFile);

    console.log('Registering thumbnail file via direct insert');
    const thumbMetadata = {
      forFile: videoFile,
      forType: 'video',
      uploadedBy: userId,
      uploadEnvironment: 'development-build',
    };

    const { data: thumbData, error: thumbError } = await supabase
      .from('storage_files')
      .insert({
        bucket_name: 'public-media',
        storage_path: actualThumbPath,
        original_name: thumbFileName,
        mime_type: thumbMimeType,
        size_bytes: thumbnailAsset.fileSize || 0,
        visibility: 'public',
        context_type: 'circle_post_thumbnail',
        circle_ids: circleIds,
        metadata: thumbMetadata,
        created_by: userId,
      })
      .select();

    if (thumbError) {
      console.error('Thumbnail registration error:', thumbError);
      throw new Error(`Failed to register thumbnail: ${thumbError.message}`);
    }

    if (!thumbData || thumbData.length === 0) {
      throw new Error('Failed to get thumbnail file data');
    }

    const thumbnailFile = thumbData[0].id;
    console.log('Successfully registered thumbnail with ID:', thumbnailFile);

    await supabase.from('post_files').insert([
      {
        post_id: postId,
        file_id: videoFile,
        display_order: 0,
      },
      {
        post_id: postId,
        file_id: thumbnailFile,
        display_order: 1,
      },
    ]);

    const videoUrl = `${getSupabaseUrl()}/storage/v1/object/public/public-media/${actualVideoPath}`;
    const thumbnailUrl = `${getSupabaseUrl()}/storage/v1/object/public/public-media/${actualThumbPath}`;

    const mediaMetadata = {
      [videoFile]: {
        contentType: 'video',
        thumbnail: thumbnailFile,
      },
    };

    const mediaUrls = {
      videoUrl,
      thumbnailUrl,
    };

    console.log('Updating post with ACTUAL Supabase URLs:', {
      postId,
      videoUrl,
      thumbnailUrl,
    });

    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({
        media_urls: mediaUrls,
        media_metadata: mediaMetadata,
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post with media URLs:', updateError);
    }

    return {
      fileIds: {
        videoId: videoFile,
        thumbnailId: thumbnailFile,
      },
      mediaUrls,
      mediaMetadata,
    };
  } catch (error) {
    console.error('Error registering post media:', error);
    throw error;
  }
};

export const updatePostWithPredictableUrls = async (
  postId: string,
  videoPath: string,
  thumbnailPath?: string
): Promise<boolean> => {
  try {
    console.log('Updating post with actual upload paths:', {
      postId,
      videoPath,
      thumbnailPath,
    });

    const videoUrl = videoPath.startsWith('http')
      ? videoPath
      : `${getSupabaseUrl()}/storage/v1/object/public/public-media/${videoPath}`;

    let thumbnailUrl = '';
    if (thumbnailPath) {
      thumbnailUrl = thumbnailPath.startsWith('http')
        ? thumbnailPath
        : `${getSupabaseUrl()}/storage/v1/object/public/public-media/${thumbnailPath}`;
    } else if (videoPath) {
      const derivedThumbPath = videoPath
        .replace('circle_post', 'circle_post_thumbnail')
        .replace(/\.\w+$/, '_thumb.jpg');
      thumbnailUrl = `${getSupabaseUrl()}/storage/v1/object/public/public-media/${derivedThumbPath}`;
    }

    const mediaUrls = {
      videoUrl,
      thumbnailUrl,
    };

    console.log('Updating with constructed media URLs:', {
      postId,
      videoUrl,
      thumbnailUrl,
    });

    const { error: updateError } = await supabase
      .from('circle_posts')
      .update({
        media_urls: mediaUrls,
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post with media_urls:', updateError);
      return false;
    }

    console.log('Successfully updated post with media_urls');
    return true;
  } catch (error) {
    console.error('Error in updatePostWithPredictableUrls:', error);
    return false;
  }
};

export const updateProcessingStatus = async (
  postId: string,
  status:
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'moderation_required'
    | 'rejected',
  details?: Record<string, any>
): Promise<boolean> => {
  try {
    console.log(
      `Updating processing status for post ${postId} to ${status}`,
      details
    );

    const { error } = await supabase
      .from('circle_posts')
      .update({
        processing_status: status,
        processing_details: details || null,
        processing_updated_at: new Date().toISOString(),
        ...(status === 'completed' ? { is_published: true } : {}),
      })
      .eq('id', postId);

    if (error) {
      console.error('Error updating processing status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateProcessingStatus:', error);
    return false;
  }
};

export const checkProcessingStatus = async (
  postId: string
): Promise<{
  status: string;
  details?: Record<string, any>;
  updated_at?: string;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('circle_posts')
      .select(
        'processing_status, processing_details, processing_updated_at, media_urls, content_type'
      )
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error checking processing status:', error);
      return null;
    }

    const details = data.processing_details || {};
    const hasMediaUrls =
      data.media_urls?.videoUrl && data.media_urls?.thumbnailUrl;
    const videoId = details.videoId;
    const thumbnailId = details.thumbnailId;

    let usingFallbackIds = false;
    try {
      if (videoId && thumbnailId) {
        usingFallbackIds = isFallbackId(videoId) || isFallbackId(thumbnailId);
      }
    } catch (err) {
      console.warn('Error checking fallback IDs:', err);
    }

    if (data.content_type === 'text') {
      return {
        status: 'completed',
        details: details,
        updated_at: data.processing_updated_at,
      };
    }

    const effectiveStatus =
      usingFallbackIds &&
        hasMediaUrls &&
        (!data.processing_status ||
          data.processing_status === 'queued' ||
          data.processing_status === 'processing')
        ? 'completed'
        : data.processing_status || 'unknown';

    return {
      status: effectiveStatus,
      details: {
        ...details,
        videoUrl: data.media_urls?.videoUrl,
        thumbnailUrl: data.media_urls?.thumbnailUrl,
        usingFallbackIds: usingFallbackIds,
      },
      updated_at: data.processing_updated_at,
    };
  } catch (error) {
    console.error('Error in checkProcessingStatus:', error);
    return null;
  }
};

export const pollProcessingStatus = async (
  postId: string,
  onStatusChange: (status: string, details?: Record<string, any>) => void,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<void> => {
  let attempts = 0;

  const checkStatus = async () => {
    const result = await checkProcessingStatus(postId);

    if (!result) {
      onStatusChange('error', { message: 'Could not retrieve status' });
      return;
    }

    onStatusChange(result.status, result.details);

    if (['completed', 'failed', 'rejected'].includes(result.status)) {
      return;
    }

    if (attempts < maxAttempts) {
      attempts++;
      setTimeout(checkStatus, intervalMs);
    } else {
      onStatusChange('timeout', { message: 'Status check timed out' });
    }
  };

  checkStatus();
};