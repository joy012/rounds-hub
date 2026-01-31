import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { hasBedPatientData } from '@/lib/bed-utils';
import type { Bed } from '@/lib/types';
import { BedDouble, User } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export interface BedCardProps {
  bed: Bed;
  onPress: () => void;
  className?: string;
}

/** Fixed height so all bed cells in a row are the same size. */
const CARD_HEIGHT = 80;

export function BedCard({ bed, onPress, className }: BedCardProps) {
  const hasPatient = hasBedPatientData(bed);

  return (
    <Pressable
      onPress={onPress}
      className={cn('min-w-0', className)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.94 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{ height: CARD_HEIGHT }}
        className={cn(
          'overflow-hidden rounded-xl border-2 shadow-premium',
          hasPatient
            ? 'border-success/40 bg-success dark:border-success/50 dark:bg-success'
            : 'border-border/70 bg-bed-empty dark:border-border dark:bg-bed-empty'
        )}
      >
        <View className="h-full flex-col items-center justify-center gap-2 px-2">
          <Text
            className={cn(
              'text-base font-bold tabular-nums',
              hasPatient
                ? 'text-success-foreground'
                : 'text-bed-empty-foreground dark:text-bed-empty-foreground'
            )}
            numberOfLines={1}
          >
            {bed.number}
          </Text>
          <View
            className={cn(
              'rounded-lg p-2',
              hasPatient
                ? 'bg-success-foreground/20 dark:bg-success-foreground/25'
                : 'bg-muted/40 dark:bg-muted/50'
            )}
          >
            <Icon
              as={hasPatient ? User : BedDouble}
              size={20}
              className={cn(
                hasPatient
                  ? 'text-success-foreground'
                  : 'text-muted-foreground dark:text-muted-foreground'
              )}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
