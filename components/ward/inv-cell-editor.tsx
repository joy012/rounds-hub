import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextInputArea } from '@/components/ward/text-input-area';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { X } from 'lucide-react-native';
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
            backgroundColor: 'hsl(var(--background))',
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: 'hsl(var(--border))',
            overflow: 'hidden',
          }}
        >
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-base font-semibold text-foreground">{label}</Text>
            <Pressable
              onPress={() => onOpenChange(false)}
              hitSlop={12}
              className="rounded p-1 active:opacity-70"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon as={X} size={20} className="text-muted-foreground" />
            </Pressable>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <TextInputArea
              label={label}
              value={value}
              onChange={handleChange}
              onPenModeChange={onPenModeChange}
              placeholder={`Type or draw ${label.toLowerCase()}...`}
              sectionName={label}
              initialEditing
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
