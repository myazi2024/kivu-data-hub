import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Home, ClipboardCheck, RefreshCw, Check, AlertCircle, CheckCircle2, Award, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import { useToast } from '@/hooks/use-toast';
import { NATIONALITY_OPTIONS, DeducedLandTitle } from '@/utils/landTitleDeduction';
import { validateLandTitleFile } from '@/types/landTitleRequest';
import { BuildingPermitIssuingServiceSelect } from '../BuildingPermitIssuingServiceSelect';
import { LandTitleRequestData } from '@/hooks/useLandTitleRequest';
import { ParcelValorisationData, ParcelBuildingPermit } from './types';

export interface ValorisationTabProps {
  isParcelLinkedMode: boolean;
  parcelValidated: boolean;
  parcelValorisationData: ParcelValorisationData | null;
  selectedParcelNumber: string;
  parcelBuildingPermits: ParcelBuildingPermit[];
  valorisationChoice: null | 'exact' | 'update';
  setValorisationChoice: (value: 'exact' | 'update') => void;
  showValorisationUpdate: boolean;
  formData: LandTitleRequestData;

  propertyCategory: string;
  setPropertyCategory: (v: string) => void;
  PROPERTY_CATEGORY_OPTIONS: string[];

  constructionType: string;
  setConstructionType: (v: string) => void;
  availableConstructionTypes: string[];

  constructionMaterials: string;
  setConstructionMaterials: (v: string) => void;

  constructionNature: string;
  setConstructionNature: (v: string) => void;
  availableConstructionNatures: string[];

  declaredUsage: string;
  setDeclaredUsage: (v: string) => void;
  availableDeclaredUsages: string[];

  standing: string;
  setStanding: (v: string) => void;

  floorNumber: string;
  setFloorNumber: (v: string) => void;

  constructionYear: string;
  setConstructionYear: (v: string) => void;

  hasPermitUpdate: 'yes' | 'no' | '';
  setHasPermitUpdate: (v: 'yes' | 'no' | '') => void;
  permitUpdateType: 'construction' | 'regularization';
  setPermitUpdateType: (v: 'construction' | 'regularization') => void;
  permitUpdateNumber: string;
  setPermitUpdateNumber: (v: string) => void;
  permitUpdateDate: string;
  setPermitUpdateDate: (v: string) => void;
  permitUpdateService: string;
  setPermitUpdateService: (v: string) => void;
  permitUpdateFile: File | null;
  setPermitUpdateFile: (v: File | null) => void;

  nationality: 'congolais' | 'etranger' | '';
  setNationality: (v: 'congolais' | 'etranger') => void;

  handleValidateValorisation: () => void;
  valorisationValidated: boolean;
  deducedTitleType: DeducedLandTitle | null;
  requestType: 'initial' | 'renouvellement' | 'conversion' | '';
  setActiveTab: (tab: string) => void;
}

