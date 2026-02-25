
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ToastAndroid, Platform, Alert } from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';

interface UseBackHandlerProps {
  onBackPress?: () => boolean;
  enableDoubleBackExit?: boolean;
  customExitMessage?: string;
  isModal?: boolean;
  onModalClose?: () => void;
  currentScreen?: string; 
}

interface UseBackHandlerReturn {
  backPressCount: number;
  resetBackPressCount: () => void;
  clearNavigationHistory: () => void;
  getNavigationHistory: () => string[];
  isNavigationHistoryEnabled: boolean;
  currentDetectedScreen: string;
}

class NavigationHistory {
  private static instance: NavigationHistory;
  private history: string[] = [];
  private currentScreen: string = '';

  static getInstance(): NavigationHistory {
    if (!NavigationHistory.instance) {
      NavigationHistory.instance = new NavigationHistory();
    }
    return NavigationHistory.instance;
  }

  updateScreen(screenName: string): void {
    if (
      !screenName ||
      screenName === 'undefined' ||
      screenName === this.currentScreen
    ) {
      return;
    }

    console.log(
      'Navigation History: Moving from',
      this.currentScreen,
      'to',
      screenName
    );

    if (this.currentScreen && this.currentScreen !== 'undefined') {
      const allowedNextScreens = NAVIGATION_FLOW[this.currentScreen] || [];

      if (allowedNextScreens.includes(screenName)) {
        
        this.history = this.history.filter(
          (screen) => screen !== this.currentScreen
        );
        this.history.push(this.currentScreen);
        console.log('Forward navigation detected, added to history');
      } else if (PREVIOUS_SCREEN_IN_FLOW[this.currentScreen] === screenName) {
        
        console.log('Back navigation detected, not adding to history');
      } else {
        
        console.log('Direct navigation detected, clearing history');
        this.history = [];
      }

      if (this.history.length > 15) {
        this.history = this.history.slice(-15);
      }
    }

    this.currentScreen = screenName;

    console.log('Navigation History Updated:', {
      current: this.currentScreen,
      history: [...this.history],
    });
  }

  getPreviousScreen(): string | null {
    if (this.history.length === 0) {
      console.log('No previous screen in history');
      return null;
    }
    const previous = this.history[this.history.length - 1];
    console.log('Previous screen:', previous);
    return previous;
  }

  goBack(): string | null {
    if (this.history.length === 0) {
      console.log('Cannot go back: No history available');
      return null;
    }

    const previousScreen = this.history.pop();
    console.log('Going back to:', previousScreen);
    console.log('Remaining history:', [...this.history]);

    // @ts-ignore
    return previousScreen;
  }

  getCurrentScreen(): string {
    return this.currentScreen;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.currentScreen = '';
    console.log('Navigation history cleared');
  }
}

const SCREEN_ROUTES: Record<string, string> = {
  
  home: '/(tabs)/Home',
  circles: '/(tabs)/Circles',
  inbox: '/(tabs)/Inbox',
  profile: '/(tabs)/Profile',
  plus: '/(tabs)/Plus',

  settings: '/settings',
  chat: '/chat',
  notifications: '/notifications',
  search: '/search',
  details: '/details',
  edit: '/edit',
};

const NAVIGATION_FLOW: Record<string, string[]> = {
  
};

const PREVIOUS_SCREEN_IN_FLOW: Record<string, string> = {
  
};

const detectScreenFromPath = (pathname: string, segments: string[]): string => {
  console.log(
    'Detecting screen from pathname:',
    pathname,
    'segments:',
    segments
  );

  if (pathname.includes('/(tabs)/')) {
    const tabMatch = pathname.match(/\/\(tabs\)\/(\w+)/);
    if (tabMatch) {
      const screenName = tabMatch[1].toLowerCase();
      console.log('Detected tab screen:', screenName);
      return screenName;
    }
  }

  const pathParts = pathname
    .split('/')
    .filter((part) => part && part !== '(tabs)');
  if (pathParts.length > 0) {
    const screenName = pathParts[pathParts.length - 1].toLowerCase();
    console.log('Detected screen from path parts:', screenName);
    return screenName;
  }

  console.log('Could not detect screen, using fallback: home');
  return 'home';
};

