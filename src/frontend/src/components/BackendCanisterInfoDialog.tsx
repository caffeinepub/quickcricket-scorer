import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Server, Smartphone, WifiOff } from 'lucide-react';

interface BackendCanisterInfoDialogProps {
  children?: React.ReactNode;
}

export default function BackendCanisterInfoDialog({ children }: BackendCanisterInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            What is a Backend Canister?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Information about backend canisters and offline functionality
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <Server className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Backend Canister</h4>
              <p className="text-muted-foreground">
                A canister is your app's backend running on the Internet Computer blockchain. It stores your
                matches securely in the cloud.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Smartphone className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Offline Mode</h4>
              <p className="text-muted-foreground">
                When offline, the app automatically saves all your matches on your device. You can score matches
                anytime, anywhere.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">"Backend unavailable"</h4>
              <p className="text-muted-foreground">
                This means the app cannot reach the backend canister right now. Don't worry—everything is saved
                locally on your device and you can continue scoring.
              </p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Future option:</strong> We may add automatic sync to upload your offline matches to the
              backend when you're back online.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
