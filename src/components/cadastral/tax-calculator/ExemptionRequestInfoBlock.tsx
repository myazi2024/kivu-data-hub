import React from 'react';
import { Info, FileQuestion, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExemptionRequestInfoBlockProps {
  onRequestExemption: () => void;
}

const ExemptionRequestInfoBlock: React.FC<ExemptionRequestInfoBlockProps> = ({ onRequestExemption }) => {
  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5">
      <div className="flex gap-2.5">
        <FileQuestion className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Vous n'avez pas de certificat d'exonération ?
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Si vous estimez être éligible à une exonération fiscale, vous pouvez soumettre une demande de certificat d'exonération auprès des services fiscaux compétents.
          </p>
          <div className="flex gap-1.5 items-start p-2 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/50">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Important :</strong> Votre demande d'exonération n'impacte en rien la déclaration d'impôt pour l'exercice fiscal actuel. 
              Si votre demande aboutit, l'exonération s'appliquera uniquement aux déclarations d'impôt futures.
            </p>
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRequestExemption}
        className="w-full h-9 rounded-xl border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-2 text-xs font-medium"
      >
        <FileQuestion className="h-3.5 w-3.5" />
        Demander un certificat d'exonération
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default ExemptionRequestInfoBlock;
