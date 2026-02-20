import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, X, Info, CheckCircle2, Scale, Shield, FileText, User, AlertTriangle, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import SectionHelpPopover from './SectionHelpPopover';

interface LandDisputeLiftingFormProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

const LIFTING_REASONS = [
  { value: 'jugement_definitif', label: 'Jugement définitif', description: 'Le tribunal a rendu un jugement définitif et exécutoire' },
  { value: 'conciliation_reussie', label: 'Conciliation réussie', description: 'Les parties ont trouvé un accord amiable' },
  { value: 'desistement', label: 'Désistement', description: 'Le demandeur s\'est désisté de sa réclamation' },
  { value: 'prescription', label: 'Prescription', description: 'Le délai légal pour agir est expiré' },
  { value: 'transaction', label: 'Transaction / Accord transactionnel', description: 'Un accord financier ou compensatoire a été conclu' },
  { value: 'reconnaissance_droits', label: 'Reconnaissance de droits', description: 'Les droits du propriétaire ont été reconnus officiellement' },
  { value: 'erreur_materielle', label: 'Erreur matérielle', description: 'Le litige a été enregistré par erreur' },
  { value: 'autre', label: 'Autre motif', description: 'Précisez dans les commentaires' }
];

const REQUESTER_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'mandataire', label: 'Mandataire / Représentant légal' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'notaire', label: 'Notaire' }
];

type Step = 'form' | 'review' | 'confirmation';

