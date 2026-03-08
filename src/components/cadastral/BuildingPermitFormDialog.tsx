import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Building2, FileCheck, CheckCircle2, Plus, X, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import SectionHelpPopover from './SectionHelpPopover';

interface BuildingPermitFormDialogProps {
  parcelNumber: string;
  parcelId?: string;
  permitType: 'construction' | 'regularisation';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

type Step = 'form' | 'preview' | 'confirmation';

interface PermitRecord {
  permitNumber: string;
  issueDate: string;
  issuingService: string;
  issuingServiceContact: string;
  validityPeriod: string;
  permitFile: File | null;
}

// Permit number format validation: PC-YYYY-XXXXX or similar
const PERMIT_NUMBER_REGEX = /^[A-Z]{2,4}[-/]\d{4}[-/]\d{3,6}$/i;

const BuildingPermitFormDialog: React.FC<BuildingPermitFormDialogProps> = ({
  parcelNumber,
  parcelId,
  permitType,
  open,
  onOpenChange,
  embedded = false
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  
  const [permitRecord, setPermitRecord] = useState<PermitRecord>({
    permitNumber: '',
    issueDate: '',
    issuingService: '',
    issuingServiceContact: '',
    validityPeriod: '12',
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

  // Calculate administrative status automatically from issue date + validity
  const computedStatus = (): string => {
    if (!permitRecord.issueDate || !permitRecord.validityPeriod) return 'En cours';
    const issueDate = new Date(permitRecord.issueDate);
    const validityMonths = parseInt(permitRecord.validityPeriod) || 12;
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
    return expiryDate > new Date() ? 'Valide' : 'Expiré';
  };

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
      toast.error('Veuillez remplir les champs obligatoires: N° permis, Date, Service émetteur');
      return false;
    }

    // Validate permit number format
    if (!PERMIT_NUMBER_REGEX.test(permitRecord.permitNumber)) {
      toast.error('Format du N° permis invalide. Utilisez un format tel que PC-2024-001 ou AB/2024/00123');
      return false;
    }

    // Validate date is not in the future
    const issueDate = new Date(permitRecord.issueDate);
    if (issueDate > new Date()) {
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
    let documentUrl: string | null = null;

    try {
      // Step 1: Upload file if present
      if (permitRecord.permitFile) {
        const fileExt = permitRecord.permitFile.name.split('.').pop();
        const fileName = `permit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        uploadedFilePath = `permit-documents/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(uploadedFilePath, permitRecord.permitFile);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(uploadedFilePath);
        documentUrl = data.publicUrl;
      }

      const calculatedStatus = computedStatus();

      // Step 2: Check for duplicate permit number
      const { data: existingPermits } = await supabase
        .from('cadastral_contributions')
        .select('id')
        .eq('status', 'approved')
        .contains('building_permits', JSON.stringify([{ permit_number: permitRecord.permitNumber }]))
        .limit(1);

      if (existingPermits && existingPermits.length > 0) {
        toast.error(`Le numéro de permis ${permitRecord.permitNumber} existe déjà dans le système`);
        setLoading(false);
        return;
      }

      // Step 3: Insert contribution
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'update',
          status: 'pending',
          building_permits: [{
            permit_number: permitRecord.permitNumber,
            issue_date: permitRecord.issueDate,
            issuing_service: permitRecord.issuingService,
            issuing_service_contact: permitRecord.issuingServiceContact,
            validity_period_months: parseInt(permitRecord.validityPeriod) || 12,
            administrative_status: calculatedStatus,
            permit_type: permitType,
            document_url: documentUrl
          }]
        });

      if (error) {
        // Cleanup orphaned file if DB insert failed
        if (uploadedFilePath) {
          await supabase.storage.from('cadastral-documents').remove([uploadedFilePath]).catch(() => {});
        }
        throw error;
      }

      // Step 4: Send notification (non-blocking, with error handling)
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: `${title} soumis`,
          message: `Votre ${title.toLowerCase()} pour la parcelle ${parcelNumber} a été soumis avec succès.`,
          type: 'success'
        });
      } catch (notifErr) {
        console.warn('Notification insert failed (non-blocking):', notifErr);
      }

      setStep('confirmation');
      toast.success(`${title} enregistré avec succès`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setPermitRecord({
      permitNumber: '',
      issueDate: '',
      issuingService: '',
      issuingServiceContact: '',
      validityPeriod: '12',
      permitFile: null
    });
    onOpenChange(false);
  };

  const calculatedStatus = computedStatus();

  const renderFormStep = () => (
    <div className="space-y-3">
      {/* Formulaire compact */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-xs font-medium">N° Permis *</Label>
          <Input
            placeholder="ex: PC-2024-001"
            value={permitRecord.permitNumber}
            onChange={(e) => updatePermit('permitNumber', e.target.value)}
            className="h-9 text-sm rounded-xl"
          />
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

      <div className="space-y-1">
        <Label className="text-xs font-medium">Contact service</Label>
        <Input
          placeholder="Téléphone ou email du service"
          value={permitRecord.issuingServiceContact}
          onChange={(e) => updatePermit('issuingServiceContact', e.target.value)}
          className="h-9 text-sm rounded-xl"
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
              <SelectItem value="6">6 mois</SelectItem>
              <SelectItem value="12">12 mois</SelectItem>
              <SelectItem value="24">24 mois</SelectItem>
              <SelectItem value="36">36 mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Statut (auto)</Label>
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
          Document du permis (optionnel)
          <SectionHelpPopover
            title="Document du permis"
            description="Joignez une copie numérique de l'autorisation de bâtir (scan ou photo)."
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
            Joindre le permis
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
              ['N° Permis', permitRecord.permitNumber],
              ['Date délivrance', permitRecord.issueDate],
              ['Service émetteur', permitRecord.issuingService],
              ['Validité', `${permitRecord.validityPeriod} mois`],
              ['Statut', calculatedStatus],
            ].map(([label, value], i, arr) => (
              <div key={label} className={`flex justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}>
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right max-w-[55%]">{value}</span>
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
        <h3 className="text-base font-semibold">{title} enregistré</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Votre {title.toLowerCase()} pour la parcelle {parcelNumber} a été soumis avec succès.
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

  // Embedded mode: render directly without Dialog wrapper
  if (embedded) {
    return (
      <div className="px-4 pb-4">
        {formContent}
      </div>
    );
  }

  // Standalone mode with Dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[380px] rounded-2xl p-0 gap-0 max-h-[85vh] overflow-hidden z-[1200] flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <IconComponent className={`h-4 w-4 ${iconColor}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isConstruction 
              ? 'Enregistrez une nouvelle autorisation de bâtir'
              : 'Régularisez une construction existante'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 min-h-0 p-4">
          {formContent}
        </div>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire d'autorisation de bâtir." />}
    </Dialog>
  );
};

export default BuildingPermitFormDialog;
