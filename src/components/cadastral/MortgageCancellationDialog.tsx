import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, FileX2, CheckCircle2, Upload, X, Plus, Info, ArrowLeft, FileText, AlertTriangle, Landmark, Calendar, DollarSign, Clock, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MortgageCancellationDialogProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select' | 'form' | 'preview' | 'confirmation';

interface ActiveMortgage {
  id: string;
  mortgage_amount_usd: number;
  creditor_name: string;
  creditor_type: string;
  contract_date: string;
  duration_months: number;
  mortgage_status: string;
}

interface CancellationRequest {
  mortgageId: string;
  reason: string;
  cancellationDate: string;
  settlementAmount: string;
  requesterName: string;
  requesterPhone: string;
  supportingDocuments: File[];
  comments: string;
}

const MortgageCancellationDialog: React.FC<MortgageCancellationDialogProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange
}) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [loadingMortgages, setLoadingMortgages] = useState(false);
  const [activeMortgages, setActiveMortgages] = useState<ActiveMortgage[]>([]);
  const [selectedMortgage, setSelectedMortgage] = useState<ActiveMortgage | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  
  const [formData, setFormData] = useState<CancellationRequest>({
    mortgageId: '',
    reason: 'remboursement_integral',
    cancellationDate: new Date().toISOString().split('T')[0],
    settlementAmount: '',
    requesterName: '',
    requesterPhone: '',
    supportingDocuments: [],
    comments: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const CANCELLATION_REASONS = [
    { value: 'remboursement_integral', label: 'Remboursement intégral du prêt' },
    { value: 'refinancement', label: 'Refinancement auprès d\'un autre créancier' },
    { value: 'accord_amiable', label: 'Accord amiable avec le créancier' },
    { value: 'prescription', label: 'Prescription de la dette' },
    { value: 'autre', label: 'Autre motif' }
  ];

  // Charger les hypothèques actives de la parcelle
  useEffect(() => {
    const fetchActiveMortgages = async () => {
      if (!open || !parcelId) return;
      
      setLoadingMortgages(true);
      try {
        // Chercher dans cadastral_mortgages
        const { data: mortgages, error } = await supabase
          .from('cadastral_mortgages')
          .select('*')
          .eq('parcel_id', parcelId)
          .in('mortgage_status', ['active', 'Active', 'En cours']);

        if (error) throw error;

        if (mortgages && mortgages.length > 0) {
          setActiveMortgages(mortgages.map(m => ({
            id: m.id,
            mortgage_amount_usd: m.mortgage_amount_usd,
            creditor_name: m.creditor_name,
            creditor_type: m.creditor_type,
            contract_date: m.contract_date,
            duration_months: m.duration_months,
            mortgage_status: m.mortgage_status
          })));
        } else {
          // Chercher aussi dans les contributions approuvées
          const { data: contributions } = await supabase
            .from('cadastral_contributions')
            .select('id, mortgage_history')
            .eq('parcel_number', parcelNumber)
            .eq('status', 'approved')
            .not('mortgage_history', 'is', null);

          if (contributions) {
            const activeMortgagesFromContributions: ActiveMortgage[] = [];
            contributions.forEach(c => {
              const history = c.mortgage_history as any[];
              if (Array.isArray(history)) {
                history.forEach((m, index) => {
                  if (m.mortgage_status === 'Active' || m.mortgage_status === 'active' || m.mortgage_status === 'En cours') {
                    activeMortgagesFromContributions.push({
                      id: `${c.id}-${index}`,
                      mortgage_amount_usd: m.mortgage_amount_usd || 0,
                      creditor_name: m.creditor_name || 'Non spécifié',
                      creditor_type: m.creditor_type || 'Non spécifié',
                      contract_date: m.contract_date || '',
                      duration_months: m.duration_months || 0,
                      mortgage_status: m.mortgage_status
                    });
                  }
                });
              }
            });
            setActiveMortgages(activeMortgagesFromContributions);
          }
        }
      } catch (error) {
        console.error('Error fetching mortgages:', error);
        toast.error('Erreur lors du chargement des hypothèques');
      } finally {
        setLoadingMortgages(false);
      }
    };

    fetchActiveMortgages();
  }, [open, parcelId, parcelNumber]);

  // Générer le numéro de référence
  useEffect(() => {
    if (open) {
      const ref = `RAD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setReferenceNumber(ref);
    }
  }, [open]);

  // Pré-remplir avec le profil utilisateur
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        requesterName: profile.full_name || '',
        requesterPhone: ''
      }));
    }
  }, [profile]);

  const handleMortgageSelect = (mortgageId: string) => {
    const mortgage = activeMortgages.find(m => m.id === mortgageId);
    if (mortgage) {
      setSelectedMortgage(mortgage);
      setFormData(prev => ({ ...prev, mortgageId: mortgageId }));
      setStep('form');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValid && isValidSize;
    });
    
    setFormData(prev => ({
      ...prev,
      supportingDocuments: [...prev.supportingDocuments, ...validFiles]
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.requesterName.trim()) {
      toast.error('Veuillez indiquer votre nom');
      return false;
    }
    if (!formData.cancellationDate) {
      toast.error('Veuillez indiquer la date de radiation');
      return false;
    }
    if (formData.supportingDocuments.length === 0) {
      toast.error('Veuillez joindre au moins un document justificatif (attestation de remboursement, mainlevée, etc.)');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setStep('preview');
  };

  const uploadDocuments = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of formData.supportingDocuments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `cancellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `mortgage-cancellation/${user?.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);
      
      if (!error) {
        const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!user || !selectedMortgage) {
      toast.error('Erreur: informations manquantes');
      return;
    }

    setLoading(true);
    try {
      // Upload des documents
      const documentUrls = await uploadDocuments();

      // Créer la demande de radiation via une contribution
      const { error } = await supabase
        .from('cadastral_contributions')
        .insert({
          parcel_number: parcelNumber,
          original_parcel_id: parcelId,
          user_id: user.id,
          contribution_type: 'mortgage_cancellation',
          status: 'pending',
          change_justification: formData.comments || `Demande de radiation d'hypothèque - ${CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}`,
          mortgage_history: [{
            type: 'cancellation_request',
            reference_number: referenceNumber,
            mortgage_id: selectedMortgage.id,
            mortgage_amount_usd: selectedMortgage.mortgage_amount_usd,
            creditor_name: selectedMortgage.creditor_name,
            creditor_type: selectedMortgage.creditor_type,
            original_contract_date: selectedMortgage.contract_date,
            cancellation_reason: formData.reason,
            cancellation_date: formData.cancellationDate,
            settlement_amount: formData.settlementAmount ? parseFloat(formData.settlementAmount) : null,
            requester_name: formData.requesterName,
            requester_phone: formData.requesterPhone,
            supporting_documents: documentUrls,
            submitted_at: new Date().toISOString()
          }]
        });

      if (error) throw error;

      // Créer une notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Demande de radiation soumise',
        message: `Votre demande de radiation d'hypothèque (${referenceNumber}) pour la parcelle ${parcelNumber} a été soumise. Un certificat de radiation sera délivré après validation.`,
        type: 'success',
        action_url: '/user-dashboard'
      });

      setStep('confirmation');
      toast.success('Demande de radiation soumise avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedMortgage(null);
    setFormData({
      mortgageId: '',
      reason: 'remboursement_integral',
      cancellationDate: new Date().toISOString().split('T')[0],
      settlementAmount: '',
      requesterName: profile?.full_name || '',
      requesterPhone: '',
      supportingDocuments: [],
      comments: ''
    });
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const renderSelectStep = () => (
    <div className="space-y-4">
      {loadingMortgages ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement des hypothèques...</p>
        </div>
      ) : activeMortgages.length === 0 ? (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Aucune hypothèque active trouvée sur cette parcelle. La radiation ne peut être demandée que pour des hypothèques actives.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileX2 className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Sélectionnez l'hypothèque à radier</Label>
              <p className="text-xs text-muted-foreground">{activeMortgages.length} hypothèque(s) active(s) trouvée(s)</p>
            </div>
          </div>

          <div className="space-y-3">
            {activeMortgages.map((mortgage) => (
              <Card 
                key={mortgage.id}
                className="rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleMortgageSelect(mortgage.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-amber-600" />
                        <span className="font-semibold">{mortgage.creditor_name}</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                          {mortgage.creditor_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{formatCurrency(mortgage.mortgage_amount_usd)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{mortgage.contract_date ? format(new Date(mortgage.contract_date), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{mortgage.duration_months} mois</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl">
                      Sélectionner
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Button
        variant="outline"
        onClick={handleClose}
        className="w-full h-11 rounded-xl"
      >
        Annuler
      </Button>
    </div>
  );

  const renderFormStep = () => (
    <div className="space-y-4">
      {/* Hypothèque sélectionnée */}
      <Card className="rounded-xl border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 text-amber-600" />
            <span className="font-medium">{selectedMortgage?.creditor_name}</span>
            <span className="text-muted-foreground">•</span>
            <span>{formatCurrency(selectedMortgage?.mortgage_amount_usd || 0)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileX2 className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Demande de radiation</Label>
              <p className="text-xs text-muted-foreground">Réf: {referenceNumber}</p>
            </div>
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Motif de la radiation *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {CANCELLATION_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date et montant */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date de radiation *</Label>
              <Input
                type="date"
                value={formData.cancellationDate}
                onChange={(e) => setFormData(prev => ({ ...prev, cancellationDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Montant soldé (USD)</Label>
              <Input
                type="number"
                placeholder="Montant final"
                value={formData.settlementAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, settlementAmount: e.target.value }))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* Demandeur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nom du demandeur *</Label>
              <Input
                placeholder="Votre nom complet"
                value={formData.requesterName}
                onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Téléphone</Label>
              <Input
                placeholder="+243..."
                value={formData.requesterPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, requesterPhone: e.target.value }))}
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium">Documents justificatifs *</Label>
            <p className="text-xs text-muted-foreground">Attestation de remboursement, lettre de mainlevée, quittance, etc.</p>
            
            {formData.supportingDocuments.length > 0 && (
              <div className="space-y-2">
                {formData.supportingDocuments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un document
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Commentaires */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Commentaires additionnels</Label>
            <Textarea
              placeholder="Informations complémentaires..."
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              className="min-h-[80px] text-sm rounded-xl resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setStep('select')}
          className="flex-1 h-11 rounded-xl gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={handlePreview}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          Prévisualiser
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-md border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <FileX2 className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Récapitulatif de la demande</Label>
              <p className="text-xs text-muted-foreground">Réf: {referenceNumber}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Créancier</span>
              <span className="font-semibold">{selectedMortgage?.creditor_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Montant hypothèque</span>
              <span>{formatCurrency(selectedMortgage?.mortgage_amount_usd || 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Motif</span>
              <span>{CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Date radiation</span>
              <span>{format(new Date(formData.cancellationDate), 'dd/MM/yyyy', { locale: fr })}</span>
            </div>
            {formData.settlementAmount && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Montant soldé</span>
                <span>{formatCurrency(parseFloat(formData.settlementAmount))}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Demandeur</span>
              <span>{formData.requesterName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Documents joints</span>
              <span>{formData.supportingDocuments.length} fichier(s)</span>
            </div>
          </div>

          <Alert className="rounded-xl border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <Award className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
              Un <strong>certificat de radiation</strong> sera délivré après validation de votre demande par l'administration.
            </AlertDescription>
          </Alert>
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
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Soumettre la demande'}
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
        <h3 className="text-lg font-semibold">Demande soumise avec succès</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Votre demande de radiation d'hypothèque a été enregistrée.
        </p>
        <div className="mt-3 p-3 bg-muted/50 rounded-xl">
          <p className="text-xs font-medium">Numéro de référence</p>
          <p className="text-lg font-mono font-bold text-primary">{referenceNumber}</p>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <Award className="h-4 w-4 inline-block mr-1" />
            Un <strong>certificat de radiation</strong> sera généré et mis à votre disposition après validation par l'officier hypothécaire.
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
            <FileX2 className="h-5 w-5 text-red-600" />
            Demande de radiation d'hypothèque
          </DialogTitle>
          <DialogDescription className="text-xs">
            Demandez la mainlevée d'une hypothèque active sur cette parcelle
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-4">
            {step === 'select' && renderSelectStep()}
            {step === 'form' && renderFormStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'confirmation' && renderConfirmationStep()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageCancellationDialog;
