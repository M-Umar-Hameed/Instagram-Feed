import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { CrossPlatformImage as Image } from '../ui/CrossPlatformImage';
import { Ionicons } from '@expo/vector-icons';
import type { ImageStyle } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');

export interface CarouselMediaItem {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
}

interface ImageCarouselRendererProps {
  mediaItems: CarouselMediaItem[];
  visibleHeight: number;
  onPress: () => void;
}

/**
 * Renders a horizontal carousel for posts with multiple media items (photos, videos, or mixed).
 * Includes pagination dots and handles carousel scroll state internally.
 */
const ImageCarouselRenderer: React.FC<ImageCarouselRendererProps> = ({
  mediaItems,
  visibleHeight,
  onPress,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  const handleCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      if (newIndex !== currentMediaIndex && newIndex >= 0 && newIndex < mediaItems.length) {
        setCurrentMediaIndex(newIndex);
      }
    },
    [currentMediaIndex, mediaItems.length],
  );

  return (
    <View style={[styles.wrapper, { height: visibleHeight }]}>
      {/* Carousel ScrollView */}
      <ScrollView
        ref={carouselScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleCarouselScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        style={{ width: SCREEN_WIDTH, height: visibleHeight }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {mediaItems.map((item, idx) => (
          <Pressable
            key={idx}
            style={{
              width: SCREEN_WIDTH,
              height: visibleHeight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={onPress}
          >
            {item.type === 'photo' ? (
              <Image
                source={item.url}
                style={{ width: SCREEN_WIDTH, height: visibleHeight } as ImageStyle}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : (
              // Video in carousel - thumbnail with play icon
              <View style={{ width: SCREEN_WIDTH, height: visibleHeight, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                {item.thumbnailUrl ? (
                  <Image
                    source={item.thumbnailUrl}
                    style={{ width: SCREEN_WIDTH, height: visibleHeight } as ImageStyle}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                ) : null}
                {/* Play icon overlay for carousel videos */}
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={70} color="#fff" style={{ marginLeft: 6 }} />
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.paginationContainer} pointerEvents="none">
        {mediaItems.map((_item, idx) => (
          <View
            key={idx}
            style={[
              styles.paginationDot,
              idx === currentMediaIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#000',
    width: SCREEN_WIDTH,
  } as ViewStyle,
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  } as ViewStyle,
  paginationContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  } as ViewStyle,
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  } as ViewStyle,
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
});

export default React.memo(ImageCarouselRenderer);
