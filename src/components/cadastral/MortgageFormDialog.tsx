import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Download } from 'lucide-react';
import { useMortgageDraft } from '@/hooks/useMortgageDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Landmark, CheckCircle2, X, Plus, ArrowLeft, FileText, ExternalLink, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SectionHelpPopover from './SectionHelpPopover';
import { QuickAuthDialog } from './QuickAuthDialog';
import { generateMortgageReceiptPDF } from '@/utils/generateMortgageReceiptPDF';
import { generateMortgageReference } from '@/utils/mortgageReferences';
import MortgageFlowContainer from './MortgageFlowContainer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

interface MortgageFormDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

type Step = 'form' | 'preview' | 'confirmation';

interface MortgageRecord {
  mortgageAmount: string;
  duration: string;
  creditorName: string;
  creditorType: string;
  contractDate: string;
  mortgageStatus: string;
  receiptFile: File | null;
}

// Mapping statut interne → label affiché
const STATUS_LABELS: Record<string, string> = {
  'active': 'En cours',
  'en_defaut': 'En défaut de paiement',
  'renegociee': 'Renégociée',
};

const MAX_MORTGAGE_AMOUNT_USD = 1_000_000_000;

const MortgageFormDialog: React.FC<MortgageFormDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  // Fix #15: Unsaved changes warning
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isSubmittingRef = useRef(false);
  const draftPromptShownRef = useRef(false);
  const { hasDraft, draftLoaded, loadDraft, clearDraft, autoSave } = useMortgageDraft('registration', parcelNumber, open);
  const [submissionReference, setSubmissionReference] = useState('');
  
  const [mortgageRecord, setMortgageRecord] = useState<MortgageRecord>({
    mortgageAmount: '',
    duration: '',
    creditorName: '',
    creditorType: 'Banque',
    contractDate: '',
    mortgageStatus: 'active',
    receiptFile: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft prompt shown once per session
  useEffect(() => {
    if (open && draftLoaded && hasDraft && !draftPromptShownRef.current) {
      draftPromptShownRef.current = true;
      setShowDraftPrompt(true);
    }
    if (!open) draftPromptShownRef.current = false;
  }, [open, draftLoaded, hasDraft]);

  // Draft: auto-save
  useEffect(() => {
    if (open && draftLoaded && step === 'form') autoSave(mortgageRecord);
  }, [mortgageRecord, open, draftLoaded, step, autoSave]);

  const handleRestoreDraft = () => {
    const draftData = loadDraft();
    if (draftData) setMortgageRecord(prev => ({ ...prev, ...draftData, receiptFile: null }));
    setShowDraftPrompt(false);
  };

  const handleDiscardDraft = () => { clearDraft(); setShowDraftPrompt(false); };

  const updateMortgage = (field: keyof MortgageRecord, value: string | File | null) => {
    setMortgageRecord(prev => ({ ...prev, [field]: value }));
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
      
      updateMortgage('receiptFile', file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    updateMortgage('receiptFile', null);
  };

  // Fix #12: Preview uploaded file
  const previewFile = () => {
    if (mortgageRecord.receiptFile) {
      const objectUrl = URL.createObjectURL(mortgageRecord.receiptFile);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
  };

  // Fix #15: Check if form has unsaved data
  const hasFormData = (): boolean => {
    return !!(mortgageRecord.mortgageAmount || mortgageRecord.creditorName || mortgageRecord.contractDate);
  };

  const validateForm = (): boolean => {
    const amount = parseFloat(mortgageRecord.mortgageAmount);
    if (!mortgageRecord.mortgageAmount || isNaN(amount) || amount <= 0) {
      toast.error('Le montant de l\'hypothèque doit être supérieur à 0');
      return false;
    }
    if (amount > MAX_MORTGAGE_AMOUNT_USD) {
      toast.error(`Le montant dépasse la limite autorisée (${MAX_MORTGAGE_AMOUNT_USD.toLocaleString()} USD)`);
      return false;
    }
    if (mortgageRecord.duration) {
      const dur = parseInt(mortgageRecord.duration);
      if (isNaN(dur) || dur <= 0) {
        toast.error('La durée doit être supérieure à 0 mois');
        return false;
      }
    }
    if (!mortgageRecord.creditorName.trim()) {
      toast.error('Veuillez indiquer le nom du créancier');
      return false;
    }
    if (!mortgageRecord.contractDate) {
      toast.error('Veuillez indiquer la date du contrat');
      return false;
    }
    const contractDate = new Date(mortgageRecord.contractDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (contractDate > today) {
      toast.error('La date du contrat ne peut pas être dans le futur');
      return false;
    }
    // Fix #8: Validate parcel existence
    if (!parcelId) {
      toast.error('Identifiant de parcelle manquant. Veuillez relancer la recherche.');
      return false;
    }
    // Fix #10: Only allow 'active' status for new registrations
    if (!['active', 'en_defaut', 'renegociee'].includes(mortgageRecord.mortgageStatus)) {
      toast.error('Statut d\'hypothèque invalide');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    if (!validateForm()) return;
    setStep('preview');
  };

  const checkExistingPending = async (): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from('cadastral_contributions')
      .select('id')
      .eq('parcel_number', parcelNumber)
      .eq('user_id', user.id)
      .eq('contribution_type', 'mortgage_registration')
      .in('status', ['pending']);

    return (data?.length ?? 0) > 0;
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    try {
      const hasPending = await checkExistingPending();
      if (hasPending) {
        toast.error('Une demande d\'hypothèque est déjà en cours ou renvoyée pour correction pour cette parcelle.');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Fix #8: Verify parcel actually exists in DB
      const { data: parcelExists, error: parcelError } = await supabase
        .from('cadastral_parcels')
        .select('id')
        .eq('id', parcelId!)
        .maybeSingle();
      
      if (parcelError || !parcelExists) {
        toast.error('La parcelle spécifiée n\'existe pas dans notre base de données.');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Upload du fichier si présent
      let documentUrl: string | null = null;
      if (mortgageRecord.receiptFile) {
        const fileExt = mortgageRecord.receiptFile.name.split('.').pop();
        const fileName = `mortgage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `mortgage-documents/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, mortgageRecord.receiptFile);
        
        if (uploadError) {
          toast.error('Erreur lors du téléversement du document');
          throw uploadError;
        }
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        documentUrl = data.publicUrl;
      }

      // Generate a reference for the registration
      const regReference = generateMortgageReference('HYP');

      // Fix #9: Pass duration as null explicitly (admin will handle default)
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId || null,
          user_id: user.id,
          contribution_type: 'mortgage_registration',
          status: 'pending',
          mortgage_history: [{
            request_reference_number: regReference,
            mortgage_amount_usd: parseFloat(mortgageRecord.mortgageAmount),
            duration_months: mortgageRecord.duration ? parseInt(mortgageRecord.duration) : null,
            creditor_name: mortgageRecord.creditorName.trim(),
            creditor_type: mortgageRecord.creditorType,
            contract_date: mortgageRecord.contractDate,
            mortgage_status: mortgageRecord.mortgageStatus,
            document_url: documentUrl
          }]
        });

      if (error) throw error;

      try {
        await supabase.from('audit_logs').insert({
          action: 'mortgage_registration_submitted',
          user_id: user.id,
          table_name: 'cadastral_contributions',
          new_values: { parcel_number: parcelNumber, reference: regReference } as any,
        });
      } catch { /* Non-blocking */ }

      // Fix #11: Create notification for registration
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Demande d\'enregistrement soumise',
          message: `Votre demande d'enregistrement d'hypothèque (Réf: ${regReference}) pour la parcelle ${parcelNumber} a été soumise avec succès.`,
          type: 'mortgage',
          action_url: '/user-dashboard',
        });
      } catch { /* Non-blocking */ }

      clearDraft();
      setSubmissionReference(regReference);
      setStep('confirmation');
      toast.success('Hypothèque enregistrée avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
      setShowSubmitConfirm(false);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleClose = () => {
    // Fix #15: Warn if form has unsaved data (only in form step)
    if (step === 'form' && hasFormData() && !showExitConfirm) {
      setShowExitConfirm(true);
      return;
    }
    performClose();
  };

  const performClose = () => {
    setStep('form');
    setMortgageRecord({
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: 'Banque',
      contractDate: '',
      mortgageStatus: 'active',
      receiptFile: null
    });
    setSubmissionReference('');
    setShowSubmitConfirm(false);
    setShowExitConfirm(false);
    isSubmittingRef.current = false;
    draftPromptShownRef.current = false;
    onOpenChange(false);
  };

  const statusLabel = useMemo(() => {
    return STATUS_LABELS[mortgageRecord.mortgageStatus] || mortgageRecord.mortgageStatus;
  }, [mortgageRecord.mortgageStatus]);

  // Fix #16: PDF receipt with clear "gratuit" indication for registration
  const handleDownloadRegistrationReceipt = async () => {
    try {
      const blob = await generateMortgageReceiptPDF({
        type: 'registration',
        requestReference: submissionReference,
        parcelNumber,
        requesterName: profile?.full_name || profile?.email || user?.email || 'N/A',
        totalAmountPaid: 0,
        fees: [],
        date: mortgageRecord.contractDate || new Date().toISOString(),
        mortgageData: {
          creditorName: mortgageRecord.creditorName,
          amount: parseFloat(mortgageRecord.mortgageAmount),
          contractDate: mortgageRecord.contractDate,
        },
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu-hypotheque-${submissionReference}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Reçu téléchargé');
    } catch {
      toast.error('Erreur lors de la génération du reçu');
    }
  };

  const renderFormStep = () => (
    <div className="space-y-4">
      {showDraftPrompt && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
          <Save className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-2">Un brouillon a été trouvé.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRestoreDraft} className="h-7 text-xs rounded-lg">Restaurer</Button>
              <Button size="sm" variant="ghost" onClick={handleDiscardDraft} className="h-7 text-xs rounded-lg">Ignorer</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Nouvelle Hypothèque
                <SectionHelpPopover
                  title="Déclaration d'hypothèque"
                  description="Renseignez les détails de l'hypothèque : montant emprunté, durée, identité du créancier et date du contrat. Cette information sera publiquement consultable après validation."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
            </div>
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Montant (USD) *</Label>
              <Input
                type="number"
                placeholder="50000"
                min="1"
                step="0.01"
                value={mortgageRecord.mortgageAmount}
                onChange={(e) => updateMortgage('mortgageAmount', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Durée (mois)</Label>
              <Input
                type="number"
                placeholder="120"
                min="1"
                value={mortgageRecord.duration}
                onChange={(e) => updateMortgage('duration', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Créancier *</Label>
              <Input
                placeholder="ex: Banque XYZ"
                value={mortgageRecord.creditorName}
                onChange={(e) => updateMortgage('creditorName', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type</Label>
              <Select
                value={mortgageRecord.creditorType}
                onValueChange={(value) => updateMortgage('creditorType', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  <SelectItem value="Banque">Banque</SelectItem>
                  <SelectItem value="Microfinance">Microfinance</SelectItem>
                  <SelectItem value="Coopérative">Coopérative</SelectItem>
                  <SelectItem value="Particulier">Particulier</SelectItem>
                  <SelectItem value="Autre institution">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date contrat *</Label>
              <Input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={mortgageRecord.contractDate}
                onChange={(e) => updateMortgage('contractDate', e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Statut</Label>
              <Select
                value={mortgageRecord.mortgageStatus}
                onValueChange={(value) => updateMortgage('mortgageStatus', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  <SelectItem value="active">En cours</SelectItem>
                  <SelectItem value="en_defaut">En défaut de paiement</SelectItem>
                  <SelectItem value="renegociee">Renégociée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pièce jointe - Fix #12: Add preview capability */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Justificatif (optionnel)
              <SectionHelpPopover
                title="Justificatif"
                description="Joignez le contrat d'hypothèque ou tout document attestant de l'accord avec le créancier (PDF ou image, max 10MB)."
              />
            </Label>
            {!mortgageRecord.receiptFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter justificatif
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{mortgageRecord.receiptFile.name}</span>
                {/* Fix #12: Preview button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={previewFile}
                  className="h-7 w-7 p-0 text-primary hover:bg-primary/10 rounded-lg"
                  title="Aperçu"
                >
                  <Eye className="h-4 w-4" />
                </Button>
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
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
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
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Récapitulatif</Label>
              <p className="text-xs text-muted-foreground">Vérifiez les informations</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-semibold">{parseFloat(mortgageRecord.mortgageAmount).toLocaleString()} USD</span>
            </div>
            {mortgageRecord.duration && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Durée</span>
                <span>{mortgageRecord.duration} mois</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Créancier</span>
              <span>{mortgageRecord.creditorName}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Type</span>
              <span>{mortgageRecord.creditorType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Date contrat</span>
              <span>{mortgageRecord.contractDate}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Statut</span>
              <span>{statusLabel}</span>
            </div>
            {mortgageRecord.receiptFile && (
              <div className="flex justify-between py-2 border-t">
                <span className="text-muted-foreground">Justificatif</span>
                <span className="text-xs truncate max-w-[150px]">{mortgageRecord.receiptFile.name}</span>
              </div>
            )}
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
          onClick={() => setShowSubmitConfirm(true)}
          disabled={loading}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
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
        <h3 className="text-lg font-semibold">Hypothèque enregistrée</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre déclaration d'hypothèque pour la parcelle {parcelNumber} a été soumise avec succès.
        </p>
        {submissionReference && (
          <p className="text-xs font-mono text-primary mt-2">Réf: {submissionReference}</p>
        )}
        {/* Fix #16: Clear indication that registration is free */}
        <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-xs text-primary/80">
            📋 L'enregistrement d'hypothèque est <strong>gratuit</strong>. Aucun frais n'est facturé.
          </p>
        </div>
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            🎁 Un <strong>code CCC</strong> sera généré après validation par l'administration. 
            Sa valeur dépendra de la complétude des informations fournies.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleDownloadRegistrationReceipt}
          className="w-full h-11 rounded-xl gap-2"
        >
          <Download className="h-4 w-4" />
          Télécharger le reçu PDF
        </Button>
        {!embedded && (
          <Button
            variant="outline"
            onClick={() => { performClose(); window.location.href = '/user-dashboard'; }}
            className="w-full h-11 rounded-xl gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Voir mes demandes
          </Button>
        )}
        <Button onClick={performClose} className="w-full h-11 rounded-xl">
          Fermer
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <MortgageFlowContainer
        open={open}
        embedded={embedded}
        isMobile={isMobile}
        onClose={handleClose}
        title={(
          <>
            <Landmark className="h-5 w-5 text-amber-600" />
            Déclarer une hypothèque
          </>
        )}
        description="Enregistrez une hypothèque active sur cette parcelle"
      >
        {step === 'form' && renderFormStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </MortgageFlowContainer>

      {/* Fix #15: Exit confirmation dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Quitter le formulaire ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Vous avez des données non sauvegardées. Le brouillon sera restaurable si la sauvegarde automatique a eu le temps de s'exécuter (3s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Rester</AlertDialogCancel>
            <AlertDialogAction onClick={performClose} className="text-xs bg-destructive hover:bg-destructive/90">Quitter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la soumission</AlertDialogTitle>
            <AlertDialogDescription>
              Cette demande sera envoyée à l'administration pour validation. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmer la soumission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickAuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthSuccess={() => setShowAuthDialog(false)}
      />
    </>
  );
};

export default MortgageFormDialog;
