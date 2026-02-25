import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Priority levels for different video contexts
export const VIDEO_PRIORITY = {
  FULLSCREEN_CONTEXT: 100,    // App-wide fullscreen overlay (highest)
  FULLSCREEN_MODAL: 90,       // Modal fullscreen from feed
  SIMPLE_FULLSCREEN: 80,      // Simple fullscreen modal
  FEED: 50,                   // Reels/Instagram feeds
  CIRCLE: 40,                 // Videos in circle pages
  PROFILE: 30,                // Videos in user profiles
  GENERIC: 10,                // Standalone video players
} as const;

interface VideoPlayerRegistration {
  id: string;
  component: string;
  pause: () => void;
  stop?: () => void;
  priority: number;
}

interface VideoPlaybackContextType {
  // Current active player
  activePlayerId: string | null;

  // Registration methods
  registerPlayer: (registration: VideoPlayerRegistration) => void;
  unregisterPlayer: (id: string) => void;

  // Playback control
  claimPlayback: (playerId: string) => boolean;
  releasePlayback: (playerId: string) => void;

  // Global pause
  pauseAll: () => void;

  // Ref-based immediate access
  activePlayerRef: React.MutableRefObject<string | null>;
  playersRef: React.MutableRefObject<Map<string, VideoPlayerRegistration>>;

  // Check if a specific player is active
  isPlayerActive: (playerId: string) => boolean;

  // Video position persistence
  savePosition: (postId: string, positionMs: number) => void;
  getPosition: (postId: string) => number;
  clearPosition: (postId: string) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | null>(null);

// Generate unique IDs for players
let playerIdCounter = 0;
export const generatePlayerId = (): string => {
  playerIdCounter += 1;
  return `video-player-${playerIdCounter}-${Date.now()}`;
};

interface VideoPlaybackProviderProps {
  children: ReactNode;
}

export const VideoPlaybackProvider: React.FC<VideoPlaybackProviderProps> = ({ children }) => {
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const activePlayerRef = useRef<string | null>(null);
  const playersRef = useRef<Map<string, VideoPlayerRegistration>>(new Map());

  // Video position persistence - stores postId -> positionMillis
  // LRU cache with max 100 entries to prevent memory leaks
  const videoPositionsRef = useRef<Map<string, number>>(new Map());
  const MAX_POSITION_CACHE_SIZE = 100;

  // Register a video player
  const registerPlayer = useCallback((registration: VideoPlayerRegistration) => {
    playersRef.current.set(registration.id, registration);
  }, []);

  // Unregister a video player
  const unregisterPlayer = useCallback((id: string) => {
    playersRef.current.delete(id);
    // If this was the active player, clear it
    if (activePlayerRef.current === id) {
      activePlayerRef.current = null;
      setActivePlayerId(null);
    }
  }, []);

  // Claim exclusive playback - pauses all other players immediately
  const claimPlayback = useCallback((playerId: string): boolean => {
    const player = playersRef.current.get(playerId);
    if (!player) {
      return false;
    }

    // Pause ALL other players immediately via refs (synchronous, no render delay)
    playersRef.current.forEach((registration, id) => {
      if (id !== playerId) {
        try {
          registration.pause();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Silent fail - player may have unmounted
        }
      }
    });

    // Update active player ref immediately (sync)
    activePlayerRef.current = playerId;
    // Update state for components that need to re-render
    setActivePlayerId(playerId);

    return true;
  }, []);

  // Release playback without pausing
  const releasePlayback = useCallback((playerId: string) => {
    if (activePlayerRef.current === playerId) {
      activePlayerRef.current = null;
      setActivePlayerId(null);
    }
  }, []);

  // Pause all players globally
  const pauseAll = useCallback(() => {
    playersRef.current.forEach((registration) => {
      try {
        registration.pause();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Silent fail
      }
    });
    activePlayerRef.current = null;
    setActivePlayerId(null);
  }, []);

  // Check if a player is the active one
  const isPlayerActive = useCallback((playerId: string): boolean => {
    return activePlayerRef.current === playerId;
  }, []);

  // Save video position for a post with LRU eviction
  const savePosition = useCallback((postId: string, positionMs: number) => {
    if (positionMs > 0) {
      // Delete and re-add to move to end (most recent)
      videoPositionsRef.current.delete(postId);
      videoPositionsRef.current.set(postId, positionMs);

      // LRU eviction: if cache exceeds max size, remove oldest entry (first entry)
      if (videoPositionsRef.current.size > MAX_POSITION_CACHE_SIZE) {
        const firstKey = videoPositionsRef.current.keys().next().value;
        if (firstKey) {
          videoPositionsRef.current.delete(firstKey);
        }
      }
    }
  }, []);

  // Get saved video position for a post (returns 0 if not found)
  const getPosition = useCallback((postId: string): number => {
    return videoPositionsRef.current.get(postId) || 0;
  }, []);

  // Clear saved position for a post (call when video finishes)
  const clearPosition = useCallback((postId: string) => {
    videoPositionsRef.current.delete(postId);
  }, []);

  // Handle app state changes - pause all when backgrounding
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        pauseAll();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [pauseAll]);

