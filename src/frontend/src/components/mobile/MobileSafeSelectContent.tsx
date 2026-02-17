import React from 'react';
import { SelectContent } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MobileSafeSelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectContent> {
  children: React.ReactNode;
  className?: string;
}

export function MobileSafeSelectContent({ children, className, ...props }: MobileSafeSelectContentProps) {
  return (
    <SelectContent
      className={cn('max-h-[60vh] overflow-y-auto', className)}
      {...props}
    >
      {children}
    </SelectContent>
  );
}
