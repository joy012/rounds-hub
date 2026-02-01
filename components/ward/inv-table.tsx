import { Button } from '@/components/ui/button';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { InvCellEditor } from '@/components/ward/inv-cell-editor';
import { ConsentModal } from '@/components/ward/modal-confirmation';
import type { DxPlanContent, InvRow } from '@/lib/types';
import { formatDisplayDate, generateId } from '@/lib/utils';
import { GripHorizontal, GripVertical, Pen, Plus, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 320;
/** Slim column resizer on header border; icon-only, touch area preserved. */
const RESIZER_WIDTH = 28;
/** Slim row resizer strip; icon-only. */
const ROW_RESIZER_MIN_HEIGHT = 28;
/** Default column ratios: first two same, third larger. Sum = 1. */
const DEFAULT_COL_RATIOS = { date: 0.25, investigation: 0.25, findings: 0.5 };
/** Show column/row resizers on all screen sizes (was 600; 0 = always show). */
const TABLET_BREAKPOINT = 0;

export interface InvTableProps {
  rows: InvRow[];
  onChange: (rows: InvRow[]) => void;
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

/** Empty canvas PNG base64 is ~100–300 chars; actual drawings are larger. */
const MEANINGFUL_DRAWING_MIN_LENGTH = 400;

/** Presentational cell content; touch is handled by parent GestureDetector so long-press vs tap work correctly. */
function InvCell({
  row,
  columnKey,
  width,
  isLastColumn,
}: {
  row: InvRow;
  columnKey: string;
  width: number;
  isLastColumn?: boolean;
}) {
  const content = getCellContent(row, columnKey);
  const isDateColumn = columnKey === 'date';
  const hasText = Boolean(content.text?.trim());
  /** Meaningful drawing only (for isEmpty); avoids counting empty canvas as content. */
  const hasMeaningfulDrawing =
    !isDateColumn &&
    Boolean(content.image?.trim() && content.image.length >= MEANINGFUL_DRAWING_MIN_LENGTH);
  /** Any non-empty image (for display); so keyboard text + handwriting both show. */
  const hasAnyImage = !isDateColumn && Boolean(content.image?.trim());
  const displayText = isDateColumn && content.text
    ? formatDisplayDate(content.text)
    : content.text?.trim() || undefined;

  const style = width > 0 ? { width } : { flex: 1 };
  const isEmpty = isDateColumn ? !hasText : !hasText && !hasMeaningfulDrawing;

  return (
    <View
      className={`min-h-10 justify-center p-2 ${isLastColumn ? 'border-r-0' : 'border-r border-border dark:border-border'}`}
      style={style}
    >
      {isEmpty ? (
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
      ) : (
        <View className="gap-1.5">
          {displayText ? (
            <Text
              variant="small"
              className="text-foreground line-clamp-3"
              numberOfLines={3}
            >
              {displayText}
            </Text>
          ) : null}
          {hasAnyImage && content.image ? (
            <View className="aspect-video max-w-full overflow-hidden rounded">
              <Image
                source={{
                  uri: content.image.startsWith('data:')
                    ? content.image
                    : `data:image/png;base64,${content.image}`,
                }}
                className="h-full w-full"
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function InvTable({ rows, onChange }: InvTableProps) {
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
  const [editingDateRowId, setEditingDateRowId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    column: 'investigation' | 'findings';
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

  const updateRow = useCallback(
    (id: string, updates: Partial<InvRow>) => {
      setDraftRows((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

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
    setDraftRows((prev) => {
      const next = [...prev, { id: generateId() }];
      onChange(next);
      return next;
    });
  }, [onChange]);

  const removeRow = useCallback(() => {
    if (!confirmRemoveId) return;
    setDraftRows((prev) => {
      const next = prev.filter((r) => r.id !== confirmRemoveId);
      onChange(next);
      return next;
    });
    setConfirmRemoveId(null);
    Toast.show({ type: 'success', text1: 'Investigation row removed', position: 'top' });
  }, [confirmRemoveId, onChange]);

  const editingRow = useMemo(
    () =>
      editingCell ? draftRows.find((r) => r.id === editingCell.rowId) ?? null : null,
    [editingCell, draftRows]
  );

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
        <Button size="sm" onPress={addRow} className="bg-primary">
          <Icon as={Plus} size={16} />
          <Text variant="small">Add row</Text>
        </Button>
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
                onDateCellPress={() => setEditingDateRowId(row.id)}
                onCellPress={(col) => setEditingCell({ rowId: row.id, column: col })}
                onRemove={() => setConfirmRemoveId(row.id)}
                isTablet={isTablet}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {editingDateRowId !== null && (() => {
        const row = draftRows.find((r) => r.id === editingDateRowId);
        return row ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setEditingDateRowId(null)}
          >
            <View style={styles.datePickerModalRoot}>
              <View
                style={[StyleSheet.absoluteFillObject, styles.datePickerOverlay]}
                pointerEvents="none"
              />
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setEditingDateRowId(null)}
              />
              <View style={styles.datePickerSheetWrap} pointerEvents="box-none">
                <View className="w-[90%] max-w-md rounded-2xl border border-border bg-card shadow-xl dark:border-border dark:bg-card">
                  <View className="flex-row items-center justify-between border-b border-border px-5 py-4 dark:border-border">
                    <Text variant="default" className="font-semibold text-foreground">
                      Investigation date
                    </Text>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onPress={() => setEditingDateRowId(null)}
                      accessibilityLabel="Close"
                    >
                      <Icon as={X} size={20} className="text-muted-foreground" />
                    </Button>
                  </View>
                  <View className="p-5">
                    <Label>
                      <Text variant="small" className="font-medium text-muted-foreground">
                        Select date
                      </Text>
                    </Label>
                    <DatePickerField
                      value={row.date}
                      onChange={(isoDate) => {
                        updateRow(editingDateRowId, { date: isoDate });
                        setEditingDateRowId(null);
                      }}
                      placeholder="Select date"
                      accessibilityLabel="Investigation date"
                    />
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        ) : null;
      })()}

      <InvCellEditor
        open={!!editingCell}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null);
        }}
        row={editingRow ?? draftRows[0] ?? { id: '' }}
        column={editingCell?.column ?? 'investigation'}
        onSave={
          editingCell
            ? (value) => {
              updateCell(editingCell.rowId, editingCell.column, value);
              setEditingCell(null);
            }
            : () => { }
        }
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
        className="flex-shrink-0 items-center justify-center self-stretch border-l border-border dark:border-border"
        style={[
          { width: RESIZER_WIDTH, minWidth: RESIZER_WIDTH },
          Platform.OS === 'web' ? { cursor: 'col-resize' as ViewStyle['cursor'] } : undefined,
        ]}
      >
        <Icon as={GripHorizontal} size={18} className="text-muted-foreground/80" />
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
  onDateCellPress,
  onCellPress,
  onRemove,
  isTablet,
}: {
  row: InvRow;
  tableWidth: number;
  columnRatios: ColumnRatios;
  height: number;
  onHeightChange: (height: number) => void;
  onDateCellPress: () => void;
  onCellPress: (column: 'investigation' | 'findings') => void;
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
          runOnJS(onDateCellPress)();
        }),
    [longPressGesture, onDateCellPress]
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

  const rowContent = isTablet ? (
    <View
      className="flex-row"
      style={{ minHeight: height }}
    >
      {COLUMN_KEYS.map((key, index) => {
        const tapGesture = tapGestures[key as keyof typeof tapGestures];
        const colWidth = colWidths[key as keyof typeof colWidths];
        const isLast = key === 'findings';
        return (
          <View key={key} className="flex-row flex-shrink-0">
            <GestureDetector gesture={tapGesture}>
              <View className="flex-shrink-0 active:bg-muted/50" style={{ width: colWidth }}>
                <InvCell
                  row={row}
                  columnKey={key}
                  width={colWidth}
                  isLastColumn={isLast}
                />
              </View>
            </GestureDetector>
            {index < COLUMN_KEYS.length - 1 ? (
              <View
                className="flex-shrink-0 border-l border-border dark:border-border"
                style={{ width: RESIZER_WIDTH, minWidth: RESIZER_WIDTH }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  ) : (
    <View
      className="flex-row"
      style={{ minHeight: height }}
    >
      {COLUMN_KEYS.map((key) => {
        const tapGesture = tapGestures[key as keyof typeof tapGestures];
        return (
          <GestureDetector key={key} gesture={tapGesture}>
            <View className="min-w-0 flex-1 active:bg-muted/50">
              <InvCell
                row={row}
                columnKey={key}
                width={0}
                isLastColumn={key === 'findings'}
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
    <View className="border-b border-border last:border-b-0">
      <GestureDetector gesture={longPressGesture}>
        <View>{rowContent}</View>
      </GestureDetector>
      <GestureDetector gesture={panGesture}>
        <View
          className="items-center justify-center border-t border-border dark:border-border"
          style={[
            { minHeight: ROW_RESIZER_MIN_HEIGHT },
            Platform.OS === 'web' ? { cursor: 'ns-resize' as ViewStyle['cursor'] } : undefined,
          ]}
        >
          <Icon as={GripVertical} size={18} className="text-muted-foreground/80" />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  datePickerModalRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  datePickerSheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
