import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { CrossPlatformImage as Image } from '../ui/CrossPlatformImage';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

interface ProfileAvatarProps {
  uri: string | null;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showEditButton?: boolean;
  name?: string;
}

const SIZES = {
  small: wp('12%'),
  medium: wp('18%'),
  large: wp('28%'),
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  uri,
  size = 'large',
  onPress,
  showEditButton = false,
}) => {
  const dimension = SIZES[size];
  const avatarStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    minWidth: size === 'large' ? 100 : size === 'medium' ? 68 : 48,
    minHeight: size === 'large' ? 100 : size === 'medium' ? 68 : 48,
  };

  const editButtonSize = size === 'large' ? wp('6%') : size === 'medium' ? wp('5%') : wp('4%');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <Image
        source={uri || 'https://img.icons8.com/color/96/test-account.png'}
        style={[styles.avatar, avatarStyle]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
      {showEditButton && (
        <View style={[styles.editButton, { width: editButtonSize, height: editButtonSize, borderRadius: editButtonSize / 2 }]}>
          <Ionicons name="add" size={editButtonSize * 0.65} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#F0F0F0',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00b1ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});


