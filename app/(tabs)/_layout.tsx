
import { Tabs, useRouter, useSegments } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, BackHandler } from 'react-native';
import { createContext, useState, useEffect, useRef } from 'react';
import { PostInteractionsProvider } from '../../contexts/PostInteractionsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HeaderVisibilityContext = createContext({
  homeHeaderVisible: true,
  setHomeHeaderVisible: (visible: boolean) => { },
  isFullscreen: false,
  setIsFullscreen: (fullscreen: boolean) => { },
  homeRefreshTrigger: 0,
});

export default function TabLayout() {
  const [homeHeaderVisible, setHomeHeaderVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [homeRefreshTrigger, setHomeRefreshTrigger] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  const tabHistory = useRef<string[]>([]);
  const currentTab = useRef<string>('Home');
  const isBackNavigation = useRef<boolean>(false);

  useEffect(() => {
    const backAction = () => {

      const isOnTab = (segments.length as number) === 2 && segments[0] === '(tabs)';

      if (isOnTab) {

        if (tabHistory.current.length > 0) {
          const previousTab = tabHistory.current.pop();
          console.log('Going back to:', previousTab, 'Remaining history:', tabHistory.current);
          isBackNavigation.current = true;
          router.push(`/(tabs)/${previousTab}` as any);
          return true;
        }

        if (currentTab.current !== 'Home') {
          console.log('No tab history, navigating to Home');
          tabHistory.current = [];
          isBackNavigation.current = true;
          router.push('/(tabs)/Home' as any);
          return true;
        }

        return false;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [segments, router]);

  return (
    <PostInteractionsProvider>
      <HeaderVisibilityContext.Provider
        value={{
          homeHeaderVisible,
          setHomeHeaderVisible,
          isFullscreen,
          setIsFullscreen,
          homeRefreshTrigger,
        }}
      >
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#ffffff',
            tabBarInactiveTintColor: '#666666',
            headerStyle: {
              backgroundColor: '#000000',
            },
            headerShadowVisible: false,
            headerTintColor: '#fff',
            tabBarStyle: [
              {
                backgroundColor: '#000000',
                borderTopColor: '#222',
                height: 45 + insets.bottom,
                paddingBottom: insets.bottom,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                elevation: 8,
              },
              isFullscreen && {
                display: 'none',
              },
            ],
            lazy: false,
          }}
        >
          <Tabs.Screen
            name="Home"
            options={{
              title: 'Home',
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={24}
                  color={color}
                />
              ),
            }}
            listeners={{
              tabPress: (e) => {
                if (currentTab.current === 'Home') {
                  setHomeRefreshTrigger(prev => prev + 1);
                }
              },
            }}
          />
          <Tabs.Screen
            name="Reels"
            options={{
              title: 'Reels',
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'play-circle' : 'play-circle-outline'}
                  size={26}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="AddPost"
            options={{
              title: 'Post',
              headerShown: false,
              tabBarIcon: ({ color, focused }) => (
                <View style={{
                  backgroundColor: '#000',
                  borderRadius: 8,
                  width: 36,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}>
                  <Ionicons name="add" size={22} color="#fff" />
                </View>
              ),
            }}
          />
          <Tabs.Screen
            name="Profile"
            options={{
              headerShown: false,
              title: 'Profile',
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        </Tabs>
      </HeaderVisibilityContext.Provider>
    </PostInteractionsProvider>
  );
}
