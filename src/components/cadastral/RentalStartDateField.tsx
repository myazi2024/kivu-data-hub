import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface RentalStartDateFieldProps {
  value?: string; // ISO yyyy-MM-dd
  onChange: (value: string | undefined) => void;
  constructionYear?: number;
  highlightRequired?: boolean;
}

/**
 * Datepicker conditionnel "En location depuis quand ?"
 * — Affiché lorsque l'usage déclaré est "Location".
 * — Doit être ≤ 31 déc. de l'année de construction.
 * — Doit être ≤ aujourd'hui.
 */
const RentalStartDateField: React.FC<RentalStartDateFieldProps> = ({
  value, onChange, constructionYear, highlightRequired,
}) => {
  const selected = value && isValid(parseISO(value)) ? parseISO(value) : undefined;
  const today = new Date();
  const minDate = constructionYear ? new Date(constructionYear, 0, 1) : new Date(1900, 0, 1);
  const maxDate = today;

  const isInvalid = selected && (
    selected > maxDate || (constructionYear && selected < minDate)
  );

  return (
    <div className={cn(
      "space-y-1.5",
      highlightRequired && !value && "ring-2 ring-destructive rounded-xl p-2 bg-destructive/5 animate-pulse"
    )}>
      <Label className="text-sm font-medium flex items-center gap-1">
        En location depuis quand ?
        {highlightRequired && !value && <span className="text-destructive text-xs font-semibold">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-full justify-start text-left font-normal rounded-xl text-sm",
              !selected && "text-muted-foreground",
              isInvalid && "border-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? format(selected, 'PPP', { locale: fr }) : <span>Choisir une date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[10001]" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
            disabled={(d) => d > maxDate || d < minDate}
            defaultMonth={selected ?? maxDate}
            initialFocus
            locale={fr}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {!constructionYear && (
        <p className="text-[11px] text-muted-foreground">
          Renseignez d'abord l'année de construction.
        </p>
      )}
      {constructionYear && (
        <p className="text-[11px] text-muted-foreground">
          La date doit être ≥ 01/01/{constructionYear} et ≤ aujourd'hui.
        </p>
      )}
      {isInvalid && (
        <p className="text-[11px] text-destructive font-medium">
          Date invalide : doit être ≥ 01/01/{constructionYear} (la mise en location ne peut précéder la construction).
        </p>
      )}
    </div>
  );
};

export default RentalStartDateField;
