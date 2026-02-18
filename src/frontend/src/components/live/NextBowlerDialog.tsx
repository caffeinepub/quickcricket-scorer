import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MobileSafeDialogContent } from '@/components/mobile/MobileSafeDialogContent';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import type { Player } from '../../backend';

interface NextBowlerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bowlers: Player[];
  onConfirm: (bowler: Player) => void;
  selectedBowler: Player | null;
  onSelectBowler: (bowler: Player) => void;
}

export function NextBowlerDialog({
  open,
  onOpenChange,
  bowlers,
  onConfirm,
  selectedBowler,
  onSelectBowler,
}: NextBowlerDialogProps) {
  const handleConfirm = () => {
    if (!selectedBowler) {
      return;
    }
    onConfirm(selectedBowler);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MobileSafeDialogContent>
        <DialogHeader>
          <DialogTitle>Select Next Bowler</DialogTitle>
          <DialogDescription>
            The over is complete. Choose the bowler for the next over.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Next Bowler</Label>
            <Select
              value={selectedBowler?.id.toString() || ''}
              onValueChange={(id) => {
                const bowler = bowlers.find((p) => p.id.toString() === id);
                if (bowler) onSelectBowler(bowler);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bowler from roster" />
              </SelectTrigger>
              <MobileSafeSelectContent>
                {bowlers.map((player) => (
                  <SelectItem key={player.id.toString()} value={player.id.toString()}>
                    {player.name}
                  </SelectItem>
                ))}
              </MobileSafeSelectContent>
            </Select>
          </div>
          {!selectedBowler && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Please select a bowler to continue
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!selectedBowler}
            className="w-full sm:w-auto"
          >
            Confirm Bowler
          </Button>
        </DialogFooter>
      </MobileSafeDialogContent>
    </Dialog>
  );
}
