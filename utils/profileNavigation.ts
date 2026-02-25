import { router } from 'expo-router';
import { Database } from '../database.types';

type User = Database['public']['Tables']['users']['Row'];

export interface ProfileNavigationData {
  userId: string;
  username?: string;
  name?: string;
  profilePicture?: string;
  isAnonymous?: boolean;
  anonymousUsername?: string;
}

// Third parameter: currentUserId - if provided and matches, navigates to own profile tab instead of external view
// Returns true if navigation happened, false otherwise
export const navigateToUserProfile = (
  user: User | ProfileNavigationData | null,
  postUserId?: string,
  currentUserId?: string
): boolean => {
  try {
    console.log('navigateToUserProfile called with:', {
      hasUser: !!user,
      userId: (user as User)?.id || (user as ProfileNavigationData)?.userId,
      postUserId,
      currentUserId
    });

    if (!user && !postUserId) {
      console.log('No user data available for profile navigation');
      return false;
    }

    const userId = (user as User)?.id || (user as ProfileNavigationData)?.userId || postUserId;

    if (!userId) {
      console.log('No user ID available for profile navigation');
      return false;
    }

    // Validate that userId is a proper string
    if (typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid userId for profile navigation:', userId);
      return false;
    }

    const isAnonymous = (user as any)?.is_anonymous ||
                       (user as ProfileNavigationData)?.isAnonymous ||
                       userId.startsWith('anon_');

    if (isAnonymous) {
      console.log('Cannot navigate to anonymous user profile');
      return false;
    }

    // Check if user is trying to navigate to their own profile
    // If so, navigate to the proper profile tab instead of external user view
    if (currentUserId && currentUserId === userId) {
      console.log('User tapped on own profile - navigating to own profile tab');
      try {
        router.push('/(tabs)/Profile');
        return true;
      } catch (error) {
        console.error('Navigation to own profile error:', error);
        return false;
      }
    }

    console.log(`Navigating to user profile: ${userId}`);

    try {
      router.push(`/user/${userId}`);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }

  } catch (error) {
    console.error('Error navigating to user profile:', error);
    return false;
  }
};

export const isProfileViewable = (user: User | ProfileNavigationData | null, postUserId?: string): boolean => {
  if (!user && !postUserId) return false;

  const userId = (user as User)?.id || (user as ProfileNavigationData)?.userId || postUserId;
  if (!userId) return false;

  const isAnonymous = (user as any)?.is_anonymous ||
                     (user as ProfileNavigationData)?.isAnonymous ||
                     userId.startsWith('anon_');

  return !isAnonymous;
};

export const getUserDisplayName = (user: User | ProfileNavigationData | null, post?: any): string => {
  
  if (post?.is_anonymous) {
    return post.anonymous_username || 'Anonymous';
  }

  if (!user) return 'User';

  const isAnonymous = (user as any)?.is_anonymous || (user as ProfileNavigationData)?.isAnonymous;

  if (isAnonymous) {
    return (user as any)?.anonymous_username ||
           (user as ProfileNavigationData)?.anonymousUsername ||
           'Anonymous';
  }

  return user.username || user.name || 'User';
};

export const getFormattedUsername = (user: User | ProfileNavigationData | null, post?: any): string => {
  const displayName = getUserDisplayName(user, post);
  return `@${displayName}`;
};