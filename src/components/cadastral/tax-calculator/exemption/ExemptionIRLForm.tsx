import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Shield, MapPin, FileText, Upload, X, ArrowRight, Info, Home
} from 'lucide-react';
import { ExemptionFormData } from '../ExemptionRequestDialog';
import SectionHelpPopover from '../../SectionHelpPopover';
import { toast } from 'sonner';

interface ExemptionIRLFormProps {
  formData: ExemptionFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExemptionFormData>>;
  parcelData?: any;
  onSubmit: () => void;
}

const IRL_EXEMPTION_TYPES = [
  {
    value: 'habitation_personnelle',
    label: 'Habitation personnelle du propriétaire',
    description: 'Le propriétaire occupe lui-même le bien et ne perçoit aucun revenu locatif',
    legalBasis: 'Art. 4, Ordonnance-loi n°69-009 du 10/02/1969',
    conditions: [
      'Le bien doit constituer la résidence principale du propriétaire',
      'Aucune partie du bien ne doit être louée à des tiers',
      'Le propriétaire doit occuper effectivement le bien',
    ],
    requiredDocs: ['Attestation de résidence', 'Déclaration sur l\'honneur de non-location'],
  },
  {
    value: 'edifice_public_irl',
    label: 'Propriété de l\'État ou d\'une ETD',
    description: 'Biens immobiliers appartenant à l\'État, aux provinces ou aux entités territoriales décentralisées',
    legalBasis: 'Art. 5, Ordonnance-loi n°69-009',
    conditions: [
      'Le bien doit appartenir à l\'État, une province ou une ETD',
      'Le bien doit être affecté à un service public',
      'Les biens donnés en location par l\'État ne sont pas exonérés',
    ],
    requiredDocs: ['Titre de propriété de l\'État ou ETD', 'Attestation d\'affectation publique'],
  },
  {
    value: 'organisme_international',
    label: 'Organisation internationale ou diplomatique',
    description: 'Biens occupés par des organisations internationales ou des missions diplomatiques bénéficiant d\'immunités fiscales',
    legalBasis: 'Conventions de Vienne sur les relations diplomatiques et consulaires',
    conditions: [
      'L\'organisation doit bénéficier d\'un accord de siège avec la RDC',
      'Le bien doit être affecté aux activités officielles de l\'organisation',
      'L\'exonération doit être prévue par un traité ou accord international',
    ],
    requiredDocs: ['Accord de siège ou convention diplomatique', 'Attestation du Ministère des Affaires Étrangères'],
  },
  {
    value: 'bien_non_loue',
    label: 'Bien vacant non générateur de revenus',
    description: 'Bien immobilier inoccupé et non mis en location, ne générant aucun revenu locatif',
    legalBasis: 'Art. 1, Ordonnance-loi n°69-009 (a contrario)',
    conditions: [
      'Le bien doit être effectivement vacant (aucun occupant)',
      'Le bien ne doit pas être mis en location sur le marché',
      'Le propriétaire doit prouver l\'absence de revenus locatifs',
    ],
    requiredDocs: ['Attestation de vacance du bien', 'Déclaration sur l\'honneur de non-location'],
  },
  {
    value: 'edifice_religieux_irl',
    label: 'Édifice cultuel ou religieux',
    description: 'Biens affectés exclusivement au culte religieux',
    legalBasis: 'Art. 5, alinéa 2, Ordonnance-loi n°69-009',
    conditions: [
      'Le bien doit être exclusivement affecté au culte',
      'Aucun revenu locatif ne doit être tiré du bien',
      'La confession religieuse doit être légalement reconnue en RDC',
    ],
    requiredDocs: ['Reconnaissance légale de la confession religieuse', 'Attestation d\'affectation cultuelle'],
  },
];

