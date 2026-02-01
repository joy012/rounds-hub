import { LoadingScreen } from '@/components/ui/loading-screen';
import {
  BedCard,
  BED_CARD_HEIGHT_DEFAULT,
  BED_CARD_HEIGHT_WITH_DX,
  BED_CARD_HEIGHT_DEFAULT_TABLET,
  BED_CARD_HEIGHT_WITH_DX_TABLET,
} from '@/components/ward/bed-card';
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
import { useCallback, useMemo, useReducer } from 'react';
import { Image, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Stack, useRouter } from 'expo-router';

const ADD_OPTIONS = [1, 2, 3] as const;
const ROW_GAP = 16;
const COL_GAP = 8;
const CONTENT_PX = 16;
const TABLET_BREAKPOINT = 600;
/** Extra bottom padding so the last row of bed action buttons (Delete/Out) stays above system/drawer nav and is tappable. */
const BOTTOM_PADDING_EXTRA = 56;
const ADD_BUTTON_WIDTH_TABLET = 80;
const CUSTOM_BUTTON_WIDTH_TABLET = 110;
/** Always 4 beds per row on any device (4x4 grid). */
const BEDS_PER_ROW = 4;

/** True if bed has diagnosis text or meaningful drawing (used to compute row card height). */
function bedHasDiagnosis(bed: Bed | null): boolean {
  if (!bed?.patient?.dx) return false;
  const dx = bed.patient.dx;
  if (dx.text?.trim()) return true;
  return Boolean(dx.image?.trim() && dx.image.length >= 400);
}

type HomeState = {
  editMode: boolean;
  titleInput: string;
  wardInput: string;
  confirmDeleteBedId: string | null;
  confirmDischargeBedId: string | null;
  customAddOpen: boolean;
  customAddValue: string;
};

type HomeAction =
  | { type: 'EDIT_START'; title: string; wardNumber: string }
  | { type: 'EDIT_SET_TITLE'; value: string }
  | { type: 'EDIT_SET_WARD'; value: string }
  | { type: 'EDIT_SAVE' }
  | { type: 'EDIT_CANCEL' }
  | { type: 'CONFIRM_DELETE'; bedId: string }
  | { type: 'CONFIRM_DISCHARGE'; bedId: string }
  | { type: 'CLOSE_CONFIRM_DELETE' }
  | { type: 'CLOSE_CONFIRM_DISCHARGE' }
  | { type: 'CUSTOM_ADD_OPEN' }
  | { type: 'CUSTOM_ADD_CLOSE' }
  | { type: 'CUSTOM_ADD_SET'; value: string }
  | { type: 'CUSTOM_ADD_SUBMIT' };

