import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  FileEdit, CheckCircle2, AlertTriangle, MapPin, Upload, X, FileText, Image, Eye,
  AlertCircle, FileSearch, ExternalLink, Calendar, DollarSign, Award, HelpCircle, CreditCard,
} from 'lucide-react';
import type { MutationFee } from '@/types/mutation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SectionHelpPopover from '../SectionHelpPopover';
import MutationLateFeeSection from '../mutation/MutationLateFeeSection';
import {
  MUTATION_TYPES,
  LEGAL_STATUS_OPTIONS,
  REQUESTER_TYPES,
} from '../mutation/MutationConstants';
import type { RequiredDocument } from './types';

interface MutationTypeDetails {
  value: string;
  label: string;
  description: string;
}

interface MutationFeesCalculation {
  mutationFee: number;
  bankFee: number;
  total: number;
  applicable: boolean;
  percentage: number;
}

interface LateFeesCalculation {
  days: number;
  fee: number;
  applicable: boolean;
  capped: boolean;
}

interface CertificateValidity {
  isValid: boolean;
  daysRemaining: number;
  isExpired: boolean;
}

export interface FormStepProps {
  parcelNumber: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    current_owner_name?: string;
    title_issue_date?: string;
    owner_acquisition_date?: string;
    is_title_in_current_owner_name?: boolean;
  };

  mutationType: string;
  setMutationType: (value: string) => void;
  mutationTypeDetails?: MutationTypeDetails;

  allRequiredDocuments: RequiredDocument[];
  requiredDocumentChecks: Record<string, boolean>;
  setRequiredDocumentChecks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachedFiles: File[];
  removeFile: (index: number) => void;

  requesterType: string;
  setRequesterType: (value: string) => void;

  isTransferMutation: boolean;

  beneficiaryLegalStatus: string;
  setBeneficiaryLegalStatus: (value: string) => void;
  beneficiaryLastName: string;
  setBeneficiaryLastName: (value: string) => void;
  beneficiaryMiddleName: string;
  setBeneficiaryMiddleName: (value: string) => void;
  beneficiaryFirstName: string;
  setBeneficiaryFirstName: (value: string) => void;
  beneficiaryPhone: string;
  setBeneficiaryPhone: (value: string) => void;

  /** Le type de mutation exige un certificat d'expertise. */
  requiresCertificate: boolean;
  hasExpertiseCertificate: 'yes' | 'no' | null;
  setHasExpertiseCertificate: (value: 'yes' | 'no') => void;

  expertiseCertificateInputRef: React.RefObject<HTMLInputElement>;
  handleExpertiseCertificateSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  expertiseCertificateFile: File | null;
  setExpertiseCertificateFile: (file: File | null) => void;

  expertiseCertificateDate: string;
  setExpertiseCertificateDate: (value: string) => void;
  certificateValidity: CertificateValidity;

  setShowExpertiseDialog: (value: boolean) => void;

  marketValueUsd: string;
  setMarketValueUsd: (value: string) => void;

  titleAgeAutoDetected: boolean;
  titleIssueDateFromCCC: string | null;
  titleAge: 'less_than_10' | '10_or_more' | null;
  setTitleAge: (value: 'less_than_10' | '10_or_more') => void;
  setTitleAgeAutoDetected: (value: boolean) => void;

  fees: MutationFee[];
  selectedFees: string[];
  handleFeeToggle: (feeId: string, isMandatory: boolean) => void;

  mutationFeesCalculation: MutationFeesCalculation;

  showLateFees: boolean;
  ownerAcquisitionDate: string | null;
  ownerAcquisitionDateAutoDetected: boolean;
  manualAcquisitionDate: string;
  setManualAcquisitionDate: (value: string) => void;
  lateFeesCalculation: LateFeesCalculation;

  justification: string;
  setJustification: (value: string) => void;

  totalAmount: number;

  handlePreview: () => void;
}

