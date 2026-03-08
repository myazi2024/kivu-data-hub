import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileCheck, MapPin, Building, User, FileText, Upload, DollarSign } from 'lucide-react';
import { formatCurrency, formatDateFr as formatDate } from '@/utils/formatters';
import { CancellationRequest, ParcelData, MortgageData, MortgageFee, CANCELLATION_REASONS, REQUESTER_QUALITIES } from './types';

interface CancellationReviewStepProps {
  formData: CancellationRequest;
  parcelData: ParcelData | null;
  mortgageData: MortgageData | null;
  requestReferenceNumber: string;
  selectedFeesDetails: MortgageFee[];
  totalAmount: number;
  onBack: () => void;
  onProceedToPayment: () => void;
}

// Fix #19: Removed duplicate "Modifier" button at top — only bottom action bar remains
const CancellationReviewStep: React.FC<CancellationReviewStepProps> = ({
  formData, parcelData, mortgageData, requestReferenceNumber,
  selectedFeesDetails, totalAmount, onBack, onProceedToPayment
}) => (
  <div className="space-y-4">
    <Card className="rounded-2xl border-destructive/30 bg-gradient-to-r from-destructive/5 to-destructive/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <FileCheck className="h-6 w-6 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Révision de la demande</h3>
            <p className="text-xs text-destructive/70">Réf: {requestReferenceNumber}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {parcelData && (
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Parcelle concernée</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">N° Parcelle:</span><p className="font-medium">{parcelData.parcel_number}</p></div>
            <div><span className="text-muted-foreground">Propriétaire:</span><p className="font-medium">{parcelData.current_owner_name}</p></div>
          </div>
        </CardContent>
      </Card>
    )}

    {mortgageData && (
      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Building className="h-4 w-4 text-primary" /> Hypothèque à radier</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Référence:</span><p className="font-medium font-mono">{mortgageData.reference_number}</p></div>
            <div><span className="text-muted-foreground">Créancier:</span><p className="font-medium">{mortgageData.creditor_name}</p></div>
            <div><span className="text-muted-foreground">Montant initial:</span><p className="font-medium">{formatCurrency(mortgageData.mortgage_amount_usd)}</p></div>
            <div><span className="text-muted-foreground">Date contrat:</span><p className="font-medium">{formatDate(mortgageData.contract_date)}</p></div>
          </div>
        </CardContent>
      </Card>
    )}

    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" /> Demandeur</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground">Nom:</span><p className="font-medium">{formData.requesterName}</p></div>
          <div><span className="text-muted-foreground">Qualité:</span><p className="font-medium">{REQUESTER_QUALITIES.find(q => q.value === formData.requesterQuality)?.label}</p></div>
          <div><span className="text-muted-foreground">Téléphone:</span><p className="font-medium">{formData.requesterPhone || 'N/A'}</p></div>
          <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{formData.requesterEmail || 'N/A'}</p></div>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Motif de radiation</div>
        <p className="text-sm">{CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}</p>
        {formData.settlementAmount && (
          <p className="text-xs text-muted-foreground">Montant de règlement: {formatCurrency(parseFloat(formData.settlementAmount))}</p>
        )}
        {formData.comments && (
          <p className="text-xs text-muted-foreground mt-1">Commentaire: {formData.comments}</p>
        )}
      </CardContent>
    </Card>

    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4 text-primary" /> Documents joints ({formData.supportingDocuments.length})</div>
        <div className="space-y-1">
          {formData.supportingDocuments.map((file, index) => (
            <p key={index} className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />{file.name}</p>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl border-amber-200 dark:border-amber-800">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><DollarSign className="h-4 w-4" /> Frais à payer</div>
        <div className="space-y-1">
          {selectedFeesDetails.map(fee => (
            <div key={fee.id} className="flex justify-between text-xs">
              <span>{fee.name}</span>
              <span className="font-medium">{formatCurrency(fee.amount_usd)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2 border-t border-amber-200 dark:border-amber-700">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>

    <div className="flex gap-3">
      <Button variant="outline" onClick={onBack} className="flex-1 h-11 rounded-xl">Modifier</Button>
      <Button onClick={onProceedToPayment} className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90">Procéder au paiement</Button>
    </div>
  </div>
);

export default CancellationReviewStep;
