import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Building2, FileCheck, CheckCircle2, Upload, X, Plus, Info, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SectionHelpPopover from './SectionHelpPopover';

interface BuildingPermitFormDialogProps {
  parcelNumber: string;
  parcelId?: string;
  permitType: 'construction' | 'regularisation';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'preview' | 'confirmation';

interface PermitRecord {
  permitNumber: string;
  issueDate: string;
  issuingService: string;
  issuingServiceContact: string;
  validityPeriod: string;
  administrativeStatus: string;
  permitFile: File | null;
}

const BuildingPermitFormDialog: React.FC<BuildingPermitFormDialogProps> = ({
  parcelNumber,
  parcelId,
  permitType,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  
  const [permitRecord, setPermitRecord] = useState<PermitRecord>({
    permitNumber: '',
    issueDate: '',
    issuingService: '',
    issuingServiceContact: '',
    validityPeriod: '12',
    administrativeStatus: 'Valide',
    permitFile: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConstruction = permitType === 'construction';
  const title = isConstruction ? 'Permis de construire' : 'Permis de régularisation';
  const icon = isConstruction ? Building2 : FileCheck;
  const iconColor = isConstruction ? 'text-blue-600' : 'text-green-600';
  const bgColor = isConstruction ? 'bg-blue-500/10' : 'bg-green-500/10';
  const gradientFrom = isConstruction ? 'from-blue-500' : 'from-green-500';
  const gradientTo = isConstruction ? 'to-blue-600' : 'to-green-600';

  const updatePermit = (field: keyof PermitRecord, value: string | File | null) => {
    setPermitRecord(prev => ({ ...prev, [field]: value }));
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
    try {
      // Upload du fichier si présent
      let documentUrl = null;
      if (permitRecord.permitFile) {
        const fileExt = permitRecord.permitFile.name.split('.').pop();
        const fileName = `permit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `permit-documents/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, permitRecord.permitFile);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        documentUrl = data.publicUrl;
      }

      // Créer l'enregistrement du permis via une contribution
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
            administrative_status: permitRecord.administrativeStatus,
            permit_type: permitType,
            document_url: documentUrl
          }]
        });

      if (error) throw error;

      // Créer une notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `${title} soumis`,
        message: `Votre ${title.toLowerCase()} pour la parcelle ${parcelNumber} a été soumis avec succès.`,
        type: 'success'
      });

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
      administrativeStatus: 'Valide',
      permitFile: null
    });
    onOpenChange(false);
  };

  const IconComponent = icon;

  const renderFormStep = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-xl ${bgColor} flex items-center justify-center`}>
                <IconComponent className={`h-4 w-4 ${iconColor}`} />
              </div>
              <div>
                <Label className="text-base font-semibold flex items-center gap-1.5">
                  {title}
                  <SectionHelpPopover
                    title={title}
                    description={isConstruction 
                      ? "Enregistrez un permis de construire délivré par l'autorité compétente. Renseignez le numéro, la date de délivrance et le service émetteur."
                      : "Régularisez une construction existante en fournissant les informations du permis de régularisation obtenu auprès de l'administration."}
                  />
                </Label>
                <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-xl" align="end">
                <div className="space-y-2 text-xs">
                  <h4 className="font-semibold text-sm">{title}</h4>
                  <p className="text-muted-foreground">
                    {isConstruction 
                      ? 'Enregistrez un nouveau permis de construire pour cette parcelle.'
                      : 'Régularisez une construction existante avec ce permis.'}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">N° Permis *</Label>
              <Input
                placeholder="ex: PC-2024-001"
                value={permitRecord.permitNumber}
                onChange={(e) => updatePermit('permitNumber', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date délivrance *</Label>
              <Input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={permitRecord.issueDate}
                onChange={(e) => updatePermit('issueDate', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Service émetteur *</Label>
            <BuildingPermitIssuingServiceSelect
              value={permitRecord.issuingService}
              onValueChange={(value) => updatePermit('issuingService', value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Contact service</Label>
            <Input
              placeholder="Téléphone ou email du service"
              value={permitRecord.issuingServiceContact}
              onChange={(e) => updatePermit('issuingServiceContact', e.target.value)}
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Validité (mois)</Label>
              <Select
                value={permitRecord.validityPeriod}
                onValueChange={(value) => updatePermit('validityPeriod', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
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
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Statut</Label>
              <Select
                value={permitRecord.administrativeStatus}
                onValueChange={(value) => updatePermit('administrativeStatus', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  <SelectItem value="Valide">Valide</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Expiré">Expiré</SelectItem>
                  <SelectItem value="Suspendu">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pièce jointe */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Document du permis (optionnel)
              <SectionHelpPopover
                title="Document du permis"
                description="Joignez une copie numérique du permis de construire (scan ou photo). Ce document sera vérifié par l'administration lors de la validation."
              />
            </Label>
            {!permitRecord.permitFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2"
              >
                <Plus className="h-4 w-4" />
                Joindre le permis
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{permitRecord.permitFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <X className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleClose}
          className="flex-1 h-11 rounded-xl"
        >
          Annuler
        </Button>
        <Button
          onClick={handlePreview}
          className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
        >
          Prévisualiser
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-xl ${bgColor} flex items-center justify-center`}>
              <IconComponent className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div>
              <Label className="text-base font-semibold">Récapitulatif</Label>
              <p className="text-xs text-muted-foreground">Vérifiez les informations</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Type</span>
              <span className="font-semibold">{title}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">N° Permis</span>
              <span className="font-semibold">{permitRecord.permitNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Date délivrance</span>
              <span>{permitRecord.issueDate}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Service émetteur</span>
              <span className="text-right max-w-[60%]">{permitRecord.issuingService}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Validité</span>
              <span>{permitRecord.validityPeriod} mois</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Statut</span>
              <span>{permitRecord.administrativeStatus}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setStep('form')}
          className="flex-1 h-11 rounded-xl gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Modifier
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Soumettre'}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-4 text-center py-6">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title} enregistré</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre {title.toLowerCase()} pour la parcelle {parcelNumber} a été soumis avec succès.
        </p>
        <div className={`mt-3 p-3 rounded-xl border ${isConstruction ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'}`}>
          <p className={`text-xs ${isConstruction ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
            🎁 Un <strong>code CCC</strong> sera généré après validation par l'administration. 
            Sa valeur dépendra de la complétude des informations fournies.
          </p>
        </div>
      </div>
      <Button onClick={handleClose} className="w-full h-11 rounded-xl">
        Fermer
      </Button>
    </div>
  );

  // Reset showIntro when dialog opens
  useEffect(() => {
    if (open) {
      setShowIntro(true);
    }
  }, [open]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const introConfig = isConstruction ? FORM_INTRO_CONFIGS.permit_add : FORM_INTRO_CONFIGS.permit_regularization;

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={introConfig}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] overflow-hidden z-[1200]`}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <IconComponent className={`h-5 w-5 ${iconColor}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isConstruction 
              ? 'Enregistrez un nouveau permis de construire'
              : 'Régularisez une construction existante'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-4">
            {step === 'form' && renderFormStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'confirmation' && renderConfirmationStep()}
          </div>
        </ScrollArea>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire de permis de construire." />}
    </Dialog>
  );
};

export default BuildingPermitFormDialog;
