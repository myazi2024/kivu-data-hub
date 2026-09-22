import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import {
  CCC_EDITABLE_FIELDS, CCC_FIELD_SECTIONS, formatFieldValue, toInputValue,
} from '@/lib/ccc/editableFieldsCatalog';

interface Props {
  contribution: Record<string, unknown>;
  selected: string[];
  onToggle: (field: string) => void;
}

/** Étape 1 : choisir les données à corriger, regroupées par onglet d'origine. */
export const FieldPickerStep: React.FC<Props> = ({ contribution, selected, onToggle }) => {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CCC_FIELD_SECTIONS.map((section) => ({
      section,
      fields: CCC_EDITABLE_FIELDS.filter(
        (f) => f.section === section && (!term || f.label.toLowerCase().includes(term)),
      ),
    })).filter((g) => g.fields.length > 0);
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une donnée (ex. matériaux, loyer, hauteur)"
          className="h-9 pl-8 text-sm"
          aria-label="Rechercher une donnée"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-4">
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée ne correspond.</p>
        )}
        {grouped.map(({ section, fields }) => (
          <div key={section}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{section}</p>
            <div className="space-y-1">
              {fields.map((f) => {
                const current = formatFieldValue(f, toInputValue(contribution[f.field]));
                const isChecked = selected.includes(f.field);
                return (
                  <label
                    key={f.field}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggle(f.field)}
                      className="mt-0.5"
                      aria-label={`Corriger ${f.label}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm block">{f.label}</span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        Valeur actuelle : {current}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Badge variant="secondary" className="text-xs">
        {selected.length} donnée(s) sélectionnée(s)
      </Badge>
    </div>
  );
};

export default FieldPickerStep;
