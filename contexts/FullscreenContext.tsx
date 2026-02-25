
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { CrossPlatformImage as Image } from '../components/ui/CrossPlatformImage';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import PostInteractions from '../components/PostInteractions';
import { useVideoPlayback, VIDEO_PRIORITY } from './VideoPlaybackContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface FullscreenContextType {
  showFullscreen: (videoUrl: string, postData?: any, userData?: any) => void;
  hideFullscreen: () => void;
  isFullscreen: boolean;
}

const FullscreenContext = createContext<FullscreenContextType | null>(null);

export const useFullscreen = () => {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
};

interface FullscreenProviderProps {
  children: ReactNode;
}

export const FullscreenProvider: React.FC<FullscreenProviderProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [postData, setPostData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [shouldVideoPlay, setShouldVideoPlay] = useState(false);
  const videoRef = React.useRef<Video | null>(null);

  // Global video playback control - highest priority for fullscreen
  const {
    registerPauseCallback,
    requestPlayback,
    releasePlayback,
    savePosition,
    getPosition,
    clearPosition,
  } = useVideoPlayback('FullscreenContext', VIDEO_PRIORITY.FULLSCREEN_CONTEXT);

  // Pause callback for when other components request playback
  const pauseVideo = useCallback(() => {
    setShouldVideoPlay(false);
  }, []);

  // Register pause callback
  useEffect(() => {
    registerPauseCallback(pauseVideo);
  }, [registerPauseCallback, pauseVideo]);

  const showFullscreen = async (url: string, post?: any, user?: any) => {
    setVideoUrl(url);
    setPostData(post);
    setUserData(user);
    setIsFullscreen(true);

    // Claim exclusive playback - this will pause all other videos
    requestPlayback();
    setShouldVideoPlay(true);

    StatusBar.setHidden(true, 'none');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent', false);
    }
  };

  const hideFullscreen = () => {
    setIsFullscreen(false);
    setVideoUrl('');
    setPostData(null);
    setUserData(null);

    // Release playback and stop video
    releasePlayback();
    setShouldVideoPlay(false);

    StatusBar.setHidden(false, 'slide');

  };

  return (
    <FullscreenContext.Provider value={{ showFullscreen, hideFullscreen, isFullscreen }}>
      {children}

      { }
      {isFullscreen && (
        <View style={styles.reelsContainer}>
          { }
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.reelsVideo}
            useNativeControls={false}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={shouldVideoPlay && isFullscreen}
            isMuted={false}
            onLoad={(status) => {
              // Restore saved position if available
              if (status.isLoaded && status.durationMillis && postData?.id) {
                const savedPos = getPosition(postData.id);
                if (savedPos > 0 && savedPos < status.durationMillis - 1000) {
                  videoRef.current?.setPositionAsync(savedPos).catch(() => { });
                }
              }
            }}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && postData?.id) {
                // Save video position for resuming later
                if (status.positionMillis && status.positionMillis > 500) {
                  savePosition(postData.id, status.positionMillis);
                }
                // Clear position when video finishes
                if (status.didJustFinish) {
                  clearPosition(postData.id);
                }
              }
            }}
          />

          { }
          <View style={styles.reelsHeader}>
            <TouchableOpacity style={styles.backButton} onPress={hideFullscreen}>
              <Ionicons name="chevron-back" size={wp('7%')} color="white" />
            </TouchableOpacity>
            <Text style={styles.reelsTitle}>Reels</Text>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera-outline" size={wp('7%')} color="white" />
            </TouchableOpacity>
          </View>

          { }
          <View style={styles.reelsBottom}>
            { }
            <View style={styles.reelsLeftContent}>
              {userData && (
                <View style={styles.reelsUserInfo}>
                  <View style={styles.userRow}>
                    <Image
                      source={userData?.profile_picture || 'https://img.icons8.com/color/48/test-account.png'}
                      style={styles.reelsProfilePic}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={0}
                    />
                    <Text style={styles.reelsUsername}>{userData?.username || 'user'}</Text>
                    <TouchableOpacity style={styles.followButton}>
                      <Text style={styles.followText}>Follow</Text>
                    </TouchableOpacity>
                  </View>

                  {postData?.content && (
                    <Text style={styles.reelsCaption} numberOfLines={3}>
                      {postData.content}
                    </Text>
                  )}

                  { }
                  <View style={styles.audioInfo}>
                    <Ionicons name="musical-notes" size={wp('4%')} color="white" />
                    <Text style={styles.audioText}>Original Audio</Text>
                  </View>
                </View>
              )}
            </View>

            { }
            <View style={styles.reelsActionButtons}>
              {postData && userData && (
                <PostInteractions
                  post={postData}
                  user={userData}
                  style="fullscreen"
                />
              )}

              <TouchableOpacity style={styles.reelsActionBtn}>
                <View style={styles.actionIconContainer}>
                  <Ionicons name="ellipsis-horizontal" size={wp('7%')} color="white" />
                </View>
              </TouchableOpacity>

              { }
              <TouchableOpacity style={styles.muteButton}>
                <View style={styles.muteIconContainer}>
                  <Ionicons name="volume-high" size={wp('5%')} color="white" />
                </View>
              </TouchableOpacity>

              { }
              <TouchableOpacity style={styles.musicDisc}>
                <Image
                  source={userData?.profile_picture || 'https://img.icons8.com/color/48/test-account.png'}
                  style={styles.musicDiscImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </FullscreenContext.Provider>
  );
};
export default FullscreenProvider;

