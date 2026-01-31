import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';
import * as SplashScreen from 'expo-splash-screen';
import { Activity, Stethoscope } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BEDS_PER_ROW = 4;

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
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(0.85);
  const orb1 = useSharedValue(0);
  const orb2 = useSharedValue(0);
  const orb3 = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
    iconOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.7, { duration: 600 })
      ),
      -1,
      true
    );
    orb1.value = withDelay(
      0,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        true
      )
    );
    orb2.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        true
      )
    );
    orb3.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        true
      )
    );
  }, [iconScale, iconOpacity, orb1, orb2, orb3]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const orb1Style = useAnimatedStyle(() => ({
    opacity: orb1.value * 0.6 + 0.2,
    transform: [{ scale: 0.8 + orb1.value * 0.4 }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    opacity: orb2.value * 0.6 + 0.2,
    transform: [{ scale: 0.8 + orb2.value * 0.4 }],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    opacity: orb3.value * 0.6 + 0.2,
    transform: [{ scale: 0.8 + orb3.value * 0.4 }],
  }));

  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Hero: animated icon + orbs (colorful, theme-aware) */}
      <View className="items-center justify-center px-4 pt-12 pb-8">
        <View className="relative h-28 w-28 items-center justify-center">
          <Animated.View
            style={[
              orb1Style,
              {
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.primary,
              },
            ]}
          />
          <Animated.View
            style={[
              orb2Style,
              {
                position: 'absolute',
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.success,
              },
            ]}
          />
          <Animated.View
            style={[
              orb3Style,
              {
                position: 'absolute',
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.info,
              },
            ]}
          />
          <Animated.View
            style={[
              iconAnimatedStyle,
              {
                backgroundColor: theme.card,
                borderRadius: 28,
                padding: 20,
                borderWidth: 2,
                borderColor: theme.ring,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Icon as={Stethoscope} size={40} className="text-primary" />
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
              {Array.from({ length: BEDS_PER_ROW }).map((_, colIndex) => (
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
