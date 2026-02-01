import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { hasBedPatientData } from '@/lib/bed-utils';
import type { Bed, DxPlanContent } from '@/lib/types';
import { BedDouble, User } from 'lucide-react-native';
import { Pressable, Image, View } from 'react-native';

export interface BedCardProps {
  bed: Bed;
  onPress: () => void;
  className?: string;
  /** When set, card uses this height so all cells in a row match. */
  cardHeight?: number;
  /** When true, use larger card and icon (tablet). */
  isTablet?: boolean;
}

/** Default card height when no diagnosis preview (mobile). */
export const BED_CARD_HEIGHT_DEFAULT = 80;
/** Card height when row has diagnosis (mobile). */
export const BED_CARD_HEIGHT_WITH_DX = 110;
/** Default card height on tablet – larger for better readability. */
export const BED_CARD_HEIGHT_DEFAULT_TABLET = 104;
/** Card height on tablet when row has diagnosis. */
export const BED_CARD_HEIGHT_WITH_DX_TABLET = 144;

/** Empty canvas PNG base64 is ~100–300 chars; actual drawings are larger. */
const MEANINGFUL_DRAWING_MIN_LENGTH = 400;

function hasDxDrawing(dx: DxPlanContent | undefined): boolean {
  if (!dx?.image?.trim()) return false;
  return dx.image.length >= MEANINGFUL_DRAWING_MIN_LENGTH;
}

function hasDxText(dx: DxPlanContent | undefined): boolean {
  return Boolean(dx?.text?.trim());
}

const ICON_SIZE_MOBILE = 20;
const ICON_SIZE_TABLET = 28;

export function BedCard({ bed, onPress, className, cardHeight, isTablet }: BedCardProps) {
  const hasPatient = hasBedPatientData(bed);
  const dx = bed.patient?.dx;
  const showDxText = hasDxText(dx);
  const showDxDrawing = hasDxDrawing(dx);
  const showDiagnosis = showDxText || showDxDrawing;
  /** If no diagnosis but has other patient data, show user icon. */
  const showUserIcon = hasPatient && !showDiagnosis;

  const height = cardHeight ?? (isTablet ? BED_CARD_HEIGHT_DEFAULT_TABLET : BED_CARD_HEIGHT_DEFAULT);
  const iconSize = isTablet ? ICON_SIZE_TABLET : ICON_SIZE_MOBILE;

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
        style={{ height }}
        className={cn(
          'overflow-hidden rounded-xl border-2 shadow-premium',
          hasPatient
            ? 'border-success/40 bg-success dark:border-success/50 dark:bg-success'
            : 'border-border/70 bg-bed-empty dark:border-border dark:bg-bed-empty'
        )}
      >
        <View
          className={cn(
            'h-full flex-col items-center justify-center px-2',
            isTablet ? 'gap-2' : 'gap-1.5'
          )}
        >
          <Text
            className={cn(
              'tabular-nums font-bold',
              isTablet ? 'text-2xl' : 'text-xl',
              hasPatient
                ? 'text-success-foreground'
                : 'text-bed-empty-foreground dark:text-bed-empty-foreground'
            )}
            numberOfLines={1}
          >
            {bed.number}
          </Text>
          {showDiagnosis ? (
            showDxText ? (
              <Text
                className={cn(
                  'font-bold text-success-foreground text-center',
                  isTablet ? 'text-base' : 'text-sm'
                )}
                numberOfLines={2}
              >
                {dx!.text!.trim()}
              </Text>
            ) : (
              <View
                className={cn(
                  'w-full max-w-full overflow-hidden rounded-lg bg-success-foreground/20 dark:bg-success-foreground/25',
                  isTablet ? 'h-11' : 'h-9'
                )}
              >
                <Image
                  source={{
                    uri: dx!.image!.startsWith('data:')
                      ? dx!.image!
                      : `data:image/png;base64,${dx!.image!}`,
                  }}
                  className="h-full w-full"
                  resizeMode="contain"
                />
              </View>
            )
          ) : (
            <View
              className={cn(
                'rounded-xl',
                isTablet ? 'p-3' : 'p-2',
                showUserIcon
                  ? 'bg-success-foreground/20 dark:bg-success-foreground/25'
                  : 'bg-muted/40 dark:bg-muted/50'
              )}
            >
              <Icon
                as={showUserIcon ? User : BedDouble}
                size={iconSize}
                className={cn(
                  showUserIcon
                    ? 'text-success-foreground'
                    : 'text-muted-foreground dark:text-muted-foreground'
                )}
              />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
