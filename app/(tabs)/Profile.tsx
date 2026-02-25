
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { CrossPlatformImage as Image } from '../../components/ui/CrossPlatformImage';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { router, useFocusEffect } from 'expo-router';


import { supabase, getCachedUser } from '../../utils/supabase';

import { usePostInteractions } from '../../contexts/PostInteractionsContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import * as ImagePicker from 'expo-image-picker';
import { followService } from '../../services/followService';

import Constants from 'expo-constants';
import InstagramReelsFeed from '../../components/InstagramReelsFeed';
import { ProfileHeader } from '../../components/profile';
// Avatar upload via Supabase Storage
const uploadAvatar = async (uri: string, userId: string): Promise<{ success: boolean; url: string; error?: string; cdnUrl?: string }> => {
  try {
    const { uploadMediaToSupabase } = require('../../utils/mediaUpload');
    const url = await uploadMediaToSupabase(uri, 'public-media', `avatars/${userId}`);
    return { success: true, url, cdnUrl: url };
  } catch (err: any) {
    return { success: false, url: '', error: err.message || 'Upload failed' };
  }
};
// Auth
// Auth - imported at top
// Aura stub
const useAura = () => ({ auraPoints: 0 });
// Username validation stub
const validateUsernameContent = (username: string) => ({ isValid: username.length >= 3, message: username.length < 3 ? 'Username too short' : '' });


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = (SCREEN_WIDTH - 4) / 3;

interface UserProfile {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
  total_likes_received: number;
  aura_points: number;
}

interface UserVideo {
  id: string;
  content: string | null;
  content_type: string;
  user_id: string;
  media_urls: {
    videoUrl?: string;
    thumbnailUrl?: string;
  } | null;
  likes_count: number | null;
  views_count: number | null;
  created_at: string;
  circle_ids: string[] | null;
  visibility: string;
  upvotes_count?: number;
  downvotes_count?: number;
  net_votes?: number;
  comments_count?: number;
  shares_count?: number;
  tags?: string[] | null;
  circles?: {
    id: string;
    name: string;
    visibility: string;
  }[];
}

interface BookmarkedPost {
  id: string;
  post: UserVideo;
}

// V1: Repost feature commented out - to be reintroduced in later versions
// interface RepostedPost {
//   id: string;
//   repost_comment: string | null;
//   created_at: string;
//   post: UserVideo;
// }

interface LikedPost {
  id: string;
  post: UserVideo;
}

interface UpvotedPost {
  id: string;
  vote_type: string;
  post: UserVideo;
}