  const value: VideoPlaybackContextType = {
    activePlayerId,
    registerPlayer,
    unregisterPlayer,
    claimPlayback,
    releasePlayback,
    pauseAll,
    activePlayerRef,
    playersRef,
    isPlayerActive,
    savePosition,
    getPosition,
    clearPosition,
  };

  return (
    <VideoPlaybackContext.Provider value={value}>
      {children}
    </VideoPlaybackContext.Provider>
  );
};

// Main hook for video components
export const useVideoPlayback = (
  componentName: string,
  priority: number = VIDEO_PRIORITY.GENERIC
) => {
  const context = useContext(VideoPlaybackContext);
  if (!context) {
    throw new Error('useVideoPlayback must be used within a VideoPlaybackProvider');
  }

  const playerIdRef = useRef<string>(generatePlayerId());
  const pauseCallbackRef = useRef<(() => void) | null>(null);
  const isRegisteredRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRegisteredRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        context.unregisterPlayer(playerIdRef.current);
        isRegisteredRef.current = false;
      }
    };
  }, [context]);

  // Register pause callback - call this once the component has its pause function ready
  const registerPauseCallback = useCallback((pauseFn: () => void, stopFn?: () => void) => {
    pauseCallbackRef.current = pauseFn;

    context.registerPlayer({
      id: playerIdRef.current,
      component: componentName,
      pause: pauseFn,
      stop: stopFn,
      priority,
    });
    isRegisteredRef.current = true;
  }, [context, componentName, priority]);

  // Request exclusive playback
  const requestPlayback = useCallback((): boolean => {
    return context.claimPlayback(playerIdRef.current);
  }, [context]);

  // Check if this player is currently active (ref-based, no re-render)
  const isActivePlayer = useCallback((): boolean => {
    return context.isPlayerActive(playerIdRef.current);
  }, [context]);

  // Release playback claim
  const releasePlayback = useCallback(() => {
    context.releasePlayback(playerIdRef.current);
  }, [context]);

  return {
    playerId: playerIdRef.current,
    registerPauseCallback,
    requestPlayback,
    releasePlayback,
    isActivePlayer,
    pauseAll: context.pauseAll,
    // Video position persistence
    savePosition: context.savePosition,
    getPosition: context.getPosition,
    clearPosition: context.clearPosition,
  };
};

// Simple hook just to get pauseAll function (for components that don't play video but need to pause others)
export const useGlobalVideoPause = () => {
  const context = useContext(VideoPlaybackContext);
  if (!context) {
    throw new Error('useGlobalVideoPause must be used within a VideoPlaybackProvider');
  }
  return context.pauseAll;
};

export default VideoPlaybackContext;
