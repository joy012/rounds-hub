import '@/global.css';

import { WardProvider } from '@/contexts/ward-context';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

/**
 * Root layout does not use useColorScheme or theme wrappers so the Stack (and navigation
 * context) never re-renders on theme switch. Theme is applied inside the (theme) group
 * layout, avoiding "Couldn't find a navigation context" when toggling dark/light mode.
 */
export default function RootLayout() {
  useEffect(() => {
    // Hide native splash after first paint (one splash only; no custom overlay).
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <WardProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
          <Toast />
        </WardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
