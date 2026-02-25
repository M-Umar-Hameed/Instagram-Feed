import React, { useMemo } from 'react';
import {
  Text,
  TextStyle,
  StyleProp,
  TouchableOpacity,
  Pressable,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../utils/theme';

// Global navigation lock to prevent multiple navigations across all hashtag instances
let globalHashtagNavigationLock = false;

interface HashtagTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  hashtagStyle?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onHashtagPress?: (hashtag: string) => void;
  onMentionPress?: (username: string) => void;
  selectable?: boolean;
}

interface TextPart {
  type: 'text' | 'hashtag' | 'mention' | 'url';
  content: string;
}

// Regex patterns
const HASHTAG_REGEX = /#[\w\u0600-\u06FF]+/g; // Supports Arabic/Urdu characters too
const MENTION_REGEX = /@[\w]+/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;

/**
 * HashtagText - A component that renders text with clickable hashtags and mentions
 *
 * Usage:
 * <HashtagText style={styles.text}>
 *   Check out #programming and @john
 * </HashtagText>
 */
export default function HashtagText({
  children,
  style,
  hashtagStyle,
  mentionStyle,
  numberOfLines,
  onHashtagPress,
  onMentionPress,
  selectable = false,
}: HashtagTextProps) {
  // Parse text into parts
  const parts = useMemo(() => {
    if (!children || typeof children !== 'string') {
      return [{ type: 'text', content: children || '' }] as TextPart[];
    }

    const result: TextPart[] = [];
    let lastIndex = 0;
    const text = children;

    // Combined regex to find all special patterns
    const combinedRegex = new RegExp(
      `(${HASHTAG_REGEX.source})|(${MENTION_REGEX.source})|(${URL_REGEX.source})`,
      'g'
    );

    let match;
    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Determine type
      const matchedText = match[0];
      let type: TextPart['type'] = 'text';

      if (matchedText.startsWith('#')) {
        type = 'hashtag';
      } else if (matchedText.startsWith('@')) {
        type = 'mention';
      } else if (matchedText.startsWith('http')) {
        type = 'url';
      }

      result.push({
        type,
        content: matchedText,
      });

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [children]);

  // Handle hashtag press with global navigation lock
  const handleHashtagPress = (hashtag: string) => {
    // Use global lock to prevent multiple navigations
    if (globalHashtagNavigationLock) {
      return;
    }

    const cleanTag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;

    if (onHashtagPress) {
      onHashtagPress(cleanTag);
    } else {
      // Set global lock and navigate immediately
      globalHashtagNavigationLock = true;

      // Navigate immediately
      router.push(`/hashtag/${cleanTag}`);

      // Reset lock after navigation completes
      setTimeout(() => {
        globalHashtagNavigationLock = false;
      }, 1000);
    }
  };

  // Handle mention press
  const handleMentionPress = (mention: string) => {
    const username = mention.startsWith('@') ? mention.substring(1) : mention;

    if (onMentionPress) {
      onMentionPress(username);
    }
  };

  // Render parts - Use Pressable wrapper on iOS for better touch handling
  const renderParts = () => {
    return parts.map((part, index) => {
      switch (part.type) {
        case 'hashtag':
          // On iOS, wrap in Pressable to properly capture touch before parent
          if (Platform.OS === 'ios') {
            return (
              <Pressable
                key={`hashtag-${index}`}
                onPress={() => handleHashtagPress(part.content)}
                onPressIn={(e) => {
                  // Prevent event from reaching parent TouchableOpacity
                  e.stopPropagation();
                }}
                hitSlop={{ top: 5, bottom: 5, left: 2, right: 2 }}
              >
                <Text style={[styles.hashtag, hashtagStyle]}>
                  {part.content}
                </Text>
              </Pressable>
            );
          }
          // On Android, Text onPress works fine
          return (
            <Text
              key={`hashtag-${index}`}
              style={[styles.hashtag, hashtagStyle]}
              onPress={() => handleHashtagPress(part.content)}
              suppressHighlighting={false}
            >
              {part.content}
            </Text>
          );

        case 'mention':
          if (Platform.OS === 'ios') {
            return (
              <Pressable
                key={`mention-${index}`}
                onPress={() => handleMentionPress(part.content)}
                onPressIn={(e) => e.stopPropagation()}
                hitSlop={{ top: 5, bottom: 5, left: 2, right: 2 }}
              >
                <Text style={[styles.mention, mentionStyle]}>
                  {part.content}
                </Text>
              </Pressable>
            );
          }
          return (
            <Text
              key={`mention-${index}`}
              style={[styles.mention, mentionStyle]}
              onPress={() => handleMentionPress(part.content)}
              suppressHighlighting={false}
            >
              {part.content}
            </Text>
          );

        case 'url':
          return (
            <Text
              key={`url-${index}`}
              style={styles.url}
            >
              {part.content}
            </Text>
          );

        default:
          return (
            <Text key={`text-${index}`}>
              {part.content}
            </Text>
          );
      }
    });
  };

  return (
    <Text style={style} numberOfLines={numberOfLines} selectable={selectable}>
      {renderParts()}
    </Text>
  );
}

/**
 * HashtagChip - A standalone hashtag chip component
 */
export function HashtagChip({
  tag,
  onPress,
  style,
  textStyle,
  showHash = true,
}: {
  tag: string;
  onPress?: (tag: string) => void;
  style?: StyleProp<any>;
  textStyle?: StyleProp<TextStyle>;
  showHash?: boolean;
}) {
  if (!tag) return null;

  const cleanTag = tag.startsWith('#') ? tag.substring(1) : tag;

  const handlePress = () => {
    // Use global lock to prevent multiple navigations
    if (globalHashtagNavigationLock) {
      return;
    }

    if (onPress) {
      onPress(cleanTag);
    } else {
      globalHashtagNavigationLock = true;
      router.push(`/hashtag/${cleanTag}`);

      // Reset flag after navigation
      setTimeout(() => {
        globalHashtagNavigationLock = false;
      }, 1000);
    }
  };

  // Use Pressable on iOS for better touch handling
  if (Platform.OS === 'ios') {
    return (
      <Pressable
        style={[styles.chip, style]}
        onPress={handlePress}
        onPressIn={(e) => e.stopPropagation()}
      >
        <Text style={[styles.chipText, textStyle]}>
          {showHash ? '#' : ''}{cleanTag}
        </Text>
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.chip, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, textStyle]}>
        {showHash ? '#' : ''}{cleanTag}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * HashtagList - Renders a horizontal list of hashtag chips
 */
export function HashtagList({
  tags,
  onTagPress,
  containerStyle,
  chipStyle,
  textStyle,
  maxDisplay,
}: {
  tags: string[];
  onTagPress?: (tag: string) => void;
  containerStyle?: StyleProp<any>;
  chipStyle?: StyleProp<any>;
  textStyle?: StyleProp<TextStyle>;
  maxDisplay?: number;
}) {
  if (!tags || tags.length === 0) return null;

  const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
  const hiddenCount = maxDisplay && tags.length > maxDisplay ? tags.length - maxDisplay : 0;

  return (
    <View style={[styles.chipContainer, containerStyle]}>
      {displayTags.map((tag, index) => (
        <HashtagChip
          key={`${tag}-${index}`}
          tag={tag}
          onPress={onTagPress}
          style={chipStyle}
          textStyle={textStyle}
        />
      ))}
      {hiddenCount > 0 && (
        <View style={[styles.chip, styles.moreChip, chipStyle]}>
          <Text style={[styles.chipText, styles.moreChipText, textStyle]}>
            +{hiddenCount} more
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * parseHashtags - Utility function to extract hashtags from text
 */
export function parseHashtags(text: string): string[] {
  if (!text) return [];

  const matches = text.match(HASHTAG_REGEX);
  if (!matches) return [];

  // Remove # prefix and return unique tags
  return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
}

/**
 * formatHashtags - Utility to format an array of tags for display
 */
export function formatHashtags(tags: string[], withHash: boolean = true): string {
  if (!tags || tags.length === 0) return '';

  return tags
    .map(tag => {
      const cleanTag = tag.startsWith('#') ? tag.substring(1) : tag;
      return withHash ? `#${cleanTag}` : cleanTag;
    })
    .join(' ');
}

const styles = StyleSheet.create({
  hashtag: {
    color: colors.primary,
    fontWeight: '500',
  },
  mention: {
    color: colors.primary,
    fontWeight: '500',
  },
  url: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  chip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  chipText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  moreChip: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  moreChipText: {
    color: colors.textSecondary,
  },
});
