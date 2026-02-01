import { DatePickerField } from '@/components/ui/date-picker-field';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { KeyboardHandwritingEditorModal } from '@/components/ward/keyboard-handwriting-editor-modal';
import { THEME } from '@/lib/theme';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

type InvColumnKey = 'date' | 'investigation' | 'findings';

const COLUMN_LABELS: Record<InvColumnKey, string> = {
  date: 'Date',
  investigation: 'Investigation',
  findings: 'Findings',
};

const DATE_MODAL_HEIGHT_RATIO = 0.4;

export interface InvCellEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: InvRow;
  column: InvColumnKey;
  onSave: (value: DxPlanContent) => void;
}

function rowToDxPlan(row: InvRow, column: InvColumnKey): DxPlanContent {
  const textKey = column;
  const imageKey = `${column}Image` as keyof InvRow;
  return {
    text: row[textKey] ?? '',
    image: row[imageKey] as string | undefined,
  };
}

export function InvCellEditor({
  open,
  onOpenChange,
  row,
  column,
  onSave,
}: InvCellEditorProps) {
  const { height } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const sheetHeight = Math.round(height * DATE_MODAL_HEIGHT_RATIO);
  const value = rowToDxPlan(row, column);
  const label = COLUMN_LABELS[column];
  const isDateColumn = column === 'date';

  const handleDateChange = useCallback(
    (isoDate: string | undefined) => {
      onSave({ text: isoDate ?? '', image: undefined });
      onOpenChange(false);
    },
    [onSave, onOpenChange]
  );

  const handleTextCellSave = useCallback(
    (content: DxPlanContent) => {
      onSave(content);
    },
    [onSave]
  );

  if (isDateColumn) {
    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => onOpenChange(false)}
        statusBarTranslucent
      >
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            pointerEvents="none"
          />
          <View
            style={{
              height: sheetHeight,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: theme.card,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: theme.border,
              overflow: 'hidden',
              padding: 20,
            }}
            pointerEvents="box-none"
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.cardForeground }}>
                {label}
              </Text>
              <Pressable
                onPress={() => onOpenChange(false)}
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
            <View className="gap-2">
              <Label>
                <Text variant="small" className="font-medium text-foreground">
                  Date
                </Text>
              </Label>
              <DatePickerField
                value={value.text}
                onChange={handleDateChange}
                placeholder="Select date"
                accessibilityLabel="Investigation date"
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <KeyboardHandwritingEditorModal
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      value={value}
      onSave={handleTextCellSave}
      placeholder={`Type or draw ${label.toLowerCase()}...`}
    />
  );
}
