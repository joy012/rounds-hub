import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { loadReferences } from '@/lib/references-storage';
import type { ReferenceCard } from '@/lib/types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

export default function ReferencesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<ReferenceCard[]>([]);

  const refresh = useCallback(async () => {
    const list = await loadReferences();
    setCards(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadReferences()
      .then((list) => {
        if (!cancelled) setCards(list);
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

  const handleAdd = useCallback(() => {
    router.push('/personal/references/new');
  }, [router]);

  const handleCardPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/personal/references/[id]', params: { id } });
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View
          className="flex-row items-center justify-between gap-2 border-border border-b bg-card px-3 py-3 dark:border-border dark:bg-card"
          style={{ paddingTop: 8, paddingBottom: 12 }}
        >
          <Button size="icon" variant="ghost" className="h-9 w-9" onPress={handleBack}>
            <Icon as={ChevronLeft} size={22} className="text-foreground" />
          </Button>
          <Text className="text-lg font-semibold text-foreground">Quick reference</Text>
          <Button size="icon" variant="ghost" className="h-9 w-9" onPress={handleAdd}>
            <Icon as={Plus} size={22} className="text-foreground" />
          </Button>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {cards.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-muted/20 p-6 dark:border-border dark:bg-muted/10">
              <Text variant="small" className="mb-4 text-center text-muted-foreground">
                No reference cards — add protocols, drug doses, or guidelines.
              </Text>
              <Button onPress={handleAdd} className="bg-primary w-full">
                <Icon as={Plus} size={16} />
                <Text variant="small" className="font-medium text-primary-foreground">Add card</Text>
              </Button>
            </View>
          ) : (
            <View className="gap-2">
              {cards.map((card) => (
                <View
                  key={card.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 dark:border-border dark:bg-card"
                >
                  <Pressable
                    className="min-w-0 flex-1"
                    onPress={() => handleCardPress(card.id)}
                  >
                    <Text className="font-medium text-foreground" numberOfLines={1}>
                      {card.title}
                    </Text>
                    {card.body ? (
                      <Text variant="small" className="mt-0.5 text-muted-foreground" numberOfLines={2}>
                        {card.body}
                      </Text>
                    ) : null}
                  </Pressable>
                  <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                </View>
              ))}
              <Button variant="outline" onPress={handleAdd} className="mt-2">
                <Icon as={Plus} size={16} />
                <Text variant="small" className="font-medium">Add card</Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
