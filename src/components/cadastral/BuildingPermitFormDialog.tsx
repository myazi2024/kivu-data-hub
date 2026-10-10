import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Building2, FileCheck, CheckCircle2, Plus, X, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import SectionHelpPopover from './SectionHelpPopover';
import { normalizePermitNumber, isValidPermitNumber, estimatePermitStatus, permitExpiryDate, PERMIT_VALIDITY_OPTIONS } from '@/lib/buildingPermitRules';

interface BuildingPermitFormDialogProps {
  parcelNumber: string;
  permitType: 'construction' | 'regularisation';
  /** Appelé à la fermeture (après confirmation si des données sont saisies). */
  onClose: () => void;
}

type Step = 'form' | 'preview' | 'confirmation';

interface PermitRecord {
  permitNumber: string;
  issueDate: string;
  issuingService: string;
  validityPeriod: string;
  permitFile: File | null;
}

const BuildingPermitFormDialog: React.FC<BuildingPermitFormDialogProps> = ({
  parcelNumber,
  permitType,
  onClose,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  
  const [permitRecord, setPermitRecord] = useState<PermitRecord>({
    permitNumber: '',
    issueDate: '',
    issuingService: '',
    validityPeriod: '36',
    permitFile: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConstruction = permitType === 'construction';
  const title = isConstruction ? 'Autorisation de bâtir' : 'Autorisation de régularisation';
  const iconColor = isConstruction ? 'text-blue-600' : 'text-green-600';
  const bgColor = isConstruction ? 'bg-blue-500/10' : 'bg-green-500/10';
  const gradientFrom = isConstruction ? 'from-blue-500' : 'from-green-500';
  const gradientTo = isConstruction ? 'to-blue-600' : 'to-green-600';
  const IconComponent = isConstruction ? Building2 : FileCheck;

  const updatePermit = (field: keyof PermitRecord, value: string | File | null) => {
    setPermitRecord(prev => ({ ...prev, [field]: value }));
  };

  const validityMonths = parseInt(permitRecord.validityPeriod, 10) || 36;
  // Estimation affichée ; le statut enregistré est calculé par le serveur.
  const calculatedStatus = useMemo(
    () => estimatePermitStatus(permitRecord.issueDate, validityMonths),
    [permitRecord.issueDate, validityMonths],
  );
  const expiryLabel = permitExpiryDate(permitRecord.issueDate, validityMonths)?.toLocaleDateString('fr-FR') ?? 'N/A';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValid) {
        toast.error('Format non supporté (images ou PDF uniquement)');
        return;
      }
      if (!isValidSize) {
        toast.error('Fichier trop volumineux (max 10MB)');
        return;
      }
      
      updatePermit('permitFile', file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    updatePermit('permitFile', null);
  };

  const validateForm = (): boolean => {
    if (!permitRecord.permitNumber || !permitRecord.issueDate || !permitRecord.issuingService) {
      toast.error('Veuillez remplir les champs obligatoires: N° autorisation, Date, Service émetteur');
      return false;
    }

    if (!isValidPermitNumber(permitRecord.permitNumber)) {
      toast.error('Format du N° autorisation invalide. Utilisez un format tel que PC-2024-001, AB/2024/00123 ou URB.2024.0001');
      return false;
    }

    // Validate date is not in the future
    if (permitRecord.issueDate > new Date().toISOString().slice(0, 10)) {
      toast.error('La date de délivrance ne peut pas être dans le futur');
      return false;
    }

    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setStep('preview');
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }
    setLoading(true);
    let uploadedFilePath: string | null = null;
    try {
      // Document dans le dossier de l'utilisateur (seul dossier autorisé en écriture).
      if (permitRecord.permitFile) {
        const fileExt = permitRecord.permitFile.name.split('.').pop();
        const path = `${user.id}/permit-documents/permit_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('cadastral-documents').upload(path, permitRecord.permitFile);
        if (uploadError) {
          toast.error("Échec de l'envoi du document. Aucune autorisation n'a été soumise.");
          return;
        }
        uploadedFilePath = path;
      }

      // Le serveur valide, contrôle les doublons, calcule le statut et notifie.
      const { error } = await (supabase.rpc as any)('submit_building_permit_contribution', {
        p_parcel_number: parcelNumber,
        p_permit_type: permitType === 'regularisation' ? 'regularization' : 'construction',
        p_permit_number: normalizePermitNumber(permitRecord.permitNumber),
        p_issue_date: permitRecord.issueDate,
        p_validity_months: validityMonths,
        p_issuing_service: permitRecord.issuingService,
        p_document_path: uploadedFilePath,
      });
      if (error) {
        if (uploadedFilePath) await supabase.storage.from('cadastral-documents').remove([uploadedFilePath]);
        toast.error(error.message || "Erreur lors de l'enregistrement");
        return;
      }
      setStep('confirmation');
      toast.success(`${title} soumise pour validation`);
    } finally {
      setLoading(false);
    }
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (step === 'confirmation') return false;
    return !!(
      permitRecord.permitNumber ||
      permitRecord.issueDate ||
      permitRecord.issuingService ||
      permitRecord.permitFile ||
      permitRecord.validityPeriod !== '36'
    );
  };

  const resetAndClose = () => {
    setStep('form');
    setPermitRecord({
      permitNumber: '',
      issueDate: '',
      issuingService: '',
      validityPeriod: '36',
      permitFile: null
    });
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setConfirmClose(true);
      return;
    }
    resetAndClose();
  };

  // Inline validation hint for permit number
  const permitNumberHint = useMemo(() => {
    if (!permitRecord.permitNumber) return null;
    if (isValidPermitNumber(permitRecord.permitNumber)) return null;
    return 'Format attendu: XX-YYYY-NNN (ex: PC-2024-001)';
  }, [permitRecord.permitNumber]);

  const renderFormStep = () => (
    <div className="space-y-3">
      {/* Formulaire compact */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-xs font-medium">N° Autorisation *</Label>
          <Input
            placeholder="ex: PC-2024-001"
            value={permitRecord.permitNumber}
            onChange={(e) => updatePermit('permitNumber', e.target.value)}
            className={`h-9 text-sm rounded-xl ${permitNumberHint ? 'border-orange-400 focus-visible:ring-orange-400' : ''}`}
          />
          {permitNumberHint && (
            <p className="text-[10px] text-orange-500 mt-0.5">{permitNumberHint}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Date délivrance *</Label>
          <Input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={permitRecord.issueDate}
            onChange={(e) => updatePermit('issueDate', e.target.value)}
            className="h-9 text-sm rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Service émetteur *</Label>
        <BuildingPermitIssuingServiceSelect
          value={permitRecord.issuingService}
          onValueChange={(value) => updatePermit('issuingService', value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Validité (mois)</Label>
          <Select
            value={permitRecord.validityPeriod}
            onValueChange={(value) => updatePermit('validityPeriod', value)}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl">
              <SelectValue placeholder="Durée" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-popover">
              {PERMIT_VALIDITY_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Statut (estimé)</Label>
          <div className={`h-9 flex items-center px-3 rounded-xl border text-sm font-medium ${
            calculatedStatus === 'Valide' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
            calculatedStatus === 'Expiré' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
            'bg-muted text-muted-foreground border-border'
          }`}>
            {calculatedStatus}
          </div>
        </div>
      </div>

      {/* Pièce jointe */}
      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          Document de l'autorisation (optionnel)
          <SectionHelpPopover
            title="Document de l'autorisation"
            description="Joignez une copie numérique de l'autorisation (scan ou photo)."
          />
        </Label>
        {!permitRecord.permitFile ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 w-full text-xs h-9 rounded-xl border-dashed border-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Joindre l'autorisation
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs flex-1 truncate">{permitRecord.permitFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1 h-10 rounded-xl text-xs"
        >
          Annuler
        </Button>
        <Button
          onClick={handlePreview}
          className={`flex-1 h-10 rounded-xl text-xs bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
        >
          Prévisualiser
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-3">
      <Card className="rounded-xl shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-7 w-7 rounded-lg ${bgColor} flex items-center justify-center`}>
              <IconComponent className={`h-3.5 w-3.5 ${iconColor}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Récapitulatif</Label>
              <p className="text-[10px] text-muted-foreground">Vérifiez les informations</p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              ['Type', title],
              ['Parcelle', parcelNumber],
              ['N° Autorisation', normalizePermitNumber(permitRecord.permitNumber)],
              ['Date délivrance', permitRecord.issueDate],
              ['Service émetteur', permitRecord.issuingService],
              ['Validité', `${permitRecord.validityPeriod} mois`],
              ['Statut (estimé)', calculatedStatus],
              ['Date d\'expiration', expiryLabel],
              ...(permitRecord.permitFile ? [['Document joint', permitRecord.permitFile.name]] : []),
            ].map(([label, value], i, arr) => (
              <div key={label as string} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}>
                <span className="text-muted-foreground">{label as string}</span>
                <span className="font-medium text-right max-w-[55%]">{value as string}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5">
        <p className="text-[10px] text-destructive font-medium text-center">
          ⚠️ Après soumission, les informations ne pourront plus être modifiées.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setStep('form')}
          className="flex-1 h-10 rounded-xl text-xs gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Modifier
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex-1 h-10 rounded-xl text-xs bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Soumettre'}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-3 text-center py-4">
      <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-7 w-7 text-green-600" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title} soumise</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Votre {title.toLowerCase()} pour la parcelle {parcelNumber} a été soumise. Elle sera ajoutée à la parcelle après validation par l'administration.
        </p>
        <div className={`mt-2 p-2.5 rounded-xl border ${isConstruction ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'}`}>
          <p className={`text-[10px] ${isConstruction ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
            🎁 Un <strong>code CCC</strong> sera généré après validation par l'administration.
          </p>
        </div>
      </div>
      <Button onClick={handleClose} className="w-full h-10 rounded-xl text-xs">
        Fermer
      </Button>
    </div>
  );

  const formContent = (
    <>
      {step === 'form' && renderFormStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'confirmation' && renderConfirmationStep()}
    </>
  );

  return (
    <div className="px-4 pb-4">
      {formContent}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Fermer le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription>Les informations saisies seront perdues.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => { setConfirmClose(false); resetAndClose(); }}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuildingPermitFormDialog;