const ValorisationTab: React.FC<ValorisationTabProps> = (props) => {
  const {
    isParcelLinkedMode, parcelValidated, parcelValorisationData, selectedParcelNumber, parcelBuildingPermits,
    valorisationChoice, setValorisationChoice, showValorisationUpdate, formData,
    propertyCategory, setPropertyCategory, PROPERTY_CATEGORY_OPTIONS,
    constructionType, setConstructionType, availableConstructionTypes,
    constructionMaterials, setConstructionMaterials,
    constructionNature, setConstructionNature, availableConstructionNatures,
    declaredUsage, setDeclaredUsage, availableDeclaredUsages,
    standing, setStanding,
    floorNumber, setFloorNumber,
    constructionYear, setConstructionYear,
    hasPermitUpdate, setHasPermitUpdate,
    permitUpdateType, setPermitUpdateType,
    permitUpdateNumber, setPermitUpdateNumber,
    permitUpdateDate, setPermitUpdateDate,
    permitUpdateService, setPermitUpdateService,
    permitUpdateFile, setPermitUpdateFile,
    nationality, setNationality,
    handleValidateValorisation, valorisationValidated, deducedTitleType, requestType, setActiveTab,
  } = props;

  const { toast } = useToast();

  return (
                <TabsContent value="valorisation" className="space-y-4">
                  {/* PARCEL-LINKED MODE: Auto-loaded valorisation data displayed as read-only */}
                  {isParcelLinkedMode && parcelValidated && parcelValorisationData && (
                    <>
                      <Card className="border-2 border-primary/20 rounded-xl bg-primary/5">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold">Données de mise en valeur enregistrées</h4>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ces informations sont extraites de la fiche parcellaire <strong>{selectedParcelNumber}</strong> disponible dans la base de données.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-background border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Catégorie de bien</p>
                              <p className="text-sm font-medium">{parcelValorisationData.propertyCategory || '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Type de construction</p>
                              <p className="text-sm font-medium">{parcelValorisationData.constructionType || '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Matériaux</p>
                              <p className="text-sm font-medium">{parcelValorisationData.constructionMaterials || '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Nature</p>
                              <p className="text-sm font-medium">{parcelValorisationData.constructionNature || '—'}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-background border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Usage déclaré</p>
                              <p className="text-sm font-medium">{parcelValorisationData.declaredUsage || '—'}</p>
                            </div>
                            {/* Conditionally show standing & floor_number if nature != "Non bâti" */}
                            {parcelValorisationData.constructionNature && !parcelValorisationData.constructionNature.toLowerCase().includes('non bâti') && (
                              <>
                                <div className="p-2 rounded-lg bg-background border">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Standing</p>
                                  <p className="text-sm font-medium">{parcelValorisationData.standing || '—'}</p>
                                </div>
                                {parcelValorisationData.propertyCategory !== 'Appartement' && (
                                  <div className="p-2 rounded-lg bg-background border">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Nombre d'étages</p>
                                    <p className="text-sm font-medium">{parcelValorisationData.floorNumber || '—'}</p>
                                  </div>
                                )}
                              </>
                            )}
                            {/* Conditionally show construction year if type != "Terrain nu" */}
                            {parcelValorisationData.constructionType !== 'Terrain nu' && (
                              <div className="p-2 rounded-lg bg-background border">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Année de construction</p>
                                <p className="text-sm font-medium">{parcelValorisationData.constructionYear || '—'}</p>
                              </div>
                            )}
                          </div>

                          {/* Building permits read-only sub-block */}
                          {parcelValorisationData.constructionType !== 'Terrain nu' && parcelValorisationData.propertyCategory !== 'Appartement' && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              <div className="flex items-center gap-2">
                                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                                <h5 className="text-xs font-semibold">Autorisation de bâtir</h5>
                              </div>
                              {parcelBuildingPermits.length > 0 ? (
                                <div className="space-y-2">
                                  {parcelBuildingPermits.map((permit, idx) => {
                                    // Mask permit number for PII
                                    const masked = permit.permit_number.length > 6
                                      ? permit.permit_number.slice(0, 3) + '***' + permit.permit_number.slice(-2)
                                      : '***';
                                    const issueDate = permit.issue_date ? new Date(permit.issue_date) : null;
                                    const expiryDate = issueDate ? new Date(new Date(issueDate).setMonth(issueDate.getMonth() + (permit.validity_period_months || 36))) : null;
                                    const isExpired = expiryDate ? expiryDate < new Date() : false;
                                    return (
                                      <div key={idx} className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg bg-background border">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">N° Autorisation</p>
                                          <p className="text-sm font-medium">{masked}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background border">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Statut</p>
                                          <p className="text-sm font-medium">{isExpired ? 'Expirée' : (permit.administrative_status || 'Valide')}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background border">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Date d'émission</p>
                                          <p className="text-sm font-medium">{issueDate ? issueDate.toLocaleDateString('fr-FR') : '—'}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background border">
                                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Service émetteur</p>
                                          <p className="text-sm font-medium">{permit.issuing_service || '—'}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Aucune autorisation enregistrée</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Radio group: exact or update */}
                      <RadioGroup
                        value={valorisationChoice || ''}
                        onValueChange={(val) => setValorisationChoice(val as 'exact' | 'update')}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="exact" id="valo-exact" />
                          <Label htmlFor="valo-exact" className="text-sm cursor-pointer">Ces données sont exactes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="update" id="valo-update" />
                          <Label htmlFor="valo-update" className="text-sm cursor-pointer flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3" />
                            Proposer une mise à jour
                          </Label>
                        </div>
                      </RadioGroup>
                    </>
                  )}

                  {/* Construction form block - always shown if no parcel data, or conditionally if update requested */}
                  {(!(isParcelLinkedMode && parcelValidated && parcelValorisationData) || showValorisationUpdate) && (
                  <>
                  <Card className={cn("border rounded-xl", showValorisationUpdate && "border-2 border-orange-300/50 bg-orange-50/30 dark:bg-orange-950/10")}>
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          {showValorisationUpdate ? 'Proposer une mise à jour' : 'Mise en valeur'}
                          <SectionHelpPopover
                            title={showValorisationUpdate ? "Mise à jour des données" : "Mise en valeur"}
                            description={showValorisationUpdate 
                              ? "Corrigez les informations de mise en valeur si elles sont obsolètes ou inexactes. Vos modifications seront soumises pour vérification."
                              : "Décrivez comment la parcelle est mise en valeur : type de construction, nature, usage déclaré. Ces informations déterminent le type de titre foncier auquel vous avez droit."}
                          />
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">
                          {formData.sectionType === 'urbaine' ? 'SU' : formData.sectionType === 'rurale' ? 'SR' : '—'}
                        </span>
                      </div>

                      {/* Row 0: Catégorie de bien */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Catégorie de bien *</Label>
                          <Select 
                            value={propertyCategory}
                            onValueChange={(value) => {
                              setPropertyCategory(value);
                            }}
                          >
                            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                              <SelectValue placeholder="Sélectionner la catégorie" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {PROPERTY_CATEGORY_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt} className="text-sm py-2">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 1: Type de construction + Matériaux */}
                      {propertyCategory && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Type de construct. *</Label>
                          <Select 
                            value={constructionType}
                            onValueChange={(value) => {
                              setConstructionType(value);
                              if (value === 'Terrain nu') {
                                setConstructionMaterials('');
                                setStanding('');
                                setFloorNumber('');
                              }
                            }}
                            disabled={availableConstructionTypes.length <= 1}
                          >
                            <SelectTrigger className={cn(
                              "h-11 text-sm rounded-xl border-2",
                              availableConstructionTypes.length <= 1 ? "bg-muted/50" : "focus:border-primary"
                            )}>
                              <SelectValue placeholder="Choisir le type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {availableConstructionTypes.map(t => (
                                <SelectItem key={t} value={t} className="text-sm py-2">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {constructionType !== 'Terrain nu' && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">Matériaux</Label>
                            <Select value={constructionMaterials} onValueChange={setConstructionMaterials}>
                              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {(() => {
                                  const materialsByNature: Record<string, string[]> = {
                                    'Durable': ['Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle'],
                                    'Semi-durable': ['Semi-dur', 'Briques adobes', 'Bois', 'Mixte'],
                                    'Précaire': ['Tôles', 'Bois', 'Paille', 'Autre'],
                                  };
                                  const materials = materialsByNature[constructionNature] || [
                                    'Béton armé', 'Briques cuites', 'Parpaings', 'Pierre naturelle',
                                    'Semi-dur', 'Briques adobes', 'Bois', 'Mixte', 'Tôles', 'Paille', 'Autre'
                                  ];
                                  return materials.map(m => (
                                    <SelectItem key={m} value={m} className="text-sm py-2">{m}</SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      )}

                      {/* Row 2: Nature (auto-determined) + Usage déclaré */}
                      {constructionType && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Nature *</Label>
                            <Select 
                              value={constructionNature}
                              onValueChange={setConstructionNature}
                              disabled={!constructionType}
                            >
                              <SelectTrigger className={cn(
                                "h-11 text-sm rounded-xl border-2",
                                !constructionType ? "bg-muted/50 cursor-not-allowed" : "focus:border-primary"
                              )}>
                                <SelectValue placeholder={!constructionType ? "→ Type d'abord" : "Choisir"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableConstructionNatures.map((nature) => (
                                  <SelectItem key={nature} value={nature} className="text-sm py-2">{nature}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-sm">Usage déclaré *</Label>
                            <Select 
                              value={declaredUsage}
                              onValueChange={setDeclaredUsage}
                              disabled={!constructionNature}
                            >
                              <SelectTrigger className={cn(
                                "h-11 text-sm rounded-xl border-2",
                                !constructionNature ? "bg-muted/50" : "focus:border-primary"
                              )}>
                                <SelectValue placeholder={!constructionNature ? "→ Nature d'abord" : "Choisir l'usage"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableDeclaredUsages.map((usage) => (
                                  <SelectItem key={usage} value={usage} className="text-sm py-2">{usage}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Row 3: Standing + Nombre d'étages (visible if nature != "Non bâti" AND category != "Appartement") */}
                      {constructionNature && !constructionNature.toLowerCase().includes('non bâti') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Standing</Label>
                            <Select value={standing} onValueChange={setStanding}>
                              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Haut standing" className="text-sm py-2">Haut standing</SelectItem>
                                <SelectItem value="Moyen standing" className="text-sm py-2">Moyen standing</SelectItem>
                                <SelectItem value="Bas standing" className="text-sm py-2">Bas standing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {propertyCategory !== 'Appartement' && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">Nombre d'étages</Label>
                            <Select value={floorNumber} onValueChange={setFloorNumber}>
                              <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="0" className="text-sm py-2">Rez-de-chaussée uniquement</SelectItem>
                                <SelectItem value="1" className="text-sm py-2">R+1</SelectItem>
                                <SelectItem value="2" className="text-sm py-2">R+2</SelectItem>
                                <SelectItem value="3" className="text-sm py-2">R+3</SelectItem>
                                <SelectItem value="4+" className="text-sm py-2">R+4 ou plus</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          )}
                        </div>
                      )}

                      {/* Row 4: Année de construction (visible if type != "Terrain nu") */}
                      {constructionType && constructionType !== 'Terrain nu' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Année de construction</Label>
                            <Input
                              type="number"
                              min={1900}
                              max={new Date().getFullYear()}
                              value={constructionYear}
                              onChange={(e) => setConstructionYear(e.target.value)}
                              placeholder="Ex: 2015"
                              className="h-11 text-sm rounded-xl border-2 focus:border-primary"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                   </Card>

                  {/* Building permit update sub-block (conditional, visible when update mode + type != Terrain nu + category != Appartement) */}
                  {showValorisationUpdate && constructionType && constructionType !== 'Terrain nu' && propertyCategory !== 'Appartement' && (
                    <Card className="border rounded-xl border-2 border-orange-300/50 bg-orange-50/30 dark:bg-orange-950/10">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold">Autorisation de bâtir</h4>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Avez-vous obtenu une autorisation de bâtir ?</Label>
                          <RadioGroup
                            value={hasPermitUpdate}
                            onValueChange={(val) => setHasPermitUpdate(val as 'yes' | 'no')}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="permit-yes" />
                              <Label htmlFor="permit-yes" className="text-sm cursor-pointer">Oui</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="permit-no" />
                              <Label htmlFor="permit-no" className="text-sm cursor-pointer">Non</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {hasPermitUpdate === 'yes' && (
                          <div className="space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Type *</Label>
                                <Select value={permitUpdateType} onValueChange={(v) => setPermitUpdateType(v as 'construction' | 'regularization')}>
                                  <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="construction" className="text-sm py-2">Autorisation de bâtir</SelectItem>
                                    <SelectItem value="regularization" className="text-sm py-2">Régularisation</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">N° Autorisation *</Label>
                                <Input
                                  value={permitUpdateNumber}
                                  onChange={(e) => setPermitUpdateNumber(e.target.value)}
                                  placeholder="Ex: PC-2024-001"
                                  className="h-11 text-sm rounded-xl border-2 focus:border-primary"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Date d'émission *</Label>
                                <Input
                                  type="date"
                                  value={permitUpdateDate}
                                  onChange={(e) => setPermitUpdateDate(e.target.value)}
                                  max={new Date().toISOString().split('T')[0]}
                                  className="h-11 text-sm rounded-xl border-2 focus:border-primary"
                                />
                                {permitUpdateDate && constructionYear && (() => {
                                  const permitYear = new Date(permitUpdateDate).getFullYear();
                                  const cYear = parseInt(constructionYear, 10);
                                  if (permitUpdateType === 'construction' && cYear && permitYear > cYear) {
                                    return <p className="text-[10px] text-destructive">L'autorisation de bâtir doit précéder la construction</p>;
                                  }
                                  if (permitUpdateType === 'regularization' && cYear && permitYear < cYear) {
                                    return <p className="text-[10px] text-destructive">La régularisation doit être postérieure à la construction</p>;
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Service émetteur *</Label>
                                <BuildingPermitIssuingServiceSelect
                                  value={permitUpdateService}
                                  onValueChange={setPermitUpdateService}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-sm">Document d'autorisation (optionnel)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) {
                                      const validation = validateLandTitleFile(file);
                                      if (!validation.valid) {
                                        toast({ title: "Fichier invalide", description: validation.error, variant: "destructive" });
                                        return;
                                      }
                                    }
                                    setPermitUpdateFile(file);
                                  }}
                                  className="h-11 text-sm rounded-xl border-2"
                                />
                                {permitUpdateFile && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setPermitUpdateFile(null)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  </>
                  )}

                  {/* Éligibilité légale */}
                  {constructionType && constructionNature && declaredUsage && (
                    <Card className="border-2 border-dashed rounded-xl">
                      <CardContent className="p-3 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          Éligibilité
                          <SectionHelpPopover
                            title="Éligibilité au titre foncier"
                            description="Indiquez votre nationalité. Ce critère, combiné à l'état de mise en valeur et à la présence d'une autorisation de bâtir, détermine le type de titre foncier auquel vous êtes éligible."
                          />
                        </h4>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Nationalité *</Label>
                          <Select 
                            value={nationality}
                            onValueChange={(value) => setNationality(value as 'congolais' | 'etranger')}
                          >
                            <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {NATIONALITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-sm py-2">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {nationality && (
                          <div className={cn(
                            "p-2 rounded-lg text-xs flex items-center gap-2",
                            (parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes')
                              ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          )}>
                            {(parcelBuildingPermits.length > 0 || hasPermitUpdate === 'yes') ? (
                              <>
                                <Check className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>La mise en valeur est prouvée par l'autorisation de bâtir délivrée</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Aucune autorisation de bâtir identifiée. Cela peut limiter le type de titre accessible.</span>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Bouton de validation */}
                  {nationality && (
                    <Button 
                      onClick={handleValidateValorisation}
                      disabled={!constructionType || !constructionNature || !declaredUsage || !nationality}
                      className={cn(
                        "w-full h-10 text-sm rounded-xl gap-2",
                        valorisationValidated ? "bg-green-600 hover:bg-green-700" : ""
                      )}
                    >
                      {valorisationValidated ? (
                        <><CheckCircle2 className="h-4 w-4" /> Titre déterminé</>
                      ) : (
                        <><Award className="h-4 w-4" /> Déterminer le titre</>
                      )}
                    </Button>
                  )}

                  {/* Résultat: Titre déduit */}
                  {valorisationValidated && deducedTitleType && (
                    <Card className={cn(
                      "border-2 rounded-xl",
                      deducedTitleType.confidence === 'high' 
                        ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" 
                        : deducedTitleType.confidence === 'medium'
                        ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                        : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                    )}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <Award className={cn(
                            "h-6 w-6",
                            deducedTitleType.confidence === 'high' 
                              ? "text-green-600" 
                              : deducedTitleType.confidence === 'medium'
                              ? "text-amber-600"
                              : "text-blue-600"
                          )} />
                          <h4 className={cn(
                            "text-base font-bold",
                            deducedTitleType.confidence === 'high' 
                              ? "text-green-700 dark:text-green-400" 
                              : deducedTitleType.confidence === 'medium'
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-blue-700 dark:text-blue-400"
                          )}>
                            {deducedTitleType.label}
                          </h4>
                          <span className={cn(
                            "ml-auto text-xs px-2.5 py-1 rounded-full font-medium",
                            deducedTitleType.confidence === 'high' 
                              ? "bg-green-500 text-white" 
                              : deducedTitleType.confidence === 'medium'
                              ? "bg-amber-500 text-white"
                              : "bg-blue-500 text-white"
                          )}>
                            {deducedTitleType.confidence === 'high' ? 'Fiable' : 
                             deducedTitleType.confidence === 'medium' ? 'Probable' : 
                             'À préciser'}
                          </span>
                        </div>
                        
                        {/* Contextual paragraph comparing request type with deduced title */}
                        {requestType && (
                          <div className={cn(
                            "p-3 rounded-lg text-sm leading-relaxed",
                            (() => {
                              const requestTypeLabel = requestType === 'initial' ? 'une demande initiale de titre foncier' 
                                : requestType === 'conversion' ? 'une conversion de titre foncier'
                                : 'un renouvellement de titre foncier';
                              
                              // Check alignment
                              const isRenewalRequest = requestType === 'renouvellement';
                              const isTemporaryDeduced = deducedTitleType.type === 'Concession ordinaire' || deducedTitleType.type === 'Bail emphytéotique' || deducedTitleType.type === 'Bail foncier';
                              
                              const isAligned = (isRenewalRequest && isTemporaryDeduced) ||
                                requestType === 'initial' || requestType === 'conversion';
                              
                              return isAligned 
                                ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300" 
                                : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300";
                            })()
                          )}>
                            {(() => {
                              const requestTypeLabel = requestType === 'initial' ? 'une demande initiale de titre foncier' 
                                : requestType === 'conversion' ? 'une conversion de titre foncier'
                                : 'un renouvellement de titre foncier';
                              
                              const isRenewalRequest = requestType === 'renouvellement';
                              const isTemporaryDeduced = deducedTitleType.type === 'Concession ordinaire' || deducedTitleType.type === 'Bail emphytéotique' || deducedTitleType.type === 'Bail foncier';
                              
                              const isAligned = (isRenewalRequest && isTemporaryDeduced) ||
                                requestType === 'initial';

                              if (isAligned) {
                                return (
                                  <>
                                    <strong>Analyse favorable.</strong> Vous avez indiqué qu'il s'agit d'{requestTypeLabel}. Après vérification des données disponibles dans la base de données et de celles fournies dans ce formulaire, cette parcelle est éligible pour obtenir un <strong>{deducedTitleType.label}</strong>. {deducedTitleType.description}
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <strong>Analyse divergente.</strong> Vous avez indiqué qu'il s'agit d'{requestTypeLabel}. Après vérification des données disponibles dans la base de données et de celles fournies dans ce formulaire, cette parcelle n'est pas éligible pour {requestTypeLabel === 'une demande initiale de titre foncier' ? requestTypeLabel : `un ${requestTypeLabel.replace("un ", "").replace("une ", "")}`}. Compte tenu des données disponibles et de celles renseignées dans ce formulaire, cette parcelle est éligible pour obtenir un <strong>{deducedTitleType.label}</strong>. {deducedTitleType.description}
                                  </>
                                );
                              }
                            })()}
                          </div>
                        )}

                        {!requestType && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {deducedTitleType.description}
                          </p>
                        )}

                        {deducedTitleType.conditions && deducedTitleType.conditions.length > 0 && (
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Conditions :</p>
                            <ul className="space-y-1.5">
                              {deducedTitleType.conditions.slice(0, 2).map((condition, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  {condition}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deducedTitleType.conversionPossible && (
                          <div className="p-2.5 bg-primary/5 rounded-md">
                            <p className="text-sm text-primary font-medium">
                              → Évolution : {deducedTitleType.conversionPossible.targetTitle}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground/60 pt-2 border-t border-border/30">
                          Réf: {deducedTitleType.legalBasis}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('location')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('documents')} 
                      disabled={!valorisationValidated}
                      className="flex-1 h-8 text-xs rounded-xl gap-2"
                    >
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
  );
};

export default ValorisationTab;
