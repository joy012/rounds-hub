import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { InvCellEditor } from '@/components/ward/inv-cell-editor';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { GripHorizontal, GripVertical, Pen, Plus, Save, Trash2 } from 'lucide-react-native';

const DELETE_BUTTON_WIDTH = 40;
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 320;
const DEFAULT_DATE_WIDTH = 100;
const DEFAULT_INVESTIGATION_WIDTH = 100;
const DEFAULT_FINDINGS_WIDTH = 160;
const TABLET_BREAKPOINT = 600;

export interface InvTableProps {
  rows: InvRow[];
  onChange: (rows: InvRow[]) => void;
  onPenModeChange?: (active: boolean) => void;
  /** Called when the cell editor dialog closes (so parent can re-enable scroll) */
  onEditorClose?: () => void;
}

const COLUMN_HEADERS = ['Date', 'Investigation', 'Findings'] as const;
const COLUMN_KEYS: (keyof InvRow)[] = ['date', 'investigation', 'findings'];
const DEFAULT_ROW_HEIGHT = 56;
const MIN_ROW_HEIGHT = 44;
const MAX_ROW_HEIGHT = 240;

function getCellContent(row: InvRow, key: string): { text?: string; image?: string } {
  const text = row[key as keyof InvRow] as string | undefined;
  const imageKey = `${key}Image` as keyof InvRow;
  const image = row[imageKey] as string | undefined;
  return { text, image };
}

function InvCell({
  row,
  columnKey,
  width,
  onPress,
}: {
  row: InvRow;
  columnKey: string;
  width: number;
  onPress: () => void;
}) {
  const content = getCellContent(row, columnKey);

  const style = width > 0 ? { width } : { flex: 1 };

  return (
    <Pressable
      onPress={onPress}
      className="min-h-10 justify-center border-r border-border p-2 last:border-r-0 active:bg-muted/50"
      style={style}
    >
      {content.image ? (
        <View className="aspect-video overflow-hidden rounded">
          <Image
            source={{ uri: content.image }}
            className="h-full w-full"
            resizeMode="contain"
          />
        </View>
      ) : content.text ? (
        <Text
          variant="small"
          className="text-foreground line-clamp-3"
          numberOfLines={3}
        >
          {content.text}
        </Text>
      ) : (
        <View className="flex-row items-center gap-1">
          <Icon as={Pen} size={12} className="text-muted-foreground" />
          <Text variant="small" className="text-muted-foreground">
            Tap to add
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function InvTable({ rows, onChange, onPenModeChange, onEditorClose }: InvTableProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const initialRows = useMemo(
    () => (rows.length > 0 ? rows : [{ id: generateId() }]),
    []
  );
  const [draftRows, setDraftRows] = useState<InvRow[]>(initialRows);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [columnWidths, setColumnWidths] = useState({
    date: DEFAULT_DATE_WIDTH,
    investigation: DEFAULT_INVESTIGATION_WIDTH,
    findings: DEFAULT_FINDINGS_WIDTH,
  });
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: 'date' | 'investigation' | 'findings';
  } | null>(null);
  const rowHeightsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (rows.length > 0) {
      setDraftRows(rows);
    }
  }, [rows]);

  const getRowHeight = useCallback((rowId: string) => {
    return (
      rowHeightsRef.current[rowId] ??
      rowHeights[rowId] ??
      DEFAULT_ROW_HEIGHT
    );
  }, [rowHeights]);

  const updateRow = useCallback((id: string, updates: Partial<InvRow>) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const updateCell = useCallback(
    (rowId: string, column: 'date' | 'investigation' | 'findings', value: DxPlanContent) => {
      const textKey = column;
      const imageKey = `${column}Image` as keyof InvRow;
      updateRow(rowId, {
        [textKey]: value.text || undefined,
        [imageKey]: value.image || undefined,
      });
    },
    [updateRow]
  );

  const addRow = useCallback(() => {
    setDraftRows((prev) => [...prev, { id: generateId() }]);
  }, []);

  const removeRow = useCallback(async () => {
    if (!confirmRemoveId) return;
    setDraftRows((prev) => prev.filter((r) => r.id !== confirmRemoveId));
    setConfirmRemoveId(null);
    Toast.show({ type: 'success', text1: 'Row removed', position: 'top' });
  }, [confirmRemoveId]);

  const handleSave = useCallback(() => {
    onChange(draftRows);
    Toast.show({ type: 'success', text1: 'Investigations data updated', position: 'top' });
  }, [draftRows, onChange]);

  const editingRow = editingCell
    ? draftRows.find((r) => r.id === editingCell.rowId)
    : null;

  return (
      <View className="gap-2">
      <View className="flex-row flex-wrap items-center justify-between gap-1.5">
        <View className="flex-1">
          <Text variant="small" className="font-medium text-muted-foreground">
            Investigations
          </Text>
          {!isTablet && (
            <Text variant="small" className="mt-0.5 text-xs text-muted-foreground">
              Long-press a row to remove it
            </Text>
          )}
        </View>
        <View className="flex-row gap-2">
          <Button size="sm" onPress={addRow} className="bg-primary">
            <Icon as={Plus} size={16} />
            <Text variant="small">Add row</Text>
          </Button>
          <Button size="sm" onPress={handleSave} className="bg-success">
            <Icon as={Save} size={16} />
            <Text variant="small">Save</Text>
          </Button>
        </View>
      </View>
      <ScrollView
        horizontal={isTablet}
        showsHorizontalScrollIndicator={false}
        className="overflow-hidden rounded-xl border border-border dark:border-border"
      >
        <View style={!isTablet ? { width } : undefined} className={!isTablet ? 'w-full' : ''}>
          <View className="flex-row border-b border-border bg-primary/10 dark:bg-primary/15">
            <InvTableHeader
              columnWidths={columnWidths}
              onColumnResize={setColumnWidths}
              isTablet={isTablet}
            />
            {isTablet && (
              <View
                className="flex-shrink-0 items-center justify-center border-l border-border p-2"
                style={{ width: DELETE_BUTTON_WIDTH }}
              />
            )}
          </View>
          {draftRows.map((row) => (
            <InvTableRow
              key={row.id}
              row={row}
              columnWidths={columnWidths}
              height={getRowHeight(row.id)}
              onHeightChange={(h) => {
                rowHeightsRef.current[row.id] = h;
                setRowHeights((prev) => ({ ...prev, [row.id]: h }));
              }}
              onCellPress={(col) => setEditingCell({ rowId: row.id, column: col })}
              onRemove={() => setConfirmRemoveId(row.id)}
              isTablet={isTablet}
            />
          ))}
        </View>
      </ScrollView>

      <InvCellEditor
        open={!!editingCell}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCell(null);
            onEditorClose?.();
          }
        }}
        row={editingRow ?? draftRows[0] ?? { id: '' }}
        column={editingCell?.column ?? 'date'}
        onSave={
          editingCell
            ? (value) => {
                updateCell(editingCell.rowId, editingCell.column, value);
                setEditingCell(null);
              }
            : () => {}
        }
        onPenModeChange={onPenModeChange}
      />

      <ConsentModal
        open={confirmRemoveId !== null}
        onOpenChange={(open) => !open && setConfirmRemoveId(null)}
        title="Remove row?"
        description="This row will be deleted."
        confirmText="Remove"
        cancelText="Cancel"
        variant="delete"
        onConfirm={removeRow}
      />
    </View>
  );
}

