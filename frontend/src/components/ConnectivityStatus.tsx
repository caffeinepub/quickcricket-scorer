import { useConnectivity } from '../hooks/useConnectivity';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import BackendCanisterInfoDialog from './BackendCanisterInfoDialog';

export default function ConnectivityStatus() {
  const { isOnline, offlineReason } = useConnectivity();

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
        <BackendCanisterInfoDialog />
      </div>
    );
  }

  // Determine offline reason text
  let reasonText = 'Offline';
  if (offlineReason === 'network-down') {
    reasonText = 'No network';
  } else if (offlineReason === 'backend-unavailable') {
    reasonText = 'Backend unavailable';
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
        <WifiOff className="h-3 w-3" />
        {reasonText} - Saving locally
      </Badge>
      <BackendCanisterInfoDialog />
    </div>
  );
}
