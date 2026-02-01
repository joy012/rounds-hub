import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ClipboardList, FileDown, PenLine } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

type PersonalRow = {
  id: string;
  label: string;
  route: string;
  icon: typeof PenLine;
};

const ROWS: PersonalRow[] = [
  { id: 'sketches', label: 'Sketches', route: '/personal/sketches', icon: PenLine },
  { id: 'checklist', label: 'Todo List', route: '/personal/checklist', icon: ClipboardList },
  { id: 'backup', label: 'Backup and restore', route: '/personal/backup', icon: FileDown },
];

export default function PersonalHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleRowPress = useCallback(
    (route: string) => {
      router.push(route as '/personal/sketches' | '/personal/checklist' | '/personal/backup');
    },
    [router]
  );

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
          <Text className="text-lg font-semibold text-foreground">Personal</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-1 rounded-xl border border-border bg-card dark:border-border dark:bg-card overflow-hidden">
            {ROWS.map((row, index) => (
              <Pressable
                key={row.id}
                onPress={() => handleRowPress(row.route)}
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3.5',
                  index < ROWS.length - 1 && 'border-b border-border dark:border-border'
                )}
                accessibilityRole="button"
                accessibilityLabel={row.label}
              >
                <View className="rounded-lg bg-primary/10 p-2 dark:bg-primary/20">
                  <Icon as={row.icon} size={20} className="text-primary" />
                </View>
                <Text className="flex-1 text-base font-medium text-foreground">{row.label}</Text>
                <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
