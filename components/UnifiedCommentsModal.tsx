import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { CrossPlatformImage as Image } from './ui/CrossPlatformImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  createComment,
  generateAnonymousCommentData,
  validateCommentData,
  fetchComments,
  Comment,
  toggleCommentVote,
  deleteComment,
  formatTimeAgo,
  getMaxCommentDepth,
  canUserDeleteComment,
  subscribeToCommentUpdates,
} from '../utils/commentUtils';
import { anonymousUserManager } from '../utils/anonymousUtils';
import { getCachedUser } from '../utils/supabase';
import { navigateToUserProfile } from '../utils/profileNavigation';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

// Modal height values (how tall the modal is)
const HALF_SCREEN_HEIGHT = SCREEN_HEIGHT * 0.5; // 50% of screen height
const FULL_SCREEN_HEIGHT = SCREEN_HEIGHT - (Platform.OS === 'ios' ? hp('8%') : hp('6%')); // Full expanded height

interface UnifiedCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  onCommentAdded?: () => void;
  title?: string;
  // For mentor badge display
  circleId?: string;
  subcircleId?: string;
  // For deep linking - highlight specific comment
  highlightCommentId?: string;
}

const UnifiedCommentsModal: React.FC<UnifiedCommentsModalProps> = ({
  visible,
  onClose,
  postId,
  onCommentAdded,
  title = 'Comments',
  circleId,
  subcircleId,
  highlightCommentId,
}) => {
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousUser, setAnonymousUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [votingComments, setVotingComments] = useState<Set<string>>(new Set());
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(
    new Set()
  );
  const [showRepliesMap, setShowRepliesMap] = useState<Record<string, boolean>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showAnonymousToggle, setShowAnonymousToggle] = useState(false);



  // Deep link highlight - which comment to highlight
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrollViewRef = useRef<ScrollView>(null);

  const toggleReplies = (commentId: string) => {
    setShowRepliesMap((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalHeight, setModalHeight] = useState(HALF_SCREEN_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { user } = await getCachedUser();
        setCurrentUserId(user?.id || null);

        const anonUser = await anonymousUserManager.getOrCreateAnonymousUser();
        setAnonymousUser({ id: anonUser.id, username: anonUser.username });
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };

    initializeUser();
  }, []);

  // Keyboard height tracking (iOS: keyboardWillShow for smooth animation)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: any) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setKeyboardVisible(true);

      // Auto-expand modal to full screen when keyboard opens
      if (!isExpanded && visible) {
        setIsExpanded(true);
        setModalHeight(FULL_SCREEN_HEIGHT);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      }
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, visible]);

  useEffect(() => {
    if (visible) {
      loadComments();
      // Reset to half screen when opening
      setIsExpanded(false);
      setModalHeight(HALF_SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    } else {
      Keyboard.dismiss();
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setReplyingTo(null);
      setCommentText('');
      setIsExpanded(false);
      setShowAnonymousToggle(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Real-time subscription for comment updates
  useEffect(() => {
    if (!visible || !postId) return;

    console.log(`[UnifiedCommentsModal] Setting up real-time subscription for post ${postId}`);

    const unsubscribe = subscribeToCommentUpdates(postId, (updatedComments) => {
      console.log(`[UnifiedCommentsModal] Real-time update received: ${updatedComments.length} comments`);
      setComments(updatedComments);
    });

    return () => {
      console.log(`[UnifiedCommentsModal] Cleaning up subscription for post ${postId}`);
      unsubscribe();
    };
  }, [visible, postId]);

  // Handle deep link highlight - expand to show comment and highlight it
  useEffect(() => {
    if (!visible || !highlightCommentId || comments.length === 0) return;

    console.log(`[UnifiedCommentsModal] Processing highlight for comment: ${highlightCommentId}`);

    // Set the highlighted comment
    setHighlightedCommentId(highlightCommentId);

    // Helper to find comment and its parent chain
    const findCommentPath = (commentList: Comment[], targetId: string, path: string[] = []): string[] | null => {
      for (const comment of commentList) {
        if (comment.id === targetId) {
          return [...path, comment.id];
        }
        if (comment.replies && comment.replies.length > 0) {
          const found = findCommentPath(comment.replies, targetId, [...path, comment.id]);
          if (found) return found;
        }
      }
      return null;
    };

    const commentPath = findCommentPath(comments, highlightCommentId);

    if (commentPath && commentPath.length > 1) {
      // Expand all parent comments to show the target comment
      const newShowRepliesMap: Record<string, boolean> = { ...showRepliesMap };
      commentPath.slice(0, -1).forEach((parentId) => {
        newShowRepliesMap[parentId] = true;
      });
      setShowRepliesMap(newShowRepliesMap);
    }

    // Expand modal to full screen for better visibility
    setIsExpanded(true);
    setModalHeight(FULL_SCREEN_HEIGHT);

    // Clear highlight after 3 seconds
    const timer = setTimeout(() => {
      setHighlightedCommentId(null);
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, highlightCommentId, comments]);


  const loadComments = async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const fetchedComments = await fetchComments(
        postId,
        currentUserId || undefined
      );
      setComments(fetchedComments);
      console.log(
        `Loaded ${fetchedComments.length} comments for post ${postId}`
      );
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCommentInState = (
    commentId: string,
    updater: (comment: Comment) => Comment
  ) => {
    const updateCommentsRecursively = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          return updater(comment);
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentsRecursively(comment.replies),
          };
        }
        return comment;
      });
    };

    setComments((prev) => updateCommentsRecursively(prev));
  };

  const addReplyToComment = (parentId: string, newReply: Comment) => {
    const addReplyRecursively = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
            replies_count: (comment.replies_count || 0) + 1,
            showReplies: true,
          };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyRecursively(comment.replies),
          };
        }
        return comment;
      });
    };

    setComments((prev) => addReplyRecursively(prev));
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    setSubmitting(true);

    try {
      let commentData;

      if (isAnonymous) {
        commentData = await generateAnonymousCommentData(
          postId,
          commentText.trim(),
          replyingTo?.id
        );
      } else {
        if (!currentUserId) {
          Alert.alert(
            'Authentication Required',
            'Please log in to post comments'
          );
          setSubmitting(false);
          return;
        }

        commentData = {
          postId,
          userId: currentUserId,
          content: commentText.trim(),
          parentCommentId: replyingTo?.id || null,
          isAnonymous: false,
        };
      }

      const validationError = validateCommentData(commentData);
      if (validationError) {
        Alert.alert('Validation Error', validationError);
        setSubmitting(false);
        return;
      }

      const commentId = await createComment(commentData);

      if (commentId) {
        const newComment: Comment = {
          id: commentId,
          post_id: postId,
          user_id: commentData.userId,
          username: isAnonymous
            ? commentData.anonymousUsername || 'Anonymous'
            : 'You',
          profile_image: 'https://img.icons8.com/color/96/test-account.png',
          content: commentText.trim(),
          likes_count: 0,
          replies_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_liked: false,
          is_edited: false,
          is_anonymous: isAnonymous,
          anonymous_username: isAnonymous
            ? commentData.anonymousUsername || null
            : null,
          parent_comment_id: replyingTo?.id || null,
          replies: [],
          showReplies: true,
          depth: replyingTo ? (replyingTo.depth || 0) + 1 : 0,
          canDelete: true,
        };

        if (replyingTo) {
          addReplyToComment(replyingTo.id, newComment);
        } else {
          setComments((prev) => [newComment, ...prev]);
        }

        onCommentAdded?.();

        setCommentText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteComment = async (
    commentId: string,
    voteType: 'upvote' | 'downvote'
  ) => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please log in to vote on comments');
      return;
    }

    if (votingComments.has(commentId)) {
      return;
    }

    const findComment = (commentsList: Comment[]): Comment | null => {
      for (const c of commentsList) {
        if (c.id === commentId) return c;
        if (c.replies) {
          const found = findComment(c.replies);
          if (found) return found;
        }
      }
      return null;
    };

    const currentComment = findComment(comments);
    if (!currentComment) return;

    const previousState = {
      upvotes_count: currentComment.upvotes_count || 0,
      downvotes_count: currentComment.downvotes_count || 0,
      net_votes: currentComment.net_votes || 0,
      user_vote_type: currentComment.user_vote_type,
    };

    let newUpvotes = previousState.upvotes_count;
    let newDownvotes = previousState.downvotes_count;
    let newUserVoteType: 'upvote' | 'downvote' | null = voteType;

    if (previousState.user_vote_type === voteType) {
      newUserVoteType = null;
      if (voteType === 'upvote') {
        newUpvotes = Math.max(0, newUpvotes - 1);
      } else {
        newDownvotes = Math.max(0, newDownvotes - 1);
      }
    } else if (previousState.user_vote_type) {
      // Switching vote (e.g., upvote to downvote)
      if (previousState.user_vote_type === 'upvote') {
        newUpvotes = Math.max(0, newUpvotes - 1);
        newDownvotes += 1;
      } else {
        newDownvotes = Math.max(0, newDownvotes - 1);
        newUpvotes += 1;
      }
    } else {
      if (voteType === 'upvote') {
        newUpvotes += 1;
      } else {
        newDownvotes += 1;
      }
    }

    const newNetVotes = newUpvotes - newDownvotes;

    // Optimistic UI update — always show the vote change to the user
    updateCommentInState(commentId, (c) => ({
      ...c,
      upvotes_count: newUpvotes,
      downvotes_count: newDownvotes,
      net_votes: newNetVotes,
      user_vote_type: newUserVoteType,
    }));

    setVotingComments((prev) => new Set([...prev, commentId]));

    try {
      const result = await toggleCommentVote(
        commentId,
        currentUserId,
        voteType
      );

      if (result.success) {
        // Update with actual server values to ensure consistency
        updateCommentInState(commentId, (c) => ({
          ...c,
          upvotes_count: result.upvotesCount,
          downvotes_count: result.downvotesCount,
          net_votes: result.netVotes,
          user_vote_type: result.userVoteType,
        }));
      } else {
        console.log('[handleVoteComment] API failed, rolling back');
        updateCommentInState(commentId, (c) => ({
          ...c,
          ...previousState,
        }));
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
      updateCommentInState(commentId, (c) => ({
        ...c,
        ...previousState,
      }));
    } finally {
      setVotingComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to delete comments');
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteComment(comment.id, currentUserId);

              if (result.success) {
                updateCommentInState(comment.id, (c) => ({
                  ...c,
                  content: '[deleted]',
                  is_deleted: true,
                }));

                onCommentAdded?.();
              } else {
                Alert.alert(
                  'Error',
                  result.message || 'Failed to delete comment'
                );
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const toggleCollapse = (commentId: string) => {
    setCollapsedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleTouchStart = (event: any) => {
    setIsDragging(true);
    setStartY(event.nativeEvent.pageY);
    setCurrentY(event.nativeEvent.pageY);
  };

  const handleTouchMove = (event: any) => {
    if (!isDragging) return;

    const newY = event.nativeEvent.pageY;
    const deltaY = newY - startY;

    setCurrentY(newY);

    // Allow dragging down (to close)
    if (deltaY > 0) {
      translateY.setValue(deltaY * 0.8);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    const deltaY = currentY - startY;

    if (deltaY > 150) {
      // Swipe down significantly - close modal
      Keyboard.dismiss();
      onClose();
    } else if (deltaY < -80 && !isExpanded) {
      // Swipe up significantly - expand to full screen
      setIsExpanded(true);
      setModalHeight(FULL_SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else if (deltaY > 80 && isExpanded) {
      // Swipe down when expanded - collapse to half screen
      Keyboard.dismiss();
      setIsExpanded(false);
      setModalHeight(HALF_SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      // Return to current state
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    }
  };

  const getTotalCommentCount = () => {
    const countReplies = (commentsList: Comment[]): number => {
      return commentsList.reduce((total, comment) => {
        return (
          total + 1 + (comment.replies ? countReplies(comment.replies) : 0)
        );
      }, 0);
    };
    return countReplies(comments);
  };

  const formatCount = (count: number): string => {
    const safeCount = Math.max(count, 0);
    if (safeCount >= 1000000) {
      return `${(safeCount / 1000000).toFixed(1)}M`;
    } else if (safeCount >= 1000) {
      return `${(safeCount / 1000).toFixed(1)}K`;
    }
    return safeCount.toString();
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    if (!comment) return null;

    const hasReplies = comment.replies && comment.replies.length > 0;
    const isCollapsed = collapsedComments.has(comment.id);
    const maxDepth = getMaxCommentDepth();
    const canReply = depth < maxDepth - 1 && comment.content !== '[deleted]';

    const visualDepth = Math.min(depth, 3);
    const showThreadLine = depth > 0;

    const showReplies = showRepliesMap[comment.id] || false;
    const isHighlighted = highlightedCommentId === comment.id;

    return (
      <View key={comment.id} style={[styles.commentWrapper, isHighlighted && styles.highlightedComment]}>
        {/* Thread line for nested comments */}
        {showThreadLine && (
          <View
            style={[
              styles.threadContainer,
              { marginLeft: wp(`${(visualDepth - 1) * 3}%`) },
            ]}
          >
            <TouchableOpacity
              style={styles.threadLineWrapper}
              onPress={() => toggleCollapse(comment.id)}
              activeOpacity={0.3}
            >
              <View style={styles.threadLine} />
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.commentContent,
            { marginLeft: wp(`${visualDepth * 3}%`) },
          ]}
        >
          { }
          <View style={styles.commentHeader}>
            { }
            <TouchableOpacity
              onPress={() => {
                if (!comment.is_anonymous) {
                  navigateToUserProfile(
                    {
                      id: comment.user_id,
                      username: comment.username,
                      profile_picture: comment.profile_image
                    } as any,
                    // @ts-ignore
                    comment.user_id
                  );
                }
              }}
              // @ts-ignore
              disabled={comment.is_anonymous}
              activeOpacity={0.7}
            >
              <Image
                source={comment.profile_image || 'https://img.icons8.com/color/96/test-account.png'}
                style={styles.commentAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </TouchableOpacity>

            { }
            <TouchableOpacity
              onPress={() => {
                if (!comment.is_anonymous) {
                  navigateToUserProfile(
                    {
                      id: comment.user_id,
                      username: comment.username,
                      profile_picture: comment.profile_image
                    } as any,
                    // @ts-ignore
                    comment.user_id
                  );
                }
              }}
              // @ts-ignore
              disabled={comment.is_anonymous}
              activeOpacity={0.7}
            >
              <Text style={styles.commentUsername}>{comment.username}</Text>
            </TouchableOpacity>

            {comment.is_anonymous && (
              <View style={styles.anonymousBadge}>
                <Text style={styles.anonymousBadgeText}>Anon</Text>
              </View>
            )}
            {comment.is_edited && (
              <Text style={styles.editedText}> (edited)</Text>
            )}

            { }
            <TouchableOpacity
              onPress={() => toggleCollapse(comment.id)}
              style={{ marginLeft: 'auto', padding: wp('1%') }}
              activeOpacity={0.7}
            >
              {isCollapsed && hasReplies && (
                <Text style={styles.collapsedIndicator}>
                  [{comment.replies?.length} more]
                </Text>
              )}
            </TouchableOpacity>
          </View>

          { }
          {!isCollapsed && (
            <>
              <View style={styles.commentContentRow}>
                <View style={styles.commentTextContainer}>
                  <Text
                    style={[
                      styles.commentText,
                      comment.content === '[deleted]' && styles.deletedCommentText,
                    ]}
                  >
                    {comment.content}
                  </Text>
                </View>

                <View style={styles.votingContainerHorizontal}>
                  { }
                  <TouchableOpacity
                    onPress={() => handleVoteComment(comment.id, 'upvote')}
                    disabled={votingComments.has(comment.id)}
                    style={styles.voteButtonHorizontal}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={wp('6%')}
                      color={
                        comment.user_vote_type === 'upvote'
                          ? '#ff3856'
                          : '#8e8e93'
                      }
                    />
                  </TouchableOpacity>

                  {/* Vote count - Reddit style: min 0 normally, min 1 if user upvoted */}
                  <Text
                    style={[
                      styles.voteCountHorizontal,
                      comment.user_vote_type === 'upvote' && styles.upvotedTextComment,
                      comment.user_vote_type === 'downvote' && styles.downvotedTextComment,
                    ]}
                  >
                    {formatCount(Math.max(
                      comment.user_vote_type === 'upvote' ? 1 : 0,
                      (comment.upvotes_count || 0) - (comment.downvotes_count || 0)
                    ))}
                  </Text>

                  { }
                  <TouchableOpacity
                    onPress={() => handleVoteComment(comment.id, 'downvote')}
                    disabled={votingComments.has(comment.id)}
                    style={styles.voteButtonHorizontal}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={wp('6%')}
                      color={
                        comment.user_vote_type === 'downvote'
                          ? '#ff3856'
                          : '#8e8e93'
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              { }
              <View style={styles.commentActions}>
                <Text style={styles.commentTime}>
                  {formatTimeAgo(comment.created_at)}
                </Text>
                { }
                {canReply && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setReplyingTo(comment);
                      setCommentText('');
                    }}
                  >
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                )}

                { }
                {canUserDeleteComment(comment, currentUserId) &&
                  comment.content !== '[deleted]' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteComment(comment)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={wp('4%')}
                        color="#FF3040"
                      />
                      <Text style={[styles.actionText, styles.deleteText]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>

              { }
              {hasReplies && (
                <TouchableOpacity
                  style={styles.viewRepliesButton}
                  onPress={() => toggleReplies(comment.id)}
                >
                  <View style={styles.viewRepliesLine} />
                  <Text style={styles.viewRepliesText}>
                    {showReplies
                      ? `Hide ${comment.replies?.length} ${comment.replies?.length === 1 ? 'reply' : 'replies'}`
                      : `View ${comment.replies?.length} ${comment.replies?.length === 1 ? 'reply' : 'replies'}`
                    }
                  </Text>
                  <Ionicons
                    name={showReplies ? "chevron-up" : "chevron-down"}
                    size={wp('4%')}
                    color="#8e8e93"
                    style={styles.viewRepliesIcon}
                  />
                </TouchableOpacity>
              )}

              { }
              {hasReplies && showReplies && (
                <View style={styles.repliesContainer}>
                  {comment.replies?.map((reply) =>
                    renderComment(reply, depth + 1)
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
              height: modalHeight,
            },
          ]}
        >
          <View
            style={[styles.modalHeader, { paddingTop: isExpanded ? Math.max(insets.top, hp('1.5%')) : hp('1%') }]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.modalTitle}>
                {title} ({getTotalCommentCount()})
              </Text>
              {!isExpanded && (
                <Text style={styles.expandHint}>Swipe up to expand</Text>
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={wp('6%')} color="#000" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF3040" />
            </View>
          ) : (
            <ScrollView
              style={styles.commentsScrollView}
              contentContainerStyle={[
                styles.commentsContainer,
                keyboardVisible && { paddingBottom: hp('14%') },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={true}
              scrollEventThrottle={16}
              contentInsetAdjustmentBehavior="automatic"
            >
              {comments.length === 0 ? (
                <View style={styles.emptyCommentsContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={wp('12%')}
                    color="#c7c7cc"
                  />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>
                    Be the first to share your thoughts!
                  </Text>
                </View>
              ) : (
                comments.map((comment) => renderComment(comment, 0))
              )}
            </ScrollView>
          )}
        </Animated.View>

        { }
        <Animated.View style={[
          styles.fixedInputContainer,
          {
            transform: [{ translateY }],
            marginBottom: Platform.OS === 'ios' ? keyboardHeight : 0,
          },
        ]}>
          <SafeAreaView style={[
            styles.inputContainer,
            keyboardVisible && { paddingBottom: hp('0.5%') },
          ]}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  {`Replying to ${replyingTo?.username}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setCommentText('');
                  }}
                >
                  <Ionicons name="close" size={wp('4%')} color="#8e8e93" />
                </TouchableOpacity>
              </View>
            )}

            {showAnonymousToggle && (
              <View style={styles.anonymousToggleContainer}>
                <View style={styles.anonymousInfo}>
                  <Ionicons
                    name="person-outline"
                    size={wp('4%')}
                    color="#8e8e93"
                  />
                  <Text style={styles.anonymousInfoText}>
                    {isAnonymous
                      ? `Commenting as: ${anonymousUser?.username || 'Anonymous'}`
                      : `Commenting as: ${currentUserId ? 'Your Account' : 'Not Logged In'}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.anonymousToggle,
                    isAnonymous && styles.anonymousToggleActive,
                  ]}
                  onPress={() => setIsAnonymous(!isAnonymous)}
                >
                  <View
                    style={[
                      styles.anonymousToggleCircle,
                      isAnonymous && styles.anonymousToggleCircleActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.anonymousIconButton}
                onPress={() => setShowAnonymousToggle(!showAnonymousToggle)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isAnonymous ? 'eye-off' : 'person-circle-outline'}
                  size={wp('6%')}
                  color={isAnonymous ? '#00b1ff' : '#8e8e93'}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder={
                  replyingTo
                    ? `Reply to ${replyingTo.username}...`
                    : 'Add a comment...'
                }
                placeholderTextColor="#8e8e93"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  commentText.trim() && styles.sendButtonActive,
                ]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.sendButtonText,
                      commentText.trim() && styles.sendButtonTextActive,
                    ]}
                  >
                    Post
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: wp('4%'),
    borderTopRightRadius: wp('4%'),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height is controlled via state (modalHeight)
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: hp('5.5%'),
    backgroundColor: '#fff',
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  dragHandle: {
    width: wp('10%'),
    height: hp('0.5%'),
    backgroundColor: '#c7c7cc',
    borderRadius: wp('2%'),
    alignSelf: 'center',
    position: 'absolute',
    top: hp('0.6%'),
    left: '50%',
    marginLeft: -wp('5%'),
  },
  modalTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  expandHint: {
    fontSize: wp('2.8%'),
    color: '#8e8e93',
    marginTop: hp('0.2%'),
  },
  closeButton: {
    padding: wp('1%'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsScrollView: {
    flex: 1,
    maxHeight: '100%',
  },
  commentsContainer: {
    paddingBottom: hp('22%'),
    paddingTop: hp('0.5%'),
  },
  commentWrapper: {
    flexDirection: 'row',
    paddingLeft: wp('3%'),
    paddingRight: wp('4%'),
    paddingVertical: hp('0.5%'),
    position: 'relative',
  },
  highlightedComment: {
    backgroundColor: 'rgba(0, 177, 255, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#00b1ff',
    borderRadius: wp('1%'),
  },
  threadContainer: {
    position: 'absolute',
    left: wp('3%'),
    top: 0,
    bottom: 0,
  },
  threadLineWrapper: {
    width: wp('8%'),
    alignItems: 'center',
    height: '100%',
  },
  threadLine: {
    width: 1.5,
    backgroundColor: '#d0d0d0',
    position: 'absolute',
    top: hp('3.5%'),
    bottom: 0,
    left: '50%',
    marginLeft: -0.75,
  },
  commentContent: {
    flex: 1,
    paddingLeft: wp('2%'),
  },
  commentHeaderTouchable: {
    marginRight: wp('2%'),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    marginRight: wp('2%'),
  },
  commentUsername: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#797474',
  },
  anonymousBadge: {
    backgroundColor: '#00b1ff',
    paddingHorizontal: wp('1.5%'),
    paddingVertical: hp('0.2%'),
    borderRadius: wp('1%'),
    marginLeft: wp('1%'),
  },
  anonymousBadgeText: {
    color: '#fff',
    fontSize: wp('2.5%'),
    fontWeight: '500',
  },
  commentTime: {
    fontSize: wp('2.8%'),
    color: '#8e8e93',
    marginLeft: wp('1%'),
  },
  editedText: {
    fontSize: wp('2.8%'),
    color: '#8e8e93',
    fontStyle: 'italic',
  },
  collapsedIndicator: {
    fontSize: wp('3%'),
    color: '#00b1ff',
    marginLeft: wp('2%'),
    fontWeight: '500',
  },
  commentContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: hp('0.3%'),
    paddingLeft: wp('14%'),
  },
  commentTextContainer: {
    flex: 1,
    paddingRight: wp('1%'),
  },
  commentText: {
    fontSize: wp('3.8%'),
    color: '#000',
    lineHeight: wp('5.2%'),
    marginBottom: 0,
  },
  deletedCommentText: {
    fontStyle: 'italic',
    color: '#8e8e93',
  },
  votingContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: wp('2%'),
    minWidth: wp('20%'),
  },
  voteButtonHorizontal: {
    padding: wp('1%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteCountHorizontal: {
    fontSize: wp('3.5%'),
    color: '#797474',
    fontWeight: '500',
    textAlign: 'center',
    minWidth: wp('4%'),
  },
  upvotedTextComment: {
    color: '#797474',
    fontWeight: '700',
  },
  downvotedTextComment: {
    color: '#797474',
    fontWeight: '700',
  },

  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('0%'),
    marginTop: hp('0.2%'),
    paddingLeft: wp('14%'),
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp('4%'),
  },
  voteButton: {
    padding: wp('1%'),
  },
  voteCount: {
    fontSize: wp('3.2%'),
    color: '#000',
    fontWeight: '500',
    marginHorizontal: wp('1%'),
    minWidth: wp('8%'),
    textAlign: 'center',
  },
  upvotedText: {
    color: '#00b1ff',
  },
  downvotedText: {
    color: '#6B46C1',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp('3%'),
    padding: wp('1%'),
  },
  actionText: {
    fontSize: wp('3.2%'),
    color: '#8e8e93',
    marginLeft: wp('1%'),
  },
  deleteText: {
    color: '#ff3856',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('0.5%'),
    paddingHorizontal: wp('15%'),
    marginTop: hp('0.3%'),
    marginBottom: hp('0.3%'),
  },
  viewRepliesLine: {
    width: wp('8%'),
    height: 1,
    backgroundColor: '#8e8e93',
    marginRight: wp('1.5%'),
  },
  viewRepliesText: {
    fontSize: wp('3%'),
    color: '#8e8e93',
    fontWeight: '600',
    marginRight: wp('0.5%'),
  },
  viewRepliesIcon: {
    marginLeft: wp('0.5%'),
  },
  repliesContainer: {
    marginTop: hp('0.5%'),
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp('8%'),
  },
  emptyCommentsText: {
    fontSize: wp('4%'),
    fontWeight: '500',
    color: '#8e8e93',
    marginTop: hp('2%'),
  },
  emptyCommentsSubtext: {
    fontSize: wp('3.5%'),
    color: '#c7c7cc',
    marginTop: hp('1%'),
  },
  fixedInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    paddingTop: hp('0.5%'),
    paddingBottom: Platform.OS === 'ios' ? hp('1%') : hp('1%'),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('3%'),
    backgroundColor: '#f9f9f9',
  },
  replyingToText: {
    fontSize: wp('3.2%'),
    color: '#8e8e93',
    flex: 1,
  },
  anonymousToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    backgroundColor: '#f9f9f9',
  },
  anonymousInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  anonymousInfoText: {
    fontSize: wp('3.2%'),
    color: '#8e8e93',
    marginLeft: wp('2%'),
  },
  anonymousToggle: {
    width: wp('12%'),
    height: hp('3%'),
    borderRadius: wp('6%'),
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    paddingHorizontal: wp('0.5%'),
  },
  anonymousToggleActive: {
    backgroundColor: '#00b1ff',
  },
  anonymousToggleCircle: {
    width: wp('5%'),
    height: wp('5%'),
    borderRadius: wp('2.5%'),
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  anonymousToggleCircleActive: {
    alignSelf: 'flex-end',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: wp('1%'),
  },
  anonymousIconButton: {
    padding: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: wp('5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    fontSize: wp('3.5%'),
    color: '#000',
    maxHeight: hp('8%'),
    marginRight: wp('2%'),
    textAlignVertical: 'top',
  },
  sendButton: {
    paddingHorizontal: wp('4%'),
    paddingVertical: wp('2.5%'),
    backgroundColor: '#e5e5ea',
    borderRadius: wp('5%'),
  },
  sendButtonActive: {
    backgroundColor: '#00b1ff',
  },
  sendButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#8e8e93',
  },
  sendButtonTextActive: {
    color: '#fff',
  },
});

export default UnifiedCommentsModal;