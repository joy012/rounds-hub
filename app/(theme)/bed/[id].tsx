import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { KeyboardHandwritingEditorModal } from '@/components/ward/keyboard-handwriting-editor-modal';
import { InvTable } from '@/components/ward/inv-table';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { PatientForm } from '@/components/ward/patient-form';
import { useWard } from '@/contexts/ward-context';
import { exportBedToPdf } from '@/lib/pdf-export';
import type { DxPlanContent } from '@/lib/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BedDouble,
  ClipboardList,
  FileDown,
  FileText,
  Pencil,
  Stethoscope,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const MEANINGFUL_DRAWING_MIN_LENGTH = 400;

function DxPlanSectionReadOnly({
  value,
  sectionName,
  onEdit,
}: {
  value: DxPlanContent | undefined;
  sectionName: string;
  onEdit: () => void;
}) {
  const text = value?.text ?? '';
  const image = value?.image;
  const hasMeaningfulDrawing = Boolean(image?.trim() && image.length > MEANINGFUL_DRAWING_MIN_LENGTH);
  const hasContent = Boolean(text?.trim() || hasMeaningfulDrawing);

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center justify-between gap-1.5">
        <Text variant="small" className="font-medium text-foreground">
          {sectionName}
        </Text>
        <Button size="sm" onPress={onEdit} className="bg-primary">
          <Icon as={Pencil} size={14} />
          <Text variant="small">Edit</Text>
        </Button>
      </View>
      {hasContent ? (
        <View className="min-h-16 rounded-xl border border-border bg-muted/20 p-3 dark:border-border dark:bg-muted/10">
          {text ? (
            <Text variant="small" className="text-foreground" numberOfLines={4}>
              {text}
            </Text>
          ) : null}
          {hasMeaningfulDrawing && image ? (
            <View className="mt-2 h-28 w-full max-w-sm overflow-hidden rounded bg-muted/30">
              <Image
                source={{
                  uri: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
                }}
                className="h-full w-full"
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View className="min-h-12 items-center justify-center rounded-xl border border-dashed border-border dark:border-border">
          <Text variant="small" className="text-muted-foreground">
            No {sectionName} added
          </Text>
        </View>
      )}
    </View>
  );
}

const TOP_BAR_TABLET_BREAKPOINT = 520;

type BedDetailsState = {
  confirmDischarge: boolean;
  confirmDelete: boolean;
  exportingPdf: boolean;
  dxModalOpen: boolean;
  planModalOpen: boolean;
};

type BedDetailsAction =
  | { type: 'SET_CONFIRM_DISCHARGE'; value: boolean }
  | { type: 'SET_CONFIRM_DELETE'; value: boolean }
  | { type: 'SET_EXPORTING_PDF'; value: boolean }
  | { type: 'SET_DX_MODAL'; value: boolean }
  | { type: 'SET_PLAN_MODAL'; value: boolean };

const initialBedDetailsState: BedDetailsState = {
  confirmDischarge: false,
  confirmDelete: false,
  exportingPdf: false,
  dxModalOpen: false,
  planModalOpen: false,
};

function bedDetailsReducer(state: BedDetailsState, action: BedDetailsAction): BedDetailsState {
  switch (action.type) {
    case 'SET_CONFIRM_DISCHARGE':
      return { ...state, confirmDischarge: action.value };
    case 'SET_CONFIRM_DELETE':
      return { ...state, confirmDelete: action.value };
    case 'SET_EXPORTING_PDF':
      return { ...state, exportingPdf: action.value };
    case 'SET_DX_MODAL':
      return { ...state, dxModalOpen: action.value };
    case 'SET_PLAN_MODAL':
      return { ...state, planModalOpen: action.value };
    default:
      return state;
  }
}

export default function BedDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isNarrow = width < TOP_BAR_TABLET_BREAKPOINT;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ward, getBed, updateBedPatient, deleteBed, dischargePatient } = useWard();
  const bed = id ? getBed(id) : undefined;
  const [state, dispatch] = useReducer(bedDetailsReducer, initialBedDetailsState);
  const patient = useMemo(() => bed?.patient, [bed?.patient]);
  const patientData = useMemo(() => patient ?? {}, [patient]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleDxModalOpenChange = useCallback((open: boolean) => {
    dispatch({ type: 'SET_DX_MODAL', value: open });
  }, []);
  const handlePlanModalOpenChange = useCallback((open: boolean) => {
    dispatch({ type: 'SET_PLAN_MODAL', value: open });
  }, []);
  const openDxModal = useCallback(() => dispatch({ type: 'SET_DX_MODAL', value: true }), []);
  const openPlanModal = useCallback(() => dispatch({ type: 'SET_PLAN_MODAL', value: true }), []);
  const handleConfirmDischargeOpenChange = useCallback((open: boolean) => {
    dispatch({ type: 'SET_CONFIRM_DISCHARGE', value: open });
  }, []);
  const handleConfirmDeleteOpenChange = useCallback((open: boolean) => {
    dispatch({ type: 'SET_CONFIRM_DELETE', value: open });
  }, []);

  const handlePatientChange = useCallback(
    (updated: typeof patientData) => {
      if (!id) return;
      updateBedPatient(id, updated);
    },
    [id, updateBedPatient]
  );

  const handleDischarge = useCallback(async () => {
    if (!id) return;
    await dischargePatient(id);
    dispatch({ type: 'SET_CONFIRM_DISCHARGE', value: false });
    router.back();
  }, [id, dischargePatient, router]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteBed(id);
    dispatch({ type: 'SET_CONFIRM_DELETE', value: false });
    router.back();
  }, [id, deleteBed, router]);

  const handleExportPdf = useCallback(async () => {
    if (!bed || !ward || !bed.patient) return;
    dispatch({ type: 'SET_EXPORTING_PDF', value: true });
    try {
      await exportBedToPdf(bed, ward);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to create bed PDF', position: 'top' });
    } finally {
      dispatch({ type: 'SET_EXPORTING_PDF', value: false });
    }
  }, [bed, ward]);

  if (!id || !bed) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(166 76% 36%)" />
          <Text className="mt-3 text-muted-foreground">Bed not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const invRows = useMemo(() => patient?.inv ?? [], [patient?.inv]);
  const setInvRows = useCallback(
    (rows: typeof invRows) => {
      handlePatientChange({ ...patientData, inv: rows });
    },
    [handlePatientChange, patientData]
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="border-border border-b bg-card px-3 py-3 shadow-sm dark:border-border dark:bg-card sm:px-4 sm:py-4">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="min-w-0 flex-row items-center gap-2 sm:gap-3">
            <View className="rounded-xl bg-primary/15 p-2 dark:bg-primary/25 sm:p-2.5">
              <Icon as={BedDouble} size={isNarrow ? 20 : 24} className="text-primary" />
            </View>
            <Text variant="h4" className="truncate text-foreground">Bed {bed.number}</Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-1.5 sm:gap-2">
            {patient && (
              <>
                <Button
                  size={isNarrow ? 'icon' : 'sm'}
                  variant="outline"
                  className={isNarrow ? 'h-9 w-9 border-primary/50' : 'border-primary/50'}
                  onPress={handleExportPdf}
                  disabled={state.exportingPdf}
                >
                  <Icon as={FileDown} size={isNarrow ? 18 : 16} className="text-primary" />
                  {!isNarrow && (
                    <Text variant="small">{state.exportingPdf ? 'Exporting…' : 'Export PDF'}</Text>
                  )}
                </Button>
                <Button
                  size={isNarrow ? 'icon' : 'sm'}
                  variant="outline"
                  className={isNarrow ? 'h-9 w-9 border-info/50' : 'border-info/50'}
                  onPress={() => dispatch({ type: 'SET_CONFIRM_DISCHARGE', value: true })}
                >
                  <Icon as={UserMinus} size={isNarrow ? 18 : 16} className="text-info" />
                  {!isNarrow && <Text variant="small">Discharge</Text>}
                </Button>
              </>
            )}
            <Button
              size={isNarrow ? 'icon' : 'sm'}
              variant="destructive"
              className={isNarrow ? 'h-9 w-9' : ''}
              onPress={() => dispatch({ type: 'SET_CONFIRM_DELETE', value: true })}
            >
              <Icon as={Trash2} size={isNarrow ? 18 : 16} />
              {!isNarrow && <Text variant="small">Delete bed</Text>}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onPress={handleClose}>
              <Icon as={X} size={isNarrow ? 20 : 22} className="text-muted-foreground" />
            </Button>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          padding: 12,
          paddingBottom: 32 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card className="mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-border dark:shadow-none pt-0">
          <CardHeader className="border-border border-b bg-muted/30 px-3 py-2 dark:bg-muted/20">
            <View className="flex-row items-center gap-1.5">
              <View className="rounded-md bg-primary/15 p-1.5 dark:bg-primary/25">
                <Icon as={Stethoscope} size={16} className="text-primary" />
              </View>
              <CardTitle>
                <Text className="text-sm font-semibold text-foreground">Patient info</Text>
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="px-2 py-0">
            <PatientForm patient={patient} onChange={handlePatientChange} />
          </CardContent>
        </Card>

        <Card className="pt-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-border dark:shadow-none">
          <CardHeader className="border-border border-b bg-muted/30 px-3 py-2 dark:bg-muted/20">
            <View className="flex-row items-center gap-1.5">
              <View className="rounded-md bg-info/15 p-1.5 dark:bg-info/25">
                <Icon as={FileText} size={16} className="text-info" />
              </View>
              <CardTitle>
                <Text className="text-sm font-semibold text-foreground">Diagnosis</Text>
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="px-2 py-0">
            <DxPlanSectionReadOnly
              value={patient?.dx}
              sectionName="Diagnosis"
              onEdit={openDxModal}
            />
          </CardContent>
        </Card>

        <Card className="pt-0 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-border dark:shadow-none">
          <CardHeader className="border-border border-b bg-muted/30 px-3 py-2 dark:bg-muted/20">
            <View className="flex-row items-center gap-1.5">
              <View className="rounded-md bg-warning/15 p-1.5 dark:bg-warning/25">
                <Icon as={ClipboardList} size={16} className="text-warning" />
              </View>
              <CardTitle>
                <Text className="text-sm font-semibold text-foreground">Investigations</Text>
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="px-2 py-0">
            <InvTable rows={invRows} onChange={setInvRows} />
          </CardContent>
        </Card>

        <Card className="pt-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-border dark:shadow-none">
          <CardHeader className="border-border border-b bg-muted/30 px-3 py-2 dark:bg-muted/20">
            <View className="flex-row items-center gap-1.5">
              <View className="rounded-md bg-success/15 p-1.5 dark:bg-success/25">
                <Icon as={FileText} size={16} className="text-success" />
              </View>
              <CardTitle>
                <Text className="text-sm font-semibold text-foreground">Plan</Text>
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="px-2 py-0">
            <DxPlanSectionReadOnly
              value={patient?.plan}
              sectionName="Plan"
              onEdit={openPlanModal}
            />
          </CardContent>
        </Card>
      </ScrollView>

      <KeyboardHandwritingEditorModal
        open={state.dxModalOpen}
        onOpenChange={handleDxModalOpenChange}
        title="Diagnosis"
        value={patient?.dx}
        onSave={(dx) => handlePatientChange({ ...patientData, dx })}
        placeholder="Diagnosis notes..."
      />

      <KeyboardHandwritingEditorModal
        open={state.planModalOpen}
        onOpenChange={handlePlanModalOpenChange}
        title="Plan"
        value={patient?.plan}
        onSave={(plan) => handlePatientChange({ ...patientData, plan })}
        placeholder="Plan notes..."
      />

      <ConsentModal
        open={state.confirmDischarge}
        onOpenChange={handleConfirmDischargeOpenChange}
        title="Discharge patient?"
        description="Patient data will be cleared. The bed will remain."
        confirmText="Discharge"
        cancelText="Cancel"
        variant="info"
        onConfirm={handleDischarge}
      />

      <ConsentModal
        open={state.confirmDelete}
        onOpenChange={handleConfirmDeleteOpenChange}
        title="Remove bed?"
        description="This will remove the bed and all patient data. This cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="delete"
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