const ExemptionIRLForm: React.FC<ExemptionIRLFormProps> = ({
  formData, setFormData, parcelData, onSubmit
}) => {
  const currentYear = new Date().getFullYear();
  const selectedType = IRL_EXEMPTION_TYPES.find(t => t.value === formData.irlExemptionType);

  const handleAddDocument = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} dépasse 10 Mo`);
        return false;
      }
      return true;
    });
    setFormData(prev => ({
      ...prev,
      irlSupportingDocuments: [...prev.irlSupportingDocuments, ...newFiles],
    }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      irlSupportingDocuments: prev.irlSupportingDocuments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.irlExemptionType) {
      toast.error('Veuillez sélectionner un motif d\'exonération');
      return;
    }
    if (!formData.irlJustification.trim()) {
      toast.error('Veuillez fournir une justification pour votre demande');
      return;
    }
    if (formData.irlSupportingDocuments.length === 0) {
      toast.error('Veuillez joindre au moins un document justificatif');
      return;
    }
    onSubmit();
  };

  return (
    <div className="space-y-3 px-4 py-4">
      {/* Info banner */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <DollarSign className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Exonération de l'impôt sur le revenu locatif
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
            Ce formulaire concerne l'exonération de l'IRL (22% sur les revenus locatifs), perçu par la Direction Générale des Recettes (DGR). 
            Sélectionnez le motif d'exonération applicable et fournissez les justificatifs nécessaires.
          </p>
        </div>
      </div>

      {/* Section: Localisation */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <Label className="text-sm font-semibold">Localisation de la parcelle</Label>
            <Badge variant="outline" className="text-[10px] ml-auto">Auto</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Province</Label>
              <Input value={formData.province || '—'} disabled className="h-9 text-sm rounded-xl opacity-70" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ville</Label>
              <Input value={formData.ville || '—'} disabled className="h-9 text-sm rounded-xl opacity-70" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Exercice fiscal */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <Label className="text-sm font-semibold">Exercice fiscal visé</Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'exonération s'appliquera à partir de l'exercice fiscal sélectionné, sous réserve d'approbation par la DGR.
          </p>
          <Select
            value={formData.fiscalYear.toString()}
            onValueChange={(v) => setFormData(prev => ({ ...prev, fiscalYear: parseInt(v) }))}
          >
            <SelectTrigger className="h-10 text-sm rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-popover">
              {[currentYear + 1, currentYear + 2].map(y => (
                <SelectItem key={y} value={y.toString()}>{y} (exercice futur)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Section: Motif d'exonération IRL */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Motif d'exonération *
              <SectionHelpPopover
                title="Motifs d'exonération IRL"
                description="Sélectionnez le motif correspondant à votre situation. Chaque motif est détaillé avec sa base légale, les conditions d'éligibilité et les documents à fournir."
              />
            </Label>
          </div>

          <div className="space-y-2">
            {IRL_EXEMPTION_TYPES.map(type => {
              const isSelected = formData.irlExemptionType === type.value;
              return (
                <div key={type.value}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, irlExemptionType: type.value }))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </button>

                  {isSelected && (
                    <div className="ml-3 mt-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/50 space-y-2">
                      <div className="flex gap-1.5 items-start">
                        <Info className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">{type.legalBasis}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Conditions requises :</p>
                        <ul className="space-y-0.5">
                          {type.conditions.map((c, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <span className="text-blue-400">•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Documents requis :</p>
                        <ul className="space-y-0.5">
                          {type.requiredDocs.map((d, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <FileText className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" /> {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section: Détails du bien */}
      {formData.irlExemptionType && (
        <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Home className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <Label className="text-sm font-semibold">Informations complémentaires</Label>
            </div>

            {(formData.irlExemptionType === 'bien_non_loue' || formData.irlExemptionType === 'habitation_personnelle') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Depuis quand le bien est-il dans cette situation ?</Label>
                <Input
                  type="date"
                  value={formData.occupancyStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupancyStartDate: e.target.value }))}
                  className="h-9 text-sm rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre de locataires actuels</Label>
              <Input
                type="number"
                min={0}
                value={formData.tenantCount}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantCount: parseInt(e.target.value) || 0 }))}
                className="h-9 text-sm rounded-xl"
              />
              {formData.tenantCount > 0 && formData.irlExemptionType !== 'organisme_international' && (
                <p className="text-xs text-amber-600 flex gap-1 items-start">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  Avec des locataires en place, l'exonération IRL peut être difficile à obtenir sauf cas spécifique.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section: Justification */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <Label className="text-sm font-semibold">Justification de la demande *</Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Décrivez en détail pourquoi vous estimez que ce bien devrait être exonéré de l'IRL. Précisez votre situation et tout élément pertinent.
          </p>
          <Textarea
            value={formData.irlJustification}
            onChange={(e) => setFormData(prev => ({ ...prev, irlJustification: e.target.value }))}
            placeholder="Ex: Le bien est ma résidence principale depuis 2019. Je l'occupe personnellement et aucune partie n'est louée à des tiers..."
            className="min-h-[100px] text-sm rounded-xl"
          />
        </CardContent>
      </Card>

      {/* Section: Documents */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Upload className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <Label className="text-sm font-semibold">Documents justificatifs *</Label>
          </div>
          <p className="text-xs text-muted-foreground">PDF ou image, max 10 Mo par fichier.</p>

          {formData.irlSupportingDocuments.length > 0 && (
            <div className="space-y-1.5">
              {formData.irlSupportingDocuments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate flex-1">{file.name}</span>
                  <button onClick={() => removeDocument(i)} className="p-1 rounded-md hover:bg-muted">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ajouter un document…</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple onChange={(e) => handleAddDocument(e.target.files)} />
          </label>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2"
      >
        <Shield className="h-4 w-4" />
        Voir le récapitulatif
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ExemptionIRLForm;
