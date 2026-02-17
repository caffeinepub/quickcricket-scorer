import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteMatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLocalOnly: boolean;
  isOnline: boolean;
  matchTitle: string;
}

export default function DeleteMatchConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLocalOnly,
  isOnline,
  matchTitle,
}: DeleteMatchConfirmDialogProps) {
  const willDeleteFromBackend = !isLocalOnly && isOnline;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Match?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{matchTitle}</strong>?
            </p>
            <p>This match will be removed from this device.</p>
            {willDeleteFromBackend && (
              <p className="text-amber-600 font-medium">
                Since you're online and this match is synced, it will also be deleted from the backend canister.
              </p>
            )}
            {isLocalOnly && (
              <p className="text-muted-foreground text-sm">
                This is a local-only match and will only be removed from this device.
              </p>
            )}
            <p className="font-semibold">This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete Match
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
