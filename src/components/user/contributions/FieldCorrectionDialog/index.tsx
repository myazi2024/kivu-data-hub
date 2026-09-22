import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  collectInvalidatedFields, getEditableField, toInputValue, validateFieldValue,
} from '@/lib/ccc/editableFieldsCatalog';
import { useCorrectionRequests, type CorrectionChange } from '@/hooks/useCorrectionRequests';
import { useFieldOptions } from './useFieldOptions';
import { FieldPickerStep } from './FieldPickerStep';
import { FieldValuesStep } from './FieldValuesStep';
import { ReviewStep } from './ReviewStep';
import { trackEvent } from '@/lib/analytics';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: Record<string, any> | null;
}

type Step = 1 | 2 | 3;

/**
 * Demande de modification ciblée d'une contribution approuvée : l'utilisateur
 * choisit les données concernées, saisit les nouvelles valeurs avec les mêmes
 * contrôles que le formulaire CCC, puis motive sa demande.
 */
export const FieldCorrectionDialog: React.FC<Props> = ({ open, onOpenChange, contribution }) => {
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [autoAdded, setAutoAdded] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  const { optionsFor } = useFieldOptions();
  const { createRequest, creating } = useCorrectionRequests();

  const reset = () => {
    setStep(1);
    setSelected([]);
    setAutoAdded([]);
    setValues({});
    setReason('');
  };

  const toggleField = (field: string) => {
    setSelected((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
    setAutoAdded((prev) => prev.filter((f) => f !== field));
  };

  /** Valeurs effectives = valeur saisie si présente, sinon valeur actuelle. */
  const effectiveValues = useMemo(() => {
    const out: Record<string, string> = {};
    if (!contribution) return out;
    for (const key of Object.keys(contribution)) out[key] = toInputValue(contribution[key]);
    for (const [k, v] of Object.entries(values)) out[k] = v;
    return out;
  }, [contribution, values]);

  const handleValueChange = (field: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Les données dépendantes deviennent incohérentes : on les vide et on
      // les ajoute à la demande pour que l'utilisateur les renseigne.
      const invalidated = collectInvalidatedFields(field, contribution ?? {});
      for (const dep of invalidated) next[dep] = '';
      if (invalidated.length > 0) {
        setSelected((sel) => [...sel, ...invalidated.filter((d) => !sel.includes(d))]);
        setAutoAdded((auto) => [...auto, ...invalidated.filter((d) => !auto.includes(d))]);
      }
      return next;
    });
  };

  const changes: CorrectionChange[] = useMemo(() => {
    if (!contribution) return [];
    return selected
      .map((f) => {
        const def = getEditableField(f);
        if (!def) return null;
        const oldValue = toInputValue(contribution[f]);
        const newValue = values[f] ?? '';
        if (newValue === oldValue) return null;
        return { field: f, label: def.label, old_value: oldValue, new_value: newValue };
      })
      .filter(Boolean) as CorrectionChange[];
  }, [selected, values, contribution]);

  const validationError = useMemo(() => {
    for (const f of selected) {
      const def = getEditableField(f);
      if (!def) continue;
      const msg = validateFieldValue(def, values[f] ?? '');
      if (msg) return `${def.label} : ${msg}`;
    }
    return null;
  }, [selected, values]);

  const goToValues = () => {
    if (selected.length === 0) {
      toast.error('Sélectionnez au moins une donnée à corriger');
      return;
    }
    setStep(2);
  };

  const goToReview = () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (changes.length === 0) {
      toast.error('Aucune valeur n’a été modifiée');
      return;
    }
    setStep(3);
  };

  const submit = async () => {
    if (!contribution) return;
    if (reason.trim().length < 10) {
      toast.error('Le motif doit contenir au moins 10 caractères');
      return;
    }
    try {
      await createRequest({
        contributionId: contribution.id,
        parcelNumber: contribution.parcel_number,
        changes,
        reason,
      });
      trackEvent('ccc_correction_request_submit', {
        id: contribution.id,
        fields: changes.length,
      });
      toast.success('Demande de modification envoyée');
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error('correction request', e);
      const msg: string = e?.message ?? '';
      if (msg.includes('ccc_correction_requests_one_pending') || msg.includes('duplicate key')) {
        toast.error('Une demande est déjà en attente pour cette contribution');
      } else if (msg.includes('Limite de 10')) {
        toast.error('Limite de 10 demandes par jour atteinte');
      } else {
        toast.error("Impossible d'envoyer votre demande de modification");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier mes données</DialogTitle>
          <DialogDescription>
            {step === 1 && `Choisissez les données à corriger sur la parcelle ${contribution?.parcel_number ?? ''}.`}
            {step === 2 && 'Saisissez les nouvelles valeurs.'}
            {step === 3 && 'Vérifiez les changements et motivez votre demande.'}
          </DialogDescription>
        </DialogHeader>

        {contribution && step === 1 && (
          <FieldPickerStep contribution={contribution} selected={selected} onToggle={toggleField} />
        )}
        {contribution && step === 2 && (
          <FieldValuesStep
            contribution={contribution}
            selected={selected}
            values={values}
            autoAdded={autoAdded}
            optionsFor={optionsFor}
            effectiveValues={effectiveValues}
            onChange={handleValueChange}
          />
        )}
        {contribution && step === 3 && (
          <ReviewStep changes={changes} reason={reason} onReasonChange={setReason} />
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
              Retour
            </Button>
          )}
          {step === 1 && <Button onClick={goToValues}>Continuer</Button>}
          {step === 2 && <Button onClick={goToReview}>Vérifier</Button>}
          {step === 3 && (
            <Button onClick={submit} disabled={creating}>
              {creating ? 'Envoi…' : 'Envoyer la demande'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldCorrectionDialog;
