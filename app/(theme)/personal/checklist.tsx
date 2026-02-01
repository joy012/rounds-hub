import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  loadChecklist,
  saveChecklist,
  createChecklistItem,
  type ChecklistItem,
} from '@/lib/checklist-storage';
import { formatDisplayDate } from '@/lib/utils';
import { ChevronLeft, Calendar, Pencil, Plus, Trash2 } from 'lucide-react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Stack, useRouter } from 'expo-router';
import { ConsentModal } from '@/components/ward/modal-confirmation';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function parseISODate(str: string | undefined): Date {
  if (!str || !ISO_DATE_REGEX.test(str)) return new Date();
  const d = new Date(str + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDueStatus(item: ChecklistItem): 'overdue' | 'dueToday' | 'ok' {
  if (item.done) return 'ok';
  if (!item.date) return 'ok';
  const today = toISODate(new Date());
  if (item.date < today) return 'overdue';
  if (item.date === today) return 'dueToday';
  return 'ok';
}

export default function TodoListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [datePickerForId, setDatePickerForId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const refresh = useCallback(async () => {
    const list = await loadChecklist();
    setItems(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadChecklist()
      .then((list) => {
        if (!cancelled) setItems(list);
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

  const persist = useCallback(async (next: ChecklistItem[]) => {
    setSaving(true);
    try {
      await saveChecklist(next);
      setItems(next);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save', position: 'top' });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    Keyboard.dismiss();
    setNewText('');
    const item = createChecklistItem(text, items.length);
    const next = [...items, item];
    await persist(next);
  }, [newText, items, persist]);

  const handleToggle = useCallback(
    async (id: string, checked: boolean) => {
      const next = items.map((i) => (i.id === id ? { ...i, done: checked } : i));
      await persist(next);
    },
    [items, persist]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteId) return;
    const next = items.filter((i) => i.id !== deleteId);
    await persist(next);
    setDeleteId(null);
  }, [deleteId, items, persist]);

  const handleDateChange = useCallback(
    (id: string, iso: string | undefined) => {
      const next = items.map((i) =>
        i.id === id ? { ...i, date: iso } : i
      );
      persist(next);
      setDatePickerForId(null);
    },
    [items, persist]
  );

  const handleStartEdit = useCallback((id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    const next = items.map((i) =>
      i.id === editingId ? { ...i, text: trimmed || i.text } : i
    );
    persist(next);
    setEditingId(null);
    setEditingText('');
    Keyboard.dismiss();
  }, [editingId, editingText, items, persist]);

  const openDatePicker = useCallback(
    (id: string, currentDate?: string) => {
      const date = parseISODate(currentDate);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: date,
          mode: 'date',
          display: 'default',
          onChange: (event: DateTimePickerEvent, selected?: Date) => {
            if (event.type === 'set' && selected) {
              handleDateChange(id, toISODate(selected));
            }
          },
        });
        return;
      }
      setDatePickerForId(id);
    },
    [handleDateChange]
  );

  const datePickerItem = useMemo(
    () => (datePickerForId ? items.find((i) => i.id === datePickerForId) : null),
    [datePickerForId, items]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.date;
      const dateB = b.date;
      if (!dateA && !dateB) return a.order - b.order;
      if (!dateA) return 1;
      if (!dateB) return -1;
      const cmp = dateA.localeCompare(dateB);
      return cmp !== 0 ? cmp : a.order - b.order;
    });
  }, [items]);

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
          className="flex-row items-center gap-2 border-border border-b bg-card px-3 py-3 dark:border-border dark:bg-card"
          style={{ paddingTop: 8, paddingBottom: 12 }}
        >
          <Button size="icon" variant="ghost" className="h-9 w-9" onPress={handleBack}>
            <Icon as={ChevronLeft} size={22} className="text-foreground" />
          </Button>
          <Text className="text-lg font-semibold text-foreground">Todo List</Text>
          {saving ? (
            <ActivityIndicator size="small" color="hsl(166 76% 36%)" style={{ marginLeft: 8 }} />
          ) : null}
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
          <View className="mb-4 flex-row gap-2">
            <Input
              placeholder="e.g. Review bed 3, Call consultant"
              value={newText}
              onChangeText={setNewText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              className="min-h-10 flex-1"
            />
            <Button size="icon" onPress={handleAdd} disabled={!newText.trim()} className="h-10 w-10 bg-primary">
              <Icon as={Plus} size={18} className="text-primary-foreground" />
            </Button>
          </View>

          {items.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-muted/20 p-6 dark:border-border dark:bg-muted/10">
              <Text variant="small" className="text-center text-muted-foreground">
                No items yet — add a todo above.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {sortedItems.map((item) => {
                const dueStatus = getDueStatus(item);
                const isOverdue = dueStatus === 'overdue';
                const isDueToday = dueStatus === 'dueToday';
                const rowClassName = [
                  'flex-row items-center gap-2 rounded-xl border p-3',
                  isOverdue && 'border-destructive/70 bg-destructive/5 dark:bg-destructive/10',
                  isDueToday && !isOverdue && 'border-amber-500/70 bg-amber-500/5 dark:bg-amber-500/10',
                  !isOverdue && !isDueToday && 'border-border bg-card dark:border-border dark:bg-card',
                ].filter(Boolean).join(' ');
                return (
                <View key={item.id} className={rowClassName}>
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                    aria-label={item.text}
                  />
                  <View className="min-w-0 flex-1 gap-0.5">
                    {editingId === item.id ? (
                      <Input
                        value={editingText}
                        onChangeText={setEditingText}
                        onBlur={handleSaveEdit}
                        onSubmitEditing={handleSaveEdit}
                        onEndEditing={handleSaveEdit}
                        placeholder="Todo title"
                        className="min-h-9 border-border text-base"
                        autoFocus
                        selectTextOnFocus
                      />
                    ) : (
                      <Pressable
                        onPress={() => handleStartEdit(item.id, item.text)}
                        className="py-0.5"
                        accessibilityRole="button"
                        accessibilityLabel={`Edit: ${item.text}`}
                      >
                        <Text
                          className={`text-base ${item.done ? 'text-muted-foreground line-through' : isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}
                          numberOfLines={2}
                        >
                          {item.text}
                        </Text>
                      </Pressable>
                    )}
                    {item.date && editingId !== item.id ? (
                      <Text
                        variant="small"
                        className={isOverdue ? 'text-destructive' : isDueToday ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}
                      >
                        {formatDisplayDate(item.date)}
                      </Text>
                    ) : null}
                  </View>
                  {editingId !== item.id ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onPress={() => openDatePicker(item.id, item.date)}
                        accessibilityLabel={item.date ? formatDisplayDate(item.date) : 'Set date'}
                      >
                        <Icon
                          as={Calendar}
                          size={16}
                          className={item.date ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onPress={() => handleStartEdit(item.id, item.text)}
                        accessibilityLabel="Edit title"
                      >
                        <Icon as={Pencil} size={16} className="text-muted-foreground" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onPress={() => setDeleteId(item.id)}
                    accessibilityLabel="Delete"
                  >
                    <Icon as={Trash2} size={16} className="text-destructive" />
                  </Button>
                </View>
              );
              })}
            </View>
          )}
        </ScrollView>

        {Platform.OS === 'ios' && datePickerItem && (
          <Modal visible={true} transparent animationType="slide">
            <Pressable
              className="flex-1 justify-end bg-black/50"
              onPress={() => setDatePickerForId(null)}
            >
              <Pressable
                className="rounded-t-2xl bg-card p-4"
                onPress={(e) => e.stopPropagation()}
              >
                <DateTimePicker
                  value={parseISODate(datePickerItem.date)}
                  mode="date"
                  display="spinner"
                  onChange={(_: unknown, selected?: Date) => {
                    if (selected) {
                      handleDateChange(datePickerItem.id, toISODate(selected));
                    }
                  }}
                  themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                />
                <Button
                  variant="outline"
                  className="mt-2"
                  onPress={() => setDatePickerForId(null)}
                >
                  <Text variant="small">Done</Text>
                </Button>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        <ConsentModal
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Remove item?"
          description="This item will be removed from your todo list."
          confirmText="Remove"
          cancelText="Cancel"
          variant="delete"
          onConfirm={handleConfirmDelete}
        />
      </SafeAreaView>
    </>
  );
}
