import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { followService } from '../services/followService';
import { getCachedUser } from '../utils/supabase';
import { notifyFollowUpdate } from '../hooks/useFeed';

interface FollowContextType {
  followingIds: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => Promise<boolean>;
  refreshFollowStatus: () => Promise<void>;
  isLoading: boolean;
  currentUserId: string | null;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const FollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const REFRESH_COOLDOWN = 5000;

  const loadFollowingIds = useCallback(async (silent: boolean = false) => {
    try {
      const now = Date.now();
      if (!silent && now - lastRefreshTime.current < REFRESH_COOLDOWN) {
        return;
      }
      lastRefreshTime.current = now;

      const { user } = await getCachedUser();
      if (!user) {
        setFollowingIds(new Set());
        setCurrentUserId(null);
        if (!silent) setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const ids = await followService.getFollowingIds(user.id);
      setFollowingIds(new Set(ids));
      if (!silent) setIsLoading(false);
    } catch (error) {
      console.error('Error loading following IDs:', error);
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowingIds(false);
  }, [loadFollowingIds]);

  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = followService.subscribeToFollowChanges(
      currentUserId,
      () => {
        loadFollowingIds(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, loadFollowingIds]);

  const isFollowing = useCallback((userId: string): boolean => {
    return followingIds.has(userId);
  }, [followingIds]);

  const toggleFollow = useCallback(async (userId: string): Promise<boolean> => {
    if (!currentUserId) return false;

    const wasFollowing = followingIds.has(userId);

    setFollowingIds(prev => {
      const newSet = new Set(prev);
      if (wasFollowing) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });

    try {
      let success;
      if (wasFollowing) {
        success = await followService.unfollowUser(userId);
      } else {
        success = await followService.followUser(userId);
      }

      if (!success) {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          if (wasFollowing) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
        return false;
      }

      notifyFollowUpdate();

      return true;
    } catch (error) {
      console.error('Error toggling follow:', error);

      setFollowingIds(prev => {
        const newSet = new Set(prev);
        if (wasFollowing) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });

      return false;
    }
  }, [currentUserId, followingIds]);

  const refreshFollowStatus = useCallback(async () => {
    await loadFollowingIds(true);
  }, [loadFollowingIds]);

  return (
    <FollowContext.Provider
      value={{
        followingIds,
        isFollowing,
        toggleFollow,
        refreshFollowStatus,
        isLoading,
        currentUserId,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};
