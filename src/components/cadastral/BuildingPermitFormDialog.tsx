import React, { useState, useRef, useMemo } from 'react';
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

// Permit number format validation: flexible for DRC formats
// Supports: PC-2024-001, AB/2024/00123, PC.2024.001, URB-2024-001234, etc.
const PERMIT_NUMBER_REGEX = /^[A-Z]{2,6}[-/.]\d{4}[-/.]\d{2,6}$/i;

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

  // Normalize permit number: trim + uppercase
  const normalizePermitNumber = (value: string): string => value.trim().toUpperCase();

  const updatePermit = (field: keyof PermitRecord, value: string | File | null) => {
    setPermitRecord(prev => ({ ...prev, [field]: value }));
  };

  // Calculate administrative status automatically from issue date + validity (memoized)
  const calculatedStatus = useMemo((): string => {
    if (!permitRecord.issueDate || !permitRecord.validityPeriod) return 'En cours';
    const issueDate = new Date(permitRecord.issueDate);
    const validityMonths = parseInt(permitRecord.validityPeriod) || 36;
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
    return expiryDate > new Date() ? 'Valide' : 'Expiré';
  }, [permitRecord.issueDate, permitRecord.validityPeriod]);

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

    const normalized = normalizePermitNumber(permitRecord.permitNumber);

    // Validate permit number format
    if (!PERMIT_NUMBER_REGEX.test(normalized)) {
      toast.error('Format du N° autorisation invalide. Utilisez un format tel que PC-2024-001, AB/2024/00123 ou URB.2024.0001');
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

    const normalizedPermitNumber = normalizePermitNumber(permitRecord.permitNumber);

    try {
      // Step 1: Check for duplicate permit number BEFORE upload (server-side filtered)
      const { data: existingContributions, error: dupError } = await supabase
        .from('cadastral_contributions')
        .select('id, building_permits')
        .eq('parcel_number', parcelNumber)
        .in('status', ['pending', 'approved', 'verified'])
        .not('building_permits', 'is', null);

      if (dupError) {
        console.error('Duplicate check error:', dupError);
        // Non-blocking: continue if duplicate check fails
      } else if (existingContributions) {
        const isDuplicate = existingContributions.some((contrib) => {
          const permits = contrib.building_permits;
          if (!Array.isArray(permits)) return false;
          return permits.some((bp: any) => {
            const existing = (bp.permitNumber || bp.permit_number || '').trim().toUpperCase();
            return existing === normalizedPermitNumber;
          });
        });

        if (isDuplicate) {
          toast.error(`Le numéro d'autorisation ${normalizedPermitNumber} existe déjà pour cette parcelle`);
          setLoading(false);
          return;
        }
      }

      // Step 2: Upload file if present (AFTER duplicate check)
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

      // Use memoized calculatedStatus (already in scope)

      // Standardize permit_type: always use 'construction' or 'regularization' (EN)
      const standardizedPermitType = permitType === 'regularisation' ? 'regularization' : 'construction';

      // Step 3: Insert contribution with camelCase JSON keys (matching PermitCard expectations)
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'update',
          status: 'pending',
          building_permits: [{
            permitNumber: normalizedPermitNumber,
            issueDate: permitRecord.issueDate,
            issuingService: permitRecord.issuingService,
            issuingServiceContact: permitRecord.issuingServiceContact,
            validityMonths: parseInt(permitRecord.validityPeriod) || 36,
            administrativeStatus: calculatedStatus,
            permitType: standardizedPermitType,
            documentUrl: documentUrl,
            isCurrent: true
          }]
        });

      if (error) {
        // Cleanup orphaned file if DB insert failed
        if (uploadedFilePath) {
          await supabase.storage.from('cadastral-documents').remove([uploadedFilePath]).catch(() => {});
        }
        throw error;
      }

      // Step 4: Send notification (non-blocking, fire-and-forget)
      supabase.from('notifications').insert({
        user_id: user.id,
        title: `${title} soumise`,
        message: `Votre ${title.toLowerCase()} pour la parcelle ${parcelNumber} a été soumise avec succès.`,
      }).then(({ error: notifErr }) => {
        if (notifErr) console.warn('Notification insert failed (non-blocking):', notifErr);
      });

      setStep('confirmation');
      toast.success(`${title} enregistrée avec succès`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
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
      permitRecord.issuingServiceContact ||
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
      issuingServiceContact: '',
      validityPeriod: '36',
      permitFile: null
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer ?');
      if (!confirmed) return;
    }
    resetAndClose();
  };

  // Inline validation hint for permit number
  const permitNumberHint = useMemo(() => {
    if (!permitRecord.permitNumber) return null;
    const normalized = normalizePermitNumber(permitRecord.permitNumber);
    if (PERMIT_NUMBER_REGEX.test(normalized)) return null;
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
              ['Statut', calculatedStatus],
              ['Date d\'expiration', (() => {
                if (!permitRecord.issueDate || !permitRecord.validityPeriod) return 'N/A';
                const d = new Date(permitRecord.issueDate);
                d.setMonth(d.getMonth() + (parseInt(permitRecord.validityPeriod) || 12));
                return d.toLocaleDateString('fr-FR');
              })()],
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
        <h3 className="text-base font-semibold">{title} enregistrée</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Votre {title.toLowerCase()} pour la parcelle {parcelNumber} a été soumise avec succès.
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
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire d'autorisation." />}
    </Dialog>
  );
};

export default BuildingPermitFormDialog;
