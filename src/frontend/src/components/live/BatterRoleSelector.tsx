import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import type { Player } from '../../backend';
import { MobileSafeSelectContent } from '../mobile/MobileSafeSelectContent';

interface BatterRoleSelectorProps {
  label: string;
  players: Player[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  disabled?: boolean;
  errorMessage?: string;
}

export default function BatterRoleSelector({
  label,
  players,
  selectedPlayer,
  onSelectPlayer,
  disabled = false,
  errorMessage,
}: BatterRoleSelectorProps) {
  const handleValueChange = (playerId: string) => {
    const player = players.find((p) => p.id.toString() === playerId);
    if (player) {
      onSelectPlayer(player);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`select-${label}`}>{label}</Label>
      <Select
        value={selectedPlayer?.id.toString() || ''}
        onValueChange={handleValueChange}
        disabled={disabled || players.length === 0}
      >
        <SelectTrigger id={`select-${label}`} className="w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <MobileSafeSelectContent>
          {players.map((player) => (
            <SelectItem key={player.id.toString()} value={player.id.toString()}>
              {player.name}
            </SelectItem>
          ))}
        </MobileSafeSelectContent>
      </Select>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      {players.length === 0 && !errorMessage && (
        <p className="text-sm text-muted-foreground">No eligible players available</p>
      )}
    </div>
  );
}