const LandDisputeLiftingForm: React.FC<LandDisputeLiftingFormProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false
}) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [requestReference, setRequestReference] = useState('');
  
  const [disputeReference, setDisputeReference] = useState('');
  const [validatingReference, setValidatingReference] = useState(false);
  const [referenceValid, setReferenceValid] = useState<boolean | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [disputeData, setDisputeData] = useState<any>(null);
  
  const [liftingReason, setLiftingReason] = useState('');
  const [liftingDetails, setLiftingDetails] = useState('');
  
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterIdNumber, setRequesterIdNumber] = useState('');
  const [requesterQuality, setRequesterQuality] = useState('proprietaire');
  
  const [documents, setDocuments] = useState<File[]>([]);
  const [certifyAccuracy, setCertifyAccuracy] = useState(false);
  const [allPartiesAgree, setAllPartiesAgree] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const ref = `LEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setRequestReference(ref);
    }
  }, [open]);

  useEffect(() => {
    if (profile) {
      setRequesterName(profile.full_name || '');
      setRequesterEmail(profile.email || '');
    }
  }, [profile]);

  // Validate dispute reference
  useEffect(() => {
    const timer = setTimeout(() => {
      if (disputeReference.length >= 5) {
        validateDisputeReference(disputeReference);
      } else {
        setReferenceValid(null);
        setReferenceError(null);
        setDisputeData(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [disputeReference, parcelId]);

  const validateDisputeReference = async (ref: string) => {
    setValidatingReference(true);
    setReferenceError(null);
    try {
      const { data, error } = await supabase
        .from('cadastral_land_disputes' as any)
        .select('*')
        .eq('parcel_number', parcelNumber)
        .eq('reference_number', ref.trim().toUpperCase())
        .eq('dispute_type', 'report')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setReferenceValid(true);
        setDisputeData(data);
      } else {
        setReferenceValid(false);
        setDisputeData(null);
        setReferenceError('Ce numéro de référence ne correspond à aucun litige enregistré sur cette parcelle.');
      }
    } catch (error) {
      console.error('Error validating:', error);
      setReferenceValid(false);
      setReferenceError('Erreur lors de la vérification.');
    } finally {
      setValidatingReference(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Trop volumineux (max 10 Mo)`);
      return isValid && isValidSize;
    });
    setDocuments(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenCatalog = () => {
    // Open the results dialog / service catalog
    const resultsDialog = document.querySelector('[data-results-dialog]');
    if (resultsDialog) {
      (resultsDialog as HTMLElement).style.zIndex = '1300';
    }
    const scrollContainer = document.querySelector('[data-results-scroll]');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateForm = (): boolean => {
    if (!disputeReference.trim()) { toast.error('Veuillez renseigner le numéro de référence du litige'); return false; }
    if (!referenceValid) { toast.error('Le numéro de référence du litige n\'est pas valide'); return false; }
    if (!liftingReason) { toast.error('Veuillez sélectionner le motif de la demande'); return false; }
    if (!requesterName.trim()) { toast.error('Veuillez indiquer votre nom'); return false; }
    if (!requesterQuality) { toast.error('Veuillez indiquer votre qualité'); return false; }
    if (documents.length === 0) { toast.error('Veuillez joindre au moins un document justificatif'); return false; }
    if (!certifyAccuracy) { toast.error('Vous devez certifier l\'exactitude des informations'); return false; }
    if (!allPartiesAgree) { toast.error('Vous devez confirmer l\'accord de toutes les parties'); return false; }
    return true;
  };

  const handleGoToReview = () => {
    if (!validateForm()) return;
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Vous devez être connecté'); return; }
    setLoading(true);
    try {
      const documentUrls: string[] = [];
      for (const file of documents) {
        const fileExt = file.name.split('.').pop();
        const fileName = `lifting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `land-disputes/${user.id}/${fileName}`;
        const { error } = await supabase.storage.from('cadastral-documents').upload(filePath, file);
        if (!error) {
          const { data } = supabase.storage.from('cadastral-documents').getPublicUrl(filePath);
          documentUrls.push(data.publicUrl);
        }
      }

      const { error } = await supabase
        .from('cadastral_land_disputes' as any)
        .insert({
          parcel_id: parcelId,
          parcel_number: parcelNumber,
          reference_number: requestReference,
          dispute_type: 'lifting',
          dispute_nature: disputeData?.dispute_nature || 'unknown',
          dispute_description: liftingDetails,
          current_status: 'demande_levee',
          declarant_name: requesterName,
          declarant_phone: requesterPhone,
          declarant_email: requesterEmail,
          declarant_id_number: requesterIdNumber,
          declarant_quality: requesterQuality,
          lifting_request_reference: disputeReference.toUpperCase(),
          lifting_reason: liftingReason,
          lifting_documents: documentUrls,
          lifting_status: 'pending',
          supporting_documents: documentUrls,
          reported_by: user.id,
        } as any);

      if (error) throw error;

      await supabase.from('notifications' as any).insert({
        user_id: user.id,
        title: 'Demande de levée de litige soumise',
        message: `Votre demande de levée de litige (${requestReference}) pour la parcelle ${parcelNumber} a été enregistrée.`,
        type: 'success',
        action_url: '/user-dashboard'
      });

      setStep('confirmation');
      toast.success('Demande de levée soumise avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setDisputeReference('');
    setReferenceValid(null);
    setDisputeData(null);
    setLiftingReason('');
    setLiftingDetails('');
    setDocuments([]);
    setCertifyAccuracy(false);
    setAllPartiesAgree(false);
    onOpenChange(false);
  };

  if (!open) return null;

  // Confirmation
  if (step === 'confirmation') {
    return (
      <div className="px-3 py-3 space-y-3">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-base font-bold">Demande de levée enregistrée</h3>
          <p className="text-xs text-muted-foreground">
            Votre demande de levée de litige a été soumise avec succès. Elle sera examinée par nos services.
          </p>
          <Card className="p-3 bg-muted/50">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Référence demande :</span><span className="font-mono font-bold">{requestReference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Litige concerné :</span><span className="font-mono">{disputeReference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Motif :</span><span>{LIFTING_REASONS.find(r => r.value === liftingReason)?.label}</span></div>
            </div>
          </Card>
          <Button onClick={handleClose} className="w-full">Fermer</Button>
        </div>
      </div>
    );
  }

  // Review
  if (step === 'review') {
    return (
      <div className="px-3 py-3 space-y-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('form')} className="h-7 w-7 p-0 rounded-lg">
            <span className="text-xs">←</span>
          </Button>
          <h3 className="text-sm font-bold">Récapitulatif de la demande de levée</h3>
        </div>

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Scale className="h-3.5 w-3.5" /> Informations</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Réf. demande :</span><span className="font-mono font-bold">{requestReference}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Litige :</span><span className="font-mono">{disputeReference}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Motif :</span><span>{LIFTING_REASONS.find(r => r.value === liftingReason)?.label}</span></div>
          </div>
        </Card>

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><User className="h-3.5 w-3.5" /> Demandeur</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{requesterName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span>{REQUESTER_QUALITIES.find(q => q.value === requesterQuality)?.label}</span></div>
          </div>
        </Card>

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><FileText className="h-3.5 w-3.5" /> Documents</div>
          <div className="text-xs text-muted-foreground">{documents.length} document(s) joint(s)</div>
        </Card>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Soumission en cours...</> : 'Soumettre la demande de levée'}
        </Button>
      </div>
    );
  }

  // Form
  return (
    <div className="px-3 py-3 space-y-3">
      {/* Référence de la demande */}
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 text-xs">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <span className="text-muted-foreground">Référence de la demande : </span>
            <span className="font-mono font-bold text-primary">{requestReference}</span>
          </div>
        </div>
      </Card>

      {/* Numéro de référence du litige */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label className="text-xs font-semibold">Numéro de référence du litige *</Label>
          <SectionHelpPopover title="Référence du litige" description="Chaque litige foncier enregistré dans notre système est identifié par un numéro de référence unique. Ce numéro est disponible dans l'onglet 'Litiges' du résultat cadastral de la parcelle." />
        </div>
        <div className="relative">
          <Input
            value={disputeReference}
            onChange={(e) => setDisputeReference(e.target.value.toUpperCase())}
            placeholder="Ex: LIT-XXXXXXXX-XXXX"
            className={`h-10 text-xs font-mono pr-8 ${
              referenceValid === true ? 'border-green-500' :
              referenceValid === false ? 'border-destructive' : ''
            }`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {validatingReference && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {referenceValid === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {referenceValid === false && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        {referenceError && (
          <p className="text-[10px] text-destructive">{referenceError}</p>
        )}
      </div>

      {/* Info notification */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-[10px] text-blue-800">
          Chaque litige foncier est référencé par un numéro unique disponible dans le résultat cadastral, onglet « Litiges ». Pour l'obtenir, consultez le catalogue de services.
        </AlertDescription>
      </Alert>
      <Button variant="outline" size="sm" onClick={handleOpenCatalog} className="w-full h-8 text-xs gap-1">
        <Search className="h-3 w-3" /> Ouvrir le catalogue de services
      </Button>

      {/* Show dispute info if found */}
      {referenceValid && disputeData && (
        <Card className="p-3 bg-green-50 border-green-200 space-y-1">
          <div className="text-xs font-semibold text-green-800">Litige identifié</div>
          <div className="text-[10px] text-green-700 space-y-0.5">
            <div>Nature : {disputeData.dispute_nature}</div>
            <div>Statut : {disputeData.current_status}</div>
            <div>Déclarant : {disputeData.declarant_name}</div>
          </div>
        </Card>
      )}

      {referenceValid && (
        <>
          <Separator />

          {/* Motif */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Motif de la demande de levée *</Label>
            <Select value={liftingReason} onValueChange={setLiftingReason}>
              <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Sélectionner le motif" /></SelectTrigger>
              <SelectContent>
                {LIFTING_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value} className="text-xs">
                    <div>
                      <div className="font-medium">{reason.label}</div>
                      <div className="text-muted-foreground text-[10px]">{reason.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Détails complémentaires */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Détails complémentaires</Label>
            <Textarea value={liftingDetails} onChange={(e) => setLiftingDetails(e.target.value)} placeholder="Précisions sur la résolution du litige, numéro de jugement, etc." className="text-xs min-h-[60px]" />
          </div>

          <Separator />

          {/* Informations du demandeur */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Informations du demandeur</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px]">Nom complet *</Label>
                <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Qualité *</Label>
                <Select value={requesterQuality} onValueChange={setRequesterQuality}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUESTER_QUALITIES.map(q => <SelectItem key={q.value} value={q.value} className="text-xs">{q.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Téléphone</Label>
                  <Input value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} className="h-9 text-xs" placeholder="+243..." />
                </div>
                <div>
                  <Label className="text-[10px]">E-mail</Label>
                  <Input value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} className="h-9 text-xs" type="email" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">N° pièce d'identité</Label>
                <Input value={requesterIdNumber} onChange={(e) => setRequesterIdNumber(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Documents */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-semibold">Documents justificatifs *</Label>
              <SectionHelpPopover title="Documents requis" description="Joignez les documents prouvant la résolution du litige : PV de conciliation, jugement du tribunal, acte de reconnaissance, accord transactionnel, etc." />
            </div>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">PV de conciliation, jugement, acte de reconnaissance...</p>
              <p className="text-[10px] text-muted-foreground">Images ou PDF, max 10 Mo</p>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" multiple onChange={handleFileChange} />
            {documents.length > 0 && (
              <div className="space-y-1">
                {documents.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-2 text-xs">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(i)} className="h-6 w-6 p-0 ml-1">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Certifications */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox checked={allPartiesAgree} onCheckedChange={(c) => setAllPartiesAgree(c === true)} id="parties-agree" />
              <label htmlFor="parties-agree" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
                Je confirme que toutes les parties impliquées dans ce litige ont donné leur accord pour la levée, ou qu'une décision de justice exécutoire a été rendue.
              </label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={certifyAccuracy} onCheckedChange={(c) => setCertifyAccuracy(c === true)} id="certify-lifting" />
              <label htmlFor="certify-lifting" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
                Je certifie sur l'honneur que les informations fournies sont exactes. Toute déclaration mensongère engage ma responsabilité civile et pénale.
              </label>
            </div>
          </div>

          <Button onClick={handleGoToReview} className="w-full" disabled={!certifyAccuracy || !allPartiesAgree}>
            Vérifier et soumettre
          </Button>
        </>
      )}

      <WhatsAppFloatingButton 
        message={`Bonjour, j'ai besoin d'aide pour une demande de levée de litige sur la parcelle ${parcelNumber}.`}
      />
    </div>
  );
};

export default LandDisputeLiftingForm;
