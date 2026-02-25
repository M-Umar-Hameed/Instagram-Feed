import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { ProfileAvatar } from './ProfileAvatar';

import { ProfileStats, StatItem } from './ProfileStats';

export interface ProfileHeaderProps {
  avatarUrl: string | null;
  auraPoints: number;
  displayName: string;
  username: string | null;
  bio: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onAvatarPress?: () => void;
  onAuraPress?: () => void;
  onAuraBadgePress?: () => void; // Callback when tier badge is pressed (for restricted explanation)
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onAddBioPress?: () => void;
  onNameEditPress?: () => void;
  showAddButton?: boolean;
  isEditable?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  avatarUrl,
  auraPoints,
  displayName,
  username,
  bio,
  postsCount,
  followersCount,
  followingCount,
  onAvatarPress,
  onAuraPress,
  onAuraBadgePress,
  onFollowersPress,
  onFollowingPress,
  onAddBioPress,
  onNameEditPress,
  showAddButton = false,
  isEditable = false,
}) => {
  const stats: StatItem[] = [
    { value: postsCount, label: 'Posts' },
    { value: followersCount, label: 'Followers', onPress: onFollowersPress },
    { value: followingCount, label: 'Following', onPress: onFollowingPress },
  ];

  return (
    <View style={styles.container}>
      {/* Row 1: Avatar + Aura */}
      <View style={styles.avatarRow}>
        <ProfileAvatar
          uri={avatarUrl}
          size="large"
          onPress={onAvatarPress}
          showEditButton={showAddButton}
          name={displayName}
        />
        <View style={styles.auraContainer}>
          <Text style={{ fontSize: wp('4%'), fontWeight: '600', color: '#666' }}>
            ✨ {auraPoints} Aura
          </Text>
        </View>
      </View>

      {/* Row 2: Name with edit icon */}
      <View style={styles.nameRow}>
        <Text style={styles.displayName}>{displayName}</Text>
        {isEditable && onNameEditPress && (
          <TouchableOpacity onPress={onNameEditPress} style={styles.editNameButton}>
            <Ionicons name="pencil" size={wp('4%')} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Row 3: Username */}
      {username && (
        <Text style={styles.username}>@{username}</Text>
      )}

      {/* Row 3: Bio */}
      {bio ? (
        <Text style={styles.bio}>{bio}</Text>
      ) : isEditable && onAddBioPress ? (
        <TouchableOpacity onPress={onAddBioPress} style={styles.addBioButton}>
          <View style={styles.addBioContent}>
            <Ionicons name="add-circle-outline" size={wp('4%')} color="#00b1ff" />
            <Text style={styles.addBioText}>Add bio</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Row 4: Stats */}
      <ProfileStats stats={stats} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
    paddingBottom: hp('1%'),
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
    width: '100%',
  },
  auraContainer: {
    marginLeft: wp('4%'),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('0.3%'),
  },
  displayName: {
    fontSize: wp('6%'),
    fontWeight: '700',
    color: '#000',
  },
  editNameButton: {
    marginLeft: wp('2%'),
    padding: wp('1%'),
  },
  username: {
    fontSize: wp('3.8%'),
    color: '#666',
    marginBottom: hp('0.5%'),
  },
  bio: {
    fontSize: wp('3.8%'),
    color: '#666',
    lineHeight: wp('5.5%'),
    marginBottom: hp('1%'),
  },
  addBioButton: {
    marginBottom: hp('1%'),
    marginTop: hp('0.5%'),
  },
  addBioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
  },
  addBioText: {
    fontSize: wp('3.8%'),
    color: '#00b1ff',
    fontWeight: '500',
  },
});


