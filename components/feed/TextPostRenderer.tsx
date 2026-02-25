import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle , Dimensions } from 'react-native';


const { width: SCREEN_WIDTH } = Dimensions.get('screen');

interface TextPostRendererProps {
  textContent: string;
  visibleHeight: number;
  onPress: () => void;
}

/**
 * Renders a text-only post with centered white text on a dark gradient background.
 */
const TextPostRenderer: React.FC<TextPostRendererProps> = ({
  textContent,
  visibleHeight,
  onPress,
}) => {
  return (
    <View style={[styles.wrapper, { height: visibleHeight }]}>
      <Text style={styles.text}>
        {textContent || 'Text content not available'}
      </Text>
      <Pressable style={styles.tapArea} onPress={onPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#1a1d3a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    width: SCREEN_WIDTH,
  } as ViewStyle,
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as ViewStyle,
});

export default React.memo(TextPostRenderer);
