import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface ExpertiseConfirmationStepProps {
  createdRequest: any;
  parcelNumber: string;
  onClose: () => void;
}

const ExpertiseConfirmationStep: React.FC<ExpertiseConfirmationStepProps> = ({
  createdRequest, parcelNumber, onClose
}) => {
  return (
    <div className="space-y-4 text-center py-4">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-lg">Demande envoyée !</h3>
        <p className="text-sm text-muted-foreground">
          Votre demande d'expertise immobilière a été enregistrée avec succès.
        </p>
      </div>

      {createdRequest && (
        <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Référence</span>
            <span className="font-mono font-bold">{createdRequest.reference_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-mono">{parcelNumber}</span>
          </div>
        </div>
      )}

      <Alert className="rounded-xl text-left">
        <AlertDescription className="text-sm">
          Un expert immobilier analysera votre demande et vous contactera prochainement.
          Vous pouvez suivre l'avancement depuis votre tableau de bord.
        </AlertDescription>
      </Alert>

      <Button onClick={onClose} className="w-full h-11 rounded-xl">Fermer</Button>
    </div>
  );
};

export default ExpertiseConfirmationStep;
