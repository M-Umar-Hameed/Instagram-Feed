import React, { forwardRef, useImperativeHandle, useEffect, useState, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';

// Unified playback status interface (kept same signature for backward compatibility with feed)
export interface CrossPlatformPlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isBuffering: boolean;
  didJustFinish: boolean;
  error?: string;
  playableDurationMillis?: number;
}

// Unified ref interface for both platforms
export interface CrossPlatformVideoRef {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  getStatus: () => Promise<CrossPlatformPlaybackStatus>;
  replay: () => Promise<void>;
  unload: () => Promise<void>;
  load: (uri: string, options?: { shouldPlay?: boolean; isMuted?: boolean; volume?: number; positionMillis?: number }) => Promise<void>;
}

export interface CrossPlatformVideoProps {
  source: { uri: string };
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  isMuted?: boolean;
  isLooping?: boolean;
  volume?: number;
  resizeMode?: 'contain' | 'cover' | 'fill';
  onLoad?: (status: CrossPlatformPlaybackStatus) => void;
  onError?: (error: any) => void;
  onPlaybackStatusUpdate?: (status: CrossPlatformPlaybackStatus) => void;
  onReadyForDisplay?: () => void;
  useNativeControls?: boolean;
  progressUpdateIntervalMillis?: number; // unused in expo-video, kept for type compat
  rate?: number; // unused in expo-video, kept for type compat
}

// Map resize mode to expo-video contentFit
const mapResizeMode = (mode?: 'contain' | 'cover' | 'fill'): 'contain' | 'cover' | 'fill' => {
  switch (mode) {
    case 'contain':
      return 'contain';
    case 'fill':
      return 'fill';
    case 'cover':
    default:
      return 'cover';
  }
}

export const CrossPlatformVideo = forwardRef<CrossPlatformVideoRef, CrossPlatformVideoProps>(
  (
    {
      source,
      style,
      shouldPlay = false,
      isMuted = false,
      isLooping = false,
      volume = 1.0,
      resizeMode = 'cover',
      onLoad,
      onError,
      onPlaybackStatusUpdate,
      onReadyForDisplay,
      useNativeControls = false,
    },
    ref
  ) => {
    const [isReady, setIsReady] = useState(false);
    
    // We use a ref to prevent didJustFinish infinite firing loops
    const lastStatusRef = useRef<CrossPlatformPlaybackStatus>({
      isLoaded: false,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isBuffering: false,
      didJustFinish: false,
    });

    const player = useVideoPlayer(source.uri, (p) => {
      p.loop = isLooping;
      p.muted = isMuted;
      p.volume = volume;
      if (shouldPlay) {
        p.play();
      }
    });

    // The new expo-video API handles playing state exclusively via useEvent
    const { status } = useEvent(player, 'statusChange', { status: player?.status });
    
    // Track play head via manual polling because expo-video lacks an onPlaybackStatusUpdate prop
    useEffect(() => {
      if (!player || !onPlaybackStatusUpdate) return;

      const interval = setInterval(() => {
        if (player.status === 'readyToPlay') {
          const currentStatus: CrossPlatformPlaybackStatus = {
            isLoaded: true,
            isPlaying: player.playing,
            positionMillis: Math.round(player.currentTime * 1000),
            durationMillis: Math.round((player.duration || 0) * 1000),
            // @ts-ignore
            isBuffering: player.status === 'loading',
            didJustFinish: false,
            playableDurationMillis: Math.round((player.bufferedPosition || 0) * 1000),
          };

          // Check if video just finished (near end and not looping)
          if (!isLooping && currentStatus.durationMillis > 0) {
            const nearEnd = currentStatus.positionMillis >= currentStatus.durationMillis - 100;
            if (nearEnd && !lastStatusRef.current.didJustFinish) {
              currentStatus.didJustFinish = true;
            }
          }

          lastStatusRef.current = currentStatus;
          onPlaybackStatusUpdate(currentStatus);
        }
      }, 100);

      return () => clearInterval(interval);
    }, [player, onPlaybackStatusUpdate, isLooping]);

    // Setup events and load callbacks
    useEffect(() => {
      if (status === 'readyToPlay' && !isReady) {
        setIsReady(true);
        if (shouldPlay && player && !player.playing) {
          player.play();
        }
        if (onLoad) {
          onLoad({
            isLoaded: true,
            isPlaying: player?.playing || false,
            positionMillis: Math.round((player?.currentTime || 0) * 1000),
            durationMillis: Math.round((player?.duration || 0) * 1000),
            isBuffering: false,
            didJustFinish: false,
          });
        }
        if (onReadyForDisplay) onReadyForDisplay();
      } else if (status === 'error' && onError) {
        // @ts-ignore
        onError(new Error(player?.error?.message || 'Video playback error'));
      }
    }, [status, isReady, onLoad, onError, onReadyForDisplay, player, shouldPlay]);

    // Handle prop mutations to internal player state
    useEffect(() => { if (player) player.muted = isMuted; }, [player, isMuted]);
    useEffect(() => { if (player) player.volume = volume; }, [player, volume]);
    useEffect(() => { if (player) player.loop = isLooping; }, [player, isLooping]);
    useEffect(() => {
      if (player && isReady) {
        if (shouldPlay && !player.playing) {
          player.play();
        } else if (!shouldPlay && player.playing) {
          player.pause();
        }
      }
    }, [player, shouldPlay, isReady]);

    useImperativeHandle(ref, () => ({
      play: async () => player?.play(),
      pause: async () => player?.pause(),
      seekTo: async (positionMs: number) => { if (player) player.currentTime = positionMs / 1000; },
      setVolume: (vol: number) => { if (player) player.volume = vol; },
      setMuted: (muted: boolean) => { if (player) player.muted = muted; },
      getStatus: async (): Promise<CrossPlatformPlaybackStatus> => {
        if (!player) return lastStatusRef.current;
        return {
          isLoaded: player.status === 'readyToPlay',
          isPlaying: player.playing,
          positionMillis: Math.round((player.currentTime || 0) * 1000),
          durationMillis: Math.round((player.duration || 0) * 1000),
          isBuffering: player.status === 'loading',
          didJustFinish: false,
        };
      },
      replay: async () => {
        if (player) {
          player.currentTime = 0;
          player.play();
        }
      },
      unload: async () => player?.pause(),
      load: async (uri: string, options) => {
        if (player) {
          player.replace(uri);
          if (options?.isMuted !== undefined) player.muted = options.isMuted;
          if (options?.volume !== undefined) player.volume = options.volume;
          if (options?.positionMillis !== undefined) player.currentTime = options.positionMillis / 1000;
          if (options?.shouldPlay) player.play();
        }
      },
    }), [player]);

    return (
      <VideoView
        player={player}
        style={style}
        contentFit={mapResizeMode(resizeMode)}
        nativeControls={useNativeControls}
      />
    );
  }
);

CrossPlatformVideo.displayName = 'CrossPlatformVideo';

