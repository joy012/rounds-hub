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
import { GripHorizontal, GripVertical, Pen, Plus, Save } from 'lucide-react-native';

const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 320;
const RESIZER_WIDTH = 8;
/** Default column ratios: first two same, third larger. Sum = 1. */
const DEFAULT_COL_RATIOS = { date: 0.25, investigation: 0.25, findings: 0.5 };
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
          <Text variant="small" className="text-muted-foreground" numberOfLines={2}>
            {columnKey === 'date'
              ? 'No date added'
              : columnKey === 'investigation'
                ? 'No investigation added'
                : 'No findings added'}
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
  const [columnRatios, setColumnRatios] = useState(DEFAULT_COL_RATIOS);
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
          <Text variant="small" className="mt-0.5 text-xs text-muted-foreground">
            Long-press a row to remove it
          </Text>
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
      <View
        className="w-full overflow-hidden rounded-xl border border-border dark:border-border"
        style={isTablet ? { width: '100%' } : undefined}
      >
        <ScrollView
          horizontal={!isTablet}
          showsHorizontalScrollIndicator={false}
          style={!isTablet ? { width: '100%' } : undefined}
        >
          <View style={{ width, minWidth: width }} className="w-full">
            <InvTableHeader
              tableWidth={width}
              columnRatios={columnRatios}
              onColumnRatiosChange={setColumnRatios}
              isTablet={isTablet}
            />
            {draftRows.map((row) => (
              <InvTableRow
                key={row.id}
                row={row}
                tableWidth={width}
                columnRatios={columnRatios}
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
      </View>

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

type ColumnRatios = { date: number; investigation: number; findings: number };

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
  tableWidth,
  columnRatios,
  onColumnRatiosChange,
  isTablet,
}: {
  tableWidth: number;
  columnRatios: ColumnRatios;
  onColumnRatiosChange: React.Dispatch<React.SetStateAction<ColumnRatios>>;
  isTablet: boolean;
}) {
  const contentWidth = tableWidth - 2 * RESIZER_WIDTH;
  const toPx = useCallback(
    (ratio: number) => Math.round(contentWidth * ratio),
    [contentWidth]
  );

  const resizeDateInvestigation = useCallback(
    (deltaPx: number) => {
      onColumnRatiosChange((prev) => {
        const minR = MIN_COL_WIDTH / contentWidth;
        const maxR = MAX_COL_WIDTH / contentWidth;
        const deltaR = deltaPx / contentWidth;
        let newDate = prev.date + deltaR;
        let newInv = prev.investigation - deltaR;
        newDate = Math.min(maxR, Math.max(minR, newDate));
        newInv = Math.min(maxR, Math.max(minR, newInv));
        const sum = newDate + newInv + prev.findings;
        return {
          date: newDate / sum,
          investigation: newInv / sum,
          findings: prev.findings / sum,
        };
      });
    },
    [onColumnRatiosChange, contentWidth]
  );

  const resizeInvestigationFindings = useCallback(
    (deltaPx: number) => {
      onColumnRatiosChange((prev) => {
        const minR = MIN_COL_WIDTH / contentWidth;
        const maxR = MAX_COL_WIDTH / contentWidth;
        const deltaR = deltaPx / contentWidth;
        let newInv = prev.investigation + deltaR;
        let newFind = prev.findings - deltaR;
        newInv = Math.min(maxR, Math.max(minR, newInv));
        newFind = Math.min(maxR, Math.max(minR, newFind));
        const sum = prev.date + newInv + newFind;
        return {
          date: prev.date / sum,
          investigation: newInv / sum,
          findings: newFind / sum,
        };
      });
    },
    [onColumnRatiosChange, contentWidth]
  );

  if (!isTablet) {
    return (
      <View className="flex-row border-b border-border bg-primary/10 dark:bg-primary/15">
        <View className="min-w-0 flex-1 border-r border-border p-2">
          <Text variant="small" className="font-semibold text-foreground">Date</Text>
        </View>
        <View className="min-w-0 flex-1 border-r border-border p-2">
          <Text variant="small" className="font-semibold text-foreground">Investigation</Text>
        </View>
        <View className="min-w-0 flex-1 border-r border-border p-2 last:border-r-0">
          <Text variant="small" className="font-semibold text-foreground">Findings</Text>
        </View>
      </View>
    );
  }

  const dateW = toPx(columnRatios.date);
  const invW = toPx(columnRatios.investigation);
  const findingsW = toPx(columnRatios.findings);

  return (
    <>
      {/* Resizer row: on top of header so header text doesn't break */}
      <View className="flex-row border-b border-border bg-muted/30 dark:bg-muted/20">
        <View style={{ width: dateW }} className="flex-shrink-0" />
        <ColumnResizer onResize={resizeDateInvestigation} deltaSign={1} />
        <View style={{ width: invW }} className="flex-shrink-0" />
        <ColumnResizer onResize={resizeInvestigationFindings} deltaSign={1} />
        <View style={{ width: findingsW }} className="flex-shrink-0" />
      </View>
      {/* Header row: column labels only */}
      <View className="flex-row border-b border-border bg-primary/10 dark:bg-primary/15">
        <View className="flex-shrink-0 border-r border-border p-2" style={{ width: dateW }}>
          <Text variant="small" className="font-semibold text-foreground">Date</Text>
        </View>
        <View className="flex-shrink-0 border-r border-border p-2" style={{ width: invW }}>
          <Text variant="small" className="font-semibold text-foreground">Investigation</Text>
        </View>
        <View className="flex-shrink-0 border-r border-border p-2 last:border-r-0" style={{ width: findingsW }}>
          <Text variant="small" className="font-semibold text-foreground">Findings</Text>
        </View>
      </View>
    </>
  );
}

function InvTableRow({
  row,
  tableWidth,
  columnRatios,
  height,
  onHeightChange,
  onCellPress,
  onRemove,
  isTablet,
}: {
  row: InvRow;
  tableWidth: number;
  columnRatios: ColumnRatios;
  height: number;
  onHeightChange: (height: number) => void;
  onCellPress: (column: 'date' | 'investigation' | 'findings') => void;
  onRemove: () => void;
  isTablet: boolean;
}) {
  const startHeight = useRef(height);
  const contentWidth = tableWidth - 2 * RESIZER_WIDTH;
  const colWidths = useMemo(
    () => ({
      date: Math.round(contentWidth * columnRatios.date),
      investigation: Math.round(contentWidth * columnRatios.investigation),
      findings: Math.round(contentWidth * columnRatios.findings),
    }),
    [contentWidth, columnRatios]
  );

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
          <View key={key} className="flex-shrink-0" style={{ width: colWidths[key as keyof typeof colWidths] }}>
            <InvCell
              row={row}
              columnKey={key}
              width={colWidths[key as keyof typeof colWidths]}
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
    <Pressable
      className="border-b border-border last:border-b-0"
      onLongPress={onRemove}
      delayLongPress={400}
    >
      {rowContent}
      <GestureDetector gesture={panGesture}>
        <View
          className="h-2 items-center justify-center bg-muted/30 dark:bg-muted/20"
          style={(Platform.OS === 'web' ? { cursor: 'ns-resize' as ViewStyle['cursor'] } : undefined)}
        >
          <Icon as={GripVertical} size={14} className="text-muted-foreground" />
        </View>
      </GestureDetector>
    </Pressable>
  );
}
