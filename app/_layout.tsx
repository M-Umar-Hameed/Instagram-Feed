import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { FollowProvider } from '../contexts/FollowContext';
import { FullscreenProvider } from '../contexts/FullscreenContext';
import { PostInteractionsProvider } from '../contexts/PostInteractionsContext';
import { MuteProvider } from '../contexts/MuteContext';
import { VideoPlaybackProvider } from '../contexts/VideoPlaybackContext';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import Toast, { ToastConfig } from 'react-native-toast-message';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';
import ErrorBoundary from '../components/ErrorBoundary';

const toastConfig: ToastConfig = {
  success: (props) => (
    <View style={toastStyles.container}>
      <Text style={toastStyles.text1}>{props.text2 || props.text1}</Text>
    </View>
  ),
  error: (props) => (
    <View style={[toastStyles.container, toastStyles.errorContainer]}>
      <Text style={toastStyles.text1}>{props.text2 || props.text1}</Text>
    </View>
  ),
  info: (props) => (
    <View style={toastStyles.container}>
      <Text style={toastStyles.text1}>{props.text2 || props.text1}</Text>
    </View>
  ),
};

const toastStyles = StyleSheet.create({
  container: {
    width: '90%',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    backgroundColor: '#ff4444',
  },
  text1: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#000000');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <FollowProvider>
          <PostInteractionsProvider>
            <MuteProvider>
              <VideoPlaybackProvider>
                <FullscreenProvider>
                  <StatusBar style="light" backgroundColor="#000000" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      contentStyle: { backgroundColor: '#000000' },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                </FullscreenProvider>
              </VideoPlaybackProvider>
            </MuteProvider>
          </PostInteractionsProvider>
        </FollowProvider>
      </AuthProvider>
      <Toast config={toastConfig} />
    </ErrorBoundary>
  );
}
