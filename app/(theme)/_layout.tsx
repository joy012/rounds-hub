import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Theme wrapper lives inside the route tree so the root Stack (and navigation context)
 * stays stable when theme toggles. Avoids "Couldn't find a navigation context" on theme switch.
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

export default function ThemeLayout() {
  return (
    <ThemeWrapper>
      <Slot />
    </ThemeWrapper>
  );
}
