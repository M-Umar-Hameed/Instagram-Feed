import React from 'react';
import { Platform, Image as RNImage, ImageStyle, StyleProp, ImageSourcePropType } from 'react-native';
import { Image as ExpoImage, ImageContentFit, ImageSource, ImageContentPosition } from 'expo-image';

// Source can be a URI string, an object with uri, or a local require() asset (number)
type ImageSourceType = string | { uri: string } | number | ImageSourcePropType;

interface CrossPlatformImageProps {
  source: ImageSourceType;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  transition?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * CrossPlatformImage - Uses React Native Image on Android to prevent flickering,
 * and expo-image on iOS for better performance and caching.
 *
 * PERFORMANCE NOTES:
 * - Default cache policy is 'memory-disk' which provides best balance
 * - expo-image (iOS) manages cache automatically with LRU eviction
 * - React Native Image (Android) uses native caching
 * - For large lists, consider using 'disk' policy to save memory
 * - Cache is automatically managed but can grow to 100s of MB
 * - Use clearImageCache() utility to manually clear when needed
 */
export const CrossPlatformImage: React.FC<CrossPlatformImageProps> = ({
  source,
  style,
  contentFit = 'cover',
  contentPosition,
  cachePolicy = 'memory-disk',
  transition = 0,
  placeholder,
  onLoad,
  onError,
}) => {
  // Check if source is a local require() asset (number) or already an ImageSourcePropType
  const isLocalAsset = typeof source === 'number' ||
    (typeof source === 'object' && source !== null && !('uri' in source));

  if (Platform.OS === 'android') {
    // Use React Native Image on Android to prevent flickering
    const resizeMode = contentFit === 'contain' ? 'contain' :
                       contentFit === 'fill' ? 'stretch' :
                       contentFit === 'none' ? 'center' : 'cover';

    // Handle local assets vs URI-based sources
    const imageSource = isLocalAsset
      ? source as ImageSourcePropType
      : typeof source === 'string'
        ? { uri: source }
        : source as { uri: string };

    return (
      <RNImage
        source={imageSource}
        style={style}
        resizeMode={resizeMode}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }

  // Use expo-image on iOS
  // expo-image can handle both local assets and URIs
  // @ts-ignore
  const expoSource: ImageSource = isLocalAsset
    ? source as ImageSource
    : typeof source === 'string'
      ? source
      : (source as { uri: string }).uri;

  return (
    <ExpoImage
      source={expoSource}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      cachePolicy={cachePolicy}
      transition={transition}
      placeholder={placeholder}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

/**
 * Utility function to clear image cache when memory is low
 * Call this during app idle time or when receiving memory warnings
 */
export const clearImageCache = async (): Promise<void> => {
  if (Platform.OS === 'ios') {
    try {
      // expo-image provides clearDiskCache and clearMemoryCache
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Image: ExpoImageModule } = require('expo-image');
      if (ExpoImageModule.clearDiskCache) {
        await ExpoImageModule.clearDiskCache();
      }
      if (ExpoImageModule.clearMemoryCache) {
        await ExpoImageModule.clearMemoryCache();
      }
    } catch (error) {
      console.warn('[CrossPlatformImage] Failed to clear image cache:', error);
    }
  }
  // Android RN Image cache is managed natively, no manual clearing needed
};


