import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Award, ExternalLink, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { generateMortgageReceiptPDF } from '@/utils/generateMortgageReceiptPDF';
import { toast } from 'sonner';
import { ParcelData, MortgageData, MortgageFee, CANCELLATION_REASONS } from './types';

interface CancellationConfirmationStepProps {
  requestReferenceNumber: string;
  mortgageReferenceNumber: string;
  parcelNumber: string;
  totalAmount: number;
  formData: {
    reason: string;
    requesterName: string;
    cancellationDate: string;
  };
  parcelData: ParcelData | null;
  mortgageData: MortgageData | null;
  selectedFeesDetails: MortgageFee[];
  onClose: () => void;
}

const CancellationConfirmationStep: React.FC<CancellationConfirmationStepProps> = ({
  requestReferenceNumber, mortgageReferenceNumber, parcelNumber,
  totalAmount, formData, parcelData, mortgageData, selectedFeesDetails, onClose
}) => {
  const navigate = useNavigate();

  const handleDownloadReceipt = async () => {
    try {
      const blob = await generateMortgageReceiptPDF({
        type: 'cancellation',
        requestReference: requestReferenceNumber,
        mortgageReference: mortgageReferenceNumber,
        parcelNumber,
        requesterName: formData.requesterName,
        reason: CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label || formData.reason,
        totalAmountPaid: totalAmount,
        fees: selectedFeesDetails.map(f => ({ name: f.name, amount: f.amount_usd })),
        date: formData.cancellationDate,
        parcelData: parcelData ? {
          ownerName: parcelData.current_owner_name,
          location: [parcelData.quartier, parcelData.commune, parcelData.ville].filter(Boolean).join(', '),
        } : undefined,
        mortgageData: mortgageData ? {
          creditorName: mortgageData.creditor_name,
          amount: mortgageData.mortgage_amount_usd,
          contractDate: mortgageData.contract_date,
        } : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu-radiation-${requestReferenceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Reçu téléchargé');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du reçu');
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-green-700 dark:text-green-300">Demande soumise avec succès!</h3>
        <p className="text-sm text-muted-foreground mt-1">Votre demande de radiation d'hypothèque a été enregistrée.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2 text-left">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Référence demande</span>
            <span className="font-mono font-medium">{requestReferenceNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Référence hypothèque</span>
            <span className="font-mono font-medium">{mortgageReferenceNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-medium">{parcelNumber}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Montant payé</span>
            <span className="font-medium text-green-600">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-primary/5 border-primary/20 rounded-xl text-left">
        <Award className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs text-primary/80">
          <strong>Prochaines étapes:</strong>
          <ol className="mt-1.5 list-decimal list-inside space-y-1">
            <li>Votre demande sera examinée par un officier hypothécaire</li>
            <li>Vous recevrez une notification de suivi</li>
            <li>Le certificat de radiation sera délivré après validation</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={handleDownloadReceipt} className="w-full h-11 rounded-xl gap-2">
          <Download className="h-4 w-4" /> Télécharger le reçu PDF
        </Button>
        <Button variant="outline" onClick={() => navigate('/user-dashboard')} className="w-full h-11 rounded-xl gap-2">
          <ExternalLink className="h-4 w-4" /> Voir mes demandes
        </Button>
        <Button onClick={onClose} className="w-full h-11 rounded-xl">Fermer</Button>
      </div>
    </div>
  );
};

export default CancellationConfirmationStep;
