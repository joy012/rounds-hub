import '@/global.css';

import { WardProvider } from '@/contexts/ward-context';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

/**
 * Isolates theme (useColorScheme) so that when dark/light mode toggles,
 * only this subtree re-renders. That keeps the navigation context stable
 * and avoids "Couldn't find a navigation context" on theme switch.
 */
function ThemeWrapper({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {children}
      </ThemeProvider>
    </View>
  );
}

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
        <ThemeWrapper>
          <WardProvider>
            <Stack />
            <PortalHost />
            <Toast />
          </WardProvider>
        </ThemeWrapper>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
