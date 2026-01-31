import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';
import { cn, formatDisplayDate } from '@/lib/utils';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(str: string | undefined): Date | undefined {
  if (!str || !ISO_DATE_REGEX.test(str)) return undefined;
  const d = new Date(str + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DatePickerFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  /** Accessible label (not visually shown; use with Label outside) */
  accessibilityLabel?: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  accessibilityLabel,
}: DatePickerFieldProps) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const [open, setOpen] = useState(false);

  const date = useMemo(
    () => parseISODate(value) ?? new Date(),
    [value]
  );

  const displayText = value ? formatDisplayDate(value) : '';

  const handleNativeChange = useCallback(
    (_: unknown, selected?: Date) => {
      if (selected) {
        onChange(toISODate(selected));
        setOpen(false);
      }
    },
    [onChange]
  );

  const handleOpenPicker = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        display: 'default',
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) onChange(toISODate(selected));
        },
      });
      return;
    }
    setOpen(true);
  }, [date, onChange]);

  const handleWebChangeText = useCallback(
    (raw: string) => {
      if (!raw.trim()) {
        onChange(undefined);
        return;
      }
      if (ISO_DATE_REGEX.test(raw)) onChange(raw);
    },
    [onChange]
  );

  if (Platform.OS === 'web') {
    return (
      <View className="relative flex-1">
        <TextInput
          accessibilityLabel={accessibilityLabel}
          value={value ?? ''}
          onChangeText={handleWebChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedForeground}
          className={cn(
            'border-input bg-background text-foreground h-10 w-full min-w-0 rounded-md border px-3 py-2 pl-9 text-base shadow-sm sm:h-9',
            'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20',
            className
          )}
          // @ts-expect-error - type="date" on web opens native date picker
          type="date"
        />
        <View
          className="absolute left-3 top-0 h-10 w-6 items-center justify-center sm:h-9"
          pointerEvents="none"
        >
          <Icon as={Calendar} size={16} className="text-muted-foreground" />
        </View>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={handleOpenPicker}
        className={cn(
          'border-input bg-background flex h-10 min-w-0 flex-row items-center rounded-md border px-3 py-2 shadow-sm sm:h-9',
          className
        )}
      >
        <Icon as={Calendar} size={16} className="mr-2 text-muted-foreground" />
        <Text
          variant="default"
          className={displayText ? 'text-foreground' : 'text-muted-foreground'}
          numberOfLines={1}
        >
          {displayText || placeholder}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide">
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setOpen(false)}
          >
            <Pressable
              className="rounded-t-2xl bg-card p-4"
              onPress={(e) => e.stopPropagation()}
            >
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleNativeChange}
                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
