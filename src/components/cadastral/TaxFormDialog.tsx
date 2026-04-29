import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Receipt, CheckCircle2, Upload, X, Plus, Info, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import SectionHelpPopover from './SectionHelpPopover';
import { validateNIF, NIF_FORMAT_ERROR } from './tax-calculator/taxFormConstants';

interface TaxFormDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  /** P0+P1 alignment: tag the recorded payment with the targeted construction. */
  constructionRef?: string;
  /** P0+P1 alignment: shared taxpayer state (NIF / owner / ID) across sub-forms. */
  taxpayer?: import('./tax-calculator/useSharedTaxpayer').SharedTaxpayer;
}

type Step = 'form' | 'preview' | 'confirmation';

interface TaxRecord {
  nif: string;
  taxType: string;
  taxYear: string;
  taxAmount: string;
  /** P1: partial payment support — remaining due after this payment (USD). */
  remainingAmount: string;
  paymentStatus: string;
  paymentDate: string;
  receiptFile: File | null;
}

const TaxFormDialog: React.FC<TaxFormDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false,
  constructionRef = 'main',
  taxpayer,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(!embedded);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const [taxRecord, setTaxRecord] = useState<TaxRecord>({
    nif: taxpayer?.nif || '',
    taxType: 'Impôt foncier annuel',
    taxYear: currentYear.toString(),
    taxAmount: '',
    remainingAmount: '',
    paymentStatus: 'Payé',
    paymentDate: '',
    receiptFile: null
  });

  // Keep NIF in sync with shared taxpayer state when injected.
  useEffect(() => {
    if (taxpayer?.nif && taxpayer.nif !== taxRecord.nif) {
      setTaxRecord(prev => ({ ...prev, nif: taxpayer.nif }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxpayer?.nif]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTax = (field: keyof TaxRecord, value: string | File | null) => {
    setTaxRecord(prev => ({ ...prev, [field]: value }));
    // Propagate NIF upward into shared taxpayer state so other sub-forms benefit.
    if (field === 'nif' && taxpayer) {
      taxpayer.setNif(typeof value === 'string' ? value : '');
    }
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
      
      updateTax('receiptFile', file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    updateTax('receiptFile', null);
  };

  const validateForm = (): boolean => {
    if (!taxRecord.nif.trim()) {
      toast.error('Veuillez renseigner le Numéro d\'Impôt (NIF)');
      return false;
    }
    if (!validateNIF(taxRecord.nif)) {
      toast.error(NIF_FORMAT_ERROR);
      return false;
    }
    if (!taxRecord.taxAmount || !taxRecord.taxYear) {
      toast.error('Veuillez remplir les champs obligatoires: Montant, Année');
      return false;
    }
    const amount = parseFloat(taxRecord.taxAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Le montant doit être un nombre positif');
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
      // Check for duplicate: single optimized query with contribution_type filter (#6 fix)
      const { data: existingContribs } = await supabase
        .from('cadastral_contributions')
        .select('id, tax_history')
        .eq('parcel_number', parcelNumber)
        .eq('user_id', user.id)
        .eq('contribution_type', 'update')
        .neq('status', 'rejected');

      if (existingContribs && existingContribs.length > 0) {
        const isDuplicate = existingContribs.some(c => {
          const history = c.tax_history as any[];
          return history?.some((h: any) =>
            h.tax_type === taxRecord.taxType &&
            String(h.tax_year) === taxRecord.taxYear
          );
        });

        if (isDuplicate) {
          toast.error(`Une déclaration "${taxRecord.taxType}" pour l'année ${taxRecord.taxYear} existe déjà pour cette parcelle.`);
          setLoading(false);
          return;
        }
      }

      // Upload file if present
      let documentUrl = null;
      if (taxRecord.receiptFile) {
        const fileExt = taxRecord.receiptFile.name.split('.').pop();
        const fileName = `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `tax-documents/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, taxRecord.receiptFile);
        
        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        documentUrl = data.publicUrl;
      }

      // Insert contribution
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'update',
          status: 'pending',
          tax_history: [{
            tax_type: taxRecord.taxType,
            tax_year: parseInt(taxRecord.taxYear),
            amount_usd: parseFloat(taxRecord.taxAmount),
            payment_status: taxRecord.paymentStatus,
            payment_date: taxRecord.paymentDate || null,
            receipt_document_url: documentUrl
          }]
        });

      if (error) {
        // Cleanup orphaned file if DB insert fails
        if (uploadedFilePath) {
          await supabase.storage.from('cadastral-documents').remove([uploadedFilePath]);
        }
        throw error;
      }

      // Fire-and-forget notification
      supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Taxe enregistrée',
        message: `Votre déclaration de taxe pour la parcelle ${parcelNumber} (${taxRecord.taxYear}) a été soumise avec succès.`,
        type: 'info'
      }).then(() => {});

      setStep('confirmation');
      toast.success('Taxe enregistrée avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setTaxRecord({
      nif: '',
      taxType: 'Impôt foncier annuel',
      taxYear: currentYear.toString(),
      taxAmount: '',
      paymentStatus: 'Payé',
      paymentDate: '',
      receiptFile: null
    });
    onOpenChange(false);
  };

  const renderFormStep = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Taxe foncière
                <SectionHelpPopover
                  title="Taxe foncière"
                  description="Enregistrez le paiement d'une taxe foncière pour cette parcelle. Précisez le type de taxe, l'année fiscale concernée et le montant payé."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
            </div>
          </div>

          {/* NIF */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Numéro d'Impôt (NIF) *</Label>
            <Input
              value={taxRecord.nif}
              onChange={(e) => updateTax('nif', e.target.value)}
              placeholder="Ex: A0123456B"
              className={`h-10 text-sm rounded-xl ${taxRecord.nif && !validateNIF(taxRecord.nif) ? 'border-destructive' : ''}`}
            />
            {taxRecord.nif && !validateNIF(taxRecord.nif) ? (
              <p className="text-xs text-destructive">{NIF_FORMAT_ERROR}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                6-15 caractères alphanumériques
              </p>
            )}
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type de taxe</Label>
              <Select
                value={taxRecord.taxType}
                onValueChange={(value) => updateTax('taxType', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  <SelectItem value="Impôt foncier annuel">Impôt foncier</SelectItem>
                  {/* #14 fix: Add "Taxe de bâtisse" option */}
                  <SelectItem value="Taxe de bâtisse">Taxe de bâtisse</SelectItem>
                  <SelectItem value="Impôt sur les revenus locatifs">Revenus locatifs</SelectItem>
                  <SelectItem value="Taxe de superficie">Superficie</SelectItem>
                  <SelectItem value="Taxe de plus-value immobilière">Plus-value</SelectItem>
                  <SelectItem value="Taxe d'habitation">Habitation</SelectItem>
                  <SelectItem value="Autre taxe">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Année *</Label>
              <Select
                value={taxRecord.taxYear}
                onValueChange={(value) => updateTax('taxYear', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = currentYear - i;
                    return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Montant (USD) *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                placeholder="150"
                value={taxRecord.taxAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    updateTax('taxAmount', val);
                  }
                }}
                className={`h-10 text-sm rounded-xl ${taxRecord.taxAmount && parseFloat(taxRecord.taxAmount) <= 0 ? 'border-destructive' : ''}`}
              />
              {taxRecord.taxAmount && parseFloat(taxRecord.taxAmount) <= 0 && (
                <p className="text-xs text-destructive">Le montant doit être positif</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Statut</Label>
              <Select
                value={taxRecord.paymentStatus}
                onValueChange={(value) => updateTax('paymentStatus', value)}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  <SelectItem value="Payé">Payé</SelectItem>
                  <SelectItem value="Payé partiellement">Partiel</SelectItem>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="En retard">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Date paiement</Label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={taxRecord.paymentDate}
              onChange={(e) => updateTax('paymentDate', e.target.value)}
              className="h-10 text-sm rounded-xl"
            />
          </div>

          {/* Pièce jointe */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Reçu (optionnel)
              <SectionHelpPopover
                title="Reçu de paiement"
                description="Joignez une copie du reçu de paiement de la taxe (photo ou PDF). Ce document servira de preuve de conformité fiscale lors de la validation."
              />
            </Label>
            {!taxRecord.receiptFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter reçu
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{taxRecord.receiptFile.name}</span>
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
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
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
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Récapitulatif</Label>
              <p className="text-xs text-muted-foreground">Vérifiez les informations</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">NIF</span>
              <span className="font-mono font-bold">{taxRecord.nif}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Type</span>
              <span>{taxRecord.taxType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Année</span>
              <span className="font-semibold">{taxRecord.taxYear}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-semibold">{parseFloat(taxRecord.taxAmount).toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Statut</span>
              <span>{taxRecord.paymentStatus}</span>
            </div>
            {taxRecord.paymentDate && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Date paiement</span>
                <span>{taxRecord.paymentDate}</span>
              </div>
            )}
            {taxRecord.receiptFile && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Reçu joint</span>
                <span className="text-xs font-medium text-primary truncate max-w-[180px]">{taxRecord.receiptFile.name}</span>
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
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
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
        <h3 className="text-lg font-semibold">Taxe enregistrée</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre déclaration de taxe pour la parcelle {parcelNumber} ({taxRecord.taxYear}) a été soumise avec succès.
        </p>
        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-700 dark:text-purple-300">
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

  // Reset showIntro when dialog opens (only in standalone mode)
  useEffect(() => {
    if (open && !embedded) {
      setShowIntro(true);
    }
  }, [open, embedded]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  if (showIntro && open && !embedded) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={FORM_INTRO_CONFIGS.tax}
      />
    );
  }

  // Embedded mode: render form content directly without Dialog wrapper
  if (embedded) {
    return (
      <div className="px-4 pb-4">
        {step === 'form' && renderFormStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] overflow-hidden`}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-purple-600" />
            Déclarer une taxe
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enregistrez le paiement d'une taxe foncière
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
      {/* #19 fix: Only render WhatsApp in standalone (non-embedded) mode */}
      {open && !embedded && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec le formulaire de taxe foncière." />}
    </Dialog>
  );
};

export default TaxFormDialog;
