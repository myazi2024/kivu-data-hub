import React from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  getEditableField, formatFieldValue, toInputValue, validateFieldValue,
} from '@/lib/ccc/editableFieldsCatalog';
import { FieldInput } from './FieldInput';
import type { FieldOption } from './useFieldOptions';

interface Props {
  contribution: Record<string, unknown>;
  selected: string[];
  values: Record<string, string>;
  autoAdded: string[];
  optionsFor: (field: ReturnType<typeof getEditableField> extends undefined ? never : any, effective: Record<string, string>) => FieldOption[];
  effectiveValues: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

/** Étape 2 : saisir la nouvelle valeur de chaque donnée sélectionnée. */
export const FieldValuesStep: React.FC<Props> = ({
  contribution, selected, values, autoAdded, optionsFor, effectiveValues, onChange,
}) => (
  <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
    {autoAdded.length > 0 && (
      <Alert className="border-amber-500/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs">
          Certaines données dépendent de vos choix et ont été ajoutées à la demande :{' '}
          {autoAdded.map((f) => getEditableField(f)?.label ?? f).join(', ')}.
        </AlertDescription>
      </Alert>
    )}

    {selected.map((fieldName) => {
      const def = getEditableField(fieldName);
      if (!def) return null;
      const value = values[fieldName] ?? '';
      const errorMsg = validateFieldValue(def, value);
      const currentLabel = formatFieldValue(def, toInputValue(contribution[fieldName]));
      return (
        <div key={fieldName} className="rounded-xl border p-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`correction-${fieldName}`} className="text-sm">{def.label}</Label>
            <span className="text-[11px] text-muted-foreground">
              Actuel : {currentLabel}
            </span>
          </div>
          <FieldInput
            field={def}
            value={value}
            options={def.input === 'select' ? optionsFor(def, effectiveValues) : []}
            onChange={(v) => onChange(fieldName, v)}
          />
          {errorMsg && <p className="text-[11px] text-destructive">{errorMsg}</p>}
          {def.help && <p className="text-[11px] text-muted-foreground">{def.help}</p>}
        </div>
      );
    })}
  </div>
);

export default FieldValuesStep;
