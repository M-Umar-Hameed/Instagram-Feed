import React from 'react';
import { Dimensions, Pressable, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { CrossPlatformImage as Image } from '../ui/CrossPlatformImage';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width: SCREEN_WIDTH } = Dimensions.get('screen');

interface SingleImageRendererProps {
  imageUrl: string;
  visibleHeight: number;
  onPress: () => void;
}

/**
 * Renders a single full-screen image post with tap-to-interact overlay.
 */
const SingleImageRenderer: React.FC<SingleImageRendererProps> = ({
  imageUrl,
  visibleHeight,
  onPress,
}) => {
  return (
    <>
      <Image
        source={imageUrl}
        style={{ width: '100%', height: '100%' } as ImageStyle}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
      />
      <Pressable style={styles.tapArea} onPress={onPress} />
    </>
  );
};

const styles = StyleSheet.create({
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as ViewStyle,
});

export default React.memo(SingleImageRenderer);
