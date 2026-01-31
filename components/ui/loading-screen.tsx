import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import * as SplashScreen from 'expo-splash-screen';
import { Activity } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getBedsPerRow(width: number): number {
  if (width < 400) return 3;
  if (width < 600) return 4;
  if (width < 800) return 5;
  return 6;
}

export interface LoadingScreenProps {
  title?: string;
  /** Shown under the title during sync (e.g. "Syncing with device…") */
  subtitle?: string;
  className?: string;
}

export function LoadingScreen({
  title = 'RoundsHub',
  subtitle = 'Syncing with device…',
  className,
}: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bedsPerRow = getBedsPerRow(width);
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0.9);
  const orb1 = useSharedValue(0);
  const orb2 = useSharedValue(0);
  const orb3 = useSharedValue(0);
  const pulseRing = useSharedValue(0.95);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Heartbeat-style pulse for logo (scale up then back)
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 500 }),
        withTiming(1, { duration: 500 }),
        withTiming(1.04, { duration: 400 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
    logoOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.82, { duration: 800 })
      ),
      -1,
      true
    );
    pulseRing.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1000 }),
        withTiming(0.95, { duration: 1000 })
      ),
      -1,
      true
    );
    orb1.value = withDelay(
      0,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0.25, { duration: 1400 })
        ),
        -1,
        true
      )
    );
    orb2.value = withDelay(
      350,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0.25, { duration: 1400 })
        ),
        -1,
        true
      )
    );
    orb3.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400 }),
          withTiming(0.25, { duration: 1400 })
        ),
        -1,
        true
      )
    );
  }, [logoScale, logoOpacity, orb1, orb2, orb3, pulseRing]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseRing.value }],
  }));

  const orb1Style = useAnimatedStyle(() => ({
    opacity: orb1.value * 0.55 + 0.2,
    transform: [{ scale: 0.82 + orb1.value * 0.35 }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    opacity: orb2.value * 0.55 + 0.2,
    transform: [{ scale: 0.82 + orb2.value * 0.35 }],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    opacity: orb3.value * 0.55 + 0.2,
    transform: [{ scale: 0.82 + orb3.value * 0.35 }],
  }));

  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Hero: app logo + branded orbs and pulse ring */}
      <View className="items-center justify-center px-4 pt-12 pb-8">
        <View className="relative h-32 w-32 items-center justify-center">
          <Animated.View
            style={[
              orb1Style,
              {
                position: 'absolute',
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: theme.primary,
              },
            ]}
          />
          <Animated.View
            style={[
              orb2Style,
              {
                position: 'absolute',
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: theme.success,
              },
            ]}
          />
          <Animated.View
            style={[
              orb3Style,
              {
                position: 'absolute',
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.info,
              },
            ]}
          />
          <Animated.View
            style={[
              pulseRingStyle,
              {
                position: 'absolute',
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 2,
                borderColor: theme.primary,
                opacity: 0.35,
              },
            ]}
          />
          <Animated.View
            style={[
              logoAnimatedStyle,
              {
                width: 72,
                height: 72,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: theme.ring,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 52, height: 52 }}
              resizeMode="contain"
              accessibilityLabel="RoundsHub"
            />
          </Animated.View>
        </View>
        <View className="mt-4 flex-row items-center gap-2">
          <Icon as={Activity} size={18} className="text-primary" />
          <Text className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </Text>
        </View>
        <Text variant="small" className="mt-1 text-muted-foreground">
          {subtitle}
        </Text>
      </View>

      {/* Skeleton: header card */}
      <View className="px-4 pb-4">
        <Skeleton className="h-24 w-full animate-pulse-soft rounded-xl" />
        <View className="mt-3 flex-row gap-2">
          <Skeleton className="h-8 w-16 animate-pulse-soft rounded-lg" />
          <Skeleton className="h-8 w-14 animate-pulse-soft rounded-lg" />
          <Skeleton className="h-8 w-14 animate-pulse-soft rounded-lg" />
        </View>
      </View>

      {/* Skeleton: bed grid */}
      <View className="flex-1 px-4">
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Skeleton className="h-6 w-20 animate-pulse-soft rounded-md" />
          <Skeleton className="h-8 w-12 animate-pulse-soft rounded-lg" />
          <Skeleton className="h-8 w-12 animate-pulse-soft rounded-lg" />
          <Skeleton className="h-8 w-12 animate-pulse-soft rounded-lg" />
        </View>
        <View className="gap-3">
          {[0, 1].map((rowIndex) => (
            <View key={rowIndex} className="flex-row gap-2.5" style={{ gap: 10 }}>
              {Array.from({ length: bedsPerRow }).map((_, colIndex) => (
                <Skeleton
                  key={`${rowIndex}-${colIndex}`}
                  className="aspect-square flex-1 animate-pulse-soft rounded-xl"
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
