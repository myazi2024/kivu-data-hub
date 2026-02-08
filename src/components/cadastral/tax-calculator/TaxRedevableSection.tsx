import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck } from 'lucide-react';
import { TaxCalculationInput } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';

interface TaxRedevableSectionProps {
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
}

const QUALITE_OPTIONS = [
  { value: 'gerant', label: 'Gérant' },
  { value: 'mandataire', label: 'Mandataire' },
  { value: 'locataire', label: 'Locataire principal' },
  { value: 'autre', label: 'Autre' },
];

const TaxRedevableSection: React.FC<TaxRedevableSectionProps> = ({ input, setInput }) => {
  return (
    <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <UserCheck className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Redevable différent ?
              <SectionHelpPopover
                title="Redevable différent du propriétaire"
                description="Si la personne qui paie l'impôt n'est pas le propriétaire (ex: gérant, mandataire, locataire principal), indiquez ses informations ici."
              />
            </Label>
          </div>
          <Switch
            checked={input.redevableIsDifferent}
            onCheckedChange={(v) => setInput(prev => ({
              ...prev,
              redevableIsDifferent: v,
              ...(!v ? { redevableNom: '', redevableNif: '', redevableQualite: '' } : {}),
            }))}
          />
        </div>

        {input.redevableIsDifferent && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nom complet du redevable *</Label>
              <Input
                value={input.redevableNom}
                onChange={(e) => setInput(prev => ({ ...prev, redevableNom: e.target.value }))}
                placeholder="Nom complet"
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">NIF du redevable</Label>
              <Input
                value={input.redevableNif}
                onChange={(e) => setInput(prev => ({ ...prev, redevableNif: e.target.value }))}
                placeholder="Ex: A0123456B"
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Qualité du redevable *</Label>
              <Select
                value={input.redevableQualite || '_none'}
                onValueChange={(v) => setInput(prev => ({ ...prev, redevableQualite: v === '_none' ? '' : v }))}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Sélectionner la qualité" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  {QUALITE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxRedevableSection;
