import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import React, { type ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';

const MAX_THEME_RETRIES = 2;

/**
 * Catches "Couldn't find a navigation context" on theme switch and retries so the app doesn't crash
 * in development or production (APK).
 */
class ThemeLayoutErrorBoundary extends React.Component<
  { children: ReactNode; retryKey: number; onRetry: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    const isNavContextError =
      error?.message?.includes('navigation context') ||
      error?.message?.includes('NavigationContainer');
    if (isNavContextError) {
      // Defer retry so navigation tree can settle (avoids crash in dev and production)
      const id = setTimeout(() => {
        this.props.onRetry();
        this.setState({ hasError: false });
      }, 50);
      this._retryId = id;
    }
  }

  private _retryId: ReturnType<typeof setTimeout> | null = null;

  componentWillUnmount(): void {
    if (this._retryId != null) clearTimeout(this._retryId);
  }

  componentDidUpdate(prevProps: { retryKey: number }): void {
    if (this.props.retryKey !== prevProps.retryKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Theme wrapper: defers applying theme class so navigation context stays stable on toggle
 * (avoids "Couldn't find a navigation context" in dev and production APK).
 */
function ThemeWrapper({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const [appliedScheme, setAppliedScheme] = useState<'light' | 'dark'>(() =>
    colorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    const next = colorScheme === 'dark' ? 'dark' : 'light';
    if (next === appliedScheme) return;
    const id = setTimeout(() => setAppliedScheme(next), 0);
    return () => clearTimeout(id);
  }, [colorScheme, appliedScheme]);

  const isDark = appliedScheme === 'dark';
  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      <ThemeProvider value={NAV_THEME[appliedScheme]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {children}
      </ThemeProvider>
    </View>
  );
}

export default function ThemeLayout() {
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = (): void => {
    setRetryKey((k) => (k >= MAX_THEME_RETRIES ? 0 : k + 1));
  };

  return (
    <ThemeLayoutErrorBoundary retryKey={retryKey} onRetry={handleRetry}>
      <ThemeWrapper key={retryKey}>
        <Slot />
      </ThemeWrapper>
    </ThemeLayoutErrorBoundary>
  );
}
