
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';
import { usePostInteractions } from '../contexts/PostInteractionsContext';
import { useFeedContext } from '../contexts/FeedContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import UnifiedCommentsModal from './UnifiedCommentsModal';
import RepostOptionsModal from './RepostOptionsModal';
import { Database } from '../database.types';
import { repostToProfile } from '../utils/shareUtils';

type CirclePost = Database['public']['Tables']['circle_posts']['Row'];
type User = Database['public']['Tables']['users']['Row'];

export type PostInteractionsStyle = 'tiktok' | 'instagram' | 'fullscreen' | 'circle';

interface PostInteractionsProps {
  post: CirclePost;
  user?: User;
  style: PostInteractionsStyle;
  onCommentPress?: () => void;
  showAuraPoints?: boolean;
  isViewOnly?: boolean;
  sourceCircleId?: string | null;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({
  post,
  user,
  style,
  onCommentPress,
  showAuraPoints = false,
  isViewOnly = false,
  sourceCircleId,
}) => {
  const {
    postStats,
    likePost,
    sharePost,
    currentUser,
    updatePostStats,
    upvotePost,
    downvotePost,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getPostVoteStatus,
    userAuraPoints,
    refreshUserAuraPoints,
    isLoading,
    checkIsReposted,
  } = usePostInteractions();

  const { addLikedPost } = useFeedContext();
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const repostAnimation = useRef(new Animated.Value(1)).current;

  const currentStats = useMemo(() => {
    const stats = postStats[post.id];
    if (stats) {
      return stats;
    }

    return {
      likesCount: post.likes_count || 0,
      commentsCount: post.comments_count || 0,
      sharesCount: post.shares_count || 0,
      isLiked: false,
      upvotesCount: post.upvotes_count || 0,
      downvotesCount: post.downvotes_count || 0,
      netVotes: post.net_votes || 0,
      userVoteType: null as 'upvote' | 'downvote' | null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postStats[post.id], post]);

  useEffect(() => {
    if (currentUser?.id) {
      setIsReposted(checkIsReposted(post.id));
    }
  }, [post.id, currentUser?.id, checkIsReposted]);

  useEffect(() => {
    if (isReposted) {
      Animated.sequence([
        Animated.timing(repostAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(repostAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReposted]);

  const isLiking = isLoading(post.id, 'like');
  const isVoting = isLoading(post.id, 'vote');
  const isSharing = isLoading(post.id, 'share');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLike = async () => {
    if (!currentUser || isLiking) return;

    try {
      await likePost(post.id, post);
      if (addLikedPost && !currentStats.isLiked) {
        addLikedPost(post);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleUpvote = async () => {
    if (!currentUser || isVoting) return;

    upvotePost(post.id, post, sourceCircleId).catch(error => {
      console.error('Error upvoting post:', error);
    });

    if (showAuraPoints) {
      setTimeout(() => {
        refreshUserAuraPoints();
      }, 1000);
    }
  };

  const handleDownvote = async () => {
    if (!currentUser || isVoting) return;

    downvotePost(post.id, post, sourceCircleId).catch(error => {
      console.error('Error downvoting post:', error);
    });

    if (showAuraPoints) {
      setTimeout(() => {
        refreshUserAuraPoints();
      }, 1000);
    }
  };

  const handleShare = (event?: any) => {

    if (event && event.stopPropagation) {
      event.stopPropagation();
    }

    console.log('📤 [POST_INTERACTIONS] Share button clicked');
    console.log('📤 [POST_INTERACTIONS] Post ID:', post.id);
    console.log('📤 [POST_INTERACTIONS] Style:', style);

    if (!currentUser) {
      console.log('⚠️ [POST_INTERACTIONS] User not logged in');
      Alert.alert('Login Required', 'Please login to share posts.');
      return;
    }

    if (!user) {
      console.log('⚠️ [POST_INTERACTIONS] Post author not available');
      Alert.alert('Error', 'Post author information not available.');
      return;
    }

    if (isSharing) {
      console.log('⚠️ [POST_INTERACTIONS] Share already in progress');
      return;
    }

    if (showRepostModal) {
      console.log('⚠️ [POST_INTERACTIONS] Modal already open');
      return;
    }

    console.log('✅ [POST_INTERACTIONS] Opening repost modal');

    setShowRepostModal(true);
  };

  const handleRepost = async (type: 'simple' | 'quote', comment?: string) => {
    if (!currentUser || !user) return;

    try {
      const result = await repostToProfile(post, currentUser, type, comment);

      if (result.success) {
        setIsReposted(true);

        updatePostStats(post.id, {
          sharesCount: (currentStats.sharesCount || 0) + 1
        });

        Animated.sequence([
          Animated.timing(repostAnimation, {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(repostAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Alert.alert('Error', result.error || 'Failed to repost');
      }
    } catch (error) {
      console.error('Error reposting:', error);
      Alert.alert('Error', 'Failed to repost');
    }
  };

  const handleExternalShare = async () => {
    if (!sharePost || !user) return;

    try {
      await sharePost(post, user);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share');
    }
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress();
    } else {
      setShowCommentsModal(true);
    }
  };



  const syncCommentCount = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`Comment added to post ${post.id}`);
    } catch (error) {
      console.error('Error syncing comment count:', error);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const AuraPointsDisplay = () => {
    if (!showAuraPoints || !currentUser) return null;

    return (
      <TouchableOpacity
        style={styles.auraPointsContainer}
        onPress={() => {
          Alert.alert(
            'Aura Points',
            `You currently have ${userAuraPoints} aura points!\n\nAura points are earned from upvotes on your posts:\n• +1 point per 100 upvotes\n• -1 point per 100 downvotes`,
            [{ text: 'Cool!', style: 'default' }]
          );
        }}
      >
        <Ionicons name="star" size={wp('4%')} color="#FFD700" />
        <Text style={styles.auraPointsText}>{userAuraPoints}</Text>
      </TouchableOpacity>
    );
  };

  const renderReelsStyle = () => (
    <View style={styles.tiktokContainer}>
      <View style={[styles.voteContainer, false && styles.disabledButton]}>
        <TouchableOpacity
          style={[styles.tiktokVoteButton, isVoting && styles.disabledButton]}
          onPress={handleUpvote}
          disabled={isVoting}
        >
          <Ionicons
            name="arrow-up"
            size={wp('8%')}
            color={currentStats.userVoteType === 'upvote' ? '#ff3856' : colors.primary}
          />
        </TouchableOpacity>

        <Text style={styles.tiktokVoteText}>{formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}</Text>

        <TouchableOpacity
          style={[styles.tiktokVoteButton, isVoting && styles.disabledButton]}
          onPress={handleDownvote}
          disabled={isVoting}
        >
          <Ionicons
            name="arrow-down"
            size={wp('8%')}
            color={currentStats.userVoteType === 'downvote' ? '#ff3856' : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.tiktokButton, false && styles.disabledButton]}
        onPress={handleCommentPress}
        disabled={false}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={wp('8%')} color={colors.primary} />
        <Text style={styles.tiktokText}>{formatCount(currentStats.commentsCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tiktokButton, isSharing && styles.disabledButton]}
        onPress={handleShare}
        disabled={isSharing}
      >
        <Animated.View style={{ transform: [{ scale: repostAnimation }] }}>
          <Ionicons
            name={isReposted ? "repeat" : "arrow-redo-outline"}
            size={wp('8%')}
            color={isReposted ? "#4CD4CA" : colors.primary}
          />
        </Animated.View>
        <Text style={[styles.tiktokText, isReposted && styles.repostedText]}>
          {isSharing ? 'Sharing...' : formatCount(currentStats.sharesCount)}
        </Text>
      </TouchableOpacity>

      <AuraPointsDisplay />
    </View>
  );

  const renderInstagramStyle = () => (
    <View style={styles.instagramContainer}>
      <View style={styles.instagramLeftActions}>
        { }
        <View style={[styles.instagramVoteGroup, false && styles.disabledButton]}>
          <TouchableOpacity
            style={[styles.instagramButton, isVoting && styles.disabledButton]}
            onPress={handleUpvote}
            disabled={isVoting}
          >
            <Ionicons
              name="arrow-up"
              size={wp('7%')}
              color={currentStats.userVoteType === 'upvote' ? '#ff3856' : '#666'}
            />
          </TouchableOpacity>

          <Text style={styles.voteCountTextBetween}>{formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}</Text>

          <TouchableOpacity
            style={[styles.instagramButton, isVoting && styles.disabledButton]}
            onPress={handleDownvote}
            disabled={isVoting}
          >
            <Ionicons
              name="arrow-down"
              size={wp('7%')}
              color={currentStats.userVoteType === 'downvote' ? '#ff3856' : '#666'}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.instagramButton, false && styles.disabledButton]}
          onPress={handleCommentPress}
          disabled={false}
        >
          <Ionicons name="chatbubble-outline" size={wp('7%')} color="#000" />
          <Text style={styles.instagramCountText}>{formatCount(currentStats.commentsCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.instagramButton, isSharing && styles.disabledButton]}
          onPress={handleShare}
          disabled={isSharing}
        >
          <Animated.View style={{ transform: [{ scale: repostAnimation }] }}>
            <Ionicons
              name={isReposted ? "repeat" : "arrow-redo-outline"}
              size={wp('7%')}
              color={isReposted ? "#4CD4CA" : "#000"}
            />
          </Animated.View>
        </TouchableOpacity>




        <AuraPointsDisplay />
      </View>
    </View>
  );

  const renderFullscreenStyle = () => (
    <View style={styles.fullscreenContainer}>
      <View style={[styles.fullscreenVoteContainer, false && styles.disabledButton]}>
        <TouchableOpacity
          style={[styles.fullscreenButton, isVoting && styles.disabledButton]}
          onPress={handleUpvote}
          disabled={isVoting}
        >
          <View style={styles.fullscreenButtonContainer}>
            <Ionicons
              name="arrow-up"
              size={wp('6%')}
              color={currentStats.userVoteType === 'upvote' ? '#ff3856' : 'white'}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.fullscreenText}>{formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}</Text>

        <TouchableOpacity
          style={[styles.fullscreenButton, isVoting && styles.disabledButton]}
          onPress={handleDownvote}
          disabled={isVoting}
        >
          <View style={styles.fullscreenButtonContainer}>
            <Ionicons
              name="arrow-down"
              size={wp('6%')}
              color={currentStats.userVoteType === 'downvote' ? '#ff3856' : 'white'}
            />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.fullscreenButton, false && styles.disabledButton]}
        onPress={handleCommentPress}
        disabled={false}
      >
        <View style={styles.fullscreenButtonContainer}>
          <Ionicons name="chatbubble-outline" size={wp('6%')} color="white" />
        </View>
        <Text style={styles.fullscreenText}>{formatCount(currentStats.commentsCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fullscreenButton, isSharing && styles.disabledButton]}
        onPress={handleShare}
        disabled={isSharing}
      >
        <View style={styles.fullscreenButtonContainer}>
          <Animated.View style={{ transform: [{ scale: repostAnimation }] }}>
            <Ionicons
              name={isReposted ? "repeat" : "arrow-redo-outline"}
              size={wp('6%')}
              color={isReposted ? "#4CD4CA" : "white"}
            />
          </Animated.View>
        </View>
        <Text style={[styles.fullscreenText, isReposted && styles.repostedText]}>
          {isSharing ? 'Sharing...' : formatCount(currentStats.sharesCount)}
        </Text>
      </TouchableOpacity>

      <AuraPointsDisplay />
    </View>
  );

  const renderCircleStyle = () => (
    <View style={styles.circleContainer}>
      <View style={[styles.circleVoteContainer, false && styles.disabledButton]}>
        <TouchableOpacity
          style={[styles.circleVoteButton, isVoting && styles.disabledButton]}
          onPress={handleUpvote}
          disabled={isVoting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={currentStats.userVoteType === 'upvote' ? '#ff3856' : '#666'}
          />
        </TouchableOpacity>

        <Text style={styles.circleVoteText}>{formatCount(Math.max(currentStats.userVoteType === 'upvote' ? 1 : 0, currentStats.upvotesCount - currentStats.downvotesCount))}</Text>

        <TouchableOpacity
          style={[styles.circleVoteButton, isVoting && styles.disabledButton]}
          onPress={handleDownvote}
          disabled={isVoting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-down"
            size={20}
            color={currentStats.userVoteType === 'downvote' ? '#ff3856' : '#666'}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.circleButton, false && styles.disabledButton]}
        onPress={handleCommentPress}
        disabled={false}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#000000" />
        <Text style={styles.circleText}>{formatCount(currentStats.commentsCount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.circleButton, isSharing && styles.disabledButton]}
        onPress={handleShare}
        disabled={isSharing}
      >
        <Animated.View style={{ transform: [{ scale: repostAnimation }], flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            name={isReposted ? "repeat" : "arrow-redo-outline"}
            size={20}
            color={isReposted ? "#4CD4CA" : "#000000"}
          />
          <Text style={[styles.circleText, isReposted && styles.repostedText, { marginLeft: 6 }]}>
            {isSharing ? 'Sharing...' : 'Share'}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      <AuraPointsDisplay />
    </View>
  );

  const renderInteractions = () => {
    switch (style) {
      case 'tiktok':
        return renderReelsStyle();
      case 'instagram':
        return renderInstagramStyle();
      case 'fullscreen':
        return renderFullscreenStyle();
      case 'circle':
        return renderCircleStyle();
      default:
        return renderReelsStyle();
    }
  };

  return (
    <>
      {renderInteractions()}

      { }
      {!onCommentPress && showCommentsModal && (
        <UnifiedCommentsModal
          visible={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          postId={post.id}
          onCommentAdded={syncCommentCount}
          title="Comments"
        />
      )}

      { }
      {showRepostModal && user && (
        <RepostOptionsModal
          visible={showRepostModal}
          onClose={() => {
            setShowRepostModal(false);
          }}
          post={post}
          user={user}
          onRepost={handleRepost}
          onShare={handleExternalShare}
          isLoading={isSharing}
        />
      )}
    </>
  );
};

export default PostInteractions;

const styles = StyleSheet.create({

  tiktokContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingVertical: hp('1.5%'),
    borderTopWidth: wp('0.3%'),
    borderBottomRightRadius: wp('3%'),
    borderBottomLeftRadius: wp('3%'),
    backgroundColor: 'white',
    minHeight: hp('8%'),
    borderTopColor: colors.primary,
  } as ViewStyle,

  tiktokButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  } as ViewStyle,

  tiktokText: {
    fontSize: wp('3%'),
    marginTop: hp('0.5%'),
    textAlign: 'center',
    color: colors.text,
  } as TextStyle,

  repostedText: {
    color: '#4CD4CA',
    fontWeight: '600',
  } as TextStyle,

  voteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  } as ViewStyle,

  tiktokVoteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('1%'),
  } as ViewStyle,

  tiktokVoteText: {
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
    marginVertical: hp('0.3%'),
    textAlign: 'center',
    color: colors.text,
  } as TextStyle,

  instagramContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('0.5%'),
    paddingVertical: hp('0.8%'),
    backgroundColor: '#fff',
    minHeight: hp('6%'),
  } as ViewStyle,

  instagramLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  instagramButton: {
    marginRight: wp('4%'),
    padding: wp('1%'),
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  instagramCountText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#000',
    marginLeft: wp('1.5%'),
  } as TextStyle,

  instagramBookmarkButton: {
    padding: wp('1%'),
  } as ViewStyle,

  voteCountText: {
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
    color: '#000',
    marginRight: wp('4%'),
  } as TextStyle,

  instagramVoteGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp('-2%'),
  } as ViewStyle,

  voteCountTextBetween: {
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
    color: '#000',
    marginHorizontal: wp('-4%'),
    minWidth: wp('8%'),
    textAlign: 'center',
    marginLeft: wp('-6%'),
    marginRight: wp('-2%'),
  } as TextStyle,

  fullscreenContainer: {
    alignItems: 'center',
    gap: hp('2%'),
  } as ViewStyle,

  fullscreenButton: {
    alignItems: 'center',
    gap: hp('0.5%'),
  } as ViewStyle,

  fullscreenButtonContainer: {
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('5.5%'),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',

  } as ViewStyle,

  fullscreenText: {
    color: 'white',
    fontSize: wp('2.5%'),
    fontWeight: '600',
  } as TextStyle,

  fullscreenVoteContainer: {
    alignItems: 'center',
    gap: hp('0.5%'),
  } as ViewStyle,

  circleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: hp('1.5%'),
    marginTop: hp('1%'),
    flexWrap: 'wrap',
    gap: 6,
  } as ViewStyle,

  circleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 75,
    flex: 1,
    maxWidth: 120,
  } as ViewStyle,

  circleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  } as TextStyle,

  circleVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  circleVoteButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  circleVoteText: {
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    minWidth: 25,
    textAlign: 'center',
  } as TextStyle,

  auraPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginTop: hp('0.5%'),
  } as ViewStyle,

  auraPointsText: {
    marginLeft: 4,
    fontSize: wp('3%'),
    fontWeight: '700',
    color: '#FFD700',
  } as TextStyle,

  disabledButton: {
    opacity: 0.6,
  } as ViewStyle,
});