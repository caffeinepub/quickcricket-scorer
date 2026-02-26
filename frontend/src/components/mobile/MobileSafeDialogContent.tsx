import React from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MobileSafeDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  children: React.ReactNode;
  className?: string;
}

export function MobileSafeDialogContent({ children, className, ...props }: MobileSafeDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        'max-h-[90vh] flex flex-col gap-0 p-0',
        'w-[calc(100%-2rem)] sm:max-w-lg',
        className
      )}
      {...props}
    >
      <div className="overflow-y-auto flex-1 p-6">
        {children}
      </div>
    </DialogContent>
  );
}
