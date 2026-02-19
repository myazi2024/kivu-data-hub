import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, X, Info, CheckCircle2, Plus, Trash2, Scale, User, Phone, Mail, FileText, Calendar, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import SectionHelpPopover from './SectionHelpPopover';

interface LandDisputeReportFormProps {
  parcelNumber: string;
  parcelId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedded?: boolean;
}

const DISPUTE_NATURES = [
  { value: 'succession', label: 'Litige successoral', description: 'Conflit lié à l\'héritage ou à la transmission du bien' },
  { value: 'delimitation', label: 'Conflit de délimitation', description: 'Contestation des limites de la parcelle avec un voisin' },
  { value: 'construction_anarchique', label: 'Construction anarchique', description: 'Empiétement ou construction non autorisée sur la parcelle' },
  { value: 'expropriation', label: 'Expropriation', description: 'Procédure d\'expropriation initiée par une autorité publique' },
  { value: 'double_vente', label: 'Double vente', description: 'La parcelle a été vendue à plusieurs acquéreurs' },
  { value: 'occupation_illegale', label: 'Occupation illégale', description: 'Occupation de la parcelle par un tiers sans droit' },
  { value: 'contestation_titre', label: 'Contestation de titre', description: 'Remise en cause de la validité du titre foncier' },
  { value: 'servitude', label: 'Litige de servitude', description: 'Conflit lié à un droit de passage ou une servitude' },
  { value: 'autre', label: 'Autre', description: 'Autre type de litige foncier' }
];

const RESOLUTION_LEVELS = [
  { value: 'non_entame', label: 'Non entamé', description: 'Aucune procédure de résolution n\'a été engagée' },
  { value: 'familial', label: 'Niveau familial', description: 'Tentative de résolution au sein de la famille' },
  { value: 'conciliation_amiable', label: 'Conciliation amiable', description: 'Médiation ou arbitrage entre les parties' },
  { value: 'autorite_locale', label: 'Autorité locale', description: 'Le litige est soumis au chef de quartier ou de localité' },
  { value: 'arbitrage', label: 'Instance d\'arbitrage', description: 'Le litige est devant une commission d\'arbitrage' },
  { value: 'tribunal', label: 'Devant les tribunaux', description: 'Le litige fait l\'objet d\'une procédure judiciaire' },
  { value: 'appel', label: 'En appel', description: 'Le jugement a fait l\'objet d\'un appel' }
];

const DECLARANT_QUALITIES = [
  { value: 'proprietaire', label: 'Propriétaire' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'heritier', label: 'Héritier' },
  { value: 'mandataire', label: 'Mandataire / Représentant légal' },
  { value: 'occupant', label: 'Occupant' },
  { value: 'voisin', label: 'Voisin' },
  { value: 'autre', label: 'Autre' }
];

