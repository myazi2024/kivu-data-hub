import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MapPin, Building2, Clock, FileText, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PermitConfirmationStepProps {
  parcelNumber: string;
  requestTypeLabel: string;
  totalFeeUSD: number;
  savedContributionId: string | null;
  savedTransactionId: string | null;
  onClose: () => void;
}

const PermitConfirmationStep: React.FC<PermitConfirmationStepProps> = ({
  parcelNumber, requestTypeLabel, totalFeeUSD,
  savedContributionId, savedTransactionId, onClose,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const referenceId = savedContributionId ? savedContributionId.slice(0, 8).toUpperCase() : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copié', description: 'Référence copiée dans le presse-papiers' });
    }).catch(() => {});
  };

  return (
    <div className="py-4 space-y-4 text-center">
      <div className="relative inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
        <CheckCircle2 className="h-8 w-8 text-green-600 relative" />
      </div>
      <div>
        <h3 className="font-semibold text-base">Demande soumise avec succès</h3>
        <p className="text-xs text-muted-foreground mt-1">Votre demande sera traitée dans les 15 à 30 jours ouvrables</p>
      </div>
      <Card className="bg-muted/50 border-0 text-left rounded-lg">
        <CardContent className="p-3 space-y-2">
          {referenceId && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="h-3 w-3" />Référence</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-primary">{referenceId}</span>
                  <button onClick={() => copyToClipboard(referenceId)} className="p-0.5 hover:bg-muted rounded"><Copy className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              </div>
              <Separator />
            </>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Parcelle</div>
            <span className="font-mono font-bold text-xs">{parcelNumber}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3" />Type</div>
            <span className="text-xs">{requestTypeLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Délai estimé</div>
            <span className="text-xs">15-30 jours</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Montant payé</span>
            <span className="font-bold text-primary text-sm">${totalFeeUSD.toFixed(2)} USD</span>
          </div>
          {savedTransactionId && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Transaction</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px]">{savedTransactionId.slice(0, 12)}...</span>
                  <button onClick={() => copyToClipboard(savedTransactionId)} className="p-0.5 hover:bg-muted rounded"><Copy className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Alert className="text-left py-2 rounded-lg">
        <AlertDescription className="text-[10px]">
          Conservez votre numéro de référence{referenceId ? ` (${referenceId})` : ''}. Vous recevrez une notification lors du traitement de votre demande.
        </AlertDescription>
      </Alert>
      {/* Fix #12: Direct link to dashboard */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { onClose(); navigate('/user-dashboard?tab=building-permits'); }} className="flex-1 h-10 text-xs rounded-xl">
          Suivre ma demande
        </Button>
        <Button onClick={onClose} className="flex-1 h-10 text-sm rounded-xl">Fermer</Button>
      </div>
    </div>
  );
};

export default PermitConfirmationStep;
