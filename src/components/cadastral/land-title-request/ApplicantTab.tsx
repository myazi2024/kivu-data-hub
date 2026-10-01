import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, Info, ChevronRight, User, FileText, AlertCircle, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import { LandTitleRequestData, validatePhone } from '@/hooks/useLandTitleRequest';
import { ParcelOwnerData, ParcelSearchResult } from './types';

export interface ApplicantTabParcelSearchProps {
  requestType: 'initial' | 'renouvellement' | 'conversion' | '';
  setRequestType: (value: 'initial' | 'renouvellement' | 'conversion') => void;
  parcelNumberSearch: string;
  setParcelNumberSearch: (value: string) => void;
  parcelSearchResults: ParcelSearchResult[];
  parcelSearchLoading: boolean;
  showParcelDropdown: boolean;
  setShowParcelDropdown: (value: boolean) => void;
  selectedParcelNumber: string;
  setSelectedParcelNumber: (value: string) => void;
  parcelValidated: boolean;
  setParcelValidated: (value: boolean) => void;
  onSelectParcel: (parcel: ParcelSearchResult) => void;
  onOpenChange: (open: boolean) => void;
}

export interface ApplicantTabProps {
  formData: LandTitleRequestData;
  handleInputChange: (field: keyof LandTitleRequestData, value: any) => void;
  parcelSearch: ApplicantTabParcelSearchProps;
  parcelOwnerData: ParcelOwnerData | null;
  loadingOwnerData: boolean;
  isParcelLinkedMode: boolean;
  isFormBlocked: boolean;
  setActiveTab: (tab: string) => void;
}

