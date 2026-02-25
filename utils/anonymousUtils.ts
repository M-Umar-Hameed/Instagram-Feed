import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnonymousUser {
  id: string;
  username: string;
  sessionId: string;
  createdAt: string;
}

const ANONYMOUS_BASE_NAME = 'Anonymous';

const STORAGE_KEYS = {
  ANONYMOUS_USER: '@anonymous_user',
  ANONYMOUS_SESSION_ID: '@anonymous_session_id',
} as const;

export class AnonymousUserManager {
  private static instance: AnonymousUserManager;
  private currentAnonymousUser: AnonymousUser | null = null;

  static getInstance(): AnonymousUserManager {
    if (!AnonymousUserManager.instance) {
      AnonymousUserManager.instance = new AnonymousUserManager();
    }
    return AnonymousUserManager.instance;
  }

  generateAnonymousId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAnonymousName(): string {
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    const paddedNum = randomNum.toString().padStart(4, '0');
    return `${ANONYMOUS_BASE_NAME}#${paddedNum}`;
  }

  async createAnonymousUser(): Promise<AnonymousUser> {
    const anonymousUser: AnonymousUser = {
      id: this.generateAnonymousId(),
      username: this.generateAnonymousName(),
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_USER, JSON.stringify(anonymousUser));
    await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_SESSION_ID, anonymousUser.sessionId);
    
    this.currentAnonymousUser = anonymousUser;
    return anonymousUser;
  }

  async getCurrentAnonymousUser(): Promise<AnonymousUser | null> {
    if (this.currentAnonymousUser) {
      return this.currentAnonymousUser;
    }

    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_USER);
      if (storedUser) {
        this.currentAnonymousUser = JSON.parse(storedUser);
        return this.currentAnonymousUser;
      }
    } catch (error) {
      console.error('Error retrieving anonymous user:', error);
    }

    return null;
  }

  async getOrCreateAnonymousUser(): Promise<AnonymousUser> {
    const existingUser = await this.getCurrentAnonymousUser();
    if (existingUser) {
      return existingUser;
    }
    return this.createAnonymousUser();
  }

  async clearAnonymousUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ANONYMOUS_USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.ANONYMOUS_SESSION_ID);
      this.currentAnonymousUser = null;
    } catch (error) {
      console.error('Error clearing anonymous user:', error);
    }
  }

  async regenerateAnonymousIdentity(): Promise<AnonymousUser> {
    await this.clearAnonymousUser();
    return this.createAnonymousUser();
  }

  isAnonymousUserId(userId: string): boolean {
    return userId.startsWith('anon_');
  }

  async getAnonymousSessionId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_SESSION_ID);
    } catch (error) {
      console.error('Error getting anonymous session ID:', error);
      return null;
    }
  }
}

export const anonymousUserManager = AnonymousUserManager.getInstance();

export const generateAnonymousComment = async () => {
  const anonymousUser = await anonymousUserManager.getOrCreateAnonymousUser();
  return {
    id: `anon_comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: null,
    username: anonymousUser.username,
    profile_image: 'https://img.icons8.com/ios-filled/50/user-male-circle.png',
    content: '',
    likes_count: 0,
    created_at: new Date().toISOString(),
    is_liked: false,
    is_anonymous: true,
  };
};

export const generateAnonymousPost = async () => {
  const anonymousUser = await anonymousUserManager.getOrCreateAnonymousUser();
  return {
    id: `anon_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: null,
    username: anonymousUser.username,
    profile_image: 'https://img.icons8.com/ios-filled/50/user-male-circle.png',
    is_anonymous: true,
    created_at: new Date().toISOString(),
  };
};