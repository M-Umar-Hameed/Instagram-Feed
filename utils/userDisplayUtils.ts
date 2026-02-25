export interface UserDisplayData {
  username: string;
  profileImage?: string | null;
  isAnonymous: boolean;
}

export interface Post {
  id: string;
  user_id: string | null;
  is_anonymous?: boolean | null;
  anonymous_username?: string | null;
  created_at: string;
  content?: any;
  media_urls?: any;
  [key: string]: any;
}

export interface User {
  id: string;
  username?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
}

export const getDisplayName = (post: Post, user?: User | null): UserDisplayData => {

  if (post.is_anonymous) {
    return {
      username: post.anonymous_username || 'Anonymous',
      profileImage: null,
      isAnonymous: true,
    };
  }

  if (user) {
    return {
      username: user.username || user.name || 'Unknown User',
      profileImage: user.avatar_url,
      isAnonymous: false,
    };
  }

  return {
    username: 'Unknown User',
    profileImage: null,
    isAnonymous: false,
  };
};

export const getAnonymousAvatarPlaceholder = (username: string): string => {
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const formatUsername = (username: string, isAnonymous: boolean): string => {
  if (isAnonymous) {
    return username; 
  }

  return username.startsWith('@') ? username : `@${username}`;
};

export const shouldShowUserProfile = (post: Post): boolean => {
  return !post.is_anonymous;
};