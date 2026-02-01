import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { THEME } from '@/lib/theme';
import type { DxPlanContent } from '@/lib/types';
import { Eraser, Pencil, Save } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, StyleSheet, View } from 'react-native';
import SignatureView, { type SignatureViewRef } from 'react-native-signature-canvas';

export interface TextInputAreaProps {
  label: string;
  value: DxPlanContent | undefined;
  onChange: (value: DxPlanContent) => void;
  onPenModeChange?: (active: boolean) => void;
  placeholder?: string;
  /** Section name for toast, e.g. "Diagnosis" or "Plan" */
  sectionName?: string;
  /** When true, start in edit mode (e.g. when opened in a modal) */
  initialEditing?: boolean;
}

export function TextInputArea({
  label,
  value,
  onChange,
  onPenModeChange,
  placeholder = 'Type or draw...',
  sectionName,
  initialEditing = false,
}: TextInputAreaProps) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const penColor = theme.foreground;
  const bgColor = colorScheme === 'dark' ? theme.card : theme.background;

  const [isEditing, setIsEditing] = useState(initialEditing);
  const [draftText, setDraftText] = useState(value?.text ?? '');
  const [tool, setTool] = useState<null | 'pen' | 'eraser'>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [pendingTool, setPendingTool] = useState<null | 'pen' | 'eraser'>(null);
  const [showDiscardDrawingConfirm, setShowDiscardDrawingConfirm] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);
  const draftRef = useRef(draftText);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  draftRef.current = draftText;
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraftText(value?.text ?? '');
  }, [value?.text]);

  // Reset canvas ready and pending tool when signature view remounts (e.g. after Cancel)
  useEffect(() => {
    setCanvasReady(false);
    setPendingTool(null);
  }, [canvasKey]);

  // When WebView is ready, run any pending pen/eraser selection (defer so WebView is fully ready)
  useEffect(() => {
    if (!canvasReady || !pendingTool) return;
    const id = setTimeout(() => {
      if (pendingTool === 'pen') {
        signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
        signatureRef.current?.draw();
        onPenModeChange?.(true);
        setTool('pen');
      } else if (pendingTool === 'eraser') {
        signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
        signatureRef.current?.erase();
        onPenModeChange?.(true);
        setTool('eraser');
      }
      setPendingTool(null);
    }, 150);
    return () => clearTimeout(id);
  }, [canvasReady, pendingTool, onPenModeChange]);

  // Fallback: if onLoadEnd never fires (e.g. WebView in Modal), mark ready after delay
  useEffect(() => {
    if (!isEditing) return;
    const t = setTimeout(() => setCanvasReady((r) => r || true), 3000);
    return () => clearTimeout(t);
  }, [isEditing, canvasKey]);

  // Auto-save draft text when user navigates away (e.g. back) so no data is lost
  useEffect(() => {
    return () => {
      const draft = draftRef.current ?? '';
      const current = valueRef.current?.text ?? '';
      if (draft.trim() !== current.trim()) {
        onChangeRef.current({ text: draft.trim() || undefined, image: valueRef.current?.image });
      }
    };
  }, []);

  const text = value?.text ?? '';
  const image = value?.image;
  /** Empty canvas PNG base64 is ~100–300 chars; actual drawings are larger */
  const hasMeaningfulDrawing = Boolean(image?.trim() && image.length > 400);
  const hasContent = Boolean(text?.trim() || hasMeaningfulDrawing);

  const showSavedToast = useCallback(() => {
    // Success toast removed — only show toast on error
  }, []);

  const pendingSaveRef = useRef(false);

  const exitDrawingMode = useCallback(() => {
    setTool(null);
    onPenModeChange?.(false);
  }, [onPenModeChange]);

  const handleSignatureSave = useCallback(
    (signature: string) => {
      const text = draftRef.current?.trim() || undefined;
      const image = signature?.trim() ? signature : valueRef.current?.image;
      onChangeRef.current({ text: text || undefined, image: image || undefined });
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        showSavedToast();
        setIsEditing(false);
        exitDrawingMode();
      }
    },
    [showSavedToast, exitDrawingMode]
  );

  const handleSave = useCallback(() => {
    pendingSaveRef.current = true;
    signatureRef.current?.readSignature();
    setTimeout(() => {
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        const text = draftRef.current?.trim() || undefined;
        onChangeRef.current({ text: text || undefined, image: valueRef.current?.image });
        showSavedToast();
        setIsEditing(false);
        exitDrawingMode();
      }
    }, 200);
  }, [showSavedToast, exitDrawingMode]);

  const PEN_MIN = 0.5;
  const PEN_MAX = 2.5;
  /** Larger eraser so users can clear content faster when there is a lot of handwriting */
  const ERASER_MIN = 28;
  const ERASER_MAX = 64;
  /** Handwriting canvas height so users can write more in Dx, Plan, and Inv sections */
  const HANDWRITING_CANVAS_HEIGHT = 240;

  const handleEraser = useCallback(() => {
    Keyboard.dismiss();
    if (canvasReady) {
      // Defer so WebView has a frame to receive focus/touches
      setTimeout(() => {
        setTool('eraser');
        signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
        signatureRef.current?.erase();
        onPenModeChange?.(true);
      }, 80);
    } else {
      setPendingTool('eraser');
    }
  }, [canvasReady, onPenModeChange]);

  const handleDraw = useCallback(() => {
    Keyboard.dismiss();
    if (canvasReady) {
      // Defer so WebView has a frame to receive focus/touches
      setTimeout(() => {
        setTool('pen');
        signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
        signatureRef.current?.draw();
        onPenModeChange?.(true);
      }, 80);
    } else {
      setPendingTool('pen');
    }
  }, [canvasReady, onPenModeChange]);

  const handleCancelDrawing = useCallback(() => {
    if (hasMeaningfulDrawing) {
      setShowDiscardDrawingConfirm(true);
    } else {
      setCanvasKey((k) => k + 1);
      exitDrawingMode();
    }
  }, [exitDrawingMode, hasMeaningfulDrawing]);

  const handleConfirmDiscardDrawing = useCallback(() => {
    setShowDiscardDrawingConfirm(false);
    setCanvasKey((k) => k + 1);
    exitDrawingMode();
  }, [exitDrawingMode]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    // Pen/eraser not selected by default; scroll stays enabled until user taps Pen or Eraser
  }, []);

  const handleDoneEdit = useCallback(() => {
    setIsEditing(false);
    exitDrawingMode();
  }, [exitDrawingMode]);

  if (!isEditing) {
    return (
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-1.5">
          <Label>
            <Text variant="small" className="font-medium text-foreground">{label}</Text>
          </Label>
          <Button size="sm" onPress={handleStartEdit} className="bg-primary">
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
                  source={{ uri: image.startsWith('data:') ? image : `data:image/png;base64,${image}` }}
                  className="h-full w-full"
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View className="min-h-12 items-center justify-center rounded-xl border border-dashed border-border dark:border-border">
            <Text variant="small" className="text-muted-foreground">
              {sectionName ? `No ${sectionName} added` : `No ${label} added`}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center justify-between gap-1.5">
        <Label>
          <Text variant="small" className="font-medium text-foreground">{label}</Text>
        </Label>
        <View className="flex-row gap-2">
          <Button size="sm" variant="outline" onPress={handleDoneEdit}>
            <Text variant="small">Cancel</Text>
          </Button>
          <Button size="sm" onPress={handleSave} className="bg-primary">
            <Icon as={Save} size={14} />
            <Text variant="small">Save</Text>
          </Button>
        </View>
      </View>

      {/* 1. Keyboard input always on top */}
      <Textarea
        placeholder={placeholder}
        value={draftText}
        onChangeText={setDraftText}
        className="min-h-24 rounded-xl border border-border dark:border-border"
      />

      {/* 2. Handwriting section below; show loading until canvas is ready */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Text variant="small" className="font-medium text-muted-foreground">
            Handwriting
          </Text>
          {!canvasReady && (
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color={theme.primary} />
              <Text variant="small" className="text-muted-foreground">
                Preparing canvas…
              </Text>
            </View>
          )}
        </View>
        <View
          className="overflow-hidden rounded-lg border border-border bg-muted/30 dark:border-border dark:bg-muted/20"
          style={{ height: HANDWRITING_CANVAS_HEIGHT }}
          pointerEvents="box-none"
        >
          <SignatureView
            key={canvasKey}
            ref={signatureRef}
            onOK={handleSignatureSave}
            onLoadEnd={() => setCanvasReady(true)}
            dataURL={image ?? ''}
            descriptionText=""
            penColor={penColor}
            backgroundColor={bgColor}
            minWidth={PEN_MIN}
            maxWidth={PEN_MAX}
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; background: ${bgColor}; }
              .m-signature-pad--body { border: none; min-height: ${HANDWRITING_CANVAS_HEIGHT}px; background: ${bgColor}; }
              .m-signature-pad--footer { display: none; }
              .m-signature-pad .m-signature-pad--body canvas { background: ${bgColor}; }
            `}
            autoClear={false}
            imageType="image/png"
            style={{ flex: 1, height: HANDWRITING_CANVAS_HEIGHT }}
          />
          {!canvasReady && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.canvasLoadingOverlay,
                { backgroundColor: theme.card + 'E6' },
              ]}
              pointerEvents="none"
            >
              <ActivityIndicator size="large" color={theme.primary} />
              <Text variant="small" className="mt-2 text-muted-foreground">
                Loading writing area…
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button
            size="sm"
            variant={tool === 'pen' ? 'secondary' : 'outline'}
            onPress={handleDraw}
            disabled={!canvasReady}
            className={tool === 'pen' ? 'bg-primary/20 dark:bg-primary/25' : ''}
          >
            <Icon as={Pencil} size={14} className={tool === 'pen' ? 'text-primary' : 'text-muted-foreground'} />
            <Text variant="small" className={tool === 'pen' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
              Pen
            </Text>
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'destructive' : 'outline'}
            onPress={handleEraser}
            disabled={!canvasReady}
            className={tool === 'eraser' ? 'bg-destructive dark:bg-destructive/80' : ''}
          >
            <Icon as={Eraser} size={14} className={tool === 'eraser' ? 'text-destructive-foreground' : 'text-muted-foreground'} />
            <Text variant="small" className={tool === 'eraser' ? 'text-destructive-foreground font-semibold' : 'text-muted-foreground'}>
              Eraser
            </Text>
          </Button>
          <Button size="sm" variant="outline" onPress={handleCancelDrawing}>
            <Text variant="small">Cancel</Text>
          </Button>
          <Button size="sm" onPress={handleSave} className="bg-primary">
            <Icon as={Save} size={14} />
            <Text variant="small">Save</Text>
          </Button>
        </View>
      </View>
      <ConsentModal
        open={showDiscardDrawingConfirm}
        onOpenChange={setShowDiscardDrawingConfirm}
        title="Discard drawing?"
        description="This will discard the current drawing. Continue?"
        confirmText="Discard"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={handleConfirmDiscardDrawing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvasLoadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
