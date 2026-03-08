/**
 * Shared confirmation screen for all tax calculators.
 * Fixes #2, #3, #4: PropertyTax, BuildingTax, and IRL now show
 * a proper post-submission confirmation with reference info.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface TaxConfirmationStepProps {
  parcelNumber: string;
  fiscalYear: number;
  taxType: string; // e.g. "Impôt foncier", "Taxe de bâtisse", "IRL"
  totalAmount: number;
  onClose: () => void;
  /** Accent color class for the banner */
  accentClass?: string;
}

const TaxConfirmationStep: React.FC<TaxConfirmationStepProps> = ({
  parcelNumber, fiscalYear, taxType, totalAmount, onClose, accentClass = 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
}) => {
  return (
    <div className="space-y-4 text-center py-6 px-4">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Déclaration soumise</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre déclaration <strong>{taxType}</strong> pour la parcelle {parcelNumber} (exercice {fiscalYear}) a été enregistrée.
        </p>
        <p className="text-sm font-semibold mt-2">
          Montant : {totalAmount.toFixed(2)} USD
        </p>
      </div>

      <div className={`mt-3 p-3 rounded-xl border ${accentClass}`}>
        <p className="text-xs">
          🎁 Un <strong>code CCC</strong> sera généré après validation par l'administration.
          Sa valeur dépendra de la complétude des informations fournies.
        </p>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          ℹ️ Vous pouvez suivre le statut de votre déclaration depuis votre tableau de bord.
        </p>
      </div>

      <Button onClick={onClose} className="w-full h-11 rounded-xl">
        Fermer
      </Button>
    </div>
  );
};

export default TaxConfirmationStep;