const PARTY_ROLES = [
  { value: 'demandeur', label: 'Demandeur' },
  { value: 'defendeur', label: 'Défendeur' },
  { value: 'tiers', label: 'Tiers concerné' },
  { value: 'temoin', label: 'Témoin' }
];

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
  
  const [disputeNature, setDisputeNature] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeStartDate, setDisputeStartDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState('en_cours');
  const [resolutionLevel, setResolutionLevel] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  
  const [declarantName, setDeclarantName] = useState('');
  const [declarantPhone, setDeclarantPhone] = useState('');
  const [declarantEmail, setDeclarantEmail] = useState('');
  const [declarantIdNumber, setDeclarantIdNumber] = useState('');
  const [declarantQuality, setDeclarantQuality] = useState('proprietaire');
  
  const [parties, setParties] = useState<Party[]>([{ name: '', phone: '', role: 'defendeur', relationship: '' }]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [certifyAccuracy, setCertifyAccuracy] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const ref = `LIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setReferenceNumber(ref);
    }
  }, [open]);

  useEffect(() => {
    if (profile) {
      setDeclarantName(profile.full_name || '');
      setDeclarantEmail(profile.email || '');
    }
  }, [profile]);

  const addParty = () => {
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
    const newFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) toast.error(`${file.name}: Format non supporté`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10 Mo)`);
      return isValid && isValidSize;
    });
    setDocuments(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!disputeNature) { toast.error('Veuillez sélectionner la nature du litige'); return false; }
    if (!disputeStartDate) { toast.error('Veuillez indiquer la date de début du litige'); return false; }
    if (currentStatus === 'en_resolution' && !resolutionLevel) { toast.error('Veuillez indiquer le niveau de résolution'); return false; }
    if (!declarantName.trim()) { toast.error('Veuillez indiquer votre nom'); return false; }
    if (!declarantQuality) { toast.error('Veuillez indiquer votre qualité'); return false; }
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
    setLoading(true);
    try {
      // Upload documents
      const documentUrls: string[] = [];
      for (const file of documents) {
        const fileExt = file.name.split('.').pop();
        const fileName = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
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
          reference_number: referenceNumber,
          dispute_type: 'report',
          dispute_nature: disputeNature,
          dispute_description: disputeDescription,
          parties_involved: parties.filter(p => p.name.trim()),
          current_status: currentStatus === 'en_resolution' ? resolutionLevel : 'en_cours',
          resolution_level: resolutionLevel || null,
          resolution_details: resolutionDetails || null,
          declarant_name: declarantName,
          declarant_phone: declarantPhone,
          declarant_email: declarantEmail,
          declarant_id_number: declarantIdNumber,
          declarant_quality: declarantQuality,
          supporting_documents: documentUrls,
          dispute_start_date: disputeStartDate,
          reported_by: user.id,
        } as any);

      if (error) throw error;

      await supabase.from('notifications' as any).insert({
        user_id: user.id,
        title: 'Litige foncier signalé',
        message: `Votre signalement de litige foncier (${referenceNumber}) pour la parcelle ${parcelNumber} a été enregistré avec succès.`,
        type: 'success',
        action_url: '/user-dashboard'
      });

      setStep('confirmation');
      toast.success('Litige foncier signalé avec succès');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setDisputeNature('');
    setDisputeDescription('');
    setDisputeStartDate('');
    setCurrentStatus('en_cours');
    setResolutionLevel('');
    setResolutionDetails('');
    setParties([{ name: '', phone: '', role: 'defendeur', relationship: '' }]);
    setDocuments([]);
    setCertifyAccuracy(false);
    onOpenChange(false);
  };

  if (!open) return null;

  // Confirmation step
  if (step === 'confirmation') {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-base font-bold">Signalement enregistré</h3>
          <p className="text-xs text-muted-foreground">
            Votre signalement de litige foncier a été enregistré avec succès.
          </p>
          <Card className="p-3 bg-muted/50">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Référence :</span><span className="font-mono font-bold">{referenceNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Parcelle :</span><span className="font-mono">{parcelNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES.find(n => n.value === disputeNature)?.label}</span></div>
            </div>
          </Card>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              Ce numéro de référence sera utilisé pour le suivi de votre dossier. Conservez-le précieusement.
            </AlertDescription>
          </Alert>
          <Button onClick={handleClose} className="w-full">Fermer</Button>
        </div>
      </div>
    );
  }

  // Review step
  if (step === 'review') {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('form')} className="h-7 w-7 p-0 rounded-lg">
            <span className="text-xs">←</span>
          </Button>
          <h3 className="text-sm font-bold">Récapitulatif du signalement</h3>
        </div>

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Scale className="h-3.5 w-3.5" /> Détails du litige</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Référence :</span><span className="font-mono font-bold">{referenceNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Nature :</span><span>{DISPUTE_NATURES.find(n => n.value === disputeNature)?.label}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Début :</span><span>{disputeStartDate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Statut :</span><span>{currentStatus === 'en_resolution' ? RESOLUTION_LEVELS.find(r => r.value === resolutionLevel)?.label : 'En cours'}</span></div>
            {disputeDescription && <div className="pt-1"><span className="text-muted-foreground">Description :</span><p className="mt-0.5">{disputeDescription}</p></div>}
          </div>
        </Card>

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><User className="h-3.5 w-3.5" /> Déclarant</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Nom :</span><span>{declarantName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Qualité :</span><span>{DECLARANT_QUALITIES.find(q => q.value === declarantQuality)?.label}</span></div>
            {declarantPhone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone :</span><span>{declarantPhone}</span></div>}
          </div>
        </Card>

        {parties.filter(p => p.name.trim()).length > 0 && (
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary"><User className="h-3.5 w-3.5" /> Parties concernées</div>
            {parties.filter(p => p.name.trim()).map((party, i) => (
              <div key={i} className="text-xs flex justify-between">
                <span className="text-muted-foreground">{PARTY_ROLES.find(r => r.value === party.role)?.label} :</span>
                <span>{party.name}</span>
              </div>
            ))}
          </Card>
        )}

        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><FileText className="h-3.5 w-3.5" /> Documents</div>
          <div className="text-xs text-muted-foreground">{documents.length} document(s) joint(s)</div>
        </Card>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Soumission en cours...</> : 'Soumettre le signalement'}
        </Button>
      </div>
    );
  }

  // Form step
  return (
    <div className="p-4 space-y-4">
      {/* Référence */}
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 text-xs">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <span className="text-muted-foreground">Référence : </span>
            <span className="font-mono font-bold text-primary">{referenceNumber}</span>
          </div>
        </div>
      </Card>

      {/* Nature du litige */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label className="text-xs font-semibold">Nature du litige *</Label>
          <SectionHelpPopover title="Nature du litige" description="Sélectionnez le type de litige qui correspond le mieux à votre situation. Cette information permet de catégoriser et d'orienter correctement votre signalement." />
        </div>
        <Select value={disputeNature} onValueChange={setDisputeNature}>
          <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Sélectionner la nature du litige" /></SelectTrigger>
          <SelectContent>
            {DISPUTE_NATURES.map(nature => (
              <SelectItem key={nature.value} value={nature.value} className="text-xs">
                <div>
                  <div className="font-medium">{nature.label}</div>
                  <div className="text-muted-foreground text-[10px]">{nature.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date de début */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Date de début du litige *</Label>
        <Input type="date" value={disputeStartDate} onChange={(e) => setDisputeStartDate(e.target.value)} className="h-10 text-xs" max={new Date().toISOString().split('T')[0]} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Description du litige</Label>
        <Textarea value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} placeholder="Décrivez brièvement les circonstances du litige..." className="text-xs min-h-[70px]" />
      </div>

      <Separator />

      {/* Statut actuel */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Statut actuel du litige *</Label>
        <Select value={currentStatus} onValueChange={setCurrentStatus}>
          <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en_cours" className="text-xs">En cours (non résolu)</SelectItem>
            <SelectItem value="en_resolution" className="text-xs">En cours de résolution</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currentStatus === 'en_resolution' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Niveau de résolution *</Label>
            <Select value={resolutionLevel} onValueChange={setResolutionLevel}>
              <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Sélectionner le niveau" /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value} className="text-xs">
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-muted-foreground text-[10px]">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Détails sur la résolution</Label>
            <Textarea value={resolutionDetails} onChange={(e) => setResolutionDetails(e.target.value)} placeholder="Numéro de dossier judiciaire, nom du médiateur, etc." className="text-xs min-h-[50px]" />
          </div>
        </>
      )}

      <Separator />

      {/* Parties concernées */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Parties concernées</Label>
          <Button variant="outline" size="sm" onClick={addParty} className="h-7 text-[10px] gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {parties.map((party, index) => (
          <Card key={index} className="p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">Partie {index + 1}</span>
              {parties.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeParty(index)} className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Nom complet *</Label>
                <Input value={party.name} onChange={(e) => updateParty(index, 'name', e.target.value)} className="h-8 text-xs" placeholder="Nom" />
              </div>
              <div>
                <Label className="text-[10px]">Rôle</Label>
                <Select value={party.role} onValueChange={(v) => updateParty(index, 'role', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTY_ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input value={party.phone} onChange={(e) => updateParty(index, 'phone', e.target.value)} className="h-8 text-xs" placeholder="Téléphone (facultatif)" />
          </Card>
        ))}
      </div>

      <Separator />

      {/* Identité du déclarant */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Identité du déclarant</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Nom complet *</Label>
            <Input value={declarantName} onChange={(e) => setDeclarantName(e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Qualité *</Label>
            <Select value={declarantQuality} onValueChange={setDeclarantQuality}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECLARANT_QUALITIES.map(q => <SelectItem key={q.value} value={q.value} className="text-xs">{q.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Téléphone</Label>
              <Input value={declarantPhone} onChange={(e) => setDeclarantPhone(e.target.value)} className="h-9 text-xs" placeholder="+243..." />
            </div>
            <div>
              <Label className="text-[10px]">E-mail</Label>
              <Input value={declarantEmail} onChange={(e) => setDeclarantEmail(e.target.value)} className="h-9 text-xs" type="email" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">N° pièce d'identité</Label>
            <Input value={declarantIdNumber} onChange={(e) => setDeclarantIdNumber(e.target.value)} className="h-9 text-xs" placeholder="Numéro de carte d'identité ou passeport" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Documents justificatifs */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label className="text-xs font-semibold">Documents justificatifs</Label>
          <SectionHelpPopover title="Documents" description="Joignez tout document pertinent : procès-verbal de constatation, acte de propriété, correspondance, photos, attestation de plainte, etc." />
        </div>
        <div 
          className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Cliquez pour ajouter des fichiers</p>
          <p className="text-[10px] text-muted-foreground">Images ou PDF, max 10 Mo par fichier</p>
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

      {/* Certification */}
      <div className="flex items-start gap-2">
        <Checkbox checked={certifyAccuracy} onCheckedChange={(c) => setCertifyAccuracy(c === true)} id="certify" />
        <label htmlFor="certify" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
          Je certifie sur l'honneur que les informations fournies sont exactes et complètes. Tout signalement abusif ou frauduleux engage ma responsabilité civile et pénale.
        </label>
      </div>

      <Button onClick={handleGoToReview} className="w-full" disabled={!certifyAccuracy}>
        Vérifier et soumettre
      </Button>

      <WhatsAppFloatingButton 
        message={`Bonjour, j'ai besoin d'aide pour signaler un litige foncier sur la parcelle ${parcelNumber}.`}
      />
    </div>
  );
};

export default LandDisputeReportForm;
