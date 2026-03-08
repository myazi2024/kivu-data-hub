import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CalendarIcon, MapPin, Loader2, Plus, X, FileText, Upload, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import { PermitFormData, AttachmentFile, FeeItem, ATTACHMENT_FIELDS, isValidEmail, isValidPhone } from './types';

interface PermitFormStepProps {
  parcelNumber: string;
  requestType: 'new' | 'regularization';
  setRequestType: (v: 'new' | 'regularization') => void;
  formData: PermitFormData;
  handleInputChange: (field: string, value: string) => void;
  attachments: Record<string, AttachmentFile | null>;
  setAttachments: React.Dispatch<React.SetStateAction<Record<string, AttachmentFile | null>>>;
  feesLoading: boolean;
  feesSource: 'config' | 'fallback';
  feeBreakdown: { label: string; amount: number; detail?: string }[];
  totalFeeUSD: number;
  isFormValid: () => boolean;
  requiresOriginalPermit: () => boolean;
  onPreview: () => void;
}

const PermitFormStep: React.FC<PermitFormStepProps> = ({
  parcelNumber, requestType, setRequestType, formData, handleInputChange,
  attachments, setAttachments, feesLoading, feesSource, feeBreakdown,
  totalFeeUSD, isFormValid, requiresOriginalPermit, onPreview,
}) => {
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (key: string, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValid) { toast({ title: 'Format non supporté', description: 'Images ou PDF uniquement', variant: 'destructive' }); return; }
      if (!isValidSize) { toast({ title: 'Fichier trop volumineux', description: 'Max 10 Mo', variant: 'destructive' }); return; }
      setAttachments(prev => ({ ...prev, [key]: { file, label } }));
    }
    e.target.value = '';
  };

  // Validation hints
  const emailInvalid = formData.applicantEmail && !isValidEmail(formData.applicantEmail);
  const phoneInvalid = formData.applicantPhone && !isValidPhone(formData.applicantPhone);
  const areaValue = parseFloat(formData.plannedArea);
  const areaInvalid = formData.plannedArea && (isNaN(areaValue) || areaValue <= 0);

  return (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        {/* Parcelle info */}
        <Card className="bg-muted/50 border-0 rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />Parcelle</div>
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
            </div>
          </CardContent>
        </Card>

        {/* Type de demande */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Type de demande</h4>
            <RadioGroup value={requestType} onValueChange={(value: 'new' | 'regularization') => setRequestType(value)} className="space-y-2">
              <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${requestType === 'new' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">Nouvelle autorisation de bâtir</div>
                  <div className="text-xs text-muted-foreground">Construction à venir</div>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${requestType === 'regularization' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <RadioGroupItem value="regularization" id="regularization" />
                <Label htmlFor="regularization" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">Autorisation de régularisation</div>
                  <div className="text-xs text-muted-foreground">Construction existante sans autorisation</div>
                </Label>
              </div>
            </RadioGroup>
            {requestType === 'regularization' && (
              <Alert className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900 rounded-xl">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">Requis pour les constructions sans autorisation préalable. Frais majorés.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Détails de la construction */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              Détails de la construction
              <SectionHelpPopover title="Construction" description="Décrivez les caractéristiques techniques de votre projet de construction." />
            </h4>
            <div className="space-y-1.5">
              <Label className="text-sm">Type de construction *</Label>
              <Select value={formData.constructionType} onValueChange={(v) => handleInputChange('constructionType', v)}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner le type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                  <SelectItem value="Mixte">Mixte (résidentiel + commercial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nature de construction *</Label>
              <Select value={formData.constructionNature} onValueChange={(v) => handleInputChange('constructionNature', v)}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner la nature" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="En dur">En dur (béton, briques, ciment)</SelectItem>
                  <SelectItem value="Semi-dur">Semi-dur (matériaux mixtes)</SelectItem>
                  <SelectItem value="Précaire">Précaire (bois, tôle)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Usage déclaré *</Label>
              <Select value={formData.declaredUsage} onValueChange={(v) => handleInputChange('declaredUsage', v)}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner l'usage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Habitation">Habitation</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                  <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Surface (m²) *</Label>
                <Input type="number" min="1" placeholder="150" value={formData.plannedArea} onChange={(e) => handleInputChange('plannedArea', e.target.value)} className={cn("h-10 text-sm rounded-xl border-2", areaInvalid && "border-destructive")} />
                {areaInvalid && <p className="text-[10px] text-destructive">La surface doit être supérieure à 0</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre d'étages</Label>
                <Input type="number" min="1" placeholder="2" value={formData.numberOfFloors} onChange={(e) => handleInputChange('numberOfFloors', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre de pièces</Label>
                <Input type="number" min="1" placeholder="6" value={formData.numberOfRooms} onChange={(e) => handleInputChange('numberOfRooms', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Type de toiture</Label>
                <Select value={formData.roofingType} onValueChange={(v) => handleInputChange('roofingType', v)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Toiture" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tôle ondulée">Tôle ondulée</SelectItem>
                    <SelectItem value="Tuile">Tuile</SelectItem>
                    <SelectItem value="Dalle en béton">Dalle en béton</SelectItem>
                    <SelectItem value="Chaume">Chaume / Paille</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Eau</Label>
                <Select value={formData.waterSupply} onValueChange={(v) => handleInputChange('waterSupply', v)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Alimentation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGIDESO">REGIDESO</SelectItem>
                    <SelectItem value="Forage">Forage privé</SelectItem>
                    <SelectItem value="Citerne">Citerne</SelectItem>
                    <SelectItem value="Aucune">Aucune</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Électricité</Label>
                <Select value={formData.electricitySupply} onValueChange={(v) => handleInputChange('electricitySupply', v)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Alimentation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SNEL">SNEL</SelectItem>
                    <SelectItem value="Solaire">Solaire</SelectItem>
                    <SelectItem value="Groupe électrogène">Groupe électrogène</SelectItem>
                    <SelectItem value="Aucune">Aucune</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Coût estimé (USD)</Label>
              <Input type="number" placeholder="50000" value={formData.estimatedCost} onChange={(e) => handleInputChange('estimatedCost', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description du projet *</Label>
              <Textarea placeholder="Décrivez brièvement votre projet de construction..." value={formData.projectDescription} onChange={(e) => handleInputChange('projectDescription', e.target.value)} rows={3} className="resize-none text-sm rounded-xl border-2" />
            </div>
          </CardContent>
        </Card>

        {/* Architecte */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Architecte / Maître d'œuvre</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom de l'architecte</Label>
                <Input type="text" placeholder="Nom complet" value={formData.architectName} onChange={(e) => handleInputChange('architectName', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">N° d'agrément</Label>
                <Input type="text" placeholder="Ex: ONA/2024/001" value={formData.architectLicense} onChange={(e) => handleInputChange('architectLicense', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Champs spécifiques selon le type */}
        {requestType === 'new' ? (
          <Card className="border-2 rounded-xl">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold">Planification</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Date de début *</Label>
                  <Input type="date" min={new Date().toISOString().split('T')[0]} value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Durée (mois)</Label>
                  <Input type="number" placeholder="12" value={formData.estimatedDuration} onChange={(e) => handleInputChange('estimatedDuration', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Informations de régularisation</h4>
              <div className="space-y-1.5">
                <Label className="text-sm">Raison de la régularisation *</Label>
                <Select value={formData.regularizationReason} onValueChange={(v) => handleInputChange('regularizationReason', v)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner la raison" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construction sans permis initial">Construction sans permis initial</SelectItem>
                    <SelectItem value="Permis périmé">Permis périmé</SelectItem>
                    <SelectItem value="Modification non autorisée">Modification non autorisée</SelectItem>
                    <SelectItem value="Extension ou agrandissement">Extension ou agrandissement</SelectItem>
                    <SelectItem value="Changement d'usage sans autorisation">Changement d'usage sans autorisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {requiresOriginalPermit() && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Numéro du permis initial *</Label>
                  <Input type="text" placeholder="Ex: PC/2020/001234" value={formData.originalPermitNumber} onChange={(e) => handleInputChange('originalPermitNumber', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">Date de construction *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal rounded-xl border-2", !formData.constructionDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.constructionDate ? format(new Date(formData.constructionDate), "dd MMMM yyyy", { locale: fr }) : <span>Sélectionner une date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.constructionDate ? new Date(formData.constructionDate) : undefined} onSelect={(date) => { if (date) handleInputChange('constructionDate', date.toISOString().split('T')[0]); }} disabled={(date) => date > new Date() || date < new Date(1900, 0, 1)} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">État actuel *</Label>
                <Select value={formData.currentState} onValueChange={(v) => handleInputChange('currentState', v)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue placeholder="Sélectionner l'état" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En cours">En cours</SelectItem>
                    <SelectItem value="Terminée">Terminée</SelectItem>
                    <SelectItem value="Partiellement terminée">Partiellement terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Problèmes de conformité</Label>
                <Textarea placeholder="Décrivez les éventuels problèmes..." value={formData.complianceIssues} onChange={(e) => handleInputChange('complianceIssues', e.target.value)} rows={2} className="resize-none text-sm rounded-xl border-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informations du demandeur */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold">Informations du demandeur</h4>
            <div className="space-y-1.5">
              <Label className="text-sm">Nom complet *</Label>
              <Input type="text" placeholder="Jean Dupont" value={formData.applicantName} onChange={(e) => handleInputChange('applicantName', e.target.value)} className="h-10 text-sm rounded-xl border-2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Téléphone *</Label>
                <Input type="tel" placeholder="+243 XXX XXX XXX" value={formData.applicantPhone} onChange={(e) => handleInputChange('applicantPhone', e.target.value)} className={cn("h-10 text-sm rounded-xl border-2", phoneInvalid && "border-destructive")} />
                {phoneInvalid && <p className="text-[10px] text-destructive">Numéro invalide (min. 9 chiffres)</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input type="email" placeholder="email@exemple.com" value={formData.applicantEmail} onChange={(e) => handleInputChange('applicantEmail', e.target.value)} className={cn("h-10 text-sm rounded-xl border-2", emailInvalid && "border-destructive")} />
                {emailInvalid && <p className="text-[10px] text-destructive">Adresse email invalide</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Adresse</Label>
              <Textarea placeholder="Votre adresse complète..." value={formData.applicantAddress} onChange={(e) => handleInputChange('applicantAddress', e.target.value)} rows={2} className="resize-none text-sm rounded-xl border-2" />
            </div>
          </CardContent>
        </Card>

        {/* Pièces jointes */}
        <Card className="border-2 rounded-xl">
          <CardContent className="p-3 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Upload className="h-4 w-4" />
              Pièces jointes
              <SectionHelpPopover title="Documents requis" description="Joignez les documents nécessaires à l'instruction de votre dossier. Les plans architecturaux et la pièce d'identité sont obligatoires." />
            </h4>
            <div className="space-y-2">
              {ATTACHMENT_FIELDS.map(({ key, label, required }) => (
                <div key={key}>
                  {!attachments[key] ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRefs.current[key]?.click()}
                      className={cn("gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2 justify-start", required && !attachments[key] && "border-destructive/50")}>
                      <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{label}{required ? ' *' : ''}</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium block truncate">{label}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{attachments[key]!.file.name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAttachments(prev => ({ ...prev, [key]: null }))} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <input ref={el => { fileInputRefs.current[key] = el; }} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => handleFileChange(key, label, e)} className="hidden" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif des frais */}
        <Card className="bg-primary/5 border-2 border-primary/20 rounded-xl">
          <CardContent className="p-3 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5"><Info className="h-4 w-4 text-primary" />Détail des frais</h4>
            {feesLoading ? (
              <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Chargement des frais...</span></div>
            ) : (
              <>
                {feeBreakdown.map((fee, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground text-xs">{fee.label}</span>
                      {fee.detail && <span className="text-[10px] text-muted-foreground ml-1">({fee.detail})</span>}
                    </div>
                    <span className="font-medium ml-2">${fee.amount.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-lg font-bold text-primary">${totalFeeUSD.toFixed(2)} USD</span>
                </div>
                {feesSource === 'fallback' && (
                  <p className="text-[10px] text-muted-foreground italic">* Tarification par défaut. Le montant final sera confirmé par l'administration.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Button onClick={onPreview} className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg" disabled={!isFormValid() || feesLoading}>
          Aperçu avant soumission
        </Button>
      </div>
    </ScrollArea>
  );
};

export default PermitFormStep;
