import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { computeOverByOverBreakdown } from '../../utils/overByOverBreakdown';
import { BallByBallReportDialog } from './BallByBallReportDialog';
import type { Ball } from '../../backend';

interface OverByOverBreakdownProps {
  balls: Ball[];
}

export function OverByOverBreakdown({ balls }: OverByOverBreakdownProps) {
  const [selectedOver, setSelectedOver] = useState<number | null>(null);
  const breakdown = computeOverByOverBreakdown(balls);
  
  if (breakdown.length === 0) {
    return null;
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Overs Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] w-full">
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {breakdown.map((over) => (
                <button
                  key={over.overNumber}
                  onClick={() => setSelectedOver(over.overNumber)}
                  className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground font-medium">
                    Over {over.overNumber}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-foreground">
                    {over.runsScored}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <BallByBallReportDialog
        open={selectedOver !== null}
        onOpenChange={(open) => !open && setSelectedOver(null)}
        overNumber={selectedOver || 1}
        balls={balls}
      />
    </>
  );
}
