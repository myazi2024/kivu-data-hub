import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CCCEditableField } from '@/lib/ccc/editableFieldsCatalog';
import type { FieldOption } from './useFieldOptions';

interface Props {
  field: CCCEditableField;
  value: string;
  options: FieldOption[];
  onChange: (value: string) => void;
}

/** Contrôle de saisie aligné sur le type de la donnée du formulaire CCC. */
export const FieldInput: React.FC<Props> = ({ field, value, options, onChange }) => {
  const inputId = `correction-${field.field}`;

  if (field.input === 'boolean') {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={inputId} className="h-9 text-sm">
          <SelectValue placeholder="Choisir" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Oui</SelectItem>
          <SelectItem value="false">Non</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field.input === 'select') {
    if (options.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">
          Aucune option disponible : renseignez d'abord la donnée dont celle-ci dépend.
        </p>
      );
    }
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={inputId} className="h-9 text-sm">
          <SelectValue placeholder="Choisir une valeur" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      id={inputId}
      type={field.input === 'number' ? 'number' : field.input === 'date' ? 'date' : 'text'}
      value={value}
      min={field.min}
      max={field.max}
      step={field.step}
      maxLength={field.maxLength}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 text-sm"
      placeholder={field.unit ? `Valeur en ${field.unit}` : 'Nouvelle valeur'}
    />
  );
};

export default FieldInput;
