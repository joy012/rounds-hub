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
import { Image, View } from 'react-native';
import SignatureView, { type SignatureViewRef } from 'react-native-signature-canvas';
import Toast from 'react-native-toast-message';

export interface TextInputAreaProps {
  label: string;
  value: DxPlanContent | undefined;
  onChange: (value: DxPlanContent) => void;
  onPenModeChange?: (active: boolean) => void;
  placeholder?: string;
  /** Section name for toast, e.g. "Dx" or "Plan" */
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
  const hasContent = Boolean(text?.trim() || image);

  const showSavedToast = useCallback(
    (message: string) => {
      const title = sectionName ? `${sectionName} data updated` : message;
      Toast.show({
        type: 'success',
        text1: title,
        position: 'top',
      });
    },
    [sectionName]
  );

  const handleSave = useCallback(() => {
    onChange({ text: draftText.trim() || undefined, image: value?.image });
    showSavedToast('Saved');
  }, [draftText, value?.image, onChange, showSavedToast]);

  const handleSignatureSave = useCallback(
    (signature: string) => {
      if (signature) {
        onChange({ text: draftText.trim() || undefined, image: signature });
        showSavedToast('Saved');
      }
    },
    [draftText, onChange, showSavedToast]
  );

  const handleSaveDrawing = useCallback(() => {
    signatureRef.current?.readSignature();
  }, []);

  const handleEraser = useCallback(() => {
    signatureRef.current?.erase();
  }, []);

  const handleDraw = useCallback(() => {
    signatureRef.current?.draw();
  }, []);

  const handleClearCanvas = useCallback(() => {
    setShowClearConfirm(false);
    signatureRef.current?.clearSignature();
    onChange({ text: draftText.trim() || undefined, image: undefined });
  }, [draftText, onChange]);

  const handleRequestClearCanvas = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    onPenModeChange?.(true);
  }, [onPenModeChange]);

  const handleDoneEdit = useCallback(() => {
    setIsEditing(false);
    onPenModeChange?.(false);
  }, [onPenModeChange]);

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
            {image ? (
              <View className="mt-2 aspect-video max-h-24 w-32 overflow-hidden rounded bg-muted/30">
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
              Tap Edit to add notes
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
            <Text variant="small">Done</Text>
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

      {/* 2. Handwriting section below, with eraser in pen section */}
      <View className="gap-2">
        <Text variant="small" className="font-medium text-muted-foreground">
          Handwriting
        </Text>
        <View className="h-36 overflow-hidden rounded-lg border border-border bg-muted/30 dark:border-border dark:bg-muted/20">
          <SignatureView
            ref={signatureRef}
            onOK={handleSignatureSave}
            dataURL={image}
            descriptionText=""
            penColor={penColor}
            backgroundColor={bgColor}
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; background: ${bgColor}; }
              .m-signature-pad--body { border: none; min-height: 140px; background: ${bgColor}; }
              .m-signature-pad--footer { display: none; }
              .m-signature-pad .m-signature-pad--body canvas { background: ${bgColor}; }
            `}
            autoClear={false}
            imageType="image/png"
            style={{ flex: 1, height: 140 }}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" onPress={handleSaveDrawing} className="bg-primary">
            <Icon as={Save} size={14} />
            <Text variant="small">Save drawing</Text>
          </Button>
          <Button size="sm" variant="secondary" onPress={handleDraw}>
            <Icon as={Pencil} size={14} className="text-primary" />
            <Text variant="small">Pen</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={handleEraser}>
            <Icon as={Eraser} size={14} className="text-muted-foreground" />
            <Text variant="small">Eraser</Text>
          </Button>
          {image ? (
            <Button size="sm" variant="outline" onPress={handleRequestClearCanvas}>
              <Text variant="small">Clear drawing</Text>
            </Button>
          ) : null}
        </View>
      </View>

      <ConsentModal
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear drawing?"
        description="This will remove the drawing. You can draw again after clearing."
        confirmText="Clear"
        cancelText="Cancel"
        variant="delete"
        onConfirm={handleClearCanvas}
      />
    </View>
  );
}