const styles = StyleSheet.create({

  reelsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
    zIndex: 99999,
    elevation: 99999,
  },
  reelsVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  reelsHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp('6%') : hp('4%'),
    left: 0,
    right: 0,
    height: hp('6%'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    zIndex: 100001,
  },
  backButton: {
    padding: wp('2%'),
  },
  reelsTitle: {
    color: 'white',
    fontSize: wp('4.5%'),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cameraButton: {
    padding: wp('2%'),
  },
  reelsBottom: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp('4%') : hp('2%'),
    left: 0,
    right: 0,
    height: hp('25%'),
    flexDirection: 'row',
    paddingHorizontal: wp('4%'),
    zIndex: 100001,
  },
  reelsLeftContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: wp('4%'),
  },
  reelsUserInfo: {
    marginBottom: hp('2%'),
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  reelsProfilePic: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('4%'),
    marginRight: wp('3%'),
  },
  reelsUsername: {
    color: 'white',
    fontSize: wp('3.8%'),
    fontWeight: '600',
    marginRight: wp('3%'),
  },
  followButton: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: wp('1%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: wp('1%'),
  },
  followText: {
    color: 'white',
    fontSize: wp('3.2%'),
    fontWeight: '600',
  },
  reelsCaption: {
    color: 'white',
    fontSize: wp('3.5%'),
    lineHeight: wp('4.8%'),
    marginBottom: hp('1%'),
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioText: {
    color: 'white',
    fontSize: wp('3.2%'),
    marginLeft: wp('1%'),
  },
  reelsActionButtons: {
    width: wp('15%'),
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: hp('2%'),
  },
  reelsActionBtn: {
    alignItems: 'center',
    marginBottom: hp('2.5%'),
  },
  actionIconContainer: {
    width: wp('11%'),
    height: wp('11%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: wp('1%'),
  },
  actionText: {
    color: 'white',
    fontSize: wp('2.8%'),
    fontWeight: '500',
    textAlign: 'center',
  },
  muteButton: {
    marginBottom: hp('2.5%'),
  },
  muteIconContainer: {
    width: wp('8%'),
    height: wp('8%'),
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: wp('4%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicDisc: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    overflow: 'hidden',
    marginTop: hp('1%'),
  },
  musicDiscImage: {
    width: '100%',
    height: '100%',
    borderRadius: wp('5%'),
  },
});