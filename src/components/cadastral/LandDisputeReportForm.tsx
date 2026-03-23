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
import { Loader2, Upload, X, Info, CheckCircle2, Plus, Trash2, Scale, User, Phone, Mail, FileText, Calendar, AlertTriangle, Shield, Image, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import SectionHelpPopover from './SectionHelpPopover';
import {
  uploadDisputeFiles,
  cleanupUploadedFiles,
  checkDuplicateDispute,
  sendDisputeNotification,
  notifyAdminsAboutDispute,
  validateEmail,
  validatePhone,
  validateFileCount,
  validateFile,
  getDisputeReportDraftKey,
  generateDisputeReference,
} from '@/utils/disputeUploadUtils';
import {
  MAX_PARTIES,
  MAX_DESCRIPTION_LENGTH,
  DISPUTE_NATURES,
  RESOLUTION_LEVELS,
  DECLARANT_QUALITIES,
  PARTY_ROLES,
} from '@/utils/disputeSharedTypes';

interface LandDisputeReportFormProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
  onDisputeDataChange?: (data: any) => void;
}

interface Party {
  name: string;
  phone: string;
  role: string;
  relationship: string;
}

type Step = 'form' | 'review' | 'confirmation';

const LandDisputeReportForm: React.FC<LandDisputeReportFormProps> = ({
  parcelNumber,
  parcelId,
  open,
  onOpenChange,
  embedded = false
}) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  
  // Track whether reference has been generated for this session
  const referenceGenerated = useRef(false);
  
  const [disputeNature, setDisputeNature] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeStartDate, setDisputeStartDate] = useState('');
  const [hasResolutionStarted, setHasResolutionStarted] = useState(false);
  const [resolutionLevel, setResolutionLevel] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  
  const [declarantName, setDeclarantName] = useState('');
  const [declarantPhone, setDeclarantPhone] = useState('');
  const [declarantEmail, setDeclarantEmail] = useState('');
  const [declarantQuality, setDeclarantQuality] = useState('proprietaire');
  
  const [parties, setParties] = useState<Party[]>([{ name: '', phone: '', role: 'defendeur', relationship: '' }]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [certifyAccuracy, setCertifyAccuracy] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftKey = getDisputeReportDraftKey(parcelNumber);

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return disputeNature !== '' || disputeDescription !== '' || disputeStartDate !== '' || documents.length > 0;
  }, [disputeNature, disputeDescription, disputeStartDate, documents]);

  // Expose hasUnsavedChanges to parent via custom event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      e.detail.hasChanges = hasUnsavedChanges();
    };
    window.addEventListener('check-dispute-report-changes', handler as EventListener);
    return () => window.removeEventListener('check-dispute-report-changes', handler as EventListener);
  }, [hasUnsavedChanges]);

  // Save draft to localStorage
  useEffect(() => {
    if (step !== 'form') return;
    const draftData = {
      disputeNature, disputeDescription, disputeStartDate, hasResolutionStarted,
      resolutionLevel, resolutionDetails, declarantName, declarantPhone,
      declarantEmail, declarantQuality, parties,
    };
    if (disputeNature || disputeDescription || disputeStartDate) {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [disputeNature, disputeDescription, disputeStartDate, hasResolutionStarted, resolutionLevel, resolutionDetails, declarantName, declarantPhone, declarantEmail, declarantQuality, parties, step, draftKey]);

  // Generate reference ONCE per session and restore draft
  useEffect(() => {
    if (open && !referenceGenerated.current) {
      setReferenceNumber(generateDisputeReference('LIT'));
      referenceGenerated.current = true;

      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setDisputeNature(draft.disputeNature || '');
          setDisputeDescription(draft.disputeDescription || '');
          setDisputeStartDate(draft.disputeStartDate || '');
          setHasResolutionStarted(draft.hasResolutionStarted || false);
          setResolutionLevel(draft.resolutionLevel || '');
          setResolutionDetails(draft.resolutionDetails || '');
          setDeclarantName(draft.declarantName || '');
          setDeclarantPhone(draft.declarantPhone || '');
          setDeclarantEmail(draft.declarantEmail || '');
          setDeclarantQuality(draft.declarantQuality || 'proprietaire');
          if (draft.parties?.length) setParties(draft.parties);
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
      if (!declarantName) setDeclarantName(profile.full_name || '');
      if (!declarantEmail) setDeclarantEmail(profile.email || '');
    }
  }, [profile]);

  const addParty = () => {
    if (parties.length >= MAX_PARTIES) {
      toast.error(`Maximum ${MAX_PARTIES} parties autorisées`);
      return;
    }
    setParties(prev => [...prev, { name: '', phone: '', role: 'defendeur', relationship: '' }]);
  };

  const removeParty = (index: number) => {
    setParties(prev => prev.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: keyof Party, value: string) => {
    setParties(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
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

  const validateForm = (): boolean => {
    if (!disputeNature) { toast.error('Veuillez sélectionner la nature du litige'); return false; }
    if (!disputeStartDate) { toast.error('Veuillez indiquer la date de début du litige'); return false; }
    const today = new Date().toISOString().split('T')[0];
    if (disputeStartDate > today) { toast.error('La date de début ne peut pas être dans le futur'); return false; }
    if (hasResolutionStarted && !resolutionLevel) { toast.error('Veuillez indiquer le niveau de résolution'); return false; }
    if (!embedded && (!declarantName.trim() || declarantName.trim().length < 3)) { toast.error('Le nom du déclarant doit contenir au moins 3 caractères'); return false; }
    if (!declarantQuality) { toast.error('Veuillez indiquer votre qualité'); return false; }
    if (declarantEmail && !validateEmail(declarantEmail)) { toast.error('Adresse e-mail invalide'); return false; }
    if (declarantPhone && !validatePhone(declarantPhone)) { toast.error('Numéro de téléphone invalide'); return false; }
    if (parties.length > 0 && !parties[0].name.trim()) { toast.error('Veuillez renseigner au moins une partie concernée'); return false; }
    if (!certifyAccuracy) { toast.error('Vous devez certifier l\'exactitude des informations'); return false; }
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
      const isDuplicate = await checkDuplicateDispute(parcelNumber, disputeNature, user.id);
      if (isDuplicate) {
        toast.error('Un litige de même nature est déjà en cours sur cette parcelle.');
        setLoading(false);
        return;
      }

      let documentUrls: string[] = [];
      if (documents.length > 0) {
        const uploadResult = await uploadDisputeFiles(documents, user.id, 'dispute');
        documentUrls = uploadResult.urls;
        uploadedPaths = uploadResult.paths;
      }

      // Always persist as 'en_cours'; resolution_level is stored separately
      const { error } = await supabase
        .from('cadastral_land_disputes' as any)
        .insert({
          parcel_id: parcelId,
          parcel_number: parcelNumber,
          reference_number: referenceNumber,
          dispute_type: 'report',
          dispute_nature: disputeNature,
          dispute_description: disputeDescription,
          parties_involved: parties.filter(p => p.name.trim()),
          current_status: 'en_cours',
          resolution_level: resolutionLevel || null,
          resolution_details: resolutionDetails || null,
          declarant_name: declarantName,
          declarant_phone: declarantPhone || null,
          declarant_email: declarantEmail || null,
          declarant_quality: declarantQuality,
          supporting_documents: documentUrls,
          dispute_start_date: disputeStartDate,
          reported_by: user.id,
        } as any);

      if (error) {
        await cleanupUploadedFiles(uploadedPaths);
        throw error;
      }

      // Create CCC contribution (non-blocking)
      try {
          await supabase
            .from('cadastral_contributions')
            .insert({
              parcel_number: parcelNumber,
              original_parcel_id: parcelId || null as any,
            user_id: user.id,
            contribution_type: 'new',
            status: 'pending',
            current_owner_name: declarantName,
            province: null,
            whatsapp_number: declarantPhone || null,
          });
      } catch (contributionError) {
        console.warn('Erreur contribution CCC:', contributionError);
      }

      // Notification to submitter
      await sendDisputeNotification(
        user.id,
        'Litige foncier signalé',
        `Votre signalement de litige foncier (${referenceNumber}) pour la parcelle ${parcelNumber} a été enregistré avec succès.`,
        '/user-dashboard?tab=disputes'
      );

      // Notify admins
      await notifyAdminsAboutDispute(
        'Nouveau signalement de litige',
        `Un nouveau litige foncier (${referenceNumber}) a été signalé sur la parcelle ${parcelNumber} par ${declarantName}.`
      );

      localStorage.removeItem(draftKey);
      setStep('confirmation');
      toast.success('Litige foncier signalé avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setDisputeNature('');
    setDisputeDescription('');
    setDisputeStartDate('');
    setHasResolutionStarted(false);
    setResolutionLevel('');
    setResolutionDetails('');
    setDeclarantName('');
    setDeclarantPhone('');
    setDeclarantEmail('');
    setDeclarantQuality('proprietaire');
    setParties([{ name: '', phone: '', role: 'defendeur', relationship: '' }]);
    setDocuments([]);
    setCertifyAccuracy(false);
    onOpenChange(false);
  };

  const copyReference = () => {
    navigator.clipboard.writeText(referenceNumber);
    toast.success('Référence copiée');
  };

  if (!open) return null;

  // Confirmation step
  if (step === 'confirmation') {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-base font-bold">Signalement enregistré</h3>
          <p className="text-sm text-muted-foreground">
            Votre signalement de litige foncier a été enregistré avec succès.
          </p>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Référence :</span>
                <button onClick={copyReference} className="flex items-center gap-1 font-mono font-bold hover:text-primary transition-colors">
                  {referenceNumber} <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Parcelle :</span><span className="font-mono">{parcelNumber}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES.find(n => n.value === disputeNature)?.label}</span></div>
            </CardContent>
          </Card>
          <Alert className="bg-blue-50 border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              Conservez ce numéro de référence pour le suivi de votre dossier. Vous pouvez le retrouver dans votre tableau de bord.
            </AlertDescription>
          </Alert>
          <Button onClick={handleClose} className="w-full h-11 rounded-xl">Fermer</Button>
        </div>
      </div>
    );
  }

  // Review step
  if (step === 'review') {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="sm" onClick={() => setStep('form')} className="h-8 w-8 p-0 rounded-xl">
            <span className="text-sm">←</span>
          </Button>
          <h3 className="text-sm font-bold">Récapitulatif du signalement</h3>
        </div>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Scale className="h-4 w-4" /> Détails du litige</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Référence :</span><span className="font-mono font-bold">{referenceNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES.find(n => n.value === disputeNature)?.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Début :</span><span>{disputeStartDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Statut :</span><span>{hasResolutionStarted ? RESOLUTION_LEVELS.find(r => r.value === resolutionLevel)?.label : 'En cours'}</span></div>
              {disputeDescription && <div className="pt-1"><span className="text-muted-foreground">Description :</span><p className="mt-0.5">{disputeDescription}</p></div>}
              {resolutionDetails && <div className="pt-1"><span className="text-muted-foreground">Détails résolution :</span><p className="mt-0.5">{resolutionDetails}</p></div>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Déclarant</div>
            <div className="space-y-1.5 text-sm">
              {!embedded && <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{declarantName}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span>{DECLARANT_QUALITIES.find(q => q.value === declarantQuality)?.label}</span></div>
              {!embedded && declarantPhone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone :</span><span>{declarantPhone}</span></div>}
              {!embedded && declarantEmail && <div className="flex justify-between"><span className="text-muted-foreground">E-mail :</span><span>{declarantEmail}</span></div>}
            </div>
          </CardContent>
        </Card>

        {parties.filter(p => p.name.trim()).length > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary"><User className="h-4 w-4" /> Parties concernées</div>
              {parties.filter(p => p.name.trim()).map((party, i) => (
                <div key={i} className="text-sm flex justify-between">
                  <span className="text-muted-foreground">{PARTY_ROLES.find(r => r.value === party.role)?.label} :</span>
                  <span>{party.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Soumission en cours...</> : 'Soumettre le signalement'}
        </Button>
      </div>
    );
  }

  // Form step
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Draft restored indicator */}
      {draftRestored && (
        <Alert className="bg-blue-50 border-blue-200 rounded-xl">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Brouillon restauré. Vos données précédentes ont été récupérées.
          </AlertDescription>
        </Alert>
      )}

      {/* Avertissement important - masqué en mode embarqué */}
      {!embedded && (
        <Alert className="bg-amber-50 border-amber-300 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Important :</span> Les informations que vous fournissez dans ce formulaire doivent être exactes et vérifiables. Tout signalement contenant des informations erronées ou mensongères ne sera pas pris en considération et pourra engager votre responsabilité.
          </AlertDescription>
        </Alert>
      )}

      {/* Référence */}
      <Card className="bg-primary/5 border-primary/20 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Référence du signalement</p>
              <p className="font-mono font-bold text-sm text-primary">{referenceNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nature du litige */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          Nature du litige *
          <SectionHelpPopover title="Nature du litige" description="Sélectionnez le type de litige qui correspond le mieux à votre situation. Cette information permet de catégoriser et d'orienter correctement votre signalement." />
        </Label>
        <Select value={disputeNature} onValueChange={setDisputeNature}>
          <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
            <SelectValue placeholder="Sélectionner la nature du litige" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {DISPUTE_NATURES.map(nature => (
              <SelectItem key={nature.value} value={nature.value} className="text-sm py-2">
                {nature.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {disputeNature && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {DISPUTE_NATURES.find(n => n.value === disputeNature)?.description}
          </p>
        )}
      </div>

      {/* Date de début */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Date de début du litige *</Label>
        <Input type="date" value={disputeStartDate} onChange={(e) => setDisputeStartDate(e.target.value)} className="h-11 text-sm rounded-xl border-2 focus:border-primary" max={new Date().toISOString().split('T')[0]} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Description du litige</Label>
        <Textarea value={disputeDescription} onChange={(e) => { if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) setDisputeDescription(e.target.value); }} placeholder="Décrivez brièvement les circonstances du litige..." className="text-sm min-h-[80px] rounded-xl border-2 focus:border-primary" maxLength={MAX_DESCRIPTION_LENGTH} />
        {disputeDescription.length > MAX_DESCRIPTION_LENGTH * 0.8 && (
          <p className="text-[10px] text-muted-foreground text-right">{disputeDescription.length}/{MAX_DESCRIPTION_LENGTH}</p>
        )}
      </div>

      <Separator />

      {/* Résolution entamée ? (boolean toggle instead of ghost status) */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          Une procédure de résolution a-t-elle été entamée ?
          <SectionHelpPopover title="Résolution" description="Indiquez si une tentative de résolution (familiale, amiable, judiciaire...) a déjà été engagée pour ce litige." />
        </Label>
        <div className="flex gap-2">
          <Button
            variant={!hasResolutionStarted ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setHasResolutionStarted(false); setResolutionLevel(''); }}
            className="flex-1 h-10 rounded-xl text-sm"
          >
            Non
          </Button>
          <Button
            variant={hasResolutionStarted ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHasResolutionStarted(true)}
            className="flex-1 h-10 rounded-xl text-sm"
          >
            Oui
          </Button>
        </div>
      </div>

      {hasResolutionStarted && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Niveau de résolution *</Label>
            <Select value={resolutionLevel} onValueChange={setResolutionLevel}>
              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary"><SelectValue placeholder="Sélectionner le niveau" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {RESOLUTION_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value} className="text-sm py-2">
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resolutionLevel && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {RESOLUTION_LEVELS.find(l => l.value === resolutionLevel)?.description}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Détails sur la résolution</Label>
            <Textarea value={resolutionDetails} onChange={(e) => { if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) setResolutionDetails(e.target.value); }} placeholder="Numéro de dossier judiciaire, nom du médiateur, etc." className="text-sm min-h-[60px] rounded-xl border-2 focus:border-primary" maxLength={MAX_DESCRIPTION_LENGTH} />
            {resolutionDetails.length > MAX_DESCRIPTION_LENGTH * 0.8 && (
              <p className="text-[10px] text-muted-foreground text-right">{resolutionDetails.length}/{MAX_DESCRIPTION_LENGTH}</p>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Parties concernées */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Parties concernées
            <SectionHelpPopover title="Parties" description="Renseignez les personnes ou entités impliquées dans le litige : voisin, héritier, institution, etc." />
          </Label>
          <Button variant="outline" size="sm" onClick={addParty} className="h-9 text-xs gap-1 rounded-xl" disabled={parties.length >= MAX_PARTIES}>
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {parties.map((party, index) => (
          <Card key={index} className="rounded-xl shadow-sm">
            <CardContent className="p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Partie {index + 1}</span>
                {parties.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeParty(index)} className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nom complet *</Label>
                  <Input value={party.name} onChange={(e) => updateParty(index, 'name', e.target.value)} className="h-11 text-sm rounded-xl border-2" placeholder="Nom" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rôle</Label>
                  <Select value={party.role} onValueChange={(v) => updateParty(index, 'role', v)}>
                    <SelectTrigger className="h-11 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {PARTY_ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input value={party.phone} onChange={(e) => updateParty(index, 'phone', e.target.value)} className="h-11 text-sm rounded-xl border-2" placeholder="Téléphone (facultatif)" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Identité du déclarant */}
      <Card className="border-2 border-dashed rounded-xl">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            {embedded ? 'Qualité du déclarant' : 'Identité du déclarant'}
            <SectionHelpPopover title="Déclarant" description={embedded ? "Indiquez votre qualité par rapport à cette parcelle." : "Renseignez vos informations personnelles. Ces données permettent de vous contacter pour le suivi du dossier."} />
          </h4>
          <div className="space-y-2.5">
            {!embedded && (
              <div className="space-y-1">
                <Label className="text-xs">Nom complet *</Label>
                <Input value={declarantName} onChange={(e) => setDeclarantName(e.target.value)} className="h-11 text-sm rounded-xl border-2" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Qualité *</Label>
              <Select value={declarantQuality} onValueChange={setDeclarantQuality}>
                <SelectTrigger className="h-11 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DECLARANT_QUALITIES.map(q => <SelectItem key={q.value} value={q.value} className="text-sm">{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!embedded && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={declarantPhone} onChange={(e) => setDeclarantPhone(e.target.value)} className="h-11 text-sm rounded-xl border-2" placeholder="+243..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input value={declarantEmail} onChange={(e) => setDeclarantEmail(e.target.value)} className="h-11 text-sm rounded-xl border-2" type="email" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Documents justificatifs */}
      <Card className="border rounded-xl">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            Documents justificatifs
            <SectionHelpPopover title="Documents" description="Joignez tout document pertinent : procès-verbal de constatation, acte de propriété, correspondance, photos, attestation de plainte, etc." />
          </h4>
          <p className="text-xs text-muted-foreground">
            PV de constatation, acte de propriété, photos... (max 10 Mo/fichier)
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

      {!embedded && (
        <>
          <Separator />

          {/* Certification */}
          <div className="flex items-start gap-2.5">
            <Checkbox checked={certifyAccuracy} onCheckedChange={(c) => setCertifyAccuracy(c === true)} id="certify" className="mt-0.5" />
            <label htmlFor="certify" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Je certifie sur l'honneur que les informations fournies sont exactes et complètes. Tout signalement abusif ou frauduleux engage ma responsabilité civile et pénale.
            </label>
          </div>

          <Button onClick={handleGoToReview} className="w-full h-11 rounded-xl" disabled={!certifyAccuracy}>
            Vérifier et soumettre
          </Button>
        </>
      )}

      <WhatsAppFloatingButton 
        message={`Bonjour, j'ai besoin d'aide pour signaler un litige foncier sur la parcelle ${parcelNumber}.`}
      />
    </div>
  );
};

export default LandDisputeReportForm;