export const useBackHandler = ({
  onBackPress,
  enableDoubleBackExit = false,
  customExitMessage = 'Press back again to exit app',
  isModal = false,
  onModalClose,
  currentScreen, 
}: UseBackHandlerProps): UseBackHandlerReturn => {
  const [backPressCount, setBackPressCount] = useState<number>(0);
  const backPressTimer = useRef<NodeJS.Timeout | null>(null);
  const historyManager = NavigationHistory.getInstance();
  const previousScreenRef = useRef<string>('');

  const pathname = usePathname();
  const segments = useSegments();

  const detectedScreen =
    currentScreen || detectScreenFromPath(pathname, segments);

  const [lastDetectedScreen, setLastDetectedScreen] = useState<string>('');

  useEffect(() => {
    if (
      detectedScreen &&
      detectedScreen !== 'undefined' &&
      detectedScreen !== lastDetectedScreen
    ) {
      console.log(
        'Screen changed detected:',
        lastDetectedScreen,
        '->',
        detectedScreen
      );
      historyManager.updateScreen(detectedScreen);
      setLastDetectedScreen(detectedScreen);
      previousScreenRef.current = detectedScreen;
    }
  }, [detectedScreen, historyManager, lastDetectedScreen]);

  const navigateToPreviousScreen = (): boolean => {
    const currentScreenLower = historyManager.getCurrentScreen().toLowerCase();

    const isTabScreen = ['home', 'circles', 'inbox', 'profile', 'plus'].includes(currentScreenLower);

    if (isTabScreen) {
      console.log('Tab screen detected, using router.back()');
      
      return false; 
    }

    const previousScreen = historyManager.goBack();

    if (!previousScreen) {
      console.log('No previous screen to navigate to');
      return false;
    }

    const routePath = SCREEN_ROUTES[previousScreen.toLowerCase()];

    if (routePath) {
      try {
        console.log('Navigating back to:', routePath);
        router.navigate(routePath as any);
        return true;
      } catch (error) {
        console.error('Navigation error:', error);
        return false;
      }
    } else {
      
      try {
        console.log('Trying direct navigation to:', `/${previousScreen}`);
        router.navigate(`/${previousScreen}` as any);
        return true;
      } catch (error) {
        console.error('Direct navigation failed:', error);
        return false;
      }
    }
  };

  useEffect(() => {
    const backAction = (): boolean => {
      console.log('='.repeat(60));
      console.log('Back button pressed');
      console.log('Current screen:', historyManager.getCurrentScreen());
      console.log('History:', historyManager.getHistory());

      try {
        
        if (onBackPress) {
          const handled = onBackPress();
          if (handled) {
            console.log('Custom handler handled the back press');
            return true;
          }
        }

        if (isModal && onModalClose) {
          console.log('Closing modal');
          onModalClose();
          return true;
        }

        const currentScreenLower = historyManager
          .getCurrentScreen()
          .toLowerCase();

        if (currentScreenLower === 'home' && enableDoubleBackExit) {
          console.log('Home screen double-tap exit handling');

          if (backPressCount === 0) {
            setBackPressCount(1);

            if (Platform.OS === 'android') {
              ToastAndroid.show(customExitMessage, ToastAndroid.SHORT);
            } else {
              Alert.alert('', customExitMessage, [], { cancelable: true });
            }

            if (backPressTimer.current) {
              clearTimeout(backPressTimer.current);
            }

            // @ts-ignore
            backPressTimer.current = setTimeout(() => {
              console.log('Resetting back press count');
              setBackPressCount(0);
            }, 2000);

            return true;
          } else {
            
            console.log('Exiting app');
            if (backPressTimer.current) {
              clearTimeout(backPressTimer.current);
            }
            BackHandler.exitApp();
            return false;
          }
        }

        const navigationHandled = navigateToPreviousScreen();
        if (navigationHandled) {
          console.log('Successfully navigated to previous screen');
          return true;
        }

        if (currentScreenLower !== 'home') {
          console.log('No history available, navigating to home');
          try {
            router.navigate('/(tabs)/Home' as any);
            return true;
          } catch (error) {
            console.error('Failed to navigate to home:', error);
          }
        }

        if (currentScreenLower === 'home' && !enableDoubleBackExit) {
          console.log('On home screen, using default exit');
          return false; 
        }

        console.log('Using default back behavior');
        return false;
      } catch (error) {
        console.error('Back handler error:', error);
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      backHandler.remove();
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
        backPressTimer.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onBackPress,
    enableDoubleBackExit,
    customExitMessage,
    isModal,
    onModalClose,
    backPressCount,
    historyManager,
    detectedScreen, 
  ]);

  const clearNavigationHistory = (): void => {
    historyManager.clear();
    console.log('🗑️ Navigation history cleared manually');
  };

  const getNavigationHistory = (): string[] => {
    return historyManager.getHistory();
  };

  const resetBackPressCount = (): void => {
    setBackPressCount(0);
    if (backPressTimer.current) {
      clearTimeout(backPressTimer.current);
      backPressTimer.current = null;
    }
    console.log('Back press count reset');
  };

  return {
    backPressCount,
    resetBackPressCount,
    clearNavigationHistory,
    getNavigationHistory,
    isNavigationHistoryEnabled: true,
    currentDetectedScreen: detectedScreen,
  };
};

export default useBackHandler;