export default function Profile() {
  const { signOut, user } = useAuth();
  const { userAuraPoints, refreshUserAuraPoints, getUserAuraBreakdown, deletePost } = usePostInteractions();
  const { auraPoints: contextAuraPoints } = useAura();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [privateVideos, setPrivateVideos] = useState<UserVideo[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<BookmarkedPost[]>([]);
  // V1: Repost feature commented out - to be reintroduced in later versions
  // const [repostedPosts, setRepostedPosts] = useState<RepostedPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
  const [upvotedPosts, setUpvotedPosts] = useState<UpvotedPost[]>([]);
  const [bookmarkedPostsUsers, setBookmarkedPostsUsers] = useState<Record<string, any>>({});
  const [likedPostsUsers, setLikedPostsUsers] = useState<Record<string, any>>({});
  const [upvotedPostsUsers, setUpvotedPostsUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  // const [editForm, setEditForm] = useState({
  //   username: '',
  //   name: '',
  //   bio: '',
  // });
  const [selectedTab, setSelectedTab] = useState<
    // V1: Repost feature commented out - removed 'reposts' from type
    'videos' | 'private' | 'bookmarks' | 'liked' | 'upvoted'
  >('videos');
  const [showMenu, setShowMenu] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [showEditProfileSubmenu, setShowEditProfileSubmenu] = useState(false);
  const [showQuickEditMenu, setShowQuickEditMenu] = useState(false);
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const handleQuickEdit = () => {
    setShowMenu(true);
    setShowQuickEditMenu(true);
  };






  const [editModalType, setEditModalType] = useState<'name' | 'last_name' | 'username' | 'bio'>('name');
  const [editModalValue, setEditModalValue] = useState('');
  const [editModalTitle, setEditModalTitle] = useState('');



  useEffect(() => {
    loadUserProfile();
    // @ts-ignore
  }, [loadUserProfile]);

  // Track previous tab to detect tab changes
  const previousTab = useRef(selectedTab);
  const previousProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (profile) {
      // Load tab content when:
      // 1. Profile loads for the first time (previousProfileId is null)
      // 2. Profile ID changes (different user)
      // 3. Tab changes
      const isNewProfile = previousProfileId.current !== profile.id;
      const isTabChange = previousTab.current !== selectedTab;

      if (isNewProfile || isTabChange) {
        previousProfileId.current = profile.id;
        previousTab.current = selectedTab;
        loadTabContent();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, profile?.id]); // Only depend on profile.id, not entire profile object

  // Refresh current tab data when Profile screen regains focus
  // (e.g., after navigating to a post and changing a vote/like)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // Skip the initial focus (already handled by useEffect above)
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (profile?.id) {
        loadTabContent();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      // @ts-ignore
    }, [profile?.id, selectedTab, loadTabContent])
  );

  // NOTE: Removed automatic call to refreshUserAuraPoints because the RPC
  // 'update_user_aura_points' recalculates aura from post votes, which overwrites
  // the initial 250 aura for new users. AuraContext now handles aura display correctly.
  // The RPC should only be called when there's actual voting activity.
  // useEffect(() => {
  //   if (profile?.id && refreshUserAuraPoints) {
  //     refreshUserAuraPoints();
  //   }
  // }, [profile?.id, refreshUserAuraPoints]);

  useEffect(() => {
    if (!profile?.id || !user?.id) return;

    const unsubscribe = followService.subscribeToFollowChanges(
      profile.id,
      async (change) => {
        // Only update counts for follow-related changes, not aura point updates
        // Check if this is a follow change (user_follows table) or
        // a user update with follower/following count changes
        const isFollowChange = change.table === 'user_follows' ||
          (change.table === 'users' && (
            change.new?.followers_count !== change.old?.followers_count ||
            change.new?.following_count !== change.old?.following_count
          ));

        if (isFollowChange) {
          // Silent update - don't show loading indicator
          await silentRefreshCounts();
        }
      }
    );

    return () => {
      unsubscribe();
    };
    // @ts-ignore
  }, [profile?.id, user?.id, silentRefreshCounts]);

  const silentRefreshCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('followers_count, following_count')
        .eq('id', user.id)
        .single();

      if (error || !profileData) return;

      setProfile(prev => prev ? {
        ...prev,
        followers_count: profileData.followers_count,
        following_count: profileData.following_count,
      } : prev);
    } catch (error) {
      console.error('Error in silent refresh:', error);
    }
  }, [user?.id]);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { user } = await getCachedUser();

      if (!user) {
        Alert.alert('Error', 'No authenticated user found');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select(
          `
          id,
          username,
          name,
          email,
          bio,
          avatar_url,
          followers_count,
          following_count,
          total_likes_received,
          aura_points
        `
        )
        .eq('id', user.id)
        .single();

      if (profileError) {
        Alert.alert('Error', 'Failed to load profile');
        return;
      }

      setProfile(profileData);

      await loadUserVideos(user.id);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
    // @ts-ignore
  }, [loadUserVideos]);

  const loadTabContent = useCallback(async () => {
    if (!profile) return;

    setTabLoading(true);
    try {
      switch (selectedTab) {
        case 'videos':
          await loadUserVideos(profile.id);
          break;
        case 'private':
          await loadPrivateVideos(profile.id);
          break;
        case 'bookmarks':
          await loadBookmarkedPosts(profile.id);
          break;
        case 'liked':
          await loadLikedPosts(profile.id);
          break;
        case 'upvoted':
          await loadUpvotedPosts(profile.id);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${selectedTab}:`, error);
    } finally {
      setTabLoading(false);
    }
    // @ts-ignore
  }, [profile, selectedTab, loadUserVideos, loadPrivateVideos, loadBookmarkedPosts, loadLikedPosts, loadUpvotedPosts]);

  const loadUserVideos = useCallback(async (userId: string) => {
    try {
      // Fetch user's public posts for the main Posts tab
      // Circle-only posts are shown in the 'private' (Groups) tab instead
      // Note: Videos have status=null after processing, but is_published=true
      // So we only check is_published=true (not status='published') to include videos
      const { data: posts, error } = await supabase
        .from('circle_posts')
        .select(
          `
          id,
          user_id,
          content,
          content_type,
          media_urls,
          likes_count,
          views_count,
          created_at,
          circle_ids,
          visibility,
          upvotes_count,
          downvotes_count,
          net_votes,
          comments_count,
          shares_count,
          tags,
          is_anonymous,
          anonymous_username
        `
        )
        .eq('user_id', userId)
        .eq('is_published', true)
        .eq('visibility', 'public')
        .in('content_type', ['text', 'photo', 'image', 'video', 'mixed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading user posts:', error);
        return;
      }

      const validPosts = (posts || []).filter((post) => {
        // Parse media_urls if it's a string (JSON)
        let mediaUrls = post.media_urls;
        if (typeof mediaUrls === 'string') {
          try {
            mediaUrls = JSON.parse(mediaUrls);
          } catch {
            mediaUrls = null;
          }
        }

        if (post.content_type === 'video') {
          // Handle both single video and multiple videos formats
          if (Array.isArray(mediaUrls)) {
            const firstItem = mediaUrls[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              return !!(firstItem.url && firstItem.url.startsWith('http'));
            }
            return false;
          } else {
            const videoUrl = mediaUrls?.videoUrl;
            return videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
          }
        } else if (post.content_type === 'photo' || post.content_type === 'image' || post.content_type === 'mixed') {
          if (mediaUrls) {
            if (Array.isArray(mediaUrls)) {
              if (mediaUrls.length === 0) return false;
              const firstItem = mediaUrls[0];
              // Handle both string URLs and object format { type, url }
              if (typeof firstItem === 'string') {
                return firstItem.startsWith('http');
              } else if (typeof firstItem === 'object' && firstItem !== null) {
                return !!(firstItem.url && firstItem.url.startsWith('http'));
              }
              return false;
            } else if (typeof mediaUrls === 'object') {
              return !!(mediaUrls.imageUrl || mediaUrls.photoUrl || mediaUrls.url);
            }
          }
          return false;
        } else if (post.content_type === 'text') {
          if (!post.content) return false;
          let textContent = '';
          if (typeof post.content === 'string') {
            try {
              const parsed = JSON.parse(post.content);
              textContent = parsed.text || parsed.content || parsed.body || '';
            } catch {
              textContent = post.content;
            }
          } else if (typeof post.content === 'object' && post.content !== null) {
            textContent = (post.content as any).text || (post.content as any).content || (post.content as any).body || '';
          }
          return textContent.trim() !== '';
        }
        return false;
      });

      setUserVideos(validPosts.map(v => ({ ...v, circles: undefined })) as UserVideo[]);
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  }, []);

  const loadPrivateVideos = useCallback(async (userId: string) => {
    try {
      // Fetch user's circle posts for the Groups tab
      // Note: Videos have status=null after processing, but is_published=true
      const { data: videos, error } = await supabase
        .from('circle_posts')
        .select(
          `
          id,
          user_id,
          content,
          content_type,
          media_urls,
          likes_count,
          views_count,
          created_at,
          circle_ids,
          visibility,
          upvotes_count,
          downvotes_count,
          net_votes,
          comments_count,
          shares_count,
          tags,
          is_anonymous,
          anonymous_username
        `
        )
        .eq('user_id', userId)
        .eq('is_published', true)
        .in('content_type', ['text', 'photo', 'image', 'video', 'mixed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading circle posts:', error);
        return;
      }

      // Filter to get posts that belong to circles:
      // 1. Posts with visibility='circle_only' (circle-only posts)
      // 2. Posts with visibility='public' AND circle_ids (posted to both world feed and circles)
      // Note: Public+circle posts will show in BOTH Posts tab and Groups tab (intentional)
      const filteredVideos = (videos || []).filter((video) => {
        const isCircleOnly = video.visibility === 'circle_only';
        const isPublicWithCircles = video.visibility === 'public' && video.circle_ids && video.circle_ids.length > 0;
        return isCircleOnly || isPublicWithCircles;
      });

      const validVideos = filteredVideos.filter((video) => {
        // Parse media_urls if it's a string (JSON)
        let mediaUrls = video.media_urls;
        if (typeof mediaUrls === 'string') {
          try {
            mediaUrls = JSON.parse(mediaUrls);
          } catch {
            mediaUrls = null;
          }
        }

        if (video.content_type === 'video') {
          // Handle both single video and multiple videos formats
          if (Array.isArray(mediaUrls)) {
            const firstItem = mediaUrls[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              return !!(firstItem.url && firstItem.url.startsWith('http'));
            }
            return false;
          } else {
            const videoUrl = mediaUrls?.videoUrl;
            return videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
          }
        } else if (video.content_type === 'photo' || video.content_type === 'image' || video.content_type === 'mixed') {
          if (mediaUrls) {
            if (Array.isArray(mediaUrls)) {
              if (mediaUrls.length === 0) return false;
              const firstItem = mediaUrls[0];
              // Handle both string URLs and object format { type, url }
              if (typeof firstItem === 'string') {
                return firstItem.startsWith('http');
              } else if (typeof firstItem === 'object' && firstItem !== null) {
                return !!(firstItem.url && firstItem.url.startsWith('http'));
              }
              return false;
            } else if (typeof mediaUrls === 'object') {
              return !!(mediaUrls.imageUrl || mediaUrls.photoUrl || mediaUrls.url);
            }
          }
          return false;
        } else if (video.content_type === 'text') {
          if (!video.content) return false;
          let textContent = '';
          if (typeof video.content === 'string') {
            try {
              const parsed = JSON.parse(video.content);
              textContent = parsed.text || parsed.content || parsed.body || '';
            } catch {
              textContent = video.content;
            }
          } else if (typeof video.content === 'object' && video.content !== null) {
            textContent = (video.content as any).text || (video.content as any).content || (video.content as any).body || '';
          }
          return textContent.trim() !== '';
        }
        return false;
      });

      // Fetch circle names for the posts
      // Collect all unique circle IDs (get first/parent circle only)
      const allCircleIds = new Set<string>();
      validVideos.forEach(video => {
        if (video.circle_ids && video.circle_ids.length > 0) {
          // Only add the first circle ID (parent circle)
          allCircleIds.add(video.circle_ids[0]);
        }
      });

      // Fetch circle names from database
      let circleMap: Record<string, { id: string; name: string; visibility: string }> = {};
      if (allCircleIds.size > 0) {
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name, visibility')
          .in('id', Array.from(allCircleIds));

        if (circlesData) {
          circlesData.forEach(circle => {
            circleMap[circle.id] = circle;
          });
        }
      }

      // Attach circle info to videos (only parent circle)
      // Include both 'circles' array (for grid badge) and 'circle' object (for fullscreen view)
      const videosWithCircles = validVideos.map(v => {
        const circleId = v.circle_ids && v.circle_ids.length > 0 ? v.circle_ids[0] : null;
        const circleData = circleId ? circleMap[circleId] : null;
        return {
          ...v,
          circles: circleData ? [circleData] : undefined,
          circle: circleData ? { id: circleData.id, name: circleData.name } : undefined
        };
      }) as UserVideo[];

      setPrivateVideos(videosWithCircles);
    } catch (error) {
      console.error('Error loading circle posts:', error);
    }
  }, []);

  const loadBookmarkedPosts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_bookmarks')
        .select(
          `
          id,
          post:circle_posts(
            id,
            user_id,
            content,
            content_type,
            media_urls,
            likes_count,
            views_count,
            created_at,
            circle_ids,
            visibility,
            upvotes_count,
            downvotes_count,
            net_votes,
            comments_count,
            shares_count,
            tags
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookmarks:', error);
        return;
      }

      interface RawBookmarkedPost {
        id: string;
        post: UserVideo | UserVideo[];
      }

      const transformedData = (data || []).map((item: RawBookmarkedPost): BookmarkedPost => ({
        id: item.id,
        post: {
          ...(Array.isArray(item.post) ? item.post[0] : item.post),
          circles: undefined
        }
      }));

      // Filter out ghost videos from bookmarks
      const validBookmarks = transformedData.filter((bookmark) => {
        if (bookmark.post.content_type === 'video') {
          const mediaUrls = bookmark.post.media_urls;
          // Handle both single video and multiple videos formats
          if (Array.isArray(mediaUrls)) {
            const firstItem = mediaUrls[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              return !!(firstItem.url && firstItem.url.startsWith('http'));
            }
            return false;
          } else {
            const videoUrl = mediaUrls?.videoUrl;
            return videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
          }
        }
        return true; // Keep non-video posts
      });

      // Fetch user data for post authors
      const userIds = [...new Set(validBookmarks.map(b => b.post.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, name, email, avatar_url, aura_points, bio, followers_count, following_count')
          .in('id', userIds);

        if (!usersError && usersData) {
          const usersMap: Record<string, any> = {};
          usersData.forEach(u => {
            usersMap[u.id] = u;
          });
          setBookmarkedPostsUsers(usersMap);
        }
      }

      setBookmarkedPosts(validBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkedPostsUsers]);

  // V1: Repost feature commented out - to be reintroduced in later versions
  // const loadRepostedPosts = async (userId: string) => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('user_reposts')
  //       .select(
  //         `
  //         id,
  //         repost_comment,
  //         created_at,
  //         post:circle_posts(
  //           id,
  //           user_id,
  //           content,
  //           content_type,
  //           media_urls,
  //           likes_count,
  //           views_count,
  //           created_at,
  //           circle_ids,
  //           visibility,
  //           upvotes_count,
  //           downvotes_count,
  //           net_votes,
  //           comments_count,
  //           shares_count
  //         )
  //       `
  //       )
  //       .eq('user_id', userId)
  //       .order('created_at', { ascending: false });

  //     if (error) {
  //       console.error('Error loading reposts:', error);
  //       return;
  //     }

  //     interface RawRepostedPost {
  //       id: string;
  //       repost_comment: string | null;
  //       created_at: string;
  //       post: UserVideo | UserVideo[];
  //     }

  //     const transformedData = (data || []).map((item: RawRepostedPost): RepostedPost => ({
  //       id: item.id,
  //       repost_comment: item.repost_comment,
  //       created_at: item.created_at,
  //       post: {
  //         ...(Array.isArray(item.post) ? item.post[0] : item.post),
  //         circles: undefined
  //       }
  //     }));

  //     setRepostedPosts(transformedData);
  //   } catch (error) {
  //     console.error('Error loading reposts:', error);
  //   }
  // };

  const loadLikedPosts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_liked_posts')
        .select(
          `
          id,
          post:circle_posts(
            id,
            user_id,
            content,
            content_type,
            media_urls,
            likes_count,
            views_count,
            created_at,
            circle_ids,
            visibility,
            upvotes_count,
            downvotes_count,
            net_votes,
            comments_count,
            shares_count,
            tags
          )
        `
        )
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (error) {
        console.error('Error loading liked posts:', error);
        return;
      }

      interface RawLikedPost {
        id: string;
        post: UserVideo | UserVideo[];
      }

      const transformedData = (data || []).map((item: RawLikedPost): LikedPost => ({
        id: item.id,
        post: {
          ...(Array.isArray(item.post) ? item.post[0] : item.post),
          circles: undefined
        }
      }));

      // Filter out ghost videos from liked posts
      const validLikedPosts = transformedData.filter((liked) => {
        if (liked.post.content_type === 'video') {
          const mediaUrls = liked.post.media_urls;
          // Handle both single video and multiple videos formats
          if (Array.isArray(mediaUrls)) {
            const firstItem = mediaUrls[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              return !!(firstItem.url && firstItem.url.startsWith('http'));
            }
            return false;
          } else {
            const videoUrl = mediaUrls?.videoUrl;
            return videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
          }
        }
        return true; // Keep non-video posts
      });

      // Fetch user data for post authors
      const userIds = [...new Set(validLikedPosts.map(l => l.post.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, name, email, avatar_url, aura_points, bio, followers_count, following_count')
          .in('id', userIds);

        if (!usersError && usersData) {
          const usersMap: Record<string, any> = {};
          usersData.forEach(u => {
            usersMap[u.id] = u;
          });
          setLikedPostsUsers(usersMap);
        }
      }

      setLikedPosts(validLikedPosts);
    } catch (error) {
      console.error('Error loading liked posts:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likedPostsUsers]);

  const loadUpvotedPosts = useCallback(async (userId: string) => {
    try {

      const { data, error } = await supabase
        .from('post_votes')
        .select(
          `
          id,
          vote_type,
          post_id,
          circle_posts!inner(
            id,
            user_id,
            content,
            content_type,
            media_urls,
            likes_count,
            views_count,
            created_at,
            circle_ids,
            visibility,
            upvotes_count,
            downvotes_count,
            net_votes,
            comments_count,
            shares_count,
            tags
          )
        `
        )
        .eq('user_id', userId)
        .in('vote_type', ['upvote', 'downvote'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading upvoted posts:', error);
        return;
      }

      interface RawUpvotedPost {
        id: string;
        vote_type: string;
        circle_posts: UserVideo | UserVideo[];
      }

      const transformedData = (data || []).map((item: RawUpvotedPost): UpvotedPost => ({
        id: item.id,
        vote_type: item.vote_type,
        post: {
          ...(Array.isArray(item.circle_posts) ? item.circle_posts[0] : item.circle_posts),
          circles: undefined
        }
      }));

      // Filter out ghost videos from upvoted posts
      const validUpvotedPosts = transformedData.filter((upvoted) => {
        if (upvoted.post.content_type === 'video') {
          const mediaUrls = upvoted.post.media_urls;
          // Handle both single video and multiple videos formats
          if (Array.isArray(mediaUrls)) {
            const firstItem = mediaUrls[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              return !!(firstItem.url && firstItem.url.startsWith('http'));
            }
            return false;
          } else {
            const videoUrl = mediaUrls?.videoUrl;
            return videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '' && videoUrl.startsWith('http');
          }
        }
        return true; // Keep non-video posts
      });

      // Fetch user data for post authors
      const userIds = [...new Set(validUpvotedPosts.map(up => up.post.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, name, email, avatar_url, aura_points, bio, followers_count, following_count')
          .in('id', userIds);

        if (!usersError && usersData) {
          const usersMap: Record<string, any> = {};
          usersData.forEach(u => {
            usersMap[u.id] = u;
          });
          setUpvotedPostsUsers(usersMap);
        }
      }

      setUpvotedPosts(validUpvotedPosts);
      console.log(`Loaded ${validUpvotedPosts.length} voted posts (upvotes + downvotes) for user`);
    } catch (error) {
      console.error('Error loading upvoted posts:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upvotedPostsUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    await loadTabContent();

    if (refreshUserAuraPoints) {
      await refreshUserAuraPoints();
    }
    setRefreshing(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant camera roll permissions to update your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0] && profile) {
        const file = result.assets[0];

        console.log('📤 Uploading avatar...');

        try {
          // Upload to Supabase Storage
          const uploadResult = await uploadAvatar(file.uri, profile.id);

          if (!uploadResult.success) {
            console.error('❌ Upload failed:', uploadResult.error);
            Alert.alert('Error', uploadResult.error || 'Failed to upload profile picture');
            return;
          }

          console.log('✅ Upload successful:', uploadResult.cdnUrl);

          // Update user profile with new avatar URL
          const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: uploadResult.cdnUrl })
            .eq('id', profile.id);

          if (updateError) {
            console.error('Update error:', updateError);
            Alert.alert('Error', 'Failed to update profile');
            return;
          }

          const urlWithTimestamp = `${uploadResult.cdnUrl}?t=${Date.now()}`;
          setProfile({ ...profile, avatar_url: urlWithTimestamp });
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Profile picture updated!',
            position: 'top',
            topOffset: 60,
          });
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', `Upload failed: ${uploadError.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAuraBadgePress = () => {
    const currentAura = getCurrentAuraPoints();
    const isRestricted = currentAura < 50;
    const isLowAura = currentAura >= 50 && currentAura < 100;

    if (isRestricted) {
      Alert.alert(
        'Restricted Aura Status',
        `Your account is currently restricted because your Aura has dropped below 50 points.\n\nWhy does this happen?\nYour Aura can decrease when your posts receive downvotes or when you engage in behavior that goes against community guidelines.\n\nCurrent Aura: ${currentAura}\nRequired: 50+ Aura\n\nWhile restricted, you cannot:\n• Create posts\n• Comment on posts\n• Send gifts\n• Send direct messages\n\nTo restore your account, focus on positive engagement when your restrictions lift, or wait for your Aura to naturally recover.`,
        [
          {
            text: 'Learn More',
            onPress: () => {
              // Navigate to educational materials or show more info
              Alert.alert(
                'How to Improve Your Aura',
                `Tips to rebuild your Aura:\n\n1. Create quality content that others find valuable\n2. Engage positively with the community\n3. Avoid posting content that gets downvoted\n4. Be respectful in your interactions\n\nYour Aura reflects how the community values your contributions. Focus on adding value!`,
                [{ text: 'Got it!', style: 'default' }]
              );
            },
          },
          { text: 'OK', style: 'default' },
        ]
      );
    } else if (isLowAura) {
      Alert.alert(
        'Low Aura Warning',
        `Your Aura is running low at ${currentAura} points.\n\nIf your Aura drops below 50, your account will become restricted and you won't be able to post, comment, gift, or message.\n\nCurrent Aura: ${currentAura}\nRestriction threshold: 50 Aura\n\nTip: Focus on creating quality content and positive engagement to build your Aura back up!`,
        [
          {
            text: 'Learn More',
            onPress: () => {
              Alert.alert(
                'How to Improve Your Aura',
                `Tips to increase your Aura:\n\n1. Create quality content that others find valuable\n2. Engage positively with the community\n3. Avoid posting content that gets downvoted\n4. Be respectful in your interactions\n\nYour Aura reflects how the community values your contributions. Focus on adding value!`,
                [{ text: 'Got it!', style: 'default' }]
              );
            },
          },
          { text: 'OK', style: 'default' },
        ]
      );
    }
  };

  const handleAuraPointsPress = async () => {
    try {
      if (!getUserAuraBreakdown) {
        Alert.alert(
          'Aura Points',
          `You have ${getCurrentAuraPoints()} aura points!\n\nAura points are earned from upvotes on your posts:\n• +1 point per 100 upvotes\n• -1 point per 100 downvotes`,
          [{ text: 'Cool!', style: 'default' }]
        );
        return;
      }

      const breakdown = await getUserAuraBreakdown();
      if (breakdown) {
        Alert.alert(
          'Aura Points Breakdown',
          `Total Aura Points: ${getCurrentAuraPoints()}\n\nBreakdown:\n• Total Upvotes: ${breakdown.total_upvotes || 0}\n• Total Downvotes: ${breakdown.total_downvotes || 0}\n• Net Votes: ${breakdown.net_votes || 0}\n\nEarn more by creating quality content that gets upvoted!`,
          [{ text: 'Nice!', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Aura Points',
          `You have ${getCurrentAuraPoints()} aura points!\n\nCreate posts and get upvotes to earn more aura points!`,
          [{ text: 'Got it!', style: 'default' }]
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      Alert.alert(
        'Aura Points',
        `You have ${getCurrentAuraPoints()} aura points!\n\nAura points are earned from upvotes on your posts.`,
        [{ text: 'Cool!', style: 'default' }]
      );
    }
  };

  const getCurrentAuraPoints = () => {
    // Prefer auraPoints from AuraContext (more reliable), fallback to PostInteractions, then profile
    const points = contextAuraPoints ?? userAuraPoints ?? profile?.aura_points ?? 0;
    return Math.max(0, points);
  };

  const getDisplayName = () => {
    if (profile?.name) return profile.name;
    if (profile?.username) return profile.username;
    return profile?.email?.split('@')[0] || 'User';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDisplayUsername = () => {
    if (profile?.username) return `@${profile.username}`;
    return '@' + (profile?.email?.split('@')[0] || 'user');
  };

  const handleVideoPress = (video: UserVideo, index: number) => {
    console.log('=== Video Pressed ===');
    console.log('Selected Tab:', selectedTab);
    console.log('Video Index:', index);
    console.log('Video ID:', video.id);

    setSelectedPostId(video.id);
    // @ts-ignore
    setSelectedVideoIndex(index);
    setShowVideoFeed(true);
  };

  // Memoize the posts array for the video feed modal
  // Reorders so the selected post is first — InstagramReelsFeed always starts at index 0
  const videoFeedPosts = useMemo(() => {
    let posts: any[] = [];
    switch (selectedTab) {
      case 'videos':
        posts = userVideos;
        break;
      case 'private':
        posts = privateVideos;
        break;
      case 'bookmarks':
        posts = bookmarkedPosts.map((bp: BookmarkedPost) => bp.post);
        break;
      case 'liked':
        posts = likedPosts.map((lp: LikedPost) => lp.post);
        break;
      case 'upvoted':
        posts = upvotedPosts.map((up: UpvotedPost) => up.post);
        break;
      default:
        return [];
    }
    if (!selectedPostId) return posts;
    const idx = posts.findIndex((p: any) => p.id === selectedPostId);
    if (idx <= 0) return posts;
    return [...posts.slice(idx), ...posts.slice(0, idx)];
  }, [selectedTab, selectedPostId, userVideos, privateVideos, bookmarkedPosts, likedPosts, upvotedPosts]);

  // Close video feed and refresh data for the current tab
  // This ensures upvoted/liked posts are up-to-date after interactions
  const handleCloseVideoFeed = useCallback(() => {
    setShowVideoFeed(false);

    // Refresh the current tab data after closing (votes/likes may have changed)
    if (profile?.id) {
      if (selectedTab === 'upvoted') {
        loadUpvotedPosts(profile.id);
      } else if (selectedTab === 'liked') {
        loadLikedPosts(profile.id);
      } else if (selectedTab === 'bookmarks') {
        loadBookmarkedPosts(profile.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, profile?.id]);

  // Handle hashtag press inside modal - close modal first, then navigate
  const handleHashtagPressInModal = useCallback((tag: string) => {
    // Close the modal first
    handleCloseVideoFeed();

    // Navigate after modal closes
    setTimeout(() => {
      router.push(`/hashtag/${tag}`);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabPress = (
    // V1: Repost feature commented out - removed 'reposts' from type
    tab: 'videos' | 'private' | 'bookmarks' | 'liked' | 'upvoted'
  ) => {
    setSelectedTab(tab);
  };

  const handleDeletePost = async (postId: string) => {
    const result = await deletePost(postId);
    if (result.success) {
      setUserVideos(prevVideos => prevVideos.filter(v => v.id !== postId));
      setPrivateVideos(prevVideos => prevVideos.filter(v => v.id !== postId));
      setBookmarkedPosts(prevPosts => prevPosts.filter(p => p.post.id !== postId));
      // V1: Repost feature commented out - to be reintroduced in later versions
      // setRepostedPosts(prevPosts => prevPosts.filter(p => p.post.id !== postId));
      setLikedPosts(prevPosts => prevPosts.filter(p => p.post.id !== postId));
      setUpvotedPosts(prevPosts => prevPosts.filter(p => p.post.id !== postId));
      setShowVideoFeed(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Post deleted successfully',
        position: 'top',
        topOffset: 60,
      });
    } else {
      Alert.alert('Error', result.error || 'Failed to delete post');
    }
  };

  const handleMenuPress = () => {
    setShowMenu(true);
  };

  const handleMenuClose = () => {
    setShowMenu(false);
    setShowSettingsSubmenu(false);
    setShowEditProfileSubmenu(false);
    setShowQuickEditMenu(false);
  };

  const handleSettings = () => {
    setShowSettingsSubmenu(true);
  };

  const handleEditProfile = () => {
    setShowEditProfileSubmenu(true);
  };



  const openEditModal = (type: 'name' | 'last_name' | 'username' | 'bio', title: string, currentValue: string) => {
    setEditModalType(type);
    setEditModalTitle(title);
    setEditModalValue(currentValue);
    setShowMenu(false);
    setShowSettingsSubmenu(false);
    setShowEditProfileSubmenu(false);
    setShowEditModal(true);
  };

  const handleEditName = () => {
    openEditModal('name', 'Edit Name', profile?.name || '');
  };

  const handleEditLastName = () => {

    openEditModal('last_name', 'Edit Last Name', '');
  };

  const handleEditUsername = () => {
    openEditModal('username', 'Edit Username', profile?.username || '');
  };

  const handleEditBio = () => {
    openEditModal('bio', 'Edit Bio', profile?.bio || '');
  };

  const handleEditModalSave = async () => {
    if (!profile || (!editModalValue.trim() && editModalType !== 'bio')) {
      return;
    }

    try {
      setSaving(true);
      type UpdateData = Partial<Pick<UserProfile, 'username' | 'bio' | 'name'>> & {
        last_name?: string | null;
      };
      let updateData: UpdateData = {};
      let processedValue = editModalValue.trim();

      switch (editModalType) {
        case 'username': {
          processedValue = processedValue.toLowerCase().replace(/[^a-z0-9_]/g, '');
          const usernameValidation = validateUsernameContent(processedValue);
          if (!usernameValidation.isValid) {
            Alert.alert('Error', usernameValidation.message);
            setSaving(false);
            return;
          }
          updateData.username = processedValue;
          break;
        }
        case 'bio':
          processedValue = processedValue.slice(0, 80);
          updateData.bio = processedValue || null;
          break;
        case 'name':
          updateData.name = processedValue || null;
          break;
        case 'last_name':
          updateData.last_name = processedValue || null;
          break;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        console.error('Update error:', error);
        if (editModalType === 'username' && error.message.includes('duplicate')) {
          Alert.alert('Error', 'Username already taken');
        } else {
          Alert.alert('Error', `Failed to update ${editModalTitle.toLowerCase()}`);
        }
        setSaving(false);
        return;
      }

      const updatedProfile: UserProfile = { ...profile, ...updateData };
      setProfile(updatedProfile);

      setShowEditModal(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${editModalTitle} updated successfully!`,
        position: 'top',
        topOffset: 60,
      });
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', `Failed to update ${editModalTitle.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutFromSettings = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setShowMenu(false);
            setShowSettingsSubmenu(false);
            signOut();
          },
        },
      ]
    );
  };

  const handleBackFromSettings = () => {
    setShowSettingsSubmenu(false);
  };

  const handleBackFromEditProfile = () => {
    setShowEditProfileSubmenu(false);
  };

  const handleFindFriendsPress = () => {
    setShowFindFriendsModal(true);
  };

  const handleFollowersPress = () => {
    if (!profile) return;
    router.push({
      pathname: '/FollowTabs' as any,
      params: {
        userId: profile.id,
        username: getDisplayName(),
        initialTab: 'followers'
      }
    });
  };

  const handleFollowingPress = () => {
    if (!profile) return;
    router.push({
      pathname: '/FollowTabs' as any,
      params: {
        userId: profile.id,
        username: getDisplayName(),
        initialTab: 'following'
      }
    });
  };

  // V1: Repost feature commented out - removed RepostedPost from type union
  const renderVideoItem = ({ item, index }: { item: UserVideo | BookmarkedPost | LikedPost | UpvotedPost; index: number }) => {

    const video = 'post' in item ? item.post : item;
    const contentType = video.content_type;

    // Determine the thumbnail/image URL based on content type
    let displayUrl = '';
    let isTextPost = false;
    let textContent = '';

    if (contentType === 'text') {
      isTextPost = true;
      // Extract text content for display
      if (typeof video.content === 'string') {
        textContent = video.content;
      } else if (typeof video.content === 'object' && video.content !== null) {
        textContent = (video.content as any).text || (video.content as any).content || (video.content as any).body || '';
      }
    } else if (contentType === 'photo' || contentType === 'image' || contentType === 'mixed') {
      // Get image URL from media_urls (handles both string URLs and object format)
      if (Array.isArray(video.media_urls) && video.media_urls.length > 0) {
        const firstItem = video.media_urls[0];
        if (typeof firstItem === 'string') {
          displayUrl = firstItem;
        } else if (typeof firstItem === 'object' && firstItem !== null) {
          // Object format: { type, url, thumbnailUrl }
          displayUrl = firstItem.url || firstItem.thumbnailUrl || '';
        }
      } else if (typeof video.media_urls === 'object' && video.media_urls !== null) {
        displayUrl = (video.media_urls as any).imageUrl || (video.media_urls as any).photoUrl || (video.media_urls as any).url || '';
      }
    } else if (contentType === 'video') {
      // Get video thumbnail or URL - handle both single and multiple videos
      if (Array.isArray(video.media_urls) && video.media_urls.length > 0) {
        const firstItem = video.media_urls[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          displayUrl = firstItem.thumbnailUrl || firstItem.url || '';
        }
      } else {
        displayUrl = (video.media_urls as any)?.thumbnailUrl || (video.media_urls as any)?.videoUrl || '';
      }
    }

    // Get caption text (for non-text posts, content is the caption)
    // Content can be a string or an object { text: string }
    let caption = '';
    if (!isTextPost && video.content) {
      if (typeof video.content === 'string') {
        caption = video.content;
      } else if (typeof video.content === 'object' && !Array.isArray(video.content)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        caption = (video.content as any).text || (video.content as any).content || (video.content as any).body || '';
      }
    }

    // Get circle name if post belongs to a circle (for Groups tab)
    const circleName = video.circles && video.circles.length > 0 ? video.circles[0].name : null;

    // Get tags
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tags = video.tags && Array.isArray(video.tags) ? video.tags : [];

    return (
      <TouchableOpacity
        style={[
          styles.videoItem,
          { marginRight: (index + 1) % 3 === 0 ? 0 : 2 },
        ]}
        onPress={() => handleVideoPress(video, index)}
        activeOpacity={0.9}
      >
        {isTextPost ? (
          // Text post: show text content in a box
          <View style={[styles.videoThumbnail, styles.textPostContainer]}>
            <Text style={styles.textPostContent} numberOfLines={6}>
              {textContent}
            </Text>
          </View>
        ) : (
          // Video/Photo/Mixed post: show image thumbnail
          <Image
            source={displayUrl || 'https://via.placeholder.com/150x200/000000/FFFFFF?text=Post'}
            style={styles.videoThumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        )}

        {/* TODO: Spotlight/Pin feature - enable when manual pin control is implemented
        {video.is_pinned && (
          <View style={styles.spotlightBadge}>
            <Text style={styles.spotlightText}>Spotlight</Text>
          </View>
        )}
        */}

        {/* Show views count for all post types (videos, photos, mixed) */}
        {(contentType === 'video' || contentType === 'mixed' || contentType === 'photo' || contentType === 'image') && (
          <View style={styles.videoOverlay}>
            <View style={styles.viewsContainer}>
              <Ionicons name="eye" size={12} color="white" />
              <Text style={styles.viewsText}>
                {video.views_count ? formatNumber(video.views_count) : '0'}
              </Text>
            </View>
          </View>
        )}

        {/* Show circle/group name badge */}
        {circleName && (
          <View style={styles.circleBadge}>
            <Ionicons name="people" size={wp('2.5%')} color="white" />
            <Text style={styles.circleBadgeText} numberOfLines={1}>{circleName}</Text>
          </View>
        )}

        {/* Show placeholder for missing images */}
        {!isTextPost && !displayUrl && (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="image" size={24} color="#666" />
          </View>
        )}

      </TouchableOpacity>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <View style={styles.loadingVideos}>
          <ActivityIndicator size="large" color="#00b1ff" />
        </View>
      );
    }

    switch (selectedTab) {
      case 'videos':
        return userVideos.length > 0 ? (
          <FlatList
            data={userVideos}
            renderItem={renderVideoItem}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.videosList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>
              Content you post to the world feed will show up here
            </Text>
          </View>
        );

      case 'private':
        return privateVideos.length > 0 ? (
          <FlatList
            data={privateVideos}
            renderItem={renderVideoItem}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.videosList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Circle Posts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Content you post to your Circles will show up here
            </Text>
          </View>
        );

      // V1: Repost feature commented out - to be reintroduced in later versions
      // case 'reposts':
      //   return repostedPosts.length > 0 ? (
      //     <FlatList
      //       data={repostedPosts}
      //       renderItem={renderVideoItem}
      //       numColumns={3}
      //       scrollEnabled={false}
      //       showsVerticalScrollIndicator={false}
      //       keyExtractor={(item, index) => `${item.id}-${index}`}
      //       contentContainerStyle={styles.videosList}
      //     />
      //   ) : (
      //     <View style={styles.emptyState}>
      //       <Text style={styles.emptyTitle}>No videos reposted</Text>
      //       <Text style={styles.emptySubtitle}>
      //         Repost what you find interesting
      //       </Text>
      //     </View>
      //   );

      case 'bookmarks':
        return bookmarkedPosts.length > 0 ? (
          <FlatList
            data={bookmarkedPosts}
            renderItem={renderVideoItem}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.videosList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No bookmarks yet</Text>
            <Text style={styles.emptySubtitle}>
              Bookmark videos to watch them later
            </Text>
          </View>
        );

      case 'liked':
        return likedPosts.length > 0 ? (
          <FlatList
            data={likedPosts}
            renderItem={renderVideoItem}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.videosList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No liked videos yet</Text>
            <Text style={styles.emptySubtitle}>
              Videos you like will appear here
            </Text>
          </View>
        );

      case 'upvoted':
        return upvotedPosts.length > 0 ? (
          <FlatList
            data={upvotedPosts}
            renderItem={renderVideoItem}
            numColumns={3}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.videosList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="arrow-up" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No upvoted videos yet</Text>
            <Text style={styles.emptySubtitle}>
              Videos you upvote/ downvote will appear here
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const statusBarHeight = Constants.statusBarHeight || 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FE2C55" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FE2C55" />
            <Text style={styles.errorText}>Failed to load profile</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadUserProfile}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView style={styles.safeArea}>
        { }
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? hp('5%') : hp('1%') }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleFindFriendsPress}
          >
            <Ionicons name="person-add-outline" size={wp('6%')} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{getDisplayName()}</Text>
          </View>

          {/* Gift Dashboard Button - Only visible on own profile */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/GiftDashboardScreen' as any)}
          >
            <Ionicons name="gift-outline" size={wp('6%')} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={wp('6%')} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FE2C55']}
              tintColor="#FE2C55"
            />
          }
        >
          {/* Profile Section */}
          <ProfileHeader
            avatarUrl={profile.avatar_url}
            auraPoints={getCurrentAuraPoints()}
            displayName={getDisplayName()}
            username={profile.username}
            bio={profile.bio}
            postsCount={userVideos.length}
            followersCount={profile.followers_count || 0}
            followingCount={profile.following_count || 0}
            onAvatarPress={handlePickImage}
            onAuraPress={handleAuraPointsPress}
            onAuraBadgePress={handleAuraBadgePress}
            onFollowersPress={handleFollowersPress}
            onFollowingPress={handleFollowingPress}
            onNameEditPress={handleQuickEdit}
            onAddBioPress={handleEditBio}
            showAddButton={true}
            isEditable={true}
          />

          {/* Divider between stats and tabs */}
          <View style={styles.divider} />

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'videos' && styles.activeTab]}
              onPress={() => handleTabPress('videos')}
            >
              <Ionicons
                name="globe-outline"
                size={wp('7%')}
                color={selectedTab === 'videos' ? '#000' : '#8E8E93'}
              />
              <Text style={[styles.tabText, selectedTab === 'videos' && styles.activeTabText]}>
                World Feed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedTab === 'private' && styles.activeTab]}
              onPress={() => handleTabPress('private')}
            >
              <Ionicons
                name="people"
                size={wp('7%')}
                color={selectedTab === 'private' ? '#000' : '#8E8E93'}
              />
              <Text style={[styles.tabText, selectedTab === 'private' && styles.activeTabText]}>
                Circles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, selectedTab === 'upvoted' && styles.activeTab]}
              onPress={() => handleTabPress('upvoted')}
            >
              <Ionicons
                name="arrow-up"
                size={wp('7%')}
                color={selectedTab === 'upvoted' ? '#000' : '#8E8E93'}
              />
              <Text style={[styles.tabText, selectedTab === 'upvoted' && styles.activeTabText]}>
                Upvotes/Downvotes
              </Text>
            </TouchableOpacity>

            {/* V1: Repost feature commented out - to be reintroduced in later versions */}
            {/* <TouchableOpacity
              style={[styles.tab, selectedTab === 'reposts' && styles.activeTab]}
              onPress={() => handleTabPress('reposts')}
            >
              <Ionicons
                name="repeat"
                size={wp('6%')}
                color={selectedTab === 'reposts' ? '#000' : '#8E8E93'}
              />
              <Text style={[styles.tabText, selectedTab === 'reposts' && styles.activeTabText]}>
                Repost
              </Text>
            </TouchableOpacity> */}
          </View>

          { }
          <View style={styles.videosContainer}>{renderTabContent()}</View>
        </ScrollView>

        { }
        <Modal
          visible={showMenu && !showSettingsSubmenu && !showEditProfileSubmenu && !showQuickEditMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={handleMenuClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleMenuClose}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={handleMenuClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                  <Ionicons name="settings-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Settings</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        { }
        <Modal
          visible={showMenu && showSettingsSubmenu && !showEditProfileSubmenu}
          transparent={true}
          animationType="slide"
          onRequestClose={handleMenuClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleMenuClose}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <TouchableOpacity onPress={handleBackFromSettings}>
                  <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.menuTitle}>Settings</Text>
                <TouchableOpacity onPress={handleMenuClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                  <Ionicons name="create-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Profile</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowSettingsSubmenu(false);
                    router.push('/MyReports' as any);
                  }}
                >
                  <Ionicons name="flag-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>My Reports</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={async () => {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.removeItem('@venn_circles_tour_shown');
                    await AsyncStorage.removeItem('@venn_home_tour_shown');
                    // Clear all circle join tour keys
                    const keys = await AsyncStorage.getAllKeys();
                    const tourKeys = keys.filter((k: string) => k.startsWith('@venn_circle_join_tour_'));
                    if (tourKeys.length > 0) await AsyncStorage.multiRemove(tourKeys);
                    Alert.alert('Done', 'All tours reset! Go to Circles or Home tab to see tutorials again.');
                  }}
                >
                  <Ionicons name="refresh-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Reset Tours (Testing)</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={handleLogoutFromSettings}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FE2C55" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FE2C55" />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={() => {
                    setShowMenu(false);
                    setShowSettingsSubmenu(false);
                    router.push('/DeleteAccount' as any);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#FE2C55" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Delete Account</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FE2C55" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>



        { }
        <Modal
          visible={showMenu && showEditProfileSubmenu}
          transparent={true}
          animationType="slide"
          onRequestClose={handleMenuClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleMenuClose}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <TouchableOpacity onPress={handleBackFromEditProfile}>
                  <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.menuTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleMenuClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>


                <TouchableOpacity style={styles.menuItem} onPress={handleEditLastName}>
                  <Ionicons name="person-add-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Last Name</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleEditUsername}>
                  <Ionicons name="at-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Username</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleEditBio}>
                  <Ionicons name="document-text-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Bio</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        { }
        {/* Quick Edit Menu (Name & Bio only) */}
        <Modal
          visible={showMenu && showQuickEditMenu}
          transparent={true}
          animationType="slide"
          onRequestClose={handleMenuClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleMenuClose}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Edit Info</Text>
                <TouchableOpacity onPress={handleMenuClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditName}>
                  <Ionicons name="person-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Name</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleEditBio}>
                  <Ionicons name="document-text-outline" size={20} color="#333" />
                  <Text style={styles.menuItemText}>Edit Bio</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* FindFriendsModal removed */}

        { }
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editModalOverlay}
          >
            <View style={styles.editModalContainer}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{editModalTitle}</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.editModalContent}>
                <TextInput
                  style={[
                    styles.editModalInput,
                    editModalType === 'bio' && styles.editModalBioInput
                  ]}
                  value={editModalValue}
                  onChangeText={setEditModalValue}
                  placeholder={`Enter your ${editModalTitle.toLowerCase()}`}
                  placeholderTextColor="#999"
                  multiline={editModalType === 'bio'}
                  maxLength={editModalType === 'bio' ? 80 : editModalType === 'username' ? 20 : 50}
                  autoFocus={true}
                  textAlignVertical={editModalType === 'bio' ? 'top' : 'center'}
                />

                {editModalType === 'bio' && (
                  <Text style={styles.characterCount}>
                    {editModalValue.length}/80 characters
                  </Text>
                )}

                {editModalType === 'username' && (
                  <Text style={styles.usernameHint}>
                    Username can only contain letters, numbers, and underscores
                  </Text>
                )}
              </View>

              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={styles.editModalCancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.editModalSaveButton,
                    saving && styles.editModalSaveButtonDisabled
                  ]}
                  onPress={handleEditModalSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.editModalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        { }
        {showVideoFeed && (
          <Modal
            visible={showVideoFeed}
            animationType="slide"
            onRequestClose={handleCloseVideoFeed}
          >
            <View style={{ flex: 1, backgroundColor: 'black' }}>
              { }
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: Constants.statusBarHeight + 10,
                  right: 20,
                  zIndex: 100,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleCloseVideoFeed}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

              <InstagramReelsFeed
                posts={videoFeedPosts as any}
                initialPostId={selectedPostId || undefined}
                shouldPauseOnUnmount={!showVideoFeed}
                showVideosOnly={false}
                users={profile && user ? {
                  ...bookmarkedPostsUsers,
                  ...likedPostsUsers,
                  ...upvotedPostsUsers,
                  [user.id]: {
                    id: user.id,
                    username: profile.username,
                    name: profile.name,
                    email: profile.email,
                    avatar_url: profile.avatar_url,
                    aura_points: profile.aura_points,
                    created_at: '',
                    bio: profile.bio,
                    followers_count: profile.followers_count,
                    following_count: profile.following_count,
                  } as any
                } : { ...bookmarkedPostsUsers, ...likedPostsUsers, ...upvotedPostsUsers }}
                refreshing={false}
                onRefresh={() => { }}
                onLoadMore={() => { }}
                headerHeight={0}
                isFullscreen={true}
                onDeletePost={handleDeletePost}
                onHashtagPress={handleHashtagPressInModal}
              />
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('1.5%'),
    backgroundColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    minHeight: hp('8%'),
  },
  headerButton: {
    padding: wp('2%'),
    minWidth: wp('10%'),
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#fff',
  },
  dropdownIcon: {
    marginLeft: wp('1%'),
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('3%'),
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: hp('2%'),
  },
  profilePicture: {
    width: wp('24%'),
    height: wp('24%'),
    borderRadius: wp('12%'),
    minWidth: 80,
    minHeight: 80,
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00b1ff',
    borderRadius: wp('3%'),
    width: wp('6%'),
    height: wp('6%'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    minWidth: 24,
    minHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: wp('4%'),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#000',
    marginBottom: hp('0.5%'),
  },
  statLabel: {
    fontSize: wp('3.5%'),
    color: '#666',
  },
  auraStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('0.5%'),
  },
  auraStatNumber: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#000000ff',
    marginLeft: wp('1%'),
  },
  auraLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraIcon: {
    marginLeft: wp('1%'),
    marginTop: wp('1%'),
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('2%'),
  },
  username: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#000',
  },
  verifiedBadge: {
    marginLeft: wp('1%'),
  },
  bio: {
    fontSize: wp('4%'),
    color: '#000',
    textAlign: 'center',
    marginBottom: hp('2%'),
    lineHeight: wp('5.5%'),
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp('2%'),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    width: '50%',
    alignSelf: 'center',
  },
  tabText: {
    fontSize: wp('3%'),
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  videosContainer: {
    flex: 1,
    minHeight: hp('40%'),
    backgroundColor: '#FFFFFF',
  },
  videosList: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: hp('14%'),
  },
  videoItem: {
    width: VIDEO_WIDTH,
    height: VIDEO_WIDTH * 1.33,
    marginBottom: 2,
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  textPostContainer: {
    backgroundColor: '#F5F5F5',
    padding: wp('3%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textPostContent: {
    color: '#000',
    fontSize: wp('3%'),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: wp('4.5%'),
  },
  spotlightBadge: {
    position: 'absolute',
    top: wp('2%'),
    left: wp('2%'),
    backgroundColor: '#FF6B35',
    borderRadius: wp('1%'),
    paddingHorizontal: wp('2%'),
    paddingVertical: wp('1%'),
    zIndex: 10,
  },
  spotlightText: {
    color: 'white',
    fontSize: wp('2.5%'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: wp('2%'),
    paddingVertical: wp('1.5%'),
  },
  captionText: {
    color: 'white',
    fontSize: wp('2.5%'),
    fontWeight: '500',
    lineHeight: wp('3.5%'),
  },
  tagsText: {
    color: '#87CEEB',
    fontSize: wp('2.3%'),
    fontWeight: '600',
    marginTop: wp('0.5%'),
  },
  clickableHashtag: {
    color: '#87CEEB',
    fontWeight: '700',
  },
  circleBadge: {
    position: 'absolute',
    top: wp('2%'),
    left: wp('2%'),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: wp('2%'),
    paddingHorizontal: wp('2%'),
    paddingVertical: wp('1%'),
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  circleBadgeText: {
    color: 'white',
    fontSize: wp('2.2%'),
    fontWeight: '600',
    marginLeft: wp('1%'),
  },
  videoOverlay: {
    position: 'absolute',
    bottom: wp('1%'),
    left: wp('1%'),
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    color: 'white',
    fontSize: wp('3%'),
    fontWeight: '600',
    marginLeft: wp('1%'),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videoPlaceholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('10%'),
    paddingHorizontal: wp('10%'),
    paddingBottom: hp('18%'),
  },
  emptyTitle: {
    fontSize: wp('5%'),
    fontWeight: '600',
    color: '#000',
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  emptySubtitle: {
    fontSize: wp('4%'),
    color: '#666',
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: wp('4%'),
    color: '#666',
    marginTop: hp('1.5%'),
  },
  loadingVideos: {
    paddingVertical: hp('5%'),
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
  },
  errorText: {
    fontSize: wp('4.5%'),
    color: '#666',
    marginTop: hp('2%'),
    marginBottom: hp('3%'),
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FE2C55',
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('1.5%'),
  },
  retryButtonText: {
    color: 'white',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    paddingTop: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('4%') : hp('2%'),
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
    paddingBottom: hp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuTitle: {
    fontSize: wp('5%'),
    fontWeight: '600',
    color: '#000',
  },
  menuItems: {
    paddingTop: hp('2%'),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('2%'),
  },
  menuItemText: {
    flex: 1,
    fontSize: wp('4.5%'),
    color: '#333',
    marginLeft: wp('4%'),
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: hp('1%'),
    marginHorizontal: wp('6%'),
  },
  logoutItem: {
    marginTop: hp('1%'),
  },
  logoutText: {
    color: '#FE2C55',
  },

  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
  },
  editModalContainer: {
    backgroundColor: 'white',
    borderRadius: wp('4%'),
    width: '100%',
    maxWidth: 400,
    padding: hp('3%'),
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  editModalTitle: {
    fontSize: wp('5%'),
    fontWeight: '600',
    color: '#000',
  },
  editModalContent: {
    marginBottom: hp('3%'),
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: wp('2%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    fontSize: wp('4.5%'),
    color: '#000',
    minHeight: hp('6%'),
  },
  editModalBioInput: {
    minHeight: hp('12%'),
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: wp('3.5%'),
    color: '#666',
    textAlign: 'right',
    marginTop: hp('1%'),
  },
  usernameHint: {
    fontSize: wp('3.5%'),
    color: '#666',
    marginTop: hp('1%'),
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: wp('3%'),
  },
  editModalCancelButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editModalCancelText: {
    color: '#666',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  editModalSaveButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    backgroundColor: '#00b1ff',
  },
  editModalSaveButtonDisabled: {
    backgroundColor: '#00b1ffAA',
  },
  editModalSaveText: {
    color: 'white',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
});