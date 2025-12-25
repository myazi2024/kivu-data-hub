import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Landmark, CheckCircle2, Upload, X, Plus, Info, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MortgageFormDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const MortgageFormDialog: React.FC<MortgageFormDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  
  const [mortgageRecord, setMortgageRecord] = useState<MortgageRecord>({
    mortgageAmount: '',
    duration: '',
    creditorName: '',
    creditorType: 'Banque',
    contractDate: '',
    mortgageStatus: 'Active',
    receiptFile: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const validateForm = (): boolean => {
    if (!mortgageRecord.mortgageAmount || !mortgageRecord.creditorName || !mortgageRecord.contractDate) {
      toast.error('Veuillez remplir les champs obligatoires: Montant, Créancier, Date contrat');
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
      if (mortgageRecord.receiptFile) {
        const fileExt = mortgageRecord.receiptFile.name.split('.').pop();
        const fileName = `mortgage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `mortgage-documents/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('cadastral-documents')
          .upload(filePath, mortgageRecord.receiptFile);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        documentUrl = data.publicUrl;
      }

      // Créer l'enregistrement de l'hypothèque via une contribution
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'update',
          status: 'pending',
          mortgage_history: [{
            mortgage_amount_usd: parseFloat(mortgageRecord.mortgageAmount),
            duration_months: parseInt(mortgageRecord.duration) || 0,
            creditor_name: mortgageRecord.creditorName,
            creditor_type: mortgageRecord.creditorType,
            contract_date: mortgageRecord.contractDate,
            mortgage_status: mortgageRecord.mortgageStatus,
            document_url: documentUrl
          }]
        });

      if (error) throw error;

      // Créer une notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Hypothèque soumise',
        message: `Votre déclaration d'hypothèque pour la parcelle ${parcelNumber} a été soumise avec succès.`,
        type: 'success'
      });

      setStep('confirmation');
      toast.success('Hypothèque enregistrée avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setMortgageRecord({
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: 'Banque',
      contractDate: '',
      mortgageStatus: 'Active',
      receiptFile: null
    });
    onOpenChange(false);
  };

  const renderFormStep = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Landmark className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <Label className="text-base font-semibold">Nouvelle Hypothèque</Label>
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
                  <h4 className="font-semibold text-sm">Déclaration d'hypothèque</h4>
                  <p className="text-muted-foreground">
                    Enregistrez une hypothèque active sur cette parcelle pour informer les futurs acquéreurs.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Montant (USD) *</Label>
              <Input
                type="number"
                placeholder="50000"
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
                  <SelectItem value="Active">En cours</SelectItem>
                  <SelectItem value="En défaut">En défaut de paiement</SelectItem>
                  <SelectItem value="Renégociée">Renégociée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pièce jointe */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium">Justificatif (optionnel)</Label>
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
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Durée</span>
              <span>{mortgageRecord.duration} mois</span>
            </div>
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
              <span>{mortgageRecord.mortgageStatus === 'Active' ? 'En cours' : mortgageRecord.mortgageStatus}</span>
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
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] overflow-hidden z-[1100]`}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-amber-600" />
            Déclarer une hypothèque
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enregistrez une hypothèque active sur cette parcelle
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
    </Dialog>
  );
};

export default MortgageFormDialog;
