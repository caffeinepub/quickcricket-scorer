import { Select, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { MobileSafeSelectContent } from '@/components/mobile/MobileSafeSelectContent';
import { Label } from '@/components/ui/label';
import type { Player } from '../../backend';

interface BatterRoleSelectorProps {
  label: string;
  value: Player | null;
  onChange: (player: Player) => void;
  players: Player[];
  disabled?: boolean;
  placeholder?: string;
}

export function BatterRoleSelector({
  label,
  value,
  onChange,
  players,
  disabled = false,
  placeholder = 'Select batter',
}: BatterRoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value?.id.toString() || ''}
        onValueChange={(id) => {
          const player = players.find((p) => p.id.toString() === id);
          if (player) onChange(player);
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <MobileSafeSelectContent>
          {players.map((player) => (
            <SelectItem key={player.id.toString()} value={player.id.toString()}>
              {player.name}
            </SelectItem>
          ))}
        </MobileSafeSelectContent>
      </Select>
    </div>
  );
}
