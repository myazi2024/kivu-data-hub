import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileX2, CheckCircle2, Upload, X, Info, FileText, AlertTriangle, Calendar, DollarSign, Phone, Hash, Image, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDateFr as formatDate } from '@/utils/formatters';
import {
  CancellationRequest, ParcelData, MortgageData, MortgageFee,
  CANCELLATION_REASONS, REQUESTER_QUALITIES, MAX_DOCUMENTS
} from './types';

interface CancellationFormStepProps {
  formData: CancellationRequest;
  setFormData: React.Dispatch<React.SetStateAction<CancellationRequest>>;
  parcelData: ParcelData | null;
  mortgageData: MortgageData | null;
  loadingData: boolean;
  validatingReference: boolean;
  referenceValid: boolean | null;
  referenceError: string | null;
  requestReferenceNumber: string;
  fees: MortgageFee[];
  loadingFees: boolean;
  selectedFees: string[];
  onFeeToggle: (feeId: string, isMandatory: boolean) => void;
  totalAmount: number;
  selectedFeesDetails: MortgageFee[];
  onContinue: () => void;
  onClose: () => void;
}

const CancellationFormStep: React.FC<CancellationFormStepProps> = ({
  formData, setFormData, parcelData, mortgageData, loadingData,
  validatingReference, referenceValid, referenceError, requestReferenceNumber,
  fees, loadingFees, selectedFees, onFeeToggle, totalAmount, selectedFeesDetails,
  onContinue, onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const currentCount = formData.supportingDocuments.length;
    const remainingSlots = MAX_DOCUMENTS - currentCount;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_DOCUMENTS} documents autorisés`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const newFiles = Array.from(files).slice(0, remainingSlots);
    if (newFiles.length < files.length) {
      toast.warning(`Seuls ${remainingSlots} document(s) supplémentaire(s) accepté(s)`);
    }
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    setFormData(prev => ({ ...prev, supportingDocuments: [...prev.supportingDocuments, ...validFiles] }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({ ...prev, supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-2xl border-destructive/30 bg-gradient-to-r from-destructive/5 to-destructive/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <FileX2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Demande de Radiation d'Hypothèque</h3>
              <p className="text-xs text-destructive/70">Réf: {requestReferenceNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parcel data */}
      {loadingData ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm">Chargement des données...</span>
          </CardContent>
        </Card>
      ) : parcelData && (
        <Card className="rounded-2xl shadow-md border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold text-primary">Données de la parcelle</Label>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">N° Parcelle</span>
                <p className="font-medium">{parcelData.parcel_number}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Propriétaire</span>
                <p className="font-medium">{parcelData.current_owner_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Localisation</span>
                <p className="font-medium">{[parcelData.quartier, parcelData.commune, parcelData.ville].filter(Boolean).join(', ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">N° Titre foncier</span>
                <p className="font-medium">{parcelData.title_reference_number || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mortgage reference */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Numéro de référence de l'hypothèque *</Label>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={formData.mortgageReferenceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, mortgageReferenceNumber: e.target.value.toUpperCase() }))}
                placeholder="Ex: HYP-202501-A1B2C"
                className={`h-11 text-sm rounded-xl border-2 font-mono uppercase transition-all ${
                  referenceValid === false ? 'border-destructive bg-destructive/5'
                    : referenceValid === true ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : ''
                }`}
              />
              {validatingReference && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />}
              {referenceValid === true && !validatingReference && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />}
            </div>

            {referenceError && (
              <Alert className="bg-destructive/5 border-destructive/30 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs text-destructive">
                  <p className="font-medium">{referenceError}</p>
                  <p className="mt-1.5 text-destructive/80">
                    <strong>Comment obtenir ce numéro ?</strong> Le numéro de référence est affiché dans le résultat cadastral,
                    onglet "Obligations" → "Hypothèques actives".
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {referenceValid === true && mortgageData && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                  <p className="font-medium mb-2">Hypothèque identifiée et validée</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Créancier:</span><p className="font-medium">{mortgageData.creditor_name}</p></div>
                    <div><span className="text-muted-foreground">Montant:</span><p className="font-medium">{formatCurrency(mortgageData.mortgage_amount_usd)}</p></div>
                    <div><span className="text-muted-foreground">Date contrat:</span><p className="font-medium">{formatDate(mortgageData.contract_date)}</p></div>
                    <div><span className="text-muted-foreground">Durée:</span><p className="font-medium">{mortgageData.duration_months} mois</p></div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Le numéro de référence se trouve dans le résultat cadastral (onglet Obligations → Hypothèques).</span>
          </p>
        </CardContent>
      </Card>

      {/* Reason */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Motif de la radiation *</Label>
          </div>
          <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl bg-popover z-[1300]">
              {CANCELLATION_REASONS.map(reason => (
                <SelectItem key={reason.value} value={reason.value} className="rounded-lg">
                  <div>
                    <div className="font-medium">{reason.label}</div>
                    <div className="text-xs text-muted-foreground">{reason.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Requester info */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Informations du demandeur</Label>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Qualité du demandeur *</Label>
              <Select value={formData.requesterQuality} onValueChange={(value) => setFormData(prev => ({ ...prev, requesterQuality: value }))}>
                <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl bg-popover z-[1300]">
                  {REQUESTER_QUALITIES.map(q => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet *</Label>
              <Input value={formData.requesterName} onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))} placeholder="Votre nom complet" className="h-10 text-sm rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">N° Pièce d'identité</Label>
                <Input value={formData.requesterIdNumber} onChange={(e) => setFormData(prev => ({ ...prev, requesterIdNumber: e.target.value }))} placeholder="CNI, Passeport..." className="h-10 text-sm rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Téléphone</Label>
                <Input value={formData.requesterPhone} onChange={(e) => setFormData(prev => ({ ...prev, requesterPhone: e.target.value }))} placeholder="+243..." className="h-10 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={formData.requesterEmail} onChange={(e) => setFormData(prev => ({ ...prev, requesterEmail: e.target.value }))} placeholder="email@exemple.com" className="h-10 text-sm rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional info */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Informations complémentaires</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date souhaitée *</Label>
              <Input type="date" min={new Date().toISOString().split('T')[0]} value={formData.cancellationDate} onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: e.target.value }))} className="h-10 text-sm rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Montant règlement (USD)</Label>
              <Input type="number" min="0" step="0.01" value={formData.settlementAmount} onChange={(e) => setFormData(prev => ({ ...prev, settlementAmount: e.target.value }))} placeholder="Montant final payé" className="h-10 text-sm rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Commentaires additionnels</Label>
            <Textarea value={formData.comments} onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))} placeholder="Informations supplémentaires..." className="text-sm rounded-xl resize-none" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Documents justificatifs * ({formData.supportingDocuments.length}/{MAX_DOCUMENTS})</Label>
          </div>
          <Alert className="bg-primary/5 border-primary/20 rounded-xl">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-primary/80">
              <strong>Documents requis en RDC:</strong>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>Attestation de remboursement du créancier</li>
                <li>Mainlevée signée par le créancier</li>
                <li>Copie de la pièce d'identité du demandeur</li>
                <li>Copie du certificat d'enregistrement</li>
              </ul>
            </AlertDescription>
          </Alert>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5" disabled={formData.supportingDocuments.length >= MAX_DOCUMENTS}>
            <Upload className="h-4 w-4 mr-2" />
            Ajouter des documents
          </Button>
          {formData.supportingDocuments.length > 0 && (
            <div className="space-y-2">
              {formData.supportingDocuments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                  {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-destructive flex-shrink-0" />}
                  <span className="flex-1 text-xs truncate">{file.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-6 w-6 rounded-lg hover:bg-destructive/10">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creditor accord */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox id="creditorAccord" checked={formData.creditorAccord} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, creditorAccord: checked as boolean }))} className="mt-0.5" />
            <label htmlFor="creditorAccord" className="text-xs cursor-pointer">
              <span className="font-medium text-amber-700 dark:text-amber-300">Je certifie disposer de l'accord du créancier *</span>
              <p className="mt-1 text-muted-foreground">
                Je confirme que le créancier a donné son accord pour la radiation de l'hypothèque,
                conformément à l'article 229 du Code foncier de la RDC.
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Fees */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <Label className="text-sm font-semibold text-amber-700 dark:text-amber-300">Frais de radiation (RDC)</Label>
          </div>
          {loadingFees ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {fees.map((fee) => (
                <div key={fee.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${selectedFees.includes(fee.id) ? 'bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700' : 'bg-muted/30 border-2 border-transparent'}`}>
                  <Checkbox id={fee.id} checked={selectedFees.includes(fee.id)} onCheckedChange={() => onFeeToggle(fee.id, fee.is_mandatory)} disabled={fee.is_mandatory} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={fee.id} className="text-sm font-medium cursor-pointer">
                        {fee.name}
                        {fee.is_mandatory && <span className="ml-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">obligatoire</span>}
                      </label>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">${fee.amount_usd}</span>
                    </div>
                    {fee.description && <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-amber-200 dark:border-amber-700">
            <span className="text-sm font-semibold">Total à payer</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">Annuler</Button>
        <Button onClick={onContinue} disabled={!referenceValid} className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90">Continuer</Button>
      </div>
    </div>
  );
};

export default CancellationFormStep;
