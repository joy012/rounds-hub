import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { InvCellEditor } from '@/components/ward/inv-cell-editor';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { GripHorizontal, GripVertical, Pen, Plus, Save } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 320;
/** Column resizer touch area width; min ~44pt for reliable touch. */
const RESIZER_WIDTH = 44;
/** Row resizer strip min height for reliable touch. */
const ROW_RESIZER_MIN_HEIGHT = 44;
/** Default column ratios: first two same, third larger. Sum = 1. */
const DEFAULT_COL_RATIOS = { date: 0.25, investigation: 0.25, findings: 0.5 };
/** Show column/row resizers on all screen sizes (was 600; 0 = always show). */
const TABLET_BREAKPOINT = 0;

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

/** Presentational cell content; touch is handled by parent GestureDetector so long-press vs tap work correctly. */
function InvCell({
  row,
  columnKey,
  width,
}: {
  row: InvRow;
  columnKey: string;
  width: number;
}) {
  const content = getCellContent(row, columnKey);

  const style = width > 0 ? { width } : { flex: 1 };

  return (
    <View
      className="min-h-10 justify-center border-r border-border p-2 last:border-r-0"
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
    </View>
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
    Toast.show({ type: 'success', text1: 'Investigation row removed', position: 'top' });
  }, [confirmRemoveId]);

  const handleSave = useCallback(() => {
    onChange(draftRows);
    Toast.show({ type: 'success', text1: 'Investigations table saved', position: 'top' });
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
            : () => { }
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
        className="flex-shrink-0 items-center justify-center self-stretch border-l border-r border-border bg-muted/40 dark:bg-muted/30"
        style={[
          { width: RESIZER_WIDTH, minWidth: RESIZER_WIDTH },
          Platform.OS === 'web' ? { cursor: 'col-resize' as ViewStyle['cursor'] } : undefined,
        ]}
      >
        <View className="rounded-lg border-2 border-border bg-background px-2 py-3 dark:border-muted-foreground/40 dark:bg-muted/50">
          <Icon as={GripHorizontal} size={26} className="text-muted-foreground" />
        </View>
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

  /** Resize only Date and Investigation; Findings ratio unchanged so its column doesn't move. */
  const resizeDateInvestigation = useCallback(
    (deltaPx: number) => {
      onColumnRatiosChange((prev) => {
        const minR = MIN_COL_WIDTH / contentWidth;
        const maxR = MAX_COL_WIDTH / contentWidth;
        const deltaR = deltaPx / contentWidth;
        const pairSum = prev.date + prev.investigation;
        const low = Math.max(minR, pairSum - maxR);
        const high = Math.min(maxR, pairSum - minR);
        const newDate = Math.max(low, Math.min(high, prev.date + deltaR));
        const newInv = pairSum - newDate;
        return {
          date: newDate,
          investigation: newInv,
          findings: prev.findings,
        };
      });
    },
    [onColumnRatiosChange, contentWidth]
  );

  /** Resize only Investigation and Findings; Date ratio unchanged. */
  const resizeInvestigationFindings = useCallback(
    (deltaPx: number) => {
      onColumnRatiosChange((prev) => {
        const minR = MIN_COL_WIDTH / contentWidth;
        const maxR = MAX_COL_WIDTH / contentWidth;
        const deltaR = deltaPx / contentWidth;
        const pairSum = prev.investigation + prev.findings;
        const low = Math.max(minR, pairSum - maxR);
        const high = Math.min(maxR, pairSum - minR);
        const newInv = Math.max(low, Math.min(high, prev.investigation + deltaR));
        const newFind = pairSum - newInv;
        return {
          date: prev.date,
          investigation: newInv,
          findings: newFind,
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
    <View className="flex-row border-b border-border bg-primary/10 dark:bg-primary/15">
      <View className="flex-shrink-0 border-r border-border p-2" style={{ width: dateW }}>
        <Text variant="small" className="font-semibold text-foreground">Date</Text>
      </View>
      <ColumnResizer onResize={resizeDateInvestigation} deltaSign={1} />
      <View className="flex-shrink-0 border-r border-border p-2" style={{ width: invW }}>
        <Text variant="small" className="font-semibold text-foreground">Investigation</Text>
      </View>
      <ColumnResizer onResize={resizeInvestigationFindings} deltaSign={1} />
      <View className="flex-shrink-0 border-r border-border p-2 last:border-r-0" style={{ width: findingsW }}>
        <Text variant="small" className="font-semibold text-foreground">Findings</Text>
      </View>
    </View>
  );
}

const LONG_PRESS_DURATION_MS = 450;
const TAP_MAX_DURATION_MS = 350;

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

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(LONG_PRESS_DURATION_MS)
        .onStart(() => {
          runOnJS(onRemove)();
        }),
    [onRemove]
  );

  const tapDate = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(TAP_MAX_DURATION_MS)
        .requireExternalGestureToFail(longPressGesture)
        .onEnd(() => {
          runOnJS(onCellPress)('date');
        }),
    [longPressGesture, onCellPress]
  );
  const tapInvestigation = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(TAP_MAX_DURATION_MS)
        .requireExternalGestureToFail(longPressGesture)
        .onEnd(() => {
          runOnJS(onCellPress)('investigation');
        }),
    [longPressGesture, onCellPress]
  );
  const tapFindings = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(TAP_MAX_DURATION_MS)
        .requireExternalGestureToFail(longPressGesture)
        .onEnd(() => {
          runOnJS(onCellPress)('findings');
        }),
    [longPressGesture, onCellPress]
  );

  const tapGestures = useMemo(
    () => ({ date: tapDate, investigation: tapInvestigation, findings: tapFindings }),
    [tapDate, tapInvestigation, tapFindings]
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
      {COLUMN_KEYS.map((key) => {
        const tapGesture = tapGestures[key as keyof typeof tapGestures];
        return isTablet ? (
          <GestureDetector key={key} gesture={tapGesture}>
            <View className="flex-shrink-0 active:bg-muted/50" style={{ width: colWidths[key as keyof typeof colWidths] }}>
              <InvCell
                row={row}
                columnKey={key}
                width={colWidths[key as keyof typeof colWidths]}
              />
            </View>
          </GestureDetector>
        ) : (
          <GestureDetector key={key} gesture={tapGesture}>
            <View className="min-w-0 flex-1 active:bg-muted/50">
              <InvCell
                row={row}
                columnKey={key}
                width={0}
              />
            </View>
          </GestureDetector>
        );
      })}
    </View>
  );

  if (!isTablet) {
    return (
      <GestureDetector gesture={longPressGesture}>
        <View className="border-b border-border last:border-b-0">
          {rowContent}
        </View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={longPressGesture}>
      <View className="border-b border-border last:border-b-0">
        {rowContent}
        <GestureDetector gesture={panGesture}>
          <View
            className="items-center justify-center border-t border-border bg-muted/40 dark:bg-muted/30"
            style={[
              { minHeight: ROW_RESIZER_MIN_HEIGHT },
              Platform.OS === 'web' ? { cursor: 'ns-resize' as ViewStyle['cursor'] } : undefined,
            ]}
          >
            <View className="rounded-lg border-2 border-border bg-background px-3 py-2 dark:border-muted-foreground/40 dark:bg-muted/50">
              <Icon as={GripVertical} size={22} className="text-muted-foreground" />
            </View>
          </View>
        </GestureDetector>
      </View>
    </GestureDetector>
  );
}