const initialHomeState: HomeState = {
  editMode: false,
  titleInput: '',
  wardInput: '',
  confirmDeleteBedId: null,
  confirmDischargeBedId: null,
  customAddOpen: false,
  customAddValue: '',
};

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'EDIT_START':
      return { ...state, editMode: true, titleInput: action.title, wardInput: action.wardNumber };
    case 'EDIT_SET_TITLE':
      return { ...state, titleInput: action.value };
    case 'EDIT_SET_WARD':
      return { ...state, wardInput: action.value };
    case 'EDIT_SAVE':
    case 'EDIT_CANCEL':
      return { ...state, editMode: false, titleInput: '', wardInput: '' };
    case 'CONFIRM_DELETE':
      return { ...state, confirmDeleteBedId: action.bedId };
    case 'CONFIRM_DISCHARGE':
      return { ...state, confirmDischargeBedId: action.bedId };
    case 'CLOSE_CONFIRM_DELETE':
      return { ...state, confirmDeleteBedId: null };
    case 'CLOSE_CONFIRM_DISCHARGE':
      return { ...state, confirmDischargeBedId: null };
    case 'CUSTOM_ADD_OPEN':
      return { ...state, customAddOpen: true };
    case 'CUSTOM_ADD_CLOSE':
      return { ...state, customAddOpen: false, customAddValue: '' };
    case 'CUSTOM_ADD_SET':
      return { ...state, customAddValue: action.value };
    case 'CUSTOM_ADD_SUBMIT':
      return { ...state, customAddOpen: false, customAddValue: '' };
    default:
      return state;
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= TABLET_BREAKPOINT;
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { ward, isLoading, updateTitle, updateWardNumber, addBeds, deleteBed, dischargePatient } =
    useWard();
  const [state, dispatch] = useReducer(homeReducer, initialHomeState);

  const title = ward?.title ?? '';
  const wardNumber = ward?.wardNumber ?? '';
  const beds = ward?.beds ?? [];

  const displayTitle = useMemo(
    () => (state.titleInput !== undefined && state.titleInput !== '' ? state.titleInput : title),
    [state.titleInput, title]
  );
  const displayWard = useMemo(
    () =>
      state.wardInput !== undefined && state.wardInput !== ''
        ? state.wardInput
        : (wardNumber || '1'),
    [state.wardInput, wardNumber]
  );
  const totalBeds = useMemo(() => beds.length, [beds]);

  const gridRows = useMemo(() => {
    const rows: (Bed | null)[][] = [];
    for (let i = 0; i < beds.length; i += BEDS_PER_ROW) {
      const row: (Bed | null)[] = beds.slice(i, i + BEDS_PER_ROW);
      while (row.length < BEDS_PER_ROW) row.push(null);
      rows.push(row);
    }
    if (rows.length === 0) rows.push(Array(BEDS_PER_ROW).fill(null));
    return rows;
  }, [beds]);

  /** Per-row card height so all cells in a row match the tallest (diagnosis preview). Larger on tablet. */
  const rowCardHeights = useMemo(() => {
    const defaultH = isTablet ? BED_CARD_HEIGHT_DEFAULT_TABLET : BED_CARD_HEIGHT_DEFAULT;
    const withDxH = isTablet ? BED_CARD_HEIGHT_WITH_DX_TABLET : BED_CARD_HEIGHT_WITH_DX;
    return gridRows.map((row) => {
      const hasDxInRow = row.some((b) => bedHasDiagnosis(b));
      return hasDxInRow ? withDxH : defaultH;
    });
  }, [gridRows, isTablet]);

  const handleEdit = useCallback(() => {
    dispatch({ type: 'EDIT_START', title, wardNumber: wardNumber || '1' });
  }, [title, wardNumber]);

  const handleSave = useCallback(() => {
    const newTitle = (state.titleInput ?? '').trim() || title;
    const newWard = (state.wardInput ?? '').trim() || '1';
    updateTitle(newTitle);
    updateWardNumber(newWard);
    dispatch({ type: 'EDIT_SAVE' });
    Toast.show({ type: 'success', text1: 'Ward name and number saved', position: 'top' });
  }, [state.titleInput, state.wardInput, title, updateTitle, updateWardNumber]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: 'EDIT_CANCEL' });
  }, []);

  const handleAddBeds = useCallback(
    (count: number) => {
      addBeds(count);
      Toast.show({ type: 'success', text1: `Added ${count} bed(s) to ward`, position: 'top' });
    },
    [addBeds]
  );

  const handleConfirmDeleteBed = useCallback(async () => {
    if (!state.confirmDeleteBedId) return;
    await deleteBed(state.confirmDeleteBedId);
    dispatch({ type: 'CLOSE_CONFIRM_DELETE' });
    Toast.show({ type: 'success', text1: 'Bed removed from ward', position: 'top' });
  }, [state.confirmDeleteBedId, deleteBed]);

  const handleConfirmDischarge = useCallback(async () => {
    if (!state.confirmDischargeBedId) return;
    await dischargePatient(state.confirmDischargeBedId);
    dispatch({ type: 'CLOSE_CONFIRM_DISCHARGE' });
    Toast.show({ type: 'success', text1: 'Patient discharged from bed', position: 'top' });
  }, [state.confirmDischargeBedId, dischargePatient]);

  const handleCustomAddSubmit = useCallback(() => {
    const num = parseInt(state.customAddValue, 10);
    if (!Number.isFinite(num) || num < 1) {
      Toast.show({ type: 'error', text1: 'Please enter a number of beds from 1 to 50', position: 'top' });
      return;
    }
    if (num > 50) {
      Toast.show({ type: 'error', text1: 'You can add at most 50 beds at a time', position: 'top' });
      return;
    }
    handleAddBeds(num);
    dispatch({ type: 'CUSTOM_ADD_SUBMIT' });
  }, [state.customAddValue, handleAddBeds]);

  const handleBedPress = useCallback(
    (bedId: string) => {
      router.push({ pathname: '/bed/[id]', params: { id: bedId } });
    },
    [router]
  );

  const handleTitleInputChange = useCallback((v: string) => {
    dispatch({ type: 'EDIT_SET_TITLE', value: v });
  }, []);
  const handleWardInputChange = useCallback((v: string) => {
    dispatch({ type: 'EDIT_SET_WARD', value: v });
  }, []);
  const handleCustomAddValueChange = useCallback((v: string) => {
    dispatch({ type: 'CUSTOM_ADD_SET', value: v });
  }, []);
  const handleCloseConfirmDelete = useCallback(() => {
    dispatch({ type: 'CLOSE_CONFIRM_DELETE' });
  }, []);
  const handleCloseConfirmDischarge = useCallback(() => {
    dispatch({ type: 'CLOSE_CONFIRM_DISCHARGE' });
  }, []);
  const handleCustomAddClose = useCallback(() => {
    dispatch({ type: 'CUSTOM_ADD_CLOSE' });
  }, []);

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
            paddingBottom: 24 + insets.bottom + BOTTOM_PADDING_EXTRA,
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
            {state.editMode ? (
              <View className="gap-3 rounded-xl bg-primary/10 px-4 py-3 dark:bg-primary/15">
                <View className="gap-1">
                  <Text variant="small" className="font-semibold text-muted-foreground">
                    Department
                  </Text>
                  <Input
                    className="min-h-9 text-sm font-semibold text-foreground"
                    placeholder="Department name"
                    value={displayTitle}
                    onChangeText={handleTitleInputChange}
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
                    onChangeText={handleWardInputChange}
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
                  onPress={() => dispatch({ type: 'CUSTOM_ADD_OPEN' })}
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
            {gridRows.map((row, rowIndex) => {
              const rowCardHeight =
                rowCardHeights[rowIndex] ??
                (isTablet ? BED_CARD_HEIGHT_DEFAULT_TABLET : BED_CARD_HEIGHT_DEFAULT);
              return (
                <View key={rowIndex} className="flex-row" style={{ gap: COL_GAP }}>
                  {row.map((bed, colIndex) => (
                    <View key={bed ? bed.id : `e-${rowIndex}-${colIndex}`} className="flex-1 min-w-0">
                      {bed ? (
                        <>
                          <BedCard
                            bed={bed}
                            onPress={() => handleBedPress(bed.id)}
                            className="w-full"
                            cardHeight={rowCardHeight}
                            isTablet={isTablet}
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
                              onPress={() => dispatch({ type: 'CONFIRM_DISCHARGE', bedId: bed.id })}
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
                            onPress={() => dispatch({ type: 'CONFIRM_DELETE', bedId: bed.id })}
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
                      <View className="min-w-0">
                        <View
                          className="min-w-0 rounded-xl border border-dashed border-border/80 bg-muted/10 dark:bg-muted/5"
                          style={{ height: rowCardHeight }}
                        />
                        <View style={{ height: 8 + 32 }} />
                      </View>
                    )}
                  </View>
                ))}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <ConsentModal
          open={state.confirmDeleteBedId !== null}
          onOpenChange={(open) => !open && handleCloseConfirmDelete()}
          title="Remove bed?"
          description="This will remove the bed and all patient data. This cannot be undone."
          confirmText="Remove"
          cancelText="Cancel"
          variant="delete"
          onConfirm={handleConfirmDeleteBed}
        />

        <ConsentModal
          open={state.confirmDischargeBedId !== null}
          onOpenChange={(open) => !open && handleCloseConfirmDischarge()}
          title="Discharge patient?"
          description="Patient data will be cleared. The bed will remain."
          confirmText="Discharge"
          cancelText="Cancel"
          variant="info"
          onConfirm={handleConfirmDischarge}
        />

        {state.customAddOpen && (
          <CustomAddBedsModal
            value={state.customAddValue}
            onChangeText={handleCustomAddValueChange}
            onConfirm={handleCustomAddSubmit}
            onCancel={handleCustomAddClose}
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
