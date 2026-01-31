import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { getBedDataIndicators, hasBedPatientData } from '@/lib/bed-utils';
import type { Bed } from '@/lib/types';
import {
  BedDouble,
  ClipboardList,
  FileText,
  Stethoscope,
  User,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export interface BedCardProps {
  bed: Bed;
  onPress: () => void;
  className?: string;
}

const INDICATOR_CONFIG = [
  { key: 'name' as const, label: 'Pt', Icon: User, color: 'text-info' },
  { key: 'dx' as const, label: 'Dx', Icon: Stethoscope, color: 'text-primary' },
  { key: 'plan' as const, label: 'Pl', Icon: FileText, color: 'text-success' },
  { key: 'inv' as const, label: 'Inv', Icon: ClipboardList, color: 'text-warning' },
] as const;

export function BedCard({ bed, onPress, className }: BedCardProps) {
  const hasData = hasBedPatientData(bed);
  const indicators = getBedDataIndicators(bed);

  return (
    <Pressable
      onPress={onPress}
      className={cn('min-w-0', className)}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <View
        className={cn(
          'min-h-[72px] overflow-hidden rounded-xl border shadow-premium',
          hasData
            ? 'border-primary/30 bg-primary/8 dark:border-primary/40 dark:bg-primary/12'
            : 'border-border/80 bg-bed-empty dark:border-border dark:bg-bed-empty'
        )}
      >
        {/* Column: number → icon → info (responsive, no overflow) */}
        <View className="flex-1 flex-col items-stretch justify-center gap-2 px-3 py-3">
          {/* 1. Number */}
          <Text
            className={cn(
              'text-base font-bold tabular-nums',
              hasData ? 'text-primary' : 'text-bed-empty-foreground dark:text-bed-empty-foreground'
            )}
            numberOfLines={1}
          >
            {bed.number}
          </Text>
          {/* 2. Icon */}
          <View
            className={cn(
              'self-start rounded-lg p-2',
              hasData
                ? 'bg-primary/20 dark:bg-primary/25'
                : 'bg-muted/40 dark:bg-muted/50'
            )}
          >
            <Icon
              as={hasData ? User : BedDouble}
              size={22}
              className={hasData ? 'text-primary' : 'text-muted-foreground'}
            />
          </View>
          {/* 3. Info: Empty or indicators (wraps, fully visible) */}
          <View className="min-w-0 flex-row flex-wrap items-center gap-1">
            {!hasData ? (
              <Text
                variant="small"
                className="text-xs font-medium text-muted-foreground"
                numberOfLines={1}
              >
                Empty
              </Text>
            ) : (
              INDICATOR_CONFIG.map(
                ({ key, label, Icon: IndIcon, color }) =>
                  indicators[key] && (
                    <View
                      key={key}
                      className={cn(
                        'flex-row items-center gap-1 rounded-md px-1.5 py-0.5',
                        key === 'name' && 'bg-info/25',
                        key === 'dx' && 'bg-primary/25',
                        key === 'plan' && 'bg-success/25',
                        key === 'inv' && 'bg-warning/25'
                      )}
                    >
                      <Icon as={IndIcon} size={11} className={cn(color)} />
                      <Text variant="small" className={cn('text-[10px] font-semibold', color)}>
                        {label}
                      </Text>
                    </View>
                  )
              )
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
