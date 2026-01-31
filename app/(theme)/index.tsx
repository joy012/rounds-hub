import { LoadingScreen } from '@/components/ui/loading-screen';
import { BedCard } from '@/components/ward/bed-card';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useWard } from '@/contexts/ward-context';
import type { Bed } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  BedDouble,
  Hash,
  Moon,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Sun,
  Trash2,
  UserMinus,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Stack, useRouter } from 'expo-router';

const ADD_OPTIONS = [1, 2, 3] as const;
const ROW_GAP = 16;
const COL_GAP = 8;
const CONTENT_PX = 16;
const TABLET_BREAKPOINT = 600;
const ADD_BUTTON_WIDTH_TABLET = 80;
const CUSTOM_BUTTON_WIDTH_TABLET = 110;
/** Match bed cell total height (card 80 + gap 8 + action row 32) so all row cells align. */
const BED_CELL_MIN_HEIGHT = 120;

/** Beds per row by layout width (portrait/landscape). */
function getBedsPerRow(width: number): number {
  if (width < 400) return 3;
  if (width < 600) return 4;
  if (width < 800) return 5;
  return 6;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= TABLET_BREAKPOINT;
  const bedsPerRow = getBedsPerRow(windowWidth);
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { ward, isLoading, updateTitle, updateWardNumber, addBeds, deleteBed, dischargePatient } =
    useWard();
  const [editMode, setEditMode] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [wardInput, setWardInput] = useState('');
  const [confirmDeleteBedId, setConfirmDeleteBedId] = useState<string | null>(null);
  const [confirmDischargeBedId, setConfirmDischargeBedId] = useState<string | null>(null);
  const [customAddOpen, setCustomAddOpen] = useState(false);
  const [customAddValue, setCustomAddValue] = useState('');

  const title = ward?.title ?? '';
  const wardNumber = ward?.wardNumber ?? '';
  const displayTitle = titleInput !== undefined && titleInput !== '' ? titleInput : title;
  const displayWard = wardInput !== undefined && wardInput !== '' ? wardInput : (wardNumber || '1');
  const beds = ward?.beds ?? [];
  const totalBeds = beds.length;

  const gridRows = useMemo(() => {
    const rows: (Bed | null)[][] = [];
    for (let i = 0; i < beds.length; i += bedsPerRow) {
      const row: (Bed | null)[] = beds.slice(i, i + bedsPerRow);
      while (row.length < bedsPerRow) row.push(null);
      rows.push(row);
    }
    if (rows.length === 0) rows.push(Array(bedsPerRow).fill(null));
    return rows;
  }, [beds, bedsPerRow]);

  const handleEdit = useCallback(() => {
    setTitleInput(title);
    setWardInput(wardNumber || '1');
    setEditMode(true);
  }, [title, wardNumber]);

  const handleSave = useCallback(() => {
    const newTitle = (titleInput ?? '').trim() || title;
    const newWard = (wardInput ?? '').trim() || '1';
    updateTitle(newTitle);
    updateWardNumber(newWard);
    setTitleInput('');
    setWardInput('');
    setEditMode(false);
    Toast.show({ type: 'success', text1: 'Ward name and number saved', position: 'top' });
  }, [titleInput, wardInput, title, updateTitle, updateWardNumber]);

  const handleCancelEdit = useCallback(() => {
    setTitleInput('');
    setWardInput('');
    setEditMode(false);
  }, []);

  const handleAddBeds = useCallback(
    (count: number) => {
      addBeds(count);
      Toast.show({ type: 'success', text1: `Added ${count} bed(s) to ward`, position: 'top' });
    },
    [addBeds]
  );

  const handleConfirmDeleteBed = useCallback(async () => {
    if (!confirmDeleteBedId) return;
    await deleteBed(confirmDeleteBedId);
    setConfirmDeleteBedId(null);
    Toast.show({ type: 'success', text1: 'Bed removed from ward', position: 'top' });
  }, [confirmDeleteBedId, deleteBed]);

  const handleConfirmDischarge = useCallback(async () => {
    if (!confirmDischargeBedId) return;
    await dischargePatient(confirmDischargeBedId);
    setConfirmDischargeBedId(null);
    Toast.show({ type: 'success', text1: 'Patient discharged from bed', position: 'top' });
  }, [confirmDischargeBedId, dischargePatient]);

  const handleCustomAddSubmit = useCallback(() => {
    const num = parseInt(customAddValue, 10);
    if (!Number.isFinite(num) || num < 1) {
      Toast.show({ type: 'error', text1: 'Please enter a number of beds from 1 to 50', position: 'top' });
      return;
    }
    if (num > 50) {
      Toast.show({ type: 'error', text1: 'You can add at most 50 beds at a time', position: 'top' });
      return;
    }
    handleAddBeds(num);
    setCustomAddValue('');
    setCustomAddOpen(false);
  }, [customAddValue, handleAddBeds]);

  if (isLoading || !ward) {
    return (
      <>
        <Stack.Screen options={{ title: 'RoundsHub', headerShown: false }} />
        <LoadingScreen title="RoundsHub" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <ScrollView
          className="flex-1 bg-background"
          contentContainerStyle={{
            paddingHorizontal: CONTENT_PX,
            paddingTop: 8,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* App header: logo + RoundsHub (logo has max height and aspect ratio, smaller on tablet) */}
          <View
            className="mb-4 flex-row items-center justify-between border-border border-b pb-3 dark:border-border"
            style={{ paddingTop: 4 }}
          >
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <View
                className={cn(
                  'aspect-square rounded-lg overflow-hidden',
                  isTablet ? 'h-8 w-8' : 'h-9 w-9'
                )}
              >
                <Image
                  source={require('@/assets/images/icon.png')}
                  className="h-full w-full"
                  resizeMode="contain"
                  accessibilityLabel="RoundsHub logo"
                />
              </View>
              <Text className="text-xl font-bold tracking-tight text-foreground">
                RoundsHub
              </Text>
            </View>
            <Button size="icon" variant="ghost" className="h-9 w-9" onPress={toggleColorScheme}>
              <Icon
                as={colorScheme === 'dark' ? Sun : Moon}
                size={20}
                className="text-muted-foreground"
              />
            </Button>
          </View>

          {/* Department / Ward card */}
          <View className="mb-4">
            {editMode ? (
              <View className="gap-3 rounded-xl bg-primary/10 px-4 py-3 dark:bg-primary/15">
                <View className="gap-1">
                  <Text variant="small" className="font-semibold text-muted-foreground">
                    Department
                  </Text>
                  <Input
                    className="min-h-9 text-sm font-semibold text-foreground"
                    placeholder="Department name"
                    value={displayTitle}
                    onChangeText={setTitleInput}
                  />
                </View>
                <View className="flex-row items-end gap-2">
                  <View className="w-20">
                    <Text variant="small" className="mb-1 font-semibold text-muted-foreground">
                      Ward
                    </Text>
                    <Input
                      className="min-h-9 text-sm font-semibold text-foreground"
                      placeholder="1"
                      value={displayWard}
                      onChangeText={setWardInput}
                    />
                  </View>
                  <View className="flex-row gap-1.5">
                    <Button size="sm" variant="outline" className="h-9 px-2.5" onPress={handleCancelEdit}>
                      <Text variant="small">Cancel</Text>
                    </Button>
                    <Button size="sm" className="h-9 bg-primary px-2.5" onPress={handleSave}>
                      <Icon as={Save} size={14} />
                      <Text variant="small">Save</Text>
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-3 dark:bg-primary/15">
                <View className="min-w-0 flex-1">
                  <Text className="truncate text-base font-bold tracking-tight text-foreground">
                    {displayTitle || 'Surgery Department'}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Icon as={Hash} size={14} className="text-primary" />
                      <Text variant="small" className="font-semibold text-muted-foreground">
                        Ward {displayWard}
                      </Text>
                    </View>
                    <View className="h-3 w-px bg-border" />
                    <View className="flex-row items-center gap-1">
                      <Icon as={BedDouble} size={14} className="text-success" />
                      <Text variant="small" className="font-semibold text-muted-foreground">
                        {totalBeds} bed{totalBeds !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                <Button size="icon" variant="ghost" className="h-8 w-8" onPress={handleEdit}>
                  <Icon as={Pencil} size={16} className="text-primary" />
                </Button>
              </View>
            )}
          </View>

          {/* Add beds — full width on mobile, fixed width on tablet */}
          <View className="mb-4">
            <View
              className="flex-row flex-wrap"
              style={{ gap: COL_GAP, justifyContent: isTablet ? 'flex-start' : undefined }}
            >
              {ADD_OPTIONS.map((n) => (
                <View
                  key={n}
                  style={isTablet ? { width: ADD_BUTTON_WIDTH_TABLET } : undefined}
                  className={isTablet ? '' : 'flex-1'}
                >
                  <Button
                    size="sm"
                    onPress={() => handleAddBeds(n)}
                    className="h-10 w-full bg-primary"
                  >
                    <Icon as={Plus} size={18} className="text-primary-foreground" />
                    <Text variant="small" className="font-semibold text-primary-foreground">{n}</Text>
                  </Button>
                </View>
              ))}
              <View
                style={isTablet ? { width: CUSTOM_BUTTON_WIDTH_TABLET } : { minWidth: 90 }}
                className={isTablet ? '' : 'flex-1'}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 w-full border-primary/40"
                  onPress={() => setCustomAddOpen(true)}
                >
                  <Icon as={SlidersHorizontal} size={18} className="text-primary" />
                  <Text variant="small" className="font-semibold text-primary">Custom</Text>
                </Button>
              </View>
            </View>
          </View>

          {/* Bed grid — larger cards, compact action row */}
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-0.5 w-5 rounded-full bg-primary" />
            <Text variant="small" className="font-bold uppercase tracking-wider text-muted-foreground">
              Beds
            </Text>
          </View>
          <View style={{ gap: ROW_GAP }}>
            {gridRows.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row" style={{ gap: COL_GAP }}>
                {row.map((bed, colIndex) => (
                  <View key={bed ? bed.id : `e-${rowIndex}-${colIndex}`} className="flex-1 min-w-0">
                    {bed ? (
                      <>
                        <BedCard
                          bed={bed}
                          onPress={() =>
                            router.push({ pathname: '/bed/[id]', params: { id: bed.id } })
                          }
                          className="w-full"
                        />
                        <View className="mt-2 flex-row flex-shrink-0 flex-wrap items-center gap-1.5">
                          {bed.patient && (
                            <Button
                              size={isTablet ? 'sm' : 'icon'}
                              variant="outline"
                              className={cn(
                                'h-8 border-info/50',
                                isTablet ? 'min-w-0 flex-1 px-2' : 'w-8 flex-shrink-0'
                              )}
                              onPress={() => setConfirmDischargeBedId(bed.id)}
                            >
                              <Icon as={UserMinus} size={14} className="text-info" />
                              {isTablet && (
                                <Text variant="small" className="text-xs" numberOfLines={1}>
                                  Out
                                </Text>
                              )}
                            </Button>
                          )}
                          <Button
                            size={isTablet ? 'sm' : 'icon'}
                            variant="outline"
                            className={cn(
                              'h-8 border-destructive/50',
                              isTablet ? 'min-w-0 flex-1 px-2' : 'w-8 flex-shrink-0'
                            )}
                            onPress={() => setConfirmDeleteBedId(bed.id)}
                          >
                            <Icon as={Trash2} size={14} className="text-destructive" />
{isTablet && (
                                <Text variant="small" className="text-xs text-destructive" numberOfLines={1}>
                                  Delete
                                </Text>
                              )}
                          </Button>
                        </View>
                      </>
                    ) : (
                      <View
                        className="min-w-0 rounded-xl border border-dashed border-border/80 bg-muted/10 dark:bg-muted/5"
                        style={{ minHeight: BED_CELL_MIN_HEIGHT }}
                      />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <ConsentModal
          open={confirmDeleteBedId !== null}
          onOpenChange={(open) => !open && setConfirmDeleteBedId(null)}
          title="Remove bed?"
          description="This will remove the bed and all patient data. This cannot be undone."
          confirmText="Remove"
          cancelText="Cancel"
          variant="delete"
          onConfirm={handleConfirmDeleteBed}
        />

        <ConsentModal
          open={confirmDischargeBedId !== null}
          onOpenChange={(open) => !open && setConfirmDischargeBedId(null)}
          title="Discharge patient?"
          description="Patient data will be cleared. The bed will remain."
          confirmText="Discharge"
          cancelText="Cancel"
          variant="info"
          onConfirm={handleConfirmDischarge}
        />

        {customAddOpen && (
          <CustomAddBedsModal
            value={customAddValue}
            onChangeText={setCustomAddValue}
            onConfirm={handleCustomAddSubmit}
            onCancel={() => {
              setCustomAddOpen(false);
              setCustomAddValue('');
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

function CustomAddBedsModal({
  value,
  onChangeText,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/60 p-4">
      <View className="w-full max-w-sm overflow-hidden rounded-2xl border border-primary/30 bg-card p-4 shadow-xl dark:border-primary/40">
        <View className="mb-3 flex-row items-center gap-2.5">
          <View className="rounded-lg bg-primary/20 p-2 dark:bg-primary/30">
            <Icon as={Plus} size={20} className="text-primary" />
          </View>
          <Text className="text-base font-bold text-foreground">Add beds (1–50)</Text>
        </View>
        <Input
          keyboardType="number-pad"
          placeholder="Number of beds"
          value={value}
          onChangeText={onChangeText}
          className="mb-3 min-h-10"
        />
        <View className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onPress={onCancel}>
            <Text variant="small">Cancel</Text>
          </Button>
          <Button className="flex-1 bg-primary" onPress={onConfirm}>
            <Icon as={Plus} size={14} />
            <Text variant="small">Add</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
