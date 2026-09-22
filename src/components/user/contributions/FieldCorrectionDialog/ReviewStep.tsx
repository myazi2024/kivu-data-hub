import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight } from 'lucide-react';
import type { CorrectionChange } from '@/hooks/useCorrectionRequests';
import { getEditableField, formatFieldValue } from '@/lib/ccc/editableFieldsCatalog';

interface Props {
  changes: CorrectionChange[];
  reason: string;
  onReasonChange: (v: string) => void;
}

/** Étape 3 : récapitulatif avant / après et motif obligatoire. */
export const ReviewStep: React.FC<Props> = ({ changes, reason, onReasonChange }) => (
  <div className="space-y-3">
    <div className="rounded-xl border divide-y max-h-[38vh] overflow-y-auto">
      {changes.map((c) => {
        const def = getEditableField(c.field);
        return (
          <div key={c.field} className="p-2.5">
            <p className="text-xs font-medium">{c.label}</p>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-muted-foreground line-through">
                {def ? formatFieldValue(def, c.old_value) : c.old_value || 'Non renseigné'}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium">
                {def ? formatFieldValue(def, c.new_value) : c.new_value || 'Non renseigné'}
              </span>
            </div>
          </div>
        );
      })}
    </div>

    <div>
      <Label htmlFor="correction-reason" className="text-xs">Motif de la demande *</Label>
      <Textarea
        id="correction-reason"
        value={reason}
        maxLength={1000}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Expliquez pourquoi ces données doivent être corrigées"
        className="text-sm min-h-24"
      />
      <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/1000 — 10 caractères minimum</p>
    </div>
  </div>
);

export default ReviewStep;
