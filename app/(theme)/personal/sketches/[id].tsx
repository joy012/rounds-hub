import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { THEME } from '@/lib/theme';
import { exportSketchToPdf } from '@/lib/pdf-export';
import {
  loadSketches,
  saveSketches,
  sketchDisplayTitle,
  type Sketch,
} from '@/lib/sketches-storage';
import { CheckCircle, Download, Eraser, Pencil, Trash2, ChevronLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureView, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';

const PEN_MIN = 0.5;
const PEN_MAX = 3;
const ERASER_MIN = 28;
const ERASER_MAX = 72;

const PEN_COLORS = [
  { hex: '#1a1a1a', label: 'Black' },
  { hex: '#374151', label: 'Gray' },
  { hex: '#2563eb', label: 'Blue' },
  { hex: '#dc2626', label: 'Red' },
  { hex: '#16a34a', label: 'Green' },
  { hex: '#7c3aed', label: 'Violet' },
];

/** Stable initial pen color for SignatureView so changing color doesn't reload the WebView (which would clear the canvas). We use ref.changePenColor() to update color. */
const INITIAL_PEN_COLOR = PEN_COLORS[0].hex;

type PendingAction = 'back' | 'save' | 'export' | null;

export default function SketchCanvasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const bgColor = colorScheme === 'dark' ? theme.card : theme.background;

  const [sketch, setSketch] = useState<Sketch | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0].hex);
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const signatureRef = useRef<SignatureViewRef>(null);
  const pendingActionRef = useRef<PendingAction>(null);

  const HEADER_H = 44;
  const TOOLBAR_PADDING_BOTTOM = Math.max(insets.bottom, 16);
  const TOOLBAR_H = 56 + TOOLBAR_PADDING_BOTTOM;
  const canvasHeight = height - insets.top - insets.bottom - HEADER_H - TOOLBAR_H;

  useEffect(() => {
    let cancelled = false;
    loadSketches()
      .then((list) => {
        const found = list.find((s) => s.id === id);
        if (!cancelled && found) {
          setSketch(found);
          setTitle(found.title);
          setCurrentImage(found.image);
        } else if (!cancelled) {
          setSketch(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setCanvasReady(false);
  }, [canvasKey]);

  useEffect(() => {
    const t = setTimeout(() => setCanvasReady((r) => r || true), 3000);
    return () => clearTimeout(t);
  }, [canvasKey]);

  useEffect(() => {
    if (!canvasReady) return;
    const idTimer = setTimeout(() => {
      if (tool === 'pen') {
        signatureRef.current?.changePenColor(penColor);
        signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
        signatureRef.current?.draw();
      } else {
        signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
        signatureRef.current?.erase();
      }
    }, 100);
    return () => clearTimeout(idTimer);
  }, [canvasReady, tool, penColor]);

  const handleSignatureResult = useCallback(
    (signature: string) => {
      const image = signature?.trim() ? signature : currentImage;
      const action = pendingActionRef.current;
      pendingActionRef.current = null;

      if (action === 'back') {
        if (sketch) {
          const listPromise = loadSketches().then((list) => {
            const idx = list.findIndex((s) => s.id === sketch.id);
            const updated: Sketch = {
              ...sketch,
              title: title.trim() || sketch.title,
              image: image ?? undefined,
              updatedAt: new Date().toISOString(),
            };
            const next = idx >= 0 ? [...list] : [updated, ...list];
            if (idx >= 0) next[idx] = updated;
            else next[0] = updated;
            return saveSketches(next);
          });
          listPromise.then(() => router.back());
        } else {
          router.back();
        }
        return;
      }

      if (action === 'save' && sketch) {
        setSaving(true);
        const updated: Sketch = {
          ...sketch,
          title: title.trim() || sketch.title,
          image: image ?? undefined,
          updatedAt: new Date().toISOString(),
        };
        loadSketches()
          .then((list) => {
            const idx = list.findIndex((s) => s.id === sketch.id);
            const next = idx >= 0 ? [...list] : [updated, ...list];
            if (idx >= 0) next[idx] = updated;
            else next[0] = updated;
            return saveSketches(next);
          })
          .then(() => {
            setSketch(updated);
            setTitle(updated.title);
            setCurrentImage(updated.image);
            setSaving(false);
          })
          .catch(() => {
            setSaving(false);
            Toast.show({ type: 'error', text1: 'Failed to save sketch' });
          });
        return;
      }

      if (action === 'export') {
        setExporting(true);
        const fromCanvas = image?.trim() ? image : undefined;
        const finalImage = fromCanvas ?? currentImage?.trim() ?? undefined;
        if (!finalImage) {
          setExporting(false);
          Toast.show({ type: 'error', text1: 'No drawing to export. Draw something first.' });
          return;
        }
        exportSketchToPdf(title.trim() || 'Untitled sketch', finalImage)
          .then(() => setExporting(false))
          .catch(() => {
            setExporting(false);
            Toast.show({ type: 'error', text1: 'Failed to export PDF' });
          });
      }
    },
    [sketch, title, currentImage, router]
  );

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    setEditingTitle(false);
    pendingActionRef.current = 'back';
    signatureRef.current?.readSignature();
  }, []);

  const handleSave = useCallback(() => {
    Keyboard.dismiss();
    pendingActionRef.current = 'save';
    signatureRef.current?.readSignature();
  }, []);

  const handleExportPdf = useCallback(() => {
    Keyboard.dismiss();
    pendingActionRef.current = 'export';
    signatureRef.current?.readSignature();
  }, []);

  const handlePen = useCallback(() => {
    setTool('pen');
    if (canvasReady) {
      signatureRef.current?.changePenColor(penColor);
      signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
      signatureRef.current?.draw();
    }
  }, [canvasReady, penColor]);

  const handleEraser = useCallback(() => {
    setTool('eraser');
    if (canvasReady) {
      signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
      signatureRef.current?.erase();
    }
  }, [canvasReady]);

  const handleClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    setShowClearConfirm(false);
    setCanvasKey((k) => k + 1);
    setCurrentImage(undefined);
  }, []);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!sketch) return;
    setShowDeleteConfirm(false);
    const list = await loadSketches();
    const next = list.filter((s) => s.id !== sketch.id);
    await saveSketches(next);
    router.back();
  }, [sketch, router]);

  const saveTitle = useCallback(async () => {
    setEditingTitle(false);
    if (!sketch || title === sketch.title) return;
    const list = await loadSketches();
    const idx = list.findIndex((s) => s.id === sketch.id);
    if (idx < 0) return;
    const updated: Sketch = {
      ...list[idx],
      title: title.trim() || list[idx].title,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    await saveSketches(list);
    setSketch(updated);
  }, [sketch, title]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sketch) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-muted-foreground">Sketch not found.</Text>
          <Button className="mt-4" onPress={() => router.back()}>
            <Text variant="small" className="font-medium text-primary-foreground">
              Back
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        {/* Header: no scroll, fixed */}
        <View
          className="flex-row items-center border-b border-border bg-card px-2 dark:border-border dark:bg-card"
          style={{ height: HEADER_H, paddingTop: 8, paddingBottom: 8 }}
        >
          <Button size="icon" variant="ghost" className="h-9 w-9" onPress={handleBack}>
            <Icon as={ChevronLeft} size={22} className="text-foreground" />
          </Button>
          <View className="min-w-0 flex-1 flex-row items-center justify-center px-1">
            {editingTitle ? (
              <Input
                value={title}
                onChangeText={setTitle}
                onBlur={saveTitle}
                onSubmitEditing={saveTitle}
                placeholder="Add title"
                className="flex-1 border-0 border-b border-border bg-transparent py-1 text-center text-sm shadow-none"
                autoFocus
              />
            ) : (
              <Pressable onPress={() => setEditingTitle(true)} className="flex-1 py-1">
                <Text
                  className="text-center text-sm font-medium text-foreground"
                  numberOfLines={1}
                >
                  {title.trim() ? title.trim() : 'Add title'}
                </Text>
              </Pressable>
            )}
          </View>
          <Button size="icon" variant="ghost" className="h-8 w-8" onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Icon as={CheckCircle} size={20} className="text-primary" />
            )}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onPress={handleExportPdf} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Icon as={Download} size={20} className="text-blue-600 dark:text-blue-400" />
            )}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onPress={handleDelete}>
            <Icon as={Trash2} size={20} className="text-destructive" />
          </Button>
        </View>

        {/* Canvas: no ScrollView — scroll stopped for palm rejection / drawing */}
        <View style={{ flex: 1, height: canvasHeight }} pointerEvents="box-none">
          <SignatureView
            key={canvasKey}
            ref={signatureRef}
            onOK={handleSignatureResult}
            onLoadEnd={() => setCanvasReady(true)}
            dataURL={currentImage ?? ''}
            descriptionText=""
            penColor={INITIAL_PEN_COLOR}
            backgroundColor={bgColor}
            minWidth={PEN_MIN}
            maxWidth={PEN_MAX}
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; background: ${bgColor}; }
              .m-signature-pad--body { border: none; min-height: ${canvasHeight}px; background: ${bgColor}; }
              .m-signature-pad--footer { display: none; }
              .m-signature-pad .m-signature-pad--body canvas { background: ${bgColor}; }
            `}
            autoClear={false}
            imageType="image/png"
            style={{ flex: 1, height: canvasHeight }}
          />
          {!canvasReady && (
            <View
              style={[StyleSheet.absoluteFill, styles.canvasOverlay, { backgroundColor: theme.card + 'E6' }]}
              pointerEvents="none"
            >
              <ActivityIndicator size="large" color={theme.primary} />
              <Text variant="small" className="mt-2 text-muted-foreground">
                Preparing canvas…
              </Text>
            </View>
          )}
        </View>

        {/* Bottom toolbar: Pen, Eraser, Color, Clear — extra bottom padding so it doesn't overlap system nav */}
        <View
          className="flex-row items-center justify-around border-t border-border bg-card px-2 dark:border-border dark:bg-card"
          style={{
            paddingTop: 10,
            paddingBottom: TOOLBAR_PADDING_BOTTOM,
            minHeight: 56,
          }}
        >
          <Button
            size="sm"
            variant={tool === 'pen' ? 'secondary' : 'outline'}
            onPress={handlePen}
            disabled={!canvasReady}
            className={tool === 'pen' ? 'bg-primary/20 dark:bg-primary/25' : ''}
          >
            <Icon as={Pencil} size={18} className={tool === 'pen' ? 'text-primary' : 'text-muted-foreground'} />
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'destructive' : 'outline'}
            onPress={handleEraser}
            disabled={!canvasReady}
            className={tool === 'eraser' ? 'bg-destructive dark:bg-destructive/80' : ''}
          >
            <Icon as={Eraser} size={18} className={tool === 'eraser' ? 'text-destructive-foreground' : 'text-muted-foreground'} />
          </Button>
          <View className="flex-row gap-2">
            {PEN_COLORS.map((c) => (
              <Pressable
                key={c.hex}
                onPress={() => {
                  setPenColor(c.hex);
                  setTool('pen');
                  if (canvasReady) {
                    signatureRef.current?.changePenColor(c.hex);
                    signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
                    signatureRef.current?.draw();
                  }
                }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.hex },
                  penColor === c.hex && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>
          <Button size="sm" variant="outline" onPress={handleClear} disabled={!canvasReady}>
            <Text variant="small" className="text-muted-foreground">
              Clear
            </Text>
          </Button>
        </View>
        <ConsentModal
          open={showClearConfirm}
          onOpenChange={setShowClearConfirm}
          title="Clear drawing?"
          description="This will remove all drawn content. Continue?"
          confirmText="Clear"
          cancelText="Cancel"
          variant="warning"
          onConfirm={handleConfirmClear}
        />
        <ConsentModal
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete sketch?"
          description="This sketch will be removed permanently."
          confirmText="Delete"
          cancelText="Cancel"
          variant="delete"
          onConfirm={handleConfirmDelete}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  canvasOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: 'hsl(166 76% 36%)',
  },
});
