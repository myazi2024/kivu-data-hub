import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface BuildingHeightFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  /** true tant qu'aucune construction n'est tracée dans le croquis. */
  disabled?: boolean;
  /** Aide affichée quand le champ est désactivé. */
  disabledHint?: string;
}

/**
 * Champ « Hauteur (m) » d'une construction — saisi dans le bloc Construction
 * (avant Standing), plus dans le croquis. Minimum légal : 3 m.
 */
const BuildingHeightField: React.FC<BuildingHeightFieldProps> = ({
  value,
  onChange,
  disabled = false,
  disabledHint,
}) => {
  const tooLow = value != null && value > 0 && value < 3;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">Hauteur (m)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
              <Info className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 rounded-xl text-xs">
            <p className="text-muted-foreground">
              Hauteur hors œuvre de la construction, du sol au point le plus haut. Hauteur minimale : 3 m.
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <Input
        type="number"
        min={3}
        step={0.1}
        placeholder="Ex: 3"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className={cn('h-10 rounded-xl text-sm', tooLow && 'border-destructive')}
      />
      {tooLow && <p className="text-[10px] text-destructive">Hauteur minimale : 3 m</p>}
      {disabled && disabledHint && (
        <p className="text-[10px] text-muted-foreground italic">{disabledHint}</p>
      )}
    </div>
  );
};

export default BuildingHeightField;
