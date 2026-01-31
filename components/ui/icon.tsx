import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';

/**
 * Icon wrapper: use icons from lucide-react-native.
 * Use: <Icon as={SomeIcon} size={18} /> with icons imported from 'lucide-react-native'.
 */
type IconProps = LucideProps & {
  as: LucideIcon;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
    },
  },
});

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 * When inside a Button, inherits the button's text color (e.g. white on primary/destructive).
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 14).
 */
function Icon({ as: IconComponent, className, size = 14, ...props }: IconProps) {
  const buttonTextClass = React.useContext(TextClassContext);
  return (
    <IconImpl
      as={IconComponent}
      className={cn(buttonTextClass ?? 'text-foreground', className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
