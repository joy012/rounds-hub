import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { THEME } from '@/lib/theme';
import type { DxPlanContent } from '@/lib/types';
import { Eraser, Pencil } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';
import SignatureView, { type SignatureViewRef } from 'react-native-signature-canvas';

const PEN_MIN = 0.5;
const PEN_MAX = 2.5;
const ERASER_MIN = 28;
const ERASER_MAX = 64;
const HANDWRITING_CANVAS_HEIGHT = 280;

export interface KeyboardAndHandwritingEditorProps {
  value: DxPlanContent | undefined;
  onChange: (value: DxPlanContent) => void;
  placeholder?: string;
  /** Optional label above keyboard section (e.g. in modal title instead) */
  label?: string;
}

export interface KeyboardAndHandwritingEditorRef {
  getContent: () => Promise<DxPlanContent>;
}

function KeyboardAndHandwritingEditorInner(
  { value, onChange, placeholder = 'Type or draw...', label }: KeyboardAndHandwritingEditorProps,
  ref: ForwardedRef<KeyboardAndHandwritingEditorRef>
) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const penColor = theme.foreground;
  const bgColor = colorScheme === 'dark' ? theme.card : theme.background;

  const [draftText, setDraftText] = useState(value?.text ?? '');
  const [tool, setTool] = useState<null | 'pen' | 'eraser'>('pen');
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [pendingTool, setPendingTool] = useState<null | 'pen' | 'eraser'>(null);

  const signatureRef = useRef<SignatureViewRef>(null);
  const draftRef = useRef(draftText);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const getContentResolveRef = useRef<((content: DxPlanContent) => void) | null>(null);

  draftRef.current = draftText;
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraftText(value?.text ?? '');
  }, [value?.text]);

  useEffect(() => {
    setCanvasReady(false);
    setPendingTool(null);
    setTool('pen');
  }, [canvasKey]);

  // When canvas is ready, apply pending tool or default to pen so user can write immediately
  useEffect(() => {
    if (!canvasReady) return;
    const toolToApply = pendingTool ?? 'pen';
    const id = setTimeout(() => {
      if (toolToApply === 'pen') {
        signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
        signatureRef.current?.draw();
        setTool('pen');
      } else if (toolToApply === 'eraser') {
        signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
        signatureRef.current?.erase();
        setTool('eraser');
      }
      setPendingTool(null);
    }, 150);
    return () => clearTimeout(id);
  }, [canvasReady, pendingTool]);

  useEffect(() => {
    const t = setTimeout(() => setCanvasReady((r) => r || true), 3000);
    return () => clearTimeout(t);
  }, [canvasKey]);

  const handleTextChange = useCallback(
    (text: string) => {
      setDraftText(text);
      onChange({ text, image: valueRef.current?.image });
    },
    [onChange]
  );

  const handleSignatureResult = useCallback((signature: string) => {
    const resolve = getContentResolveRef.current;
    if (resolve) {
      getContentResolveRef.current = null;
      const text = draftRef.current?.trim() || undefined;
      const image = signature?.trim() ? signature : valueRef.current?.image;
      resolve({ text: text ?? '', image: image ?? undefined });
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getContent: () =>
        new Promise((resolve: (value: DxPlanContent) => void) => {
          getContentResolveRef.current = resolve;
          signatureRef.current?.readSignature();
          setTimeout(() => {
            if (getContentResolveRef.current) {
              getContentResolveRef.current = null;
              const text = draftRef.current?.trim() || undefined;
              resolve({
                text: text ?? '',
                image: valueRef.current?.image,
              });
            }
          }, 500);
        })
    }),
    []
  );

  const handleEraser = useCallback(() => {
    Keyboard.dismiss();
    if (canvasReady) {
      setTimeout(() => {
        setTool('eraser');
        signatureRef.current?.changePenSize(ERASER_MIN, ERASER_MAX);
        signatureRef.current?.erase();
      }, 80);
    } else {
      setPendingTool('eraser');
    }
  }, [canvasReady]);

  const handleDraw = useCallback(() => {
    Keyboard.dismiss();
    if (canvasReady) {
      setTimeout(() => {
        setTool('pen');
        signatureRef.current?.changePenSize(PEN_MIN, PEN_MAX);
        signatureRef.current?.draw();
      }, 80);
    } else {
      setPendingTool('pen');
    }
  }, [canvasReady]);

  const handleClearDrawing = useCallback(() => {
    setCanvasKey((k) => k + 1);
    setTool('pen');
  }, []);

  const image = value?.image ?? '';

  return (
    <View className="gap-4">
      {label ? (
        <Text variant="small" className="font-medium text-muted-foreground">
          {label}
        </Text>
      ) : null}
      <Textarea
        placeholder={placeholder}
        value={draftText}
        onChangeText={handleTextChange}
        className="min-h-28 rounded-xl border border-border dark:border-border"
      />

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
            onOK={handleSignatureResult}
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
            <Icon
              as={Pencil}
              size={14}
              className={tool === 'pen' ? 'text-primary' : 'text-muted-foreground'}
            />
            <Text
              variant="small"
              className={
                tool === 'pen' ? 'text-primary font-semibold' : 'text-muted-foreground'
              }
            >
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
            <Icon
              as={Eraser}
              size={14}
              className={
                tool === 'eraser' ? 'text-destructive-foreground' : 'text-muted-foreground'
              }
            />
            <Text
              variant="small"
              className={
                tool === 'eraser'
                  ? 'text-destructive-foreground font-semibold'
                  : 'text-muted-foreground'
              }
            >
              Eraser
            </Text>
          </Button>
          <Button size="sm" variant="outline" onPress={handleClearDrawing}>
            <Text variant="small">Clear</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

export const KeyboardAndHandwritingEditor = forwardRef(
  KeyboardAndHandwritingEditorInner
);

const styles = StyleSheet.create({
  canvasLoadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
