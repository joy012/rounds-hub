import { DatePickerField } from '@/components/ui/date-picker-field';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { TextInputArea } from '@/components/ward/text-input-area';
import { THEME } from '@/lib/theme';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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

const BOTTOM_SHEET_HEIGHT_RATIO = 0.8;

export interface InvCellEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: InvRow;
  column: InvColumnKey;
  onSave: (value: DxPlanContent) => void;
  onPenModeChange?: (active: boolean) => void;
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
  onPenModeChange,
}: InvCellEditorProps) {
  const { height } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const sheetHeight = Math.round(height * BOTTOM_SHEET_HEIGHT_RATIO);
  const value = rowToDxPlan(row, column);
  const label = COLUMN_LABELS[column];

  const handleChange = useCallback(
    (next: DxPlanContent) => {
      onSave(next);
      onOpenChange(false);
    },
    [onSave, onOpenChange]
  );

  const handleDateChange = useCallback(
    (isoDate: string | undefined) => {
      onSave({ text: isoDate ?? '', image: undefined });
      onOpenChange(false);
    },
    [onSave, onOpenChange]
  );

  const isDateColumn = column === 'date';

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
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          pointerEvents="none"
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => onOpenChange(false)}
          accessibilityLabel="Close"
          accessibilityRole="button"
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
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.cardForeground }}>
              {label}
            </Text>
            <Pressable
              onPress={() => onOpenChange(false)}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4, borderRadius: 4 })}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon as={X} size={20} className="text-muted-foreground" />
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1, backgroundColor: theme.card }}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={true}
          >
            {isDateColumn ? (
              <View className="gap-2">
                <Label>
                  <Text variant="small" className="font-medium text-foreground">Date</Text>
                </Label>
                <DatePickerField
                  value={value.text}
                  onChange={handleDateChange}
                  placeholder="Select date"
                  accessibilityLabel="Investigation date"
                />
              </View>
            ) : (
              <TextInputArea
                label={label}
                value={value}
                onChange={handleChange}
                onPenModeChange={onPenModeChange}
                placeholder={`Type or draw ${label.toLowerCase()}...`}
                sectionName={label}
                initialEditing
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
