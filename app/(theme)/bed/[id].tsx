import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { InvTable } from '@/components/ward/inv-table';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { PatientForm } from '@/components/ward/patient-form';
import { TextInputArea } from '@/components/ward/text-input-area';
import { useWard } from '@/contexts/ward-context';
import { exportBedToPdf } from '@/lib/pdf-export';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BedDouble,
  ClipboardList,
  FileDown,
  FileText,
  Stethoscope,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const TOP_BAR_TABLET_BREAKPOINT = 520;

export default function BedDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isNarrow = width < TOP_BAR_TABLET_BREAKPOINT;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ward, getBed, updateBedPatient, deleteBed, dischargePatient } = useWard();
  const bed = id ? getBed(id) : undefined;

  const [confirmDischarge, setConfirmDischarge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [dxPenActive, setDxPenActive] = useState(false);
  const [planPenActive, setPlanPenActive] = useState(false);
  const [invPenActive, setInvPenActive] = useState(false);

  const patient = bed?.patient;
  const patientData = patient ?? {};

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

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
    setConfirmDischarge(false);
    Toast.show({ type: 'success', text1: 'Patient discharged from bed', position: 'top' });
    router.back();
  }, [id, dischargePatient, router]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    await deleteBed(id);
    setConfirmDelete(false);
    Toast.show({ type: 'success', text1: 'Bed removed from ward', position: 'top' });
    router.back();
  }, [id, deleteBed, router]);

  const handleExportPdf = useCallback(async () => {
    if (!bed || !ward || !bed.patient) return;
    setExportingPdf(true);
    try {
      await exportBedToPdf(bed, ward);
      Toast.show({ type: 'success', text1: 'Bed PDF ready to save or share', position: 'top' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to create bed PDF', position: 'top' });
    } finally {
      setExportingPdf(false);
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

  const invRows = patient?.inv ?? [];
  const setInvRows = (rows: typeof invRows) => {
    handlePatientChange({ ...patientData, inv: rows });
  };

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
                  disabled={exportingPdf}
                >
                  <Icon as={FileDown} size={isNarrow ? 18 : 16} className="text-primary" />
                  {!isNarrow && (
                    <Text variant="small">{exportingPdf ? 'Exporting…' : 'Export PDF'}</Text>
                  )}
                </Button>
                <Button
                  size={isNarrow ? 'icon' : 'sm'}
                  variant="outline"
                  className={isNarrow ? 'h-9 w-9 border-info/50' : 'border-info/50'}
                  onPress={() => setConfirmDischarge(true)}
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
              onPress={() => setConfirmDelete(true)}
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
        scrollEnabled={!(dxPenActive || planPenActive || invPenActive)}
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
            <TextInputArea
              label="Diagnosis"
              value={patient?.dx}
              onChange={(dx) => handlePatientChange({ ...patientData, dx })}
              onPenModeChange={setDxPenActive}
              placeholder="Diagnosis notes..."
              sectionName="Diagnosis"
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
            <InvTable
              rows={invRows}
              onChange={setInvRows}
              onPenModeChange={setInvPenActive}
              onEditorClose={() => setInvPenActive(false)}
            />
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
            <TextInputArea
              label="Plan"
              value={patient?.plan}
              onChange={(plan) => handlePatientChange({ ...patientData, plan })}
              onPenModeChange={setPlanPenActive}
              placeholder="Plan notes..."
              sectionName="Plan"
            />
          </CardContent>
        </Card>
      </ScrollView>

      <ConsentModal
        open={confirmDischarge}
        onOpenChange={setConfirmDischarge}
        title="Discharge patient?"
        description="Patient data will be cleared. The bed will remain."
        confirmText="Discharge"
        cancelText="Cancel"
        variant="info"
        onConfirm={handleDischarge}
      />

      <ConsentModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
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