const ApplicantTab: React.FC<ApplicantTabProps> = ({
  formData,
  handleInputChange,
  parcelSearch,
  parcelOwnerData,
  loadingOwnerData,
  isParcelLinkedMode,
  isFormBlocked,
  setActiveTab,
}) => {
  const {
    requestType,
    setRequestType,
    parcelNumberSearch,
    setParcelNumberSearch,
    parcelSearchResults,
    parcelSearchLoading,
    showParcelDropdown,
    setShowParcelDropdown,
    selectedParcelNumber,
    setSelectedParcelNumber,
    parcelValidated,
    setParcelValidated,
    onSelectParcel,
    onOpenChange,
  } = parcelSearch;

  return (
                <TabsContent value="requester" className="space-y-4">
                  {/* Informations sur la demande */}
                  <Card className="border-2 border-primary/30 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Informations sur la demande *
                          <SectionHelpPopover
                            title="Type de demande"
                            description="Indiquez s'il s'agit d'une demande initiale, d'un renouvellement ou d'une conversion de titre foncier. Ce choix influence l'évaluation de votre dossier."
                          />
                        </Label>
                      </div>

                      <Select
                        value={requestType}
                        onValueChange={(value) => setRequestType(value as 'initial' | 'renouvellement' | 'conversion')}
                      >
                        <SelectTrigger className="h-11 text-sm rounded-xl border-2 focus:border-primary">
                          <SelectValue placeholder="Sélectionnez le type de demande" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="initial" className="text-sm py-2">Demande initiale</SelectItem>
                          <SelectItem value="renouvellement" className="text-sm py-2">Renouvellement</SelectItem>
                          <SelectItem value="conversion" className="text-sm py-2">Conversion</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Parcel number search — always shown once requestType is selected */}
                      {requestType && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">
                            Numéro de la parcelle (SU ou SR) *
                          </Label>
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                value={parcelNumberSearch}
                                onChange={(e) => {
                                  setParcelNumberSearch(e.target.value);
                                  setParcelValidated(false);
                                  setSelectedParcelNumber('');
                                  setShowParcelDropdown(true);
                                }}
                                onFocus={() => setShowParcelDropdown(true)}
                                placeholder="Tapez le numéro SU ou SR..."
                                className="h-9 text-sm rounded-xl border-2 pl-8"
                              />
                              {parcelSearchLoading && (
                                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              )}
                            </div>

                            {/* Search results dropdown */}
                            {showParcelDropdown && parcelNumberSearch.length >= 2 && (
                              <div className="absolute z-[1300] w-full mt-1 bg-background border rounded-xl shadow-lg max-h-[180px] overflow-y-auto">
                                {parcelSearchResults.length > 0 ? (
                                  parcelSearchResults.map((parcel) => (
                                     <button
                                      key={parcel.id}
                                      type="button"
                                      onClick={() => onSelectParcel(parcel)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                      <span>{parcel.parcel_number}</span>
                                    </button>
                                  ))
                                ) : !parcelSearchLoading ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    Aucune parcelle trouvée pour « {parcelNumberSearch} »
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Validated parcel */}
                          {parcelValidated && selectedParcelNumber && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-xs text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              <span>Parcelle <strong>{selectedParcelNumber}</strong> trouvée dans la base de données.</span>
                            </div>
                          )}

                          {/* Parcel not found message */}
                          {!parcelValidated && parcelNumberSearch.length >= 2 && !parcelSearchLoading && parcelSearchResults.length === 0 && (
                            <div className="space-y-2 animate-fade-in">
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-1.5">
                                    <p>
                                      {requestType === 'renouvellement'
                                        ? "Une demande de renouvellement d'un titre foncier doit concerner une parcelle déjà enregistrée dans notre base de données afin de faciliter un suivi rigoureux avec les services cadastraux."
                                        : "Ce numéro de fiche parcellaire n'est pas trouvé dans notre base de données. Veuillez d'abord enregistrer votre parcelle via le formulaire CCC."}
                                    </p>
                                    <p>
                                      Nous vous invitons à commencer par ajouter cette parcelle au cadastre numérique, puis à revenir sur ce formulaire pour introduire votre demande.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full h-9 text-xs rounded-xl gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={() => {
                                  // Close this dialog and open CCC form
                                  onOpenChange(false);
                                  // Dispatch custom event to open CCC dialog
                                  window.dispatchEvent(new CustomEvent('open-ccc-dialog', { detail: { parcelNumber: parcelNumberSearch } }));
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Ajouter la parcelle « {parcelNumberSearch} » au cadastre numérique
                              </Button>
                              <p className="text-[10px] text-muted-foreground text-center">
                                Cliquez sur le bouton ci-dessus pour commencer le processus d'enregistrement de votre parcelle.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!isFormBlocked && (<>
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Informations du demandeur
                          <SectionHelpPopover
                            title="Informations du demandeur"
                            description="Renseignez votre identité complète telle qu'elle figure sur votre pièce d'identité. Ces informations seront utilisées pour le traitement administratif de votre demande."
                          />
                        </Label>
                      </div>

                      {/* PARCEL-LINKED MODE: Owner identified + role selection */}
                      {isParcelLinkedMode && parcelValidated && parcelOwnerData && (
                        <>
                          {/* Masked owner info */}
                          <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2 animate-fade-in">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-primary/10 rounded">
                                <Info className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="text-xs font-semibold text-foreground">Propriétaire identifié</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              {parcelOwnerData.legalStatus && (
                                <div><span className="text-muted-foreground">Statut :</span> <span className="font-medium">{parcelOwnerData.legalStatus}</span></div>
                              )}
                              {parcelOwnerData.gender && (
                                <div><span className="text-muted-foreground">Genre :</span> <span className="font-medium">{parcelOwnerData.gender}</span></div>
                              )}
                              <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{parcelOwnerData.lastName ? parcelOwnerData.lastName.charAt(0) + '***' : '—'}</span></div>
                              <div><span className="text-muted-foreground">Prénom :</span> <span className="font-medium">{parcelOwnerData.firstName ? parcelOwnerData.firstName.charAt(0) + '***' : '—'}</span></div>
                              {parcelOwnerData.middleName && (
                                <div><span className="text-muted-foreground">Post-nom :</span> <span className="font-medium">{parcelOwnerData.middleName.charAt(0) + '***'}</span></div>
                              )}
                              {parcelOwnerData.phone && (
                                <div><span className="text-muted-foreground">Tél :</span> <span className="font-medium">+243 ** *** {parcelOwnerData.phone.slice(-3)}</span></div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                              Les informations du propriétaire sont chargées depuis la base cadastrale. L'accès complet est réservé aux services habilités.
                            </p>
                          </div>

                          {/* Radio: Propriétaire or Mandataire */}
                          <div className="space-y-2">
                            <Label className="text-sm">Vous êtes *</Label>
                            <RadioGroup
                              value={formData.requesterType}
                              onValueChange={(value: string) => {
                                handleInputChange('requesterType', value);
                                if (value === 'owner') {
                                  handleInputChange('isOwnerSameAsRequester', true);
                                } else {
                                  handleInputChange('isOwnerSameAsRequester', false);
                                }
                              }}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="owner" id="renewal-owner" />
                                <Label htmlFor="renewal-owner" className="text-sm cursor-pointer">Propriétaire</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="beneficiary" id="renewal-beneficiary" />
                                <Label htmlFor="renewal-beneficiary" className="text-sm cursor-pointer">Ayant droit</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="representative" id="renewal-representative" />
                                <Label htmlFor="renewal-representative" className="text-sm cursor-pointer">Mandataire</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* If Mandataire: show fields for representative identity */}
                          {(formData.requesterType === 'representative' || formData.requesterType === 'beneficiary') && (
                            <div className="space-y-3 animate-fade-in border-t border-border pt-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{formData.requesterType === 'representative' ? 'Informations du mandataire' : "Informations de l'ayant droit"}</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Statut juridique *</Label>
                                  <Select
                                    value={formData.requesterLegalStatus || 'Personne physique'}
                                    onValueChange={(value) => handleInputChange('requesterLegalStatus', value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm rounded-lg border">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Personne physique">Personne physique</SelectItem>
                                      <SelectItem value="Personne morale">Personne morale</SelectItem>
                                      <SelectItem value="État">État</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                                  <div className="space-y-1.5 animate-fade-in">
                                    <Label className="text-sm">Genre *</Label>
                                    <Select
                                      value={formData.requesterGender || ''}
                                      onValueChange={(value) => handleInputChange('requesterGender', value)}
                                    >
                                      <SelectTrigger className="h-9 text-sm rounded-lg border">
                                        <SelectValue placeholder="Sélectionner" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Masculin">Masculin</SelectItem>
                                        <SelectItem value="Féminin">Féminin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

                              {/* Personne morale conditional fields */}
                              {formData.requesterLegalStatus === 'Personne morale' && (
                                <div className="space-y-2 animate-fade-in">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Type d'entreprise *</Label>
                                    <Select value={formData.requesterEntityType || ''} onValueChange={(value) => { handleInputChange('requesterEntityType', value); handleInputChange('requesterEntitySubType', ''); handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                      <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Société">Société</SelectItem>
                                        <SelectItem value="Association">Association</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {formData.requesterEntityType === 'Société' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                      <Label className="text-sm">Forme juridique *</Label>
                                      <Select value={formData.requesterEntitySubType || ''} onValueChange={(value) => { handleInputChange('requesterEntitySubType', value); if (value !== 'Autre') handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                        <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                        <SelectContent>
                                          {['Entreprise individuelle (Ets)', 'Société en Participation (SEP)', 'Société à Responsabilité Limitée (SARL)', 'Société Anonyme (SA)', 'Société par Actions Simplifiée (SAS)', 'Société en Nom Collectif (SNC)', 'Société en Commandite Simple (SCS)', "Groupement d'Intérêt Économique (GIE)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      {formData.requesterEntitySubType === 'Autre' && (
                                        <Input placeholder="Précisez la forme juridique" value={formData.requesterEntitySubTypeOther || ''} onChange={(e) => handleInputChange('requesterEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                      )}
                                    </div>
                                  )}
                                  {formData.requesterEntityType === 'Association' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                      <Label className="text-sm">Type d'association *</Label>
                                      <Select value={formData.requesterEntitySubType || ''} onValueChange={(value) => { handleInputChange('requesterEntitySubType', value); if (value !== 'Autre') handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                        <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                        <SelectContent>
                                          {['Association sans but lucratif (ASBL)', "Établissement d'Utilité Publique (EUP)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      {formData.requesterEntitySubType === 'Autre' && (
                                        <Input placeholder="Précisez le type d'association" value={formData.requesterEntitySubTypeOther || ''} onChange={(e) => handleInputChange('requesterEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                      )}
                                    </div>
                                  )}
                                  {formData.requesterEntityType && (
                                    <div className="space-y-2 animate-fade-in">
                                      <div className="space-y-1.5">
                                        <Label className="text-sm">{formData.requesterEntityType === 'Association' ? 'Dénomination *' : 'Raison sociale *'}</Label>
                                        <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder={formData.requesterEntityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"} className="h-9 text-sm rounded-lg border" />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label className="text-sm">{formData.requesterEntityType === 'Association' ? "N° d'Arrêté ministériel *" : "N° d'identification (RCCM) *"}</Label>
                                        <Input value={formData.requesterFirstName} onChange={(e) => handleInputChange('requesterFirstName', e.target.value)} placeholder={formData.requesterEntityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"} className="h-9 text-sm rounded-lg border" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* État conditional fields */}
                              {formData.requesterLegalStatus === 'État' && (
                                <div className="space-y-2 animate-fade-in">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Type de droit *</Label>
                                    <Select value={formData.requesterRightType || ''} onValueChange={(value) => handleInputChange('requesterRightType', value)}>
                                      <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Concession">Concession</SelectItem>
                                        <SelectItem value="Affectation">Affectation</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Service / Agence *</Label>
                                    <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder="Nom du service ou agence de l'État" className="h-9 text-sm rounded-lg border" />
                                  </div>
                                </div>
                              )}

                              {/* Personne physique: standard name fields */}
                              {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                      <Label className="text-sm">Nom *</Label>
                                      <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder="Nom" className="h-9 text-sm rounded-lg border" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-sm">Prénom *</Label>
                                      <Input value={formData.requesterFirstName} onChange={(e) => handleInputChange('requesterFirstName', e.target.value)} placeholder="Prénom" className="h-9 text-sm rounded-lg border" />
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Post-nom</Label>
                                    <Input value={formData.requesterMiddleName} onChange={(e) => handleInputChange('requesterMiddleName', e.target.value)} placeholder="Post-nom" className="h-9 text-sm rounded-lg border" />
                                  </div>
                                </>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Téléphone *</Label>
                                  <Input
                                    value={formData.requesterPhone}
                                    onChange={(e) => handleInputChange('requesterPhone', e.target.value)}
                                    placeholder="+243..."
                                    className={cn("h-9 text-sm rounded-lg border", formData.requesterPhone && !validatePhone(formData.requesterPhone) && "border-destructive")}
                                  />
                                  {formData.requesterPhone && !validatePhone(formData.requesterPhone) && (
                                    <p className="text-[10px] text-destructive">Format: +243 suivi de 9 chiffres</p>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Email</Label>
                                  <Input type="email" value={formData.requesterEmail} onChange={(e) => handleInputChange('requesterEmail', e.target.value)} placeholder="email@exemple.com" className="h-9 text-sm rounded-lg border" />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {loadingOwnerData && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Chargement des informations du propriétaire...
                        </div>
                      )}

                      {/* STANDARD MODE: Standard requester fields (no parcel linked or parcel not yet validated) */}
                      {!(isParcelLinkedMode && parcelValidated && parcelOwnerData) && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm">Vous êtes *</Label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleInputChange('requesterType', 'owner')}
                                className={cn(
                                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                  formData.requesterType === 'owner'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                              >
                                Propriétaire
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInputChange('requesterType', 'beneficiary')}
                                className={cn(
                                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                  formData.requesterType === 'beneficiary'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                              >
                                Ayant droit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInputChange('requesterType', 'representative')}
                                className={cn(
                                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                  formData.requesterType === 'representative'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                              >
                                Mandataire
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-sm">Statut juridique *</Label>
                              <Select
                                value={formData.requesterLegalStatus || 'Personne physique'}
                                onValueChange={(value) => handleInputChange('requesterLegalStatus', value)}
                              >
                                <SelectTrigger className="h-9 text-sm rounded-lg border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Personne physique">Personne physique</SelectItem>
                                  <SelectItem value="Personne morale">Personne morale</SelectItem>
                                  <SelectItem value="État">État</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                              <div className="space-y-1.5 animate-fade-in">
                                <Label className="text-sm">Genre *</Label>
                                <Select
                                  value={formData.requesterGender || ''}
                                  onValueChange={(value) => handleInputChange('requesterGender', value)}
                                >
                                  <SelectTrigger className="h-9 text-sm rounded-lg border">
                                    <SelectValue placeholder="Sélectionner" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Masculin">Masculin</SelectItem>
                                    <SelectItem value="Féminin">Féminin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Personne morale conditional fields */}
                          {formData.requesterLegalStatus === 'Personne morale' && (
                            <div className="space-y-2 animate-fade-in">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Type d'entreprise *</Label>
                                <Select value={formData.requesterEntityType || ''} onValueChange={(value) => { handleInputChange('requesterEntityType', value); handleInputChange('requesterEntitySubType', ''); handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                  <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Société">Société</SelectItem>
                                    <SelectItem value="Association">Association</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {formData.requesterEntityType === 'Société' && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <Label className="text-sm">Forme juridique *</Label>
                                  <Select value={formData.requesterEntitySubType || ''} onValueChange={(value) => { handleInputChange('requesterEntitySubType', value); if (value !== 'Autre') handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                    <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                      {['Entreprise individuelle (Ets)', 'Société en Participation (SEP)', 'Société à Responsabilité Limitée (SARL)', 'Société Anonyme (SA)', 'Société par Actions Simplifiée (SAS)', 'Société en Nom Collectif (SNC)', 'Société en Commandite Simple (SCS)', "Groupement d'Intérêt Économique (GIE)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  {formData.requesterEntitySubType === 'Autre' && (
                                    <Input placeholder="Précisez la forme juridique" value={formData.requesterEntitySubTypeOther || ''} onChange={(e) => handleInputChange('requesterEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                  )}
                                </div>
                              )}
                              {formData.requesterEntityType === 'Association' && (
                                <div className="space-y-1.5 animate-fade-in">
                                  <Label className="text-sm">Type d'association *</Label>
                                  <Select value={formData.requesterEntitySubType || ''} onValueChange={(value) => { handleInputChange('requesterEntitySubType', value); if (value !== 'Autre') handleInputChange('requesterEntitySubTypeOther', ''); }}>
                                    <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                      {['Association sans but lucratif (ASBL)', "Établissement d'Utilité Publique (EUP)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  {formData.requesterEntitySubType === 'Autre' && (
                                    <Input placeholder="Précisez le type d'association" value={formData.requesterEntitySubTypeOther || ''} onChange={(e) => handleInputChange('requesterEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                  )}
                                </div>
                              )}
                              {formData.requesterEntityType && (
                                <div className="space-y-2 animate-fade-in">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">{formData.requesterEntityType === 'Association' ? 'Dénomination *' : 'Raison sociale *'}</Label>
                                    <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder={formData.requesterEntityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"} className="h-9 text-sm rounded-lg border" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">{formData.requesterEntityType === 'Association' ? "N° d'Arrêté ministériel *" : "N° d'identification (RCCM) *"}</Label>
                                    <Input value={formData.requesterFirstName} onChange={(e) => handleInputChange('requesterFirstName', e.target.value)} placeholder={formData.requesterEntityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"} className="h-9 text-sm rounded-lg border" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* État conditional fields */}
                          {formData.requesterLegalStatus === 'État' && (
                            <div className="space-y-2 animate-fade-in">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Type de droit *</Label>
                                <Select value={formData.requesterRightType || ''} onValueChange={(value) => handleInputChange('requesterRightType', value)}>
                                  <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Concession">Concession</SelectItem>
                                    <SelectItem value="Affectation">Affectation</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Service / Agence *</Label>
                                <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder="Nom du service ou agence de l'État" className="h-9 text-sm rounded-lg border" />
                              </div>
                            </div>
                          )}

                          {/* Personne physique: standard name fields */}
                          {(formData.requesterLegalStatus || 'Personne physique') === 'Personne physique' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Nom *</Label>
                                  <Input value={formData.requesterLastName} onChange={(e) => handleInputChange('requesterLastName', e.target.value)} placeholder="Votre nom" className="h-9 text-sm rounded-lg border" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Prénom *</Label>
                                  <Input value={formData.requesterFirstName} onChange={(e) => handleInputChange('requesterFirstName', e.target.value)} placeholder="Votre prénom" className="h-9 text-sm rounded-lg border" />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Post-nom</Label>
                                <Input value={formData.requesterMiddleName} onChange={(e) => handleInputChange('requesterMiddleName', e.target.value)} placeholder="Post-nom" className="h-9 text-sm rounded-lg border" />
                              </div>
                            </>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-sm">Téléphone *</Label>
                              <Input
                                value={formData.requesterPhone}
                                onChange={(e) => handleInputChange('requesterPhone', e.target.value)}
                                placeholder="+243..."
                                className={cn("h-9 text-sm rounded-lg border", formData.requesterPhone && !validatePhone(formData.requesterPhone) && "border-destructive")}
                              />
                              {formData.requesterPhone && !validatePhone(formData.requesterPhone) && (
                                <p className="text-[10px] text-destructive">Format: +243 suivi de 9 chiffres</p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm">Email</Label>
                              <Input
                                type="email"
                                value={formData.requesterEmail}
                                onChange={(e) => handleInputChange('requesterEmail', e.target.value)}
                                placeholder="votre@email.com"
                                className="h-9 text-sm rounded-lg border"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {(formData.requesterType === 'representative' || formData.requesterType === 'beneficiary') && !(requestType === 'renouvellement' && parcelValidated && parcelOwnerData) && (
                    <Card className="border-2 border-dashed rounded-lg">
                      <CardContent className="p-3 space-y-3">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          Informations du propriétaire
                          <SectionHelpPopover
                            title="Informations du propriétaire"
                            description="Si le demandeur n'est pas le propriétaire, renseignez l'identité du propriétaire de la parcelle. Le titre sera établi à son nom."
                          />
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Statut juridique *</Label>
                            <Select
                              value={formData.ownerLegalStatus || 'Personne physique'}
                              onValueChange={(value) => handleInputChange('ownerLegalStatus', value)}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-lg border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                <SelectItem value="Personne physique">Personne physique</SelectItem>
                                <SelectItem value="Personne morale">Personne morale</SelectItem>
                                <SelectItem value="État">État</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(formData.ownerLegalStatus || 'Personne physique') === 'Personne physique' && (
                            <div className="space-y-1.5 animate-fade-in">
                              <Label className="text-sm">Genre *</Label>
                              <Select
                                value={formData.ownerGender || ''}
                                onValueChange={(value) => handleInputChange('ownerGender', value)}
                              >
                                <SelectTrigger className="h-9 text-sm rounded-lg border">
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                  <SelectItem value="Masculin">Masculin</SelectItem>
                                  <SelectItem value="Féminin">Féminin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Personne morale conditional fields - Owner */}
                        {formData.ownerLegalStatus === 'Personne morale' && (
                          <div className="space-y-2 animate-fade-in">
                            <div className="space-y-1.5">
                              <Label className="text-sm">Type d'entreprise *</Label>
                              <Select value={formData.ownerEntityType || ''} onValueChange={(value) => { handleInputChange('ownerEntityType', value); handleInputChange('ownerEntitySubType', ''); handleInputChange('ownerEntitySubTypeOther', ''); }}>
                                <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Société">Société</SelectItem>
                                  <SelectItem value="Association">Association</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {formData.ownerEntityType === 'Société' && (
                              <div className="space-y-1.5 animate-fade-in">
                                <Label className="text-sm">Forme juridique *</Label>
                                <Select value={formData.ownerEntitySubType || ''} onValueChange={(value) => { handleInputChange('ownerEntitySubType', value); if (value !== 'Autre') handleInputChange('ownerEntitySubTypeOther', ''); }}>
                                  <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    {['Entreprise individuelle (Ets)', 'Société en Participation (SEP)', 'Société à Responsabilité Limitée (SARL)', 'Société Anonyme (SA)', 'Société par Actions Simplifiée (SAS)', 'Société en Nom Collectif (SNC)', 'Société en Commandite Simple (SCS)', "Groupement d'Intérêt Économique (GIE)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                {formData.ownerEntitySubType === 'Autre' && (
                                  <Input placeholder="Précisez la forme juridique" value={formData.ownerEntitySubTypeOther || ''} onChange={(e) => handleInputChange('ownerEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                )}
                              </div>
                            )}
                            {formData.ownerEntityType === 'Association' && (
                              <div className="space-y-1.5 animate-fade-in">
                                <Label className="text-sm">Type d'association *</Label>
                                <Select value={formData.ownerEntitySubType || ''} onValueChange={(value) => { handleInputChange('ownerEntitySubType', value); if (value !== 'Autre') handleInputChange('ownerEntitySubTypeOther', ''); }}>
                                  <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                  <SelectContent>
                                    {['Association sans but lucratif (ASBL)', "Établissement d'Utilité Publique (EUP)", 'Autre'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                {formData.ownerEntitySubType === 'Autre' && (
                                  <Input placeholder="Précisez le type d'association" value={formData.ownerEntitySubTypeOther || ''} onChange={(e) => handleInputChange('ownerEntitySubTypeOther', e.target.value)} className="h-9 text-sm rounded-lg border mt-1" />
                                )}
                              </div>
                            )}
                            {formData.ownerEntityType && (
                              <div className="space-y-2 animate-fade-in">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">{formData.ownerEntityType === 'Association' ? 'Dénomination *' : 'Raison sociale *'}</Label>
                                  <Input value={formData.ownerLastName || ''} onChange={(e) => handleInputChange('ownerLastName', e.target.value)} placeholder={formData.ownerEntityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"} className="h-9 text-sm rounded-lg border" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">{formData.ownerEntityType === 'Association' ? "N° d'Arrêté ministériel *" : "N° d'identification (RCCM) *"}</Label>
                                  <Input value={formData.ownerFirstName || ''} onChange={(e) => handleInputChange('ownerFirstName', e.target.value)} placeholder={formData.ownerEntityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"} className="h-9 text-sm rounded-lg border" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* État conditional fields - Owner */}
                        {formData.ownerLegalStatus === 'État' && (
                          <div className="space-y-2 animate-fade-in">
                            <div className="space-y-1.5">
                              <Label className="text-sm">Type de droit *</Label>
                              <Select value={formData.ownerRightType || ''} onValueChange={(value) => handleInputChange('ownerRightType', value)}>
                                <SelectTrigger className="h-9 text-sm rounded-lg border"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Concession">Concession</SelectItem>
                                  <SelectItem value="Affectation">Affectation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm">Service / Agence *</Label>
                              <Input value={formData.ownerLastName || ''} onChange={(e) => handleInputChange('ownerLastName', e.target.value)} placeholder="Nom du service ou agence de l'État" className="h-9 text-sm rounded-lg border" />
                            </div>
                          </div>
                        )}

                        {/* Personne physique: standard name/postnom fields - Owner */}
                        {(formData.ownerLegalStatus || 'Personne physique') === 'Personne physique' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Nom *</Label>
                                <Input value={formData.ownerLastName || ''} onChange={(e) => handleInputChange('ownerLastName', e.target.value)} placeholder="Nom du propriétaire" className="h-9 text-sm rounded-lg border" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Prénom *</Label>
                                <Input value={formData.ownerFirstName || ''} onChange={(e) => handleInputChange('ownerFirstName', e.target.value)} placeholder="Prénom" className="h-9 text-sm rounded-lg border" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm">Post-nom</Label>
                              <Input value={formData.ownerMiddleName || ''} onChange={(e) => handleInputChange('ownerMiddleName', e.target.value)} placeholder="Post-nom" className="h-9 text-sm rounded-lg border" />
                            </div>
                          </>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-sm">Téléphone</Label>
                          <Input value={formData.ownerPhone || ''} onChange={(e) => handleInputChange('ownerPhone', e.target.value)} placeholder="+243..." className="h-9 text-sm rounded-lg border" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  </>)}

                  {!isFormBlocked && (
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => setActiveTab('location')} className="h-8 text-xs rounded-xl gap-2">
                        Suivant <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
  );
};

export default ApplicantTab;
