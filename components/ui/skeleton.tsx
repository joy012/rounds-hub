import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View
      className={cn('rounded-md bg-primary/10 animate-pulse-soft', className)}
      {...props}
    />
  );
}

export { Skeleton };
