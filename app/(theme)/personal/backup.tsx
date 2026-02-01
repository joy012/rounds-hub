import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import {
  exportBackupAsJson,
  exportBackupAsPdf,
  importBackupFromJson,
} from '@/lib/backup';
import { useWard } from '@/contexts/ward-context';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronLeft, FileDown, FileJson } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Stack, useRouter } from 'expo-router';

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reloadWard } = useWard();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      await exportBackupAsPdf();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not export PDF',
        text2: e instanceof Error ? e.message : undefined,
        position: 'top',
      });
    } finally {
      setExportingPdf(false);
    }
  }, []);

  const handleExportJson = useCallback(async () => {
    setExportingJson(true);
    try {
      await exportBackupAsJson();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not export backup',
        text2: e instanceof Error ? e.message : undefined,
        position: 'top',
      });
    } finally {
      setExportingJson(false);
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setRestoring(false);
        return;
      }
      setSelectedFileUri(result.assets[0].uri);
      setConfirmRestore(true);
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not open file picker',
        text2: e instanceof Error ? e.message : undefined,
        position: 'top',
      });
    } finally {
      setRestoring(false);
    }
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    const uri = selectedFileUri;
    setConfirmRestore(false);
    setSelectedFileUri(null);
    if (!uri) return;
    setRestoring(true);
    try {
      await importBackupFromJson(uri);
      await reloadWard();
      router.replace('/personal');
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not restore',
        text2: e instanceof Error ? e.message : undefined,
        position: 'top',
      });
    } finally {
      setRestoring(false);
    }
  }, [selectedFileUri, reloadWard, router]);

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
          <Text className="text-lg font-semibold text-foreground">Backup and restore</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 24 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">
            <View className="rounded-xl border border-border bg-card p-4 dark:border-border dark:bg-card">
              <View className="mb-2 flex-row items-center gap-2">
                <Icon as={FileDown} size={20} className="text-primary" />
                <Text className="font-medium text-foreground">Export as PDF</Text>
              </View>
              <Text variant="small" className="mb-3 text-muted-foreground">
                Readable backup — open in any PDF viewer. For archiving only; cannot restore from PDF.
              </Text>
              <Button
                onPress={handleExportPdf}
                disabled={exportingPdf}
                className="w-full bg-primary"
              >
                {exportingPdf ? (
                  <ActivityIndicator size="small" color="hsl(0 0% 100%)" />
                ) : (
                  <Text variant="small" className="font-medium text-primary-foreground">Export PDF</Text>
                )}
              </Button>
            </View>

            <View className="rounded-xl border border-border bg-card p-4 dark:border-border dark:bg-card">
              <View className="mb-2 flex-row items-center gap-2">
                <Icon as={FileJson} size={20} className="text-primary" />
                <Text className="font-medium text-foreground">Export as JSON</Text>
              </View>
              <Text variant="small" className="mb-3 text-muted-foreground">
                Full backup for restore. Save the file and use Restore to load it back.
              </Text>
              <Button
                onPress={handleExportJson}
                disabled={exportingJson}
                variant="outline"
                className="w-full"
              >
                {exportingJson ? (
                  <ActivityIndicator size="small" color="hsl(166 76% 36%)" />
                ) : (
                  <Text variant="small" className="font-medium">Export JSON</Text>
                )}
              </Button>
            </View>

            <View className="rounded-xl border border-border bg-card p-4 dark:border-border dark:bg-card">
              <Text className="mb-2 font-medium text-foreground">Restore from file</Text>
              <Text variant="small" className="mb-3 text-muted-foreground">
                Choose a previously exported JSON backup. This will replace all app data.
              </Text>
              <Button
                onPress={handlePickFile}
                disabled={restoring}
                variant="outline"
                className="w-full border-destructive/50"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="hsl(0 84% 60%)" />
                ) : (
                  <Text variant="small" className="font-medium text-destructive">Restore from file</Text>
                )}
              </Button>
            </View>
          </View>
        </ScrollView>

        <ConsentModal
          open={confirmRestore}
          onOpenChange={(open) => {
            if (!open) setSelectedFileUri(null);
            setConfirmRestore(open);
          }}
          title="Restore from backup?"
          description="This will replace all app data (ward, references, phrases, settings). This cannot be undone."
          confirmText="Restore"
          cancelText="Cancel"
          variant="warning"
          onConfirm={handleConfirmRestore}
        />
      </SafeAreaView>
    </>
  );
}
