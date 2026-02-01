import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  KeyboardAndHandwritingEditor,
  type KeyboardAndHandwritingEditorRef,
} from '@/components/ward/keyboard-handwriting-editor';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import { THEME } from '@/lib/theme';
import type { DxPlanContent } from '@/lib/types';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MODAL_HEIGHT_RATIO = 0.9;

/** Reusable modal with keyboard + handwriting editor. Used for Diagnosis, Plan, and Investigation table cells. */
export interface KeyboardHandwritingEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: DxPlanContent | undefined;
  onSave: (value: DxPlanContent) => void;
  placeholder?: string;
  /** Quick phrases to insert into text (tap to append). */
  insertPhrases?: string[];
}

export function KeyboardHandwritingEditorModal({
  open,
  onOpenChange,
  title,
  value,
  onSave,
  placeholder = 'Type or draw...',
  insertPhrases = [],
}: KeyboardHandwritingEditorModalProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const modalHeight = Math.round(height * MODAL_HEIGHT_RATIO);
  const footerPaddingBottom = 16 + insets.bottom;

  const [draft, setDraft] = useState<DxPlanContent | undefined>(value);
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const editorRef = useRef<KeyboardAndHandwritingEditorRef>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const hasUnsavedChanges = useCallback(
    (a: DxPlanContent | undefined, b: DxPlanContent | undefined) => {
      const textA = a?.text ?? '';
      const textB = b?.text ?? '';
      const imgA = a?.image ?? '';
      const imgB = b?.image ?? '';
      return textA.trim() !== textB.trim() || imgA !== imgB;
    },
    []
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setShowDiscardConfirm(false);
  }, [onOpenChange]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges(draft, value)) {
      setShowDiscardConfirm(true);
    } else {
      handleClose();
    }
  }, [draft, value, hasUnsavedChanges, handleClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    handleClose();
  }, [handleClose]);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setSaving(true);
    try {
      const content = await editor.getContent();
      onSave(content);
      handleClose();
    } finally {
      setSaving(false);
    }
  }, [onSave, handleClose]);

  const handleInsertPhrase = useCallback(
    (phrase: string) => {
      setDraft((prev) => {
        const current = prev?.text ?? '';
        const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
        return { ...prev, text: current + sep + phrase, image: prev?.image };
      });
    },
    []
  );

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => handleCancel()}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          pointerEvents="none"
        />
        <View
          style={{
            height: modalHeight,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.cardForeground,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Pressable
              onPress={handleCancel}
              hitSlop={12}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                padding: 4,
                borderRadius: 4,
              })}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon as={X} size={22} className="text-muted-foreground" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
          >
            {insertPhrases.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {insertPhrases.map((phrase, index) => (
                    <Pressable
                      key={`${index}-${phrase.slice(0, 20)}`}
                      onPress={() => handleInsertPhrase(phrase)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: theme.primary + '20',
                        borderWidth: 1,
                        borderColor: theme.primary + '40',
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`Insert ${phrase}`}
                    >
                      <Text variant="small" className="text-foreground" numberOfLines={1}>
                        {phrase}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <KeyboardAndHandwritingEditor
              ref={editorRef}
              value={draft}
              onChange={setDraft}
              placeholder={placeholder}
            />
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: footerPaddingBottom,
              borderTopWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Button
              variant="outline"
              onPress={handleCancel}
              disabled={saving}
              className="flex-1"
            >
              <Text variant="default">Cancel</Text>
            </Button>
            <Button
              onPress={handleSave}
              disabled={saving}
              className="flex-1 bg-primary"
            >
              <Text variant="default">{saving ? 'Saving…' : 'Save'}</Text>
            </Button>
          </View>
        </View>
      </View>
      <ConsentModal
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard changes?"
        description="You have unsaved changes. Discard them?"
        confirmText="Discard"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={handleConfirmDiscard}
      />
    </Modal>
  );
}
