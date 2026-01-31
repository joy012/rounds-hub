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
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync().catch(() => {});

const APP_PRIMARY_GREEN = '#0d9488';
const SPLASH_VISIBLE_MS = 1400;

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
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.9);
  const ringOpacity = useSharedValue(0.4);

  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      // ignore
    }
    splashOpacity.value = withDelay(
      SPLASH_VISIBLE_MS,
      withTiming(0, { duration: 350 }, () => {
        setShowSplash(false);
      })
    );
  }, []);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 500 });
    logoOpacity.value = withTiming(1, { duration: 400 });
    ringScale.value = withTiming(1.15, { duration: 800 });
    ringOpacity.value = withTiming(0, { duration: 1000 });
    hideSplash();
  }, [hideSplash, logoScale, logoOpacity, ringScale, ringOpacity]);

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

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

        {showSplash && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.splashContainer, splashAnimatedStyle]}
          >
            <View style={styles.splashContent}>
              <View style={styles.splashLogoWrap}>
                <Animated.View
                  style={[styles.splashRing, ringAnimatedStyle]}
                  pointerEvents="none"
                />
                <Animated.View style={logoAnimatedStyle}>
                  <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.splashIcon}
                    resizeMode="contain"
                    accessibilityLabel="RoundsHub"
                  />
                </Animated.View>
              </View>
              <Text style={styles.splashTitle}>RoundsHub</Text>
              <Text style={styles.splashSubtitle}>Ward rounds, simplified</Text>
            </View>
          </Animated.View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: APP_PRIMARY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    gap: 12,
  },
  splashLogoWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 132,
    height: 132,
  },
  splashRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  splashIcon: {
    width: 100,
    height: 100,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  splashSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});