type ColumnWidths = { date: number; investigation: number; findings: number };

function ColumnResizer({
  onResize,
  deltaSign,
}: {
  onResize: (delta: number) => void;
  deltaSign: 1 | -1;
}) {
  const lastTranslation = useRef(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      lastTranslation.current = 0;
    })
    .onUpdate((e) => {
      const delta = e.translationX - lastTranslation.current;
      lastTranslation.current = e.translationX;
      if (Math.abs(delta) > 0.5) {
        runOnJS(onResize)(delta * deltaSign);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="w-2 flex-shrink-0 items-center justify-center bg-transparent active:bg-primary/20"
        style={(Platform.OS === 'web' ? { cursor: 'col-resize' as ViewStyle['cursor'] } : undefined)}
      >
        <Icon as={GripHorizontal} size={12} className="text-muted-foreground" />
      </View>
    </GestureDetector>
  );
}

function InvTableHeader({
  columnWidths,
  onColumnResize,
  isTablet,
}: {
  columnWidths: ColumnWidths;
  onColumnResize: React.Dispatch<React.SetStateAction<ColumnWidths>>;
  isTablet: boolean;
}) {
  const resizeDateInvestigation = useCallback(
    (delta: number) => {
      onColumnResize((prev) => {
        const newDate = Math.round(
          Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, prev.date + delta))
        );
        const diff = newDate - prev.date;
        const newInv = Math.round(
          Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, prev.investigation - diff))
        );
        const actualDiff = prev.investigation - newInv;
        return {
          date: prev.date + actualDiff,
          investigation: newInv,
          findings: prev.findings,
        };
      });
    },
    [onColumnResize]
  );

  const resizeInvestigationFindings = useCallback(
    (delta: number) => {
      onColumnResize((prev) => {
        const newInv = Math.round(
          Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, prev.investigation + delta))
        );
        const diff = newInv - prev.investigation;
        const newFind = Math.round(
          Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, prev.findings - diff))
        );
        const actualDiff = prev.findings - newFind;
        return {
          date: prev.date,
          investigation: prev.investigation + actualDiff,
          findings: newFind,
        };
      });
    },
    [onColumnResize]
  );

  if (!isTablet) {
    return (
      <>
        <View className="min-w-0 flex-1 border-r border-border p-2">
          <Text variant="small" className="font-semibold text-foreground">Date</Text>
        </View>
        <View className="min-w-0 flex-1 border-r border-border p-2">
          <Text variant="small" className="font-semibold text-foreground">Investigation</Text>
        </View>
        <View className="min-w-0 flex-1 border-r border-border p-2 last:border-r-0">
          <Text variant="small" className="font-semibold text-foreground">Findings</Text>
        </View>
      </>
    );
  }
  return (
    <>
      <View className="flex-shrink-0 border-r border-border p-2" style={{ width: columnWidths.date }}>
        <Text variant="small" className="font-semibold text-foreground">Date</Text>
      </View>
      <ColumnResizer onResize={resizeDateInvestigation} deltaSign={1} />
      <View className="flex-shrink-0 border-r border-border p-2" style={{ width: columnWidths.investigation }}>
        <Text variant="small" className="font-semibold text-foreground">Investigation</Text>
      </View>
      <ColumnResizer onResize={resizeInvestigationFindings} deltaSign={1} />
      <View className="flex-shrink-0 border-r border-border p-2" style={{ width: columnWidths.findings }}>
        <Text variant="small" className="font-semibold text-foreground">Findings</Text>
      </View>
    </>
  );
}

