import React from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('screen');

interface VideoPlayerRendererProps {
  videoUrl: string;
  thumbnailUrl?: string;
  visibleHeight: number;
  index: number;
  postId: string;
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  onPress: () => void;
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
  videoRefs: React.MutableRefObject<Record<number, Video | null>>;
  loadedVideosCache: React.MutableRefObject<Set<string>>;
  videoLoadStates: React.MutableRefObject<Record<number, 'loading' | 'loaded' | 'error'>>;
  savePosition: (postId: string, positionMs: number) => void;
  getPosition: (postId: string) => number;
  setHasError: (error: boolean) => void;

  /** Seekable progress bar state from parent */
  videoProgress: number;
  videoDuration: number;
  isSeeking: boolean;
  formatTime: (ms: number) => string;
  handleSeekStart: (pageX: number) => void;
  handleSeekMove: (pageX: number) => void;
  handleSeekEnd: () => void;
}

/**
 * Renders the video player with expo-av Video component, pause icon,
 * animation overlays (provided via children), and seekable progress bar.
 */
const VideoPlayerRenderer: React.FC<VideoPlayerRendererProps> = ({
  videoUrl,
  visibleHeight,
  index,
  postId,
  isActive,
  isPaused,
  isMuted,
  onPress,
  onPlaybackStatusUpdate,
  videoRefs,
  loadedVideosCache,
  videoLoadStates,
  getPosition,
  setHasError,

  videoProgress,
  videoDuration,
  isSeeking,
  formatTime,
  handleSeekStart,
  handleSeekMove,
  handleSeekEnd,
}) => {
  const iconShadowStyle = {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  };

  return (
    <>
      <Video
        ref={(ref) => {
          if (videoRefs.current) {
            videoRefs.current[index] = ref;
          }
        }}
        source={{ uri: videoUrl }}
        style={styles.videoFullBackground}
        resizeMode={ResizeMode.CONTAIN}
        isLooping={true}
        shouldPlay={isActive && !isPaused}
        isMuted={!isActive || isMuted}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        useNativeControls={false}
        progressUpdateIntervalMillis={100}
        rate={1.0}
        volume={isActive && !isMuted ? 1.0 : 0}
        onLoad={(status: AVPlaybackStatus) => {
          if (status.isLoaded && status.durationMillis && status.durationMillis > 0) {
            loadedVideosCache.current?.add(videoUrl);
            if (videoLoadStates.current) {
              videoLoadStates.current[index] = 'loaded';
            }
            // Restore saved position if available
            const savedPos = getPosition(postId);
            if (savedPos > 0 && savedPos < status.durationMillis - 1000) {
              const videoRef = videoRefs.current?.[index];
              if (videoRef && typeof videoRef.setPositionAsync === 'function') {
                videoRef.setPositionAsync(savedPos).catch(() => {});
              }
            }
          }
        }}
        onError={() => {
          try {
            if (videoLoadStates.current) {
              videoLoadStates.current[index] = 'error';
            }
            setHasError(true);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {}
        }}
        onReadyForDisplay={() => {
          if (videoUrl) {
            loadedVideosCache.current?.add(videoUrl);
            if (videoLoadStates.current) {
              videoLoadStates.current[index] = 'loaded';
            }
          }
        }}
      />

      <Pressable style={styles.tapArea} onPress={onPress} />

      {/* Pause icon */}
      {isPaused && (
        <View style={styles.pauseIconContainer} pointerEvents="none">
          <Ionicons name="play" size={70} color="#fff" style={{ marginLeft: 6, ...iconShadowStyle }} />
        </View>
      )}

      {/* Seekable Progress Bar */}
      {videoDuration > 0 && (
        <View style={styles.tiktokProgressContainer} pointerEvents="box-none">
          {/* Time indicator */}
          {isSeeking && (
            <View style={styles.seekTimeIndicator} pointerEvents="none">
              <View style={styles.seekTimeContainer}>
                <Text style={styles.seekTimeText}>
                  {formatTime(videoProgress)} / {formatTime(videoDuration)}
                </Text>
              </View>
            </View>
          )}
          {/* Progress bar track */}
          <View
            style={[styles.progressBarTrack, isSeeking && styles.progressBarTrackExpanded]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.progressBarFill,
                isSeeking && styles.progressBarFillExpanded,
                { width: `${(videoProgress / videoDuration) * 100}%` },
              ]}
            />
            {isSeeking && (
              <View
                style={[
                  styles.seekThumb,
                  { left: `${(videoProgress / videoDuration) * 100}%` },
                ]}
              />
            )}
          </View>
          {/* Touchable seek area */}
          <View
            style={styles.progressTouchArea}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponderCapture={() => true}
            onResponderGrant={(e) => handleSeekStart(e.nativeEvent.pageX)}
            onResponderMove={(e) => handleSeekMove(e.nativeEvent.pageX)}
            onResponderRelease={() => handleSeekEnd()}
            onResponderTerminate={() => handleSeekEnd()}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  videoFullBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: '100%',
    backgroundColor: 'black',
  } as ViewStyle,
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as ViewStyle,
  pauseIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  } as ViewStyle,
  tiktokProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 0,
  } as ViewStyle,
  seekTimeIndicator: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  } as ViewStyle,
  seekTimeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  } as ViewStyle,
  seekTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  } as ViewStyle,
  progressBarTrackExpanded: {
    height: 6,
  } as ViewStyle,
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1.5,
  } as ViewStyle,
  progressBarFillExpanded: {
    backgroundColor: '#ff3856',
  } as ViewStyle,
  seekThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff3856',
    marginLeft: -7,
  } as ViewStyle,
  progressTouchArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 25,
  } as ViewStyle,
});

export default React.memo(VideoPlayerRenderer);
