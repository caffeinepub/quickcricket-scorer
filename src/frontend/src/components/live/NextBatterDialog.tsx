import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MobileSafeDialogContent } from '@/components/mobile/MobileSafeDialogContent';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import type { Player } from '../../backend';

interface NextBatterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibleBatters: Player[];
  onConfirm: (player: Player) => void;
  selectedBatter: Player | null;
  onSelectBatter: (player: Player) => void;
}

export function NextBatterDialog({
  open,
  onOpenChange,
  eligibleBatters,
  onConfirm,
  selectedBatter,
  onSelectBatter,
}: NextBatterDialogProps) {
  const isAllOut = eligibleBatters.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MobileSafeDialogContent>
        <DialogHeader>
          <DialogTitle>{isAllOut ? 'All Out' : 'Select Next Batter'}</DialogTitle>
          <DialogDescription>
            {isAllOut
              ? 'No more batters available. The innings is complete.'
              : 'Choose the next batter to continue scoring.'}
          </DialogDescription>
        </DialogHeader>
        {!isAllOut && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Next Batter</Label>
              <Select
                value={selectedBatter?.id.toString() || ''}
                onValueChange={(id) => {
                  const player = eligibleBatters.find((p) => p.id.toString() === id);
                  if (player) onSelectBatter(player);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select next batter" />
                </SelectTrigger>
                <MobileSafeSelectContent>
                  {eligibleBatters.map((player) => (
                    <SelectItem key={player.id.toString()} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
                </MobileSafeSelectContent>
              </Select>
            </div>
          </div>
        )}
        {isAllOut && (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              All batters have been dismissed or are currently batting.
            </p>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isAllOut && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedBatter) {
                    onConfirm(selectedBatter);
                  }
                }}
                disabled={!selectedBatter}
                className="w-full sm:w-auto"
              >
                Confirm
              </Button>
            </>
          )}
          {isAllOut && (
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Close
            </Button>
          )}
        </DialogFooter>
      </MobileSafeDialogContent>
    </Dialog>
  );
}
