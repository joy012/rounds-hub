import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import * as React from 'react';

export type ConsentVariant = 'info' | 'warning' | 'delete';

export interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConsentVariant;
  onConfirm: () => void | Promise<void>;
}

const variantToButtonVariant = {
  info: 'info' as const,
  warning: 'warning' as const,
  delete: 'destructive' as const,
};

export function ConsentModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
}: ConsentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const buttonVariant = variantToButtonVariant[variant];

  const handleConfirm = React.useCallback(async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>{title}</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>{description}</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={cn('flex-row flex-nowrap justify-end gap-2')}>
          <AlertDialogCancel disabled={loading}>
            <Text>{cancelText}</Text>
          </AlertDialogCancel>
          <Button
            variant={buttonVariant}
            onPress={handleConfirm}
            disabled={loading}>
            <Text>{confirmText}</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** @deprecated Use ConsentModal with variant="delete" or variant="info" instead */
export function ModalConfirmation(
  props: Omit<ConsentModalProps, 'variant'> & {
    variant?: ConsentVariant | 'default' | 'destructive';
  }
) {
  const { variant = 'info', ...rest } = props;
  const mappedVariant: ConsentVariant =
    variant === 'destructive' ? 'delete' : variant === 'info' || variant === 'warning' ? variant : 'info';
  return <ConsentModal {...rest} variant={mappedVariant} />;
}
