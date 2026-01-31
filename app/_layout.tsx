import '@/global.css';

import { WardProvider } from '@/contexts/ward-context';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
          <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
            <WardProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <Stack />
              <PortalHost />
              <Toast />
            </WardProvider>
          </ThemeProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