const FormStep: React.FC<FormStepProps> = ({
  parcelNumber,
  parcelData,
  mutationType,
  setMutationType,
  mutationTypeDetails,
  allRequiredDocuments,
  requiredDocumentChecks,
  setRequiredDocumentChecks,
  fileInputRef,
  handleFileSelect,
  attachedFiles,
  removeFile,
  requesterType,
  setRequesterType,
  isTransferMutation,
  beneficiaryLegalStatus,
  setBeneficiaryLegalStatus,
  beneficiaryLastName,
  setBeneficiaryLastName,
  beneficiaryMiddleName,
  setBeneficiaryMiddleName,
  beneficiaryFirstName,
  setBeneficiaryFirstName,
  beneficiaryPhone,
  setBeneficiaryPhone,
  requiresCertificate,
  hasExpertiseCertificate,
  setHasExpertiseCertificate,
  expertiseCertificateInputRef,
  handleExpertiseCertificateSelect,
  expertiseCertificateFile,
  setExpertiseCertificateFile,
  expertiseCertificateDate,
  setExpertiseCertificateDate,
  certificateValidity,
  setShowExpertiseDialog,
  marketValueUsd,
  setMarketValueUsd,
  titleAgeAutoDetected,
  titleIssueDateFromCCC,
  titleAge,
  setTitleAge,
  setTitleAgeAutoDetected,
  fees,
  selectedFees,
  handleFeeToggle,
  mutationFeesCalculation,
  showLateFees,
  ownerAcquisitionDate,
  ownerAcquisitionDateAutoDetected,
  manualAcquisitionDate,
  setManualAcquisitionDate,
  lateFeesCalculation,
  justification,
  setJustification,
  totalAmount,
  handlePreview,
}) => {
  const renderAdminFeesSection = () => (
    <Card className="border-2 border-amber-200 dark:border-amber-700 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Frais administratifs de mutation
        </h4>
        <div className="space-y-2">
          {fees.length > 0 ? (
            fees.map((fee) => {
              const isSelected = selectedFees.includes(fee.id);
              return (
                <div
                  key={fee.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 border-2 border-primary/30' : 'bg-muted/30 border-2 border-transparent hover:border-muted'}`}
                  onClick={() => handleFeeToggle(fee.id, fee.is_mandatory)}
                >
                  <Checkbox checked={isSelected} disabled={fee.is_mandatory} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{fee.fee_name}</span>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">${fee.amount_usd.toFixed(2)}</span>
                    </div>
                    {fee.description && <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>}
                    {fee.is_mandatory && <span className="text-[10px] text-muted-foreground italic">Obligatoire</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">Aucun frais actif configuré.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        {/* Info parcelle */}
        <Card className="bg-primary/5 border-primary/20 rounded-xl shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold text-sm truncate">{parcelNumber}</p>
                {parcelData?.province && (
                  <p className="text-xs text-muted-foreground truncate">
                    {parcelData.province} {parcelData.ville && `• ${parcelData.ville}`}
                  </p>
                )}
                {parcelData?.current_owner_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    Propriétaire : <span className="font-medium text-foreground">{parcelData.current_owner_name}</span>
                  </p>
                )}
              </div>
            </div>
            {parcelData?.is_title_in_current_owner_name === false && (
              <Alert className="mt-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-700 dark:text-orange-400">
                  Le titre foncier n'est pas au nom du propriétaire actuel. Cette situation peut complexifier la procédure de mutation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Type de mutation */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Type de mutation *
            <SectionHelpPopover title="Type de mutation" description="Choisissez le type d'opération juridique : vente, donation, succession, etc. Ce choix détermine les documents requis et les frais applicables." />
          </Label>
          <Select value={mutationType} onValueChange={setMutationType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {MUTATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">{mutationTypeDetails?.description}</p>
        </div>

        {/* Documents justificatifs */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Documents justificatifs
              <SectionHelpPopover title="Documents justificatifs" description="Joignez les pièces justificatives nécessaires selon le type de mutation. Max 10MB par fichier." />
            </h4>
            <div className="space-y-2">
              {allRequiredDocuments.map((doc) => {
                const isCheckable = doc.required && !doc.handledByExpertiseCertificate;
                return (
                  <div key={doc.key} className="rounded-lg border p-2">
                    <p className={`text-xs flex items-center gap-1 ${doc.required ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                      {doc.required ? <AlertCircle className="h-3 w-3 flex-shrink-0" /> : <FileText className="h-3 w-3 flex-shrink-0" />}
                      {doc.label} {doc.required && '*'}
                      {doc.handledByExpertiseCertificate && (
                        <span className="text-[10px] ml-1 text-green-600 dark:text-green-400">(section expertise ci-dessous)</span>
                      )}
                    </p>
                    {isCheckable && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Checkbox
                          id={`doc-check-${doc.key}`}
                          checked={!!requiredDocumentChecks[doc.key]}
                          onCheckedChange={(checked) => setRequiredDocumentChecks((prev) => ({ ...prev, [doc.key]: !!checked }))}
                        />
                        <Label htmlFor={`doc-check-${doc.key}`} className="text-[10px] text-muted-foreground cursor-pointer">
                          Je confirme disposer de ce document
                        </Label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5">
              <Upload className="h-4 w-4 mr-2" />
              Ajouter des documents
            </Button>
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                    {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-primary flex-shrink-0" />}
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-7 w-7 rounded-lg hover:bg-destructive/10">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qualité du demandeur */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Qualité du demandeur
            <SectionHelpPopover title="Qualité du demandeur" description="Indiquez si vous êtes le propriétaire actuel ou si vous agissez en tant que mandataire/représentant." />
          </Label>
          <Select value={requesterType} onValueChange={setRequesterType}>
            <SelectTrigger className="h-11 text-sm rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {REQUESTER_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-sm py-2">{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nouveau propriétaire (transfert uniquement) */}
        {isTransferMutation && (
          <Card className="border-2 border-primary/20 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                Nouveau propriétaire
              </h4>
              <div className="space-y-2">
                <Label className="text-sm">Statut juridique</Label>
                <Select value={beneficiaryLegalStatus} onValueChange={setBeneficiaryLegalStatus}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {LEGAL_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {beneficiaryLegalStatus === 'personne_physique' ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nom de famille *</Label>
                    <Input value={beneficiaryLastName} onChange={(e) => setBeneficiaryLastName(e.target.value)} placeholder="Nom de famille" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Post-nom</Label>
                    <Input value={beneficiaryMiddleName} onChange={(e) => setBeneficiaryMiddleName(e.target.value)} placeholder="Post-nom (optionnel)" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Prénom *</Label>
                    <Input value={beneficiaryFirstName} onChange={(e) => setBeneficiaryFirstName(e.target.value)} placeholder="Prénom" className="h-11 text-sm rounded-xl border-2" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm">Dénomination sociale *</Label>
                  <Input value={beneficiaryLastName} onChange={(e) => setBeneficiaryLastName(e.target.value)} placeholder="Nom de l'entreprise" className="h-11 text-sm rounded-xl border-2" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">Téléphone (optionnel)</Label>
                <Input value={beneficiaryPhone} onChange={(e) => setBeneficiaryPhone(e.target.value)} placeholder="+243 XXX XXX XXX" className="h-11 text-sm rounded-xl border-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificat d'expertise immobilière (types qui l'exigent) */}
        {requiresCertificate && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certificat d'expertise immobilière
                </h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-background border shadow-lg" align="start" sideOffset={5}>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2"><Award className="h-4 w-4" /> Information importante</p>
                      <p className="text-xs text-muted-foreground">Un certificat d'expertise immobilière est requis pour les mutations. Ce certificat est valable <strong>6 mois</strong> après sa date de délivrance.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Avez-vous déjà un certificat d'expertise immobilière ?</Label>
                <RadioGroup value={hasExpertiseCertificate || ''} onValueChange={(value) => setHasExpertiseCertificate(value as 'yes' | 'no')} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="cert-yes" />
                    <Label htmlFor="cert-yes" className="text-sm cursor-pointer">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="cert-no" />
                    <Label htmlFor="cert-no" className="text-sm cursor-pointer">Non</Label>
                  </div>
                </RadioGroup>
              </div>

              {hasExpertiseCertificate === 'yes' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Certificat d'expertise *</Label>
                    <input ref={expertiseCertificateInputRef} type="file" accept="image/*,.pdf" onChange={handleExpertiseCertificateSelect} className="hidden" />
                    {expertiseCertificateFile ? (
                      <div className="flex items-center gap-2 p-2 bg-background rounded-xl border-2 border-green-500/30">
                        {expertiseCertificateFile.type.startsWith('image/') ? <Image className="h-4 w-4 text-green-600 flex-shrink-0" /> : <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />}
                        <span className="flex-1 truncate text-sm">{expertiseCertificateFile.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setExpertiseCertificateFile(null)} className="h-7 w-7 rounded-lg hover:bg-destructive/10"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => expertiseCertificateInputRef.current?.click()} className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter le certificat (PDF ou image)
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date de délivrance *</Label>
                    <Input type="date" value={expertiseCertificateDate} onChange={(e) => setExpertiseCertificateDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="h-11 text-sm rounded-xl border-2" />
                    {expertiseCertificateDate && (
                      certificateValidity.isExpired ? (
                        <Alert className="bg-destructive/10 border-destructive/20 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-xs text-destructive">Ce certificat a expiré. Veuillez demander un nouveau certificat d'expertise.</AlertDescription>
                        </Alert>
                      ) : certificateValidity.daysRemaining <= 30 ? (
                        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-lg mt-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">Ce certificat expire dans {certificateValidity.daysRemaining} jours.</AlertDescription>
                        </Alert>
                      ) : (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="h-3 w-3" /> Certificat valide ({certificateValidity.daysRemaining} jours restants)</p>
                      )
                    )}
                  </div>
                </div>
              )}

              {hasExpertiseCertificate === 'no' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg">
                    <FileSearch className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                      Un certificat d'expertise immobilière est nécessaire pour procéder à la mutation. Vous pouvez en demander un en cliquant ci-dessous.
                    </AlertDescription>
                  </Alert>
                  <Button type="button" variant="seloger" onClick={() => setShowExpertiseDialog(true)} className="w-full h-11 text-sm rounded-xl">
                    <FileSearch className="h-4 w-4 mr-2" />
                    Demander un certificat
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Valeur vénale */}
              {hasExpertiseCertificate === 'yes' && (
                <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valeur vénale du bien (USD) *</Label>
                    <p className="text-xs text-muted-foreground">Cette valeur doit correspondre à celle indiquée dans le certificat d'expertise.</p>
                    <Input type="number" value={marketValueUsd} onChange={(e) => setMarketValueUsd(e.target.value)} placeholder="Ex: 50000" className="h-11 text-sm rounded-xl border-2" min="0" />
                  </div>

                  {parseFloat(marketValueUsd) >= 10000 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Ancienneté du titre foncier *</Label>
                        {titleAgeAutoDetected && titleIssueDateFromCCC && (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Auto-détecté</span>
                        )}
                      </div>
                      {titleAgeAutoDetected && titleIssueDateFromCCC && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                            Date de délivrance du titre : <strong>{format(new Date(titleIssueDateFromCCC), 'dd MMMM yyyy', { locale: fr })}</strong><br />Le taux a été automatiquement déterminé selon les données CCC de la parcelle.
                          </AlertDescription>
                        </Alert>
                      )}
                      <RadioGroup value={titleAge || ''} onValueChange={(v) => { setTitleAge(v as 'less_than_10' | '10_or_more'); setTitleAgeAutoDetected(false); }} className="space-y-2">
                        <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${titleAge === 'less_than_10' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <RadioGroupItem value="less_than_10" id="age-lt10" />
                          <div>
                            <Label htmlFor="age-lt10" className="text-sm font-medium cursor-pointer">Moins de 10 ans</Label>
                            <p className="text-xs text-muted-foreground">Taux de mutation : 3%</p>
                          </div>
                        </div>
                        <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors ${titleAge === '10_or_more' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <RadioGroupItem value="10_or_more" id="age-gte10" />
                          <div>
                            <Label htmlFor="age-gte10" className="text-sm font-medium cursor-pointer">10 ans ou plus</Label>
                            <p className="text-xs text-muted-foreground">Taux de mutation : 1.5% (sans frais bancaires)</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Fees section ===== */}
        {renderAdminFeesSection()}

        {/* Mutation fees (transfer types only) */}
        {mutationFeesCalculation.applicable && (
          <Card className="border-2 border-primary/20 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Frais de mutation calculés
              </h4>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border-2 border-primary/20">
                <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5"><DollarSign className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Frais de mutation ({mutationFeesCalculation.percentage}%)</span>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">${mutationFeesCalculation.mutationFee.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Basé sur la valeur vénale de ${parseFloat(marketValueUsd).toLocaleString()} USD</p>
                </div>
              </div>
              {mutationFeesCalculation.bankFee > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-800">
                  <div className="p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg mt-0.5"><CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Frais bancaires (0.5%)</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">${mutationFeesCalculation.bankFee.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Commission bancaire estimée</p>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground px-1">Circulaire n° 005/CAB/MIN/AFF.FONC/2013 • n°0076/2023 et 010/CAB/MIN.FINANCES/2023</p>
            </CardContent>
          </Card>
        )}

        {/* Late fees section */}
        {showLateFees && (
          <MutationLateFeeSection
            ownerAcquisitionDate={ownerAcquisitionDate}
            ownerAcquisitionDateAutoDetected={ownerAcquisitionDateAutoDetected}
            manualAcquisitionDate={manualAcquisitionDate}
            onManualAcquisitionDateChange={setManualAcquisitionDate}
            lateFeesCalculation={lateFeesCalculation}
          />
        )}

        {/* Justification / notes utilisateur */}
        <Card className="border rounded-xl">
          <CardContent className="p-3 space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes / Justification (optionnel)
              <SectionHelpPopover title="Justification" description="Ajoutez des informations ou explications complémentaires pour accompagner votre demande de mutation." />
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ajoutez une justification ou des notes complémentaires..."
              className="min-h-[60px] text-sm rounded-xl border-2 resize-none"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{justification.length}/1000</p>
          </CardContent>
        </Card>

        {/* Total à payer */}
        <Card className="border rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
              <span className="font-semibold text-sm">Total à payer</span>
              <span className="text-xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handlePreview}
          className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg"
          disabled={fees.length > 0 && selectedFees.length === 0}
        >
          <Eye className="h-4 w-4 mr-2" />
          Aperçu avant soumission
        </Button>
      </div>
    </ScrollArea>
  );
};

export default FormStep;
