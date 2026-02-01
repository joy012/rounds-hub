import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import {
  createReferenceCard,
  loadReferences,
  saveReferences,
} from '@/lib/references-storage';
import type { ReferenceCard } from '@/lib/types';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

export default function ReferenceEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadReferences()
      .then((cards) => {
        if (cancelled || !id) return;
        const card = cards.find((c) => c.id === id);
        if (card) {
          setTitle(card.title);
          setBody(card.body);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      Toast.show({ type: 'error', text1: 'Enter a title', position: 'top' });
      return;
    }
    setSaving(true);
    try {
      const cards = await loadReferences();
      if (isNew) {
        const newCard = createReferenceCard(t, body.trim(), cards.length);
        await saveReferences([...cards, newCard]);
      } else {
        const next = cards.map((c) =>
          c.id === id ? { ...c, title: t, body: body.trim() } : c
        );
        await saveReferences(next);
      }
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save', position: 'top' });
    } finally {
      setSaving(false);
    }
  }, [id, isNew, title, body, router]);

  const handleConfirmDelete = useCallback(async () => {
    if (!id || isNew) return;
    setConfirmDelete(false);
    try {
      const cards = await loadReferences();
      const next = cards.filter((c) => c.id !== id);
      await saveReferences(next);
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not delete', position: 'top' });
    }
  }, [id, isNew, router]);

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
          <Text className="text-lg font-semibold text-foreground">
            {isNew ? 'New reference' : 'Edit reference'}
          </Text>
          <View className="w-9 flex-row items-center justify-end">
            {!isNew && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onPress={() => setConfirmDelete(true)}
              >
                <Icon as={Trash2} size={18} className="text-destructive" />
              </Button>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">
            <View className="gap-1.5">
              <Text variant="small" className="font-medium text-foreground">Title</Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Drug dose"
                className="min-h-10"
              />
            </View>
            <View className="gap-1.5">
              <Text variant="small" className="font-medium text-foreground">Content</Text>
              <Textarea
                value={body}
                onChangeText={setBody}
                placeholder="Protocol, dose, or guideline…"
                className="min-h-40 text-base"
              />
            </View>
            <Button
              onPress={handleSave}
              disabled={saving}
              className="bg-primary w-full"
            >
              {saving ? (
                <ActivityIndicator size="small" color="hsl(0 0% 100%)" />
              ) : (
                <Text variant="small" className="font-medium text-primary-foreground">Save</Text>
              )}
            </Button>
          </View>
        </ScrollView>

        <ConsentModal
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete reference?"
          description="This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="delete"
          onConfirm={handleConfirmDelete}
        />
      </SafeAreaView>
    </>
  );
}
