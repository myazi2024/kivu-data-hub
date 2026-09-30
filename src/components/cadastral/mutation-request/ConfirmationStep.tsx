import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Hash, MapPin, Clock } from 'lucide-react';
import type { MutationRequest } from '@/types/mutation';

export interface ConfirmationStepProps {
  createdRequest: MutationRequest | null;
  parcelNumber: string;
  parcelData?: {
    province?: string;
    ville?: string;
  };
  handleClose: () => void;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  createdRequest,
  parcelNumber,
  parcelData,
  handleClose,
}) => {
  return (
    <div className="space-y-3 text-center py-2">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">Demande soumise avec succès</h3>
        <p className="text-[10px] text-muted-foreground mt-1">Votre demande sera traitée dans les 14 jours ouvrables</p>
      </div>
      <Card className="bg-muted/50 border-0 text-left rounded-lg">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Hash className="h-3 w-3" /> Référence</div>
            <span className="font-mono font-bold text-xs">{createdRequest?.reference_number}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Parcelle</div>
            <span className="font-mono text-xs">{parcelNumber}</span>
          </div>
          {parcelData?.province && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Localisation</span>
              <span className="text-xs">{parcelData.province}, {parcelData.ville}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Délai estimé</div>
            <span className="text-xs">{createdRequest?.estimated_processing_days || 14} jours</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Montant payé</span>
            <span className="font-bold text-primary text-sm">${Number(createdRequest?.total_amount_usd || 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
      <Alert className="text-left py-2 rounded-lg">
        <AlertDescription className="text-[10px]">Conservez votre numéro de référence. Vous recevrez une notification lors du traitement.</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { handleClose(); window.location.href = '/user-dashboard?tab=mutations'; }} className="flex-1 h-8 text-xs rounded-lg">
          Voir mes demandes
        </Button>
        <Button onClick={handleClose} className="flex-1 h-8 text-xs rounded-lg">Fermer</Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
