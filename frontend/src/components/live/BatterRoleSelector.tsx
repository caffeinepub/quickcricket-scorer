import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSafeSelectContent } from '../mobile/MobileSafeSelectContent';
import { SelectItem } from '@/components/ui/select';
import type { Player } from '../../backend';

interface BatterRoleSelectorProps {
  label: string;
  players: Player[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player | null) => void;
  disabled?: boolean;
  error?: string;
}

export function BatterRoleSelector({
  label,
  players,
  selectedPlayer,
  onSelectPlayer,
  disabled = false,
  error,
}: BatterRoleSelectorProps) {
  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onSelectPlayer(null);
    } else {
      const playerId = BigInt(value);
      const player = players.find((p) => p.id === playerId);
      onSelectPlayer(player || null);
    }
  };

  // Diagnostic logging
  React.useEffect(() => {
    if (disabled || !players || players.length === 0) {
      console.warn(`BatterRoleSelector[${label}]: Disabled or no players`, {
        label,
        disabled,
        playersCount: players?.length || 0,
        error,
      });
    }
  }, [label, disabled, players, error]);

  const selectDisabled = disabled || !players || players.length === 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={`select-${label}`}>{label}</Label>
      <Select
        value={selectedPlayer ? selectedPlayer.id.toString() : 'none'}
        onValueChange={handleValueChange}
        disabled={selectDisabled}
      >
        <SelectTrigger
          id={`select-${label}`}
          data-testid={`select-${label}-${selectDisabled ? 'disabled' : 'enabled'}`}
        >
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <MobileSafeSelectContent>
          <SelectItem value="none">None</SelectItem>
          {players && players.length > 0 ? (
            players.map((player) => (
              <SelectItem key={player.id.toString()} value={player.id.toString()}>
                {player.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-players" disabled>
              No players available
            </SelectItem>
          )}
        </MobileSafeSelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && (!players || players.length === 0) && (
        <p className="text-sm text-muted-foreground">No eligible players</p>
      )}
    </div>
  );
}
