import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MobileSafeDialogContent } from '@/components/mobile/MobileSafeDialogContent';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Ball } from '../../backend';
import { getBallsForOver, formatBallsForDisplay } from '../../utils/ballByBallReport';

interface BallByBallReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overNumber: number;
  balls: Ball[];
}

export function BallByBallReportDialog({
  open,
  onOpenChange,
  overNumber,
  balls,
}: BallByBallReportDialogProps) {
  const overBalls = getBallsForOver(balls, overNumber);
  const displayBalls = formatBallsForDisplay(overBalls);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MobileSafeDialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Over {overNumber} - Ball by Ball</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {displayBalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No balls recorded for this over
              </p>
            ) : (
              displayBalls.map((ball) => (
                <div
                  key={ball.ballNumber}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {ball.ballNumber}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{ball.batsmanName}</span>
                      <span className="text-xs text-muted-foreground">
                        vs {ball.bowlerName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={ball.isWicket ? 'destructive' : 'default'}
                      className="text-base font-bold min-w-[3rem] justify-center"
                    >
                      {ball.outcome}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </MobileSafeDialogContent>
    </Dialog>
  );
}
