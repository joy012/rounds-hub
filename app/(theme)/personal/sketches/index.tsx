import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  loadSketches,
  saveSketches,
  createSketch,
  sketchDisplayTitle,
  type Sketch,
} from '@/lib/sketches-storage';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, PenLine, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

const TABLET_BREAKPOINT = 600;
const CONTENT_MAX_WIDTH = 680;
const MEANINGFUL_IMAGE_LENGTH = 400;

function SketchCard({
  sketch,
  onPress,
  isTablet,
}: {
  sketch: Sketch;
  onPress: () => void;
  isTablet: boolean;
}) {
  const hasImage = Boolean(sketch.image?.trim() && sketch.image!.length >= MEANINGFUL_IMAGE_LENGTH);
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center rounded-2xl border border-border bg-card dark:border-border dark:bg-card overflow-hidden',
        isTablet ? 'gap-4 p-5 shadow-sm' : 'gap-3 p-4'
      )}
      style={({ pressed }) => ({
        opacity: pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      {hasImage ? (
        <View className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            source={{ uri: sketch.image!.startsWith('data:') ? sketch.image! : `data:image/png;base64,${sketch.image}` }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
      ) : (
        <View className="h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Icon as={PenLine} size={isTablet ? 24 : 20} className="text-muted-foreground" />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className={cn('font-medium text-foreground', isTablet ? 'text-lg' : 'text-base')}
          numberOfLines={1}
        >
          {sketchDisplayTitle(sketch)}
        </Text>
      </View>
      <Icon as={ChevronRight} size={isTablet ? 20 : 18} className="text-muted-foreground shrink-0" />
    </Pressable>
  );
}

export default function SketchesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [loading, setLoading] = useState(true);
  const [sketches, setSketches] = useState<Sketch[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadSketches()
      .then((list) => {
        if (!cancelled) setSketches(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAddSketch = useCallback(async () => {
    const sketch = createSketch('', undefined);
    const next = [sketch, ...sketches];
    setSketches(next);
    await saveSketches(next);
    router.push({ pathname: '/personal/sketches/[id]', params: { id: sketch.id } });
  }, [sketches, router]);

  const handleSketchPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/personal/sketches/[id]', params: { id } });
    },
    [router]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(166 76% 36%)" />
        </View>
      </SafeAreaView>
    );
  }

  const contentPadding = isTablet ? 32 : 16;
  const listGap = isTablet ? 16 : 8;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View
          className={cn(
            'flex-row items-center justify-between border-border border-b bg-card dark:border-border dark:bg-card',
            isTablet ? 'gap-4 px-6 py-4' : 'gap-2 px-3 py-3'
          )}
          style={isTablet ? { paddingTop: 12, paddingBottom: 16 } : { paddingTop: 8, paddingBottom: 12 }}
        >
          <Button size="icon" variant="ghost" className={cn(isTablet ? 'h-10 w-10' : 'h-9 w-9')} onPress={handleBack}>
            <Icon as={ChevronLeft} size={isTablet ? 24 : 22} className="text-foreground" />
          </Button>
          <Text className={cn('font-semibold text-foreground', isTablet ? 'text-xl' : 'text-lg')}>
            Sketches
          </Text>
          <Button
            size="icon"
            variant="ghost"
            className={cn(isTablet ? 'h-10 w-10' : 'h-9 w-9')}
            onPress={handleAddSketch}
          >
            <Icon as={Plus} size={isTablet ? 24 : 22} className="text-foreground" />
          </Button>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: contentPadding,
            paddingBottom: 24 + insets.bottom,
            maxWidth: isTablet ? CONTENT_MAX_WIDTH : undefined,
            alignSelf: isTablet ? 'center' : undefined,
            width: isTablet ? '100%' : undefined,
          }}
          showsVerticalScrollIndicator={false}
        >
          {sketches.length === 0 ? (
            <View
              className={cn(
                'rounded-2xl border border-dashed border-border bg-muted/10 dark:border-border dark:bg-muted/5',
                isTablet ? 'p-12' : 'p-6'
              )}
            >
              <Text
                variant={isTablet ? 'default' : 'small'}
                className="mb-6 text-center text-muted-foreground"
              >
                No sketches yet — draw notes, diagrams, or handwrite.
              </Text>
              <Button
                onPress={handleAddSketch}
                className={cn('bg-primary', isTablet ? 'h-12 rounded-xl' : 'w-full')}
              >
                <Icon as={Plus} size={isTablet ? 20 : 16} />
                <Text variant="small" className="font-medium text-primary-foreground">
                  New sketch
                </Text>
              </Button>
            </View>
          ) : (
            <View style={{ gap: listGap }}>
              {sketches.map((sketch) => (
                <SketchCard
                  key={sketch.id}
                  sketch={sketch}
                  onPress={() => handleSketchPress(sketch.id)}
                  isTablet={isTablet}
                />
              ))}
              <Button
                variant="outline"
                onPress={handleAddSketch}
                className={cn(isTablet ? 'mt-4 h-12 rounded-xl' : 'mt-2')}
              >
                <Icon as={Plus} size={isTablet ? 20 : 16} />
                <Text variant="small" className="font-medium">
                  New sketch
                </Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
