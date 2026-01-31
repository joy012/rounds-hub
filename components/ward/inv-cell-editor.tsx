import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { TextInputArea } from '@/components/ward/text-input-area';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { useCallback } from 'react';

type InvColumnKey = 'date' | 'investigation' | 'findings';

const COLUMN_LABELS: Record<InvColumnKey, string> = {
  date: 'Date',
  investigation: 'Investigation',
  findings: 'Findings',
};

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85%] p-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Text className="text-base font-semibold text-foreground">
              {label}
            </Text>
          </DialogTitle>
        </DialogHeader>
        <TextInputArea
          label={label}
          value={value}
          onChange={handleChange}
          onPenModeChange={onPenModeChange}
          placeholder={`Type or draw ${label.toLowerCase()}...`}
        />
      </DialogContent>
    </Dialog>
  );
}
