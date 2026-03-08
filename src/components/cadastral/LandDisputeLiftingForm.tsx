import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, X, Info, CheckCircle2, Scale, Shield, FileText, User, AlertTriangle, Search, Image, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import SectionHelpPopover from './SectionHelpPopover';
import {
  uploadDisputeFiles,
  cleanupUploadedFiles,
  checkDisputeAlreadyResolved,
  sendDisputeNotification,
  notifyAdminsAboutDispute,
  validateEmail,
  validatePhone,
  validateFileCount,
  validateFile,
  getDisputeLiftingDraftKey,
  generateDisputeReference,
} from '@/utils/disputeUploadUtils';
import {
  MAX_DESCRIPTION_LENGTH,
  LIFTING_REASONS,
  REQUESTER_QUALITIES,
  DISPUTE_NATURES_MAP,
  getStatusLabel,
} from '@/utils/disputeSharedTypes';

interface LandDisputeLiftingFormProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  onOpenServiceCatalog?: () => void;
}

type Step = 'form' | 'review' | 'confirmation';

const LandDisputeLiftingForm: React.FC<LandDisputeLiftingFormProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false,
  onOpenServiceCatalog
}) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [requestReference, setRequestReference] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  
  const referenceGenerated = useRef(false);
  
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
  const [requesterQuality, setRequesterQuality] = useState('proprietaire');
  
  const [documents, setDocuments] = useState<File[]>([]);
  const [certifyAccuracy, setCertifyAccuracy] = useState(false);
  const [allPartiesAgree, setAllPartiesAgree] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftKey = getDisputeLiftingDraftKey(parcelNumber);

  const hasUnsavedChanges = useCallback(() => {
    return disputeReference !== '' || liftingReason !== '' || liftingDetails !== '' || documents.length > 0;
  }, [disputeReference, liftingReason, liftingDetails, documents]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      e.detail.hasChanges = hasUnsavedChanges();
    };
    window.addEventListener('check-dispute-lifting-changes', handler as EventListener);
    return () => window.removeEventListener('check-dispute-lifting-changes', handler as EventListener);
  }, [hasUnsavedChanges]);

  // Save draft
  useEffect(() => {
    if (step !== 'form') return;
    const draftData = {
      disputeReference, liftingReason, liftingDetails,
      requesterName, requesterPhone, requesterEmail, requesterQuality,
    };
    if (disputeReference || liftingReason || liftingDetails) {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [disputeReference, liftingReason, liftingDetails, requesterName, requesterPhone, requesterEmail, requesterQuality, step, draftKey]);

  // Generate reference ONCE and restore draft
  useEffect(() => {
    if (open && !referenceGenerated.current) {
      setRequestReference(generateDisputeReference('LEV'));
      referenceGenerated.current = true;

      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setDisputeReference(draft.disputeReference || '');
          setLiftingReason(draft.liftingReason || '');
          setLiftingDetails(draft.liftingDetails || '');
          setRequesterName(draft.requesterName || '');
          setRequesterPhone(draft.requesterPhone || '');
          setRequesterEmail(draft.requesterEmail || '');
          setRequesterQuality(draft.requesterQuality || 'proprietaire');
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 3000);
        }
      } catch (e) {
        console.warn('Erreur restauration brouillon:', e);
      }
    }
    if (!open) {
      referenceGenerated.current = false;
    }
  }, [open, draftKey]);

  useEffect(() => {
    if (profile) {
      if (!requesterName) setRequesterName(profile.full_name || '');
      if (!requesterEmail) setRequesterEmail(profile.email || '');
    }
  }, [profile]);

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
        if (checkDisputeAlreadyResolved(data)) {
          setReferenceValid(false);
          setReferenceError('Ce litige a déjà été résolu, levé, ou fait déjà l\'objet d\'une demande de levée.');
          setDisputeData(null);
        } else {
          setReferenceValid(true);
          setDisputeData(data);
        }
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
    if (!validateFileCount(documents.length, files.length)) return;
    const newFiles = Array.from(files).filter(file => validateFile(file));
    setDocuments(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenCatalog = () => {
    if (onOpenServiceCatalog) {
      onOpenServiceCatalog();
    }
  };

  const validateForm = (): boolean => {
    if (!disputeReference.trim()) { toast.error('Veuillez renseigner le numéro de référence du litige'); return false; }
    if (!referenceValid) { toast.error('Le numéro de référence du litige n\'est pas valide'); return false; }
    if (!liftingReason) { toast.error('Veuillez sélectionner le motif de la demande'); return false; }
    if (!requesterName.trim() || requesterName.trim().length < 3) { toast.error('Le nom doit contenir au moins 3 caractères'); return false; }
    if (!requesterQuality) { toast.error('Veuillez indiquer votre qualité'); return false; }
    if (requesterEmail && !validateEmail(requesterEmail)) { toast.error('Adresse e-mail invalide'); return false; }
    if (requesterPhone && !validatePhone(requesterPhone)) { toast.error('Numéro de téléphone invalide'); return false; }
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
    if (loading) return;
    setLoading(true);

    let uploadedPaths: string[] = [];

    try {
      // Upload files first
      const uploadResult = await uploadDisputeFiles(documents, user.id, 'lifting');
      const documentUrls = uploadResult.urls;
      uploadedPaths = uploadResult.paths;

      // Insert lifting request
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
          declarant_phone: requesterPhone || null,
          declarant_email: requesterEmail || null,
          declarant_quality: requesterQuality,
          lifting_request_reference: disputeReference.toUpperCase(),
          lifting_reason: liftingReason,
          lifting_documents: documentUrls,
          reported_by: user.id,
        } as any);

      if (error) {
        await cleanupUploadedFiles(uploadedPaths);
        throw error;
      }

      // AFTER successful insert, update original dispute status (blocking - must succeed)
      if (disputeData?.id) {
        const { error: updateError } = await supabase
          .from('cadastral_land_disputes' as any)
          .update({ current_status: 'demande_levee', updated_at: new Date().toISOString() } as any)
          .eq('id', disputeData.id);
        
        if (updateError) {
          console.error('Erreur mise à jour statut litige original:', updateError);
          toast.error('Le litige original n\'a pas pu être mis à jour. Contactez le support.');
        }
      }

      // Notify submitter
      await sendDisputeNotification(
        user.id,
        'Demande de levée de litige soumise',
        `Votre demande de levée de litige (${requestReference}) pour la parcelle ${parcelNumber} a été enregistrée.`,
        '/user-dashboard?tab=disputes'
      );

      // Notify admins
      await notifyAdminsAboutDispute(
        'Nouvelle demande de levée de litige',
        `Une demande de levée (${requestReference}) a été soumise pour la parcelle ${parcelNumber} par ${requesterName}.`
      );

      localStorage.removeItem(draftKey);
      setStep('confirmation');
      toast.success('Demande de levée soumise avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setDisputeReference('');
    setReferenceValid(null);
    setReferenceError(null);
    setDisputeData(null);
    setLiftingReason('');
    setLiftingDetails('');
    setRequesterName('');
    setRequesterPhone('');
    setRequesterEmail('');
    setRequesterQuality('proprietaire');
    setDocuments([]);
    setCertifyAccuracy(false);
    setAllPartiesAgree(false);
    onOpenChange(false);
  };

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success('Référence copiée');
  };

  if (!open) return null;

  // Confirmation
  if (step === 'confirmation') {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-base font-bold">Demande de levée enregistrée</h3>
          <p className="text-sm text-muted-foreground">
            Votre demande de levée de litige a été soumise avec succès. Elle sera examinée par nos services.
          </p>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Référence demande :</span>
                <button onClick={() => copyReference(requestReference)} className="flex items-center gap-1 font-mono font-bold hover:text-primary transition-colors">
                  {requestReference} <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Litige concerné :</span><span className="font-mono">{disputeReference}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Motif :</span><span>{LIFTING_REASONS.find(r => r.value === liftingReason)?.label}</span></div>
            </CardContent>
          </Card>
          <Alert className="bg-blue-50 border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              Conservez ce numéro de référence pour le suivi de votre demande. Vous pouvez le retrouver dans votre tableau de bord.
            </AlertDescription>
          </Alert>
          <Button onClick={handleClose} className="w-full h-11 rounded-xl">Fermer</Button>
        </div>
      </div>
    );
  }

  // Review
  if (step === 'review') {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="sm" onClick={() => setStep('form')} className="h-8 w-8 p-0 rounded-xl">
            <span className="text-sm">←</span>
          </Button>
          <h3 className="text-sm font-bold">Récapitulatif de la demande de levée</h3>
        </div>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Scale className="h-4 w-4" /> Informations</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Réf. demande :</span><span className="font-mono font-bold">{requestReference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Litige :</span><span className="font-mono">{disputeReference}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Motif :</span><span>{LIFTING_REASONS.find(r => r.value === liftingReason)?.label}</span></div>
              {liftingDetails && <div className="pt-1"><span className="text-muted-foreground">Détails :</span><p className="mt-0.5">{liftingDetails}</p></div>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Demandeur</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{requesterName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span>{REQUESTER_QUALITIES.find(q => q.value === requesterQuality)?.label}</span></div>
              {requesterPhone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone :</span><span>{requesterPhone}</span></div>}
              {requesterEmail && <div className="flex justify-between"><span className="text-muted-foreground">E-mail :</span><span>{requesterEmail}</span></div>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><FileText className="h-4 w-4" /> Documents</div>
            <div className="text-sm text-muted-foreground">{documents.length} document(s) joint(s)</div>
            {documents.map((file, i) => (
              <div key={i} className="text-xs text-muted-foreground truncate">• {file.name}</div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 rounded-xl">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Soumission en cours...</> : 'Soumettre la demande de levée'}
        </Button>
      </div>
    );
  }

  // Form
  return (
    <div className="px-4 py-4 space-y-4">
      {draftRestored && (
        <Alert className="bg-blue-50 border-blue-200 rounded-xl">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Brouillon restauré. Vos données précédentes ont été récupérées.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-amber-50 border-amber-300 rounded-xl">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-900 leading-relaxed">
          <span className="font-semibold">Important :</span> Les informations que vous fournissez doivent être exactes et vérifiables. Toute demande contenant des informations erronées ou mensongères ne sera pas prise en considération et pourra engager votre responsabilité.
        </AlertDescription>
      </Alert>

      <Card className="bg-primary/5 border-primary/20 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Référence de la demande</p>
              <p className="font-mono font-bold text-sm text-primary">{requestReference}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          Numéro de référence du litige *
          <SectionHelpPopover title="Référence du litige" description="Chaque litige foncier enregistré dans notre système est identifié par un numéro de référence unique. Ce numéro est disponible dans l'onglet 'Litiges' du résultat cadastral de la parcelle." />
        </Label>
        <div className="relative">
          <Input
            value={disputeReference}
            onChange={(e) => setDisputeReference(e.target.value.toUpperCase())}
            placeholder="Ex: LIT-XXXXXXXX-XXXX"
            className={`h-11 text-sm font-mono rounded-xl border-2 pr-10 ${
              referenceValid === true ? 'border-green-500 focus:border-green-500' :
              referenceValid === false ? 'border-destructive focus:border-destructive' : 'focus:border-primary'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validatingReference && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {referenceValid === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {referenceValid === false && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        {referenceError && <p className="text-xs text-destructive">{referenceError}</p>}
      </div>

      {referenceValid !== true && (
        <>
          <Alert className="bg-blue-50 border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800 leading-relaxed">
              Chaque litige foncier est référencé par un numéro unique disponible dans le résultat cadastral, onglet « Litiges ». Consultez le catalogue de services pour l'obtenir.
            </AlertDescription>
          </Alert>
          {onOpenServiceCatalog && (
            <Button variant="outline" size="sm" onClick={handleOpenCatalog} className="w-full h-11 text-sm gap-2 rounded-xl border-2 border-destructive text-destructive hover:bg-destructive/5 hover:border-destructive">
              <Search className="h-4 w-4" /> Ouvrir le catalogue de services
            </Button>
          )}
        </>
      )}

      {referenceValid && disputeData && (
        <Card className="bg-green-50 border-green-200 rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-1">
            <div className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Litige identifié
            </div>
            <div className="text-xs text-green-700 space-y-0.5">
              <div>Nature : {DISPUTE_NATURES_MAP[disputeData.dispute_nature] || disputeData.dispute_nature}</div>
              <div>Statut : {getStatusLabel(disputeData.current_status)}</div>
              <div>Déclarant : {disputeData.declarant_name}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {referenceValid && (
        <>
          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              Motif de la demande de levée *
              <SectionHelpPopover title="Motif" description="Indiquez la raison pour laquelle vous demandez la levée de ce litige foncier." />
            </Label>
            <Select value={liftingReason} onValueChange={setLiftingReason}>
              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary"><SelectValue placeholder="Sélectionner le motif" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {LIFTING_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value} className="text-sm py-2">
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {liftingReason && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {LIFTING_REASONS.find(r => r.value === liftingReason)?.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Détails complémentaires</Label>
            <Textarea
              value={liftingDetails}
              onChange={(e) => { if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) setLiftingDetails(e.target.value); }}
              placeholder="Précisions sur la résolution du litige, numéro de jugement, etc."
              className="text-sm min-h-[70px] rounded-xl border-2 focus:border-primary"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            {liftingDetails.length > MAX_DESCRIPTION_LENGTH * 0.8 && (
              <p className="text-[10px] text-muted-foreground text-right">{liftingDetails.length}/{MAX_DESCRIPTION_LENGTH}</p>
            )}
          </div>

          <Separator />

          <Card className="border-2 border-dashed rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Informations du demandeur
              </h4>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Nom complet *</Label>
                  <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qualité *</Label>
                  <Select value={requesterQuality} onValueChange={setRequesterQuality}>
                    <SelectTrigger className="h-11 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {REQUESTER_QUALITIES.map(q => <SelectItem key={q.value} value={q.value} className="text-sm">{q.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Téléphone</Label>
                    <Input value={requesterPhone} onChange={(e) => setRequesterPhone(e.target.value)} className="h-11 text-sm rounded-xl border-2" placeholder="+243..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail</Label>
                    <Input value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} className="h-11 text-sm rounded-xl border-2" type="email" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card className="border rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Documents justificatifs *
                <SectionHelpPopover title="Documents requis" description="Joignez les documents prouvant la résolution du litige : PV de conciliation, jugement du tribunal, acte de reconnaissance, accord transactionnel, etc." />
              </h4>
              <p className="text-xs text-muted-foreground">
                PV de conciliation, jugement, acte de reconnaissance... (max 10 Mo/fichier)
              </p>
              
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" multiple onChange={handleFileChange} />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 text-sm rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ajouter des documents
              </Button>
              
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                      {file.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate text-sm">{file.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(i)} className="h-7 w-7 rounded-lg hover:bg-destructive/10">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Checkbox checked={allPartiesAgree} onCheckedChange={(c) => setAllPartiesAgree(c === true)} id="parties-agree" className="mt-0.5" />
              <label htmlFor="parties-agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Je confirme que toutes les parties impliquées dans ce litige ont donné leur accord pour la levée, ou qu'une décision de justice exécutoire a été rendue.
              </label>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox checked={certifyAccuracy} onCheckedChange={(c) => setCertifyAccuracy(c === true)} id="certify-lifting" className="mt-0.5" />
              <label htmlFor="certify-lifting" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Je certifie sur l'honneur que les informations fournies sont exactes. Toute déclaration mensongère engage ma responsabilité civile et pénale.
              </label>
            </div>
          </div>

          <Button onClick={handleGoToReview} className="w-full h-11 rounded-xl" disabled={!certifyAccuracy || !allPartiesAgree}>
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