function InvTableRow({
  row,
  columnWidths,
  height,
  onHeightChange,
  onCellPress,
  onRemove,
  isTablet,
}: {
  row: InvRow;
  columnWidths: ColumnWidths;
  height: number;
  onHeightChange: (height: number) => void;
  onCellPress: (column: 'date' | 'investigation' | 'findings') => void;
  onRemove: () => void;
  isTablet: boolean;
}) {
  const startHeight = useRef(height);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startHeight.current = height;
    })
    .onUpdate((e) => {
      const newHeight = Math.round(
        Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, startHeight.current + e.translationY))
      );
      runOnJS(onHeightChange)(newHeight);
    });

  const rowContent = (
    <View
      className="flex-row"
      style={{ minHeight: height }}
    >
      {COLUMN_KEYS.map((key) =>
        isTablet ? (
          <View key={key} className="flex-shrink-0" style={{ width: columnWidths[key as keyof ColumnWidths] }}>
            <InvCell
              row={row}
              columnKey={key}
              width={columnWidths[key as keyof ColumnWidths]}
              onPress={() => onCellPress(key as 'date' | 'investigation' | 'findings')}
            />
          </View>
        ) : (
          <Pressable
            key={key}
            className="min-w-0 flex-1 justify-center border-r border-border p-2 last:border-r-0 active:bg-muted/50"
            onPress={() => onCellPress(key as 'date' | 'investigation' | 'findings')}
          >
            <InvCell
              row={row}
              columnKey={key}
              width={0}
              onPress={() => onCellPress(key as 'date' | 'investigation' | 'findings')}
            />
          </Pressable>
        )
      )}
      {isTablet && (
        <View
          className="flex-shrink-0 items-center justify-center border-l border-border p-1"
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onPress={onRemove}
          >
            <Icon as={Trash2} size={16} className="text-destructive" />
          </Button>
        </View>
      )}
    </View>
  );

  if (!isTablet) {
    return (
      <Pressable
        className="border-b border-border last:border-b-0 active:opacity-95"
        onLongPress={onRemove}
        delayLongPress={400}
      >
        {rowContent}
      </Pressable>
    );
  }

  return (
    <View className="border-b border-border last:border-b-0">
      {rowContent}
      <GestureDetector gesture={panGesture}>
        <View
          className="h-2 items-center justify-center bg-muted/30 dark:bg-muted/20"
          style={(Platform.OS === 'web' ? { cursor: 'ns-resize' as ViewStyle['cursor'] } : undefined)}
        >
          <Icon as={GripVertical} size={14} className="text-muted-foreground" />
        </View>
      </GestureDetector>
    </View>
  );
}
