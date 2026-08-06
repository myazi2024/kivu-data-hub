import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  contributionId: string;
  onSubmitted?: () => void;
}

/**
 * Demande de correction pour une contribution déjà approuvée : crée une
 * contribution de type « mise à jour » rattachée à la même parcelle.
 */
export const CorrectionRequestDialog: React.FC<Props> = ({
  open, onOpenChange, parcelNumber, contributionId, onSubmitted,
}) => {
  const { user } = useAuth();
  const [field, setField] = useState('');
  const [desiredValue, setDesiredValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setField('');
    setDesiredValue('');
    setReason('');
  };

  const submit = async () => {
    if (!user) return;
    if (field.trim().length < 2) {
      toast.error('Précisez le champ à corriger');
      return;
    }
    if (reason.trim().length < 10) {
      toast.error('Le motif doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('cadastral_contributions').insert({
        user_id: user.id,
        parcel_number: parcelNumber,
        contribution_type: 'update',
        status: 'pending',
        change_justification: reason.trim(),
        changed_fields: {
          correction_request: true,
          source_contribution_id: contributionId,
          field: field.trim(),
          desired_value: desiredValue.trim() || null,
        },
      } as any);
      if (error) throw error;

      toast.success('Demande de correction envoyée');
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e) {
      console.error('correction request', e);
      toast.error("Impossible d'envoyer votre demande de correction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une correction</DialogTitle>
          <DialogDescription>
            Cette contribution est approuvée et ne peut plus être modifiée directement. Décrivez la
            correction souhaitée pour la parcelle {parcelNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="correction-field" className="text-xs">Champ concerné *</Label>
            <Input
              id="correction-field"
              value={field}
              maxLength={120}
              onChange={(e) => setField(e.target.value)}
              placeholder="Ex : Loyer mensuel du local A"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="correction-value" className="text-xs">Valeur souhaitée</Label>
            <Input
              id="correction-value"
              value={desiredValue}
              maxLength={200}
              onChange={(e) => setDesiredValue(e.target.value)}
              placeholder="Ex : 350 USD"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="correction-reason" className="text-xs">Motif *</Label>
            <Textarea
              id="correction-reason"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expliquez pourquoi cette donnée doit être corrigée"
              className="text-sm min-h-24"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/1000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionRequestDialog;
