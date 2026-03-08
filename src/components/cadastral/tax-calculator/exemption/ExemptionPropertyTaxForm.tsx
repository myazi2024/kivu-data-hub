import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calculator, Shield, MapPin, Home, FileText, Upload, X, ArrowRight, Info, AlertTriangle
} from 'lucide-react';
import { ExemptionFormData } from '../ExemptionRequestDialog';
import { EXEMPTION_DEFINITIONS } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../../SectionHelpPopover';
import { toast } from 'sonner';

interface ExemptionPropertyTaxFormProps {
  formData: ExemptionFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExemptionFormData>>;
  parcelData?: any;
  onSubmit: () => void;
}

const PROPERTY_EXEMPTION_DETAILS: Record<string, { legalBasis: string; conditions: string[]; requiredDocs: string[] }> = {
  edifice_public: {
    legalBasis: 'Art. 8, alinéa 1 de l\'Ordonnance-loi n°69-006 du 10/02/1969',
    conditions: [
      'Le bâtiment doit être affecté à un service public ou d\'utilité publique',
      'Concerne les propriétés de l\'État, des provinces, des ETD et des missions diplomatiques',
      'L\'affectation publique doit être effective et non simplement déclarée',
    ],
    requiredDocs: ['Attestation d\'affectation publique', 'Titre de propriété de l\'État ou de l\'ETD'],
  },
  edifice_religieux: {
    legalBasis: 'Art. 8, alinéa 2 de l\'Ordonnance-loi n°69-006',
    conditions: [
      'Édifice exclusivement affecté au culte religieux',
      'Inclut les lieux de culte, couvents, séminaires et presbytères',
      'Les parties affectées à un usage commercial ne sont pas exonérées',
    ],
    requiredDocs: ['Attestation de reconnaissance légale de la confession religieuse', 'Preuve d\'affectation cultuelle'],
  },
  construction_moins_5ans: {
    legalBasis: 'Art. 8, alinéa 3 de l\'Ordonnance-loi n°69-006',
    conditions: [
      'Construction achevée depuis moins de 5 ans à la date de la déclaration',
      'L\'exonération est temporaire et prend fin automatiquement après 5 ans',
      'La date d\'achèvement doit être justifiée par un document officiel',
    ],
    requiredDocs: ['Autorisation de bâtir avec date d\'achèvement', 'PV de réception des travaux'],
  },
  surface_moins_50m2: {
    legalBasis: 'Art. 8, alinéa 4 de l\'Ordonnance-loi n°69-006',
    conditions: [
      'Surface bâtie strictement inférieure à 50 m²',
      'Concerne les habitations modestes et de faible superficie',
      'La superficie est celle de l\'emprise au sol de la construction',
    ],
    requiredDocs: ['Plan de la construction avec mesures', 'Attestation de superficie du service cadastral'],
  },
  zone_economique_speciale: {
    legalBasis: 'Loi n°14/022 du 07/07/2014 fixant le régime des ZES',
    conditions: [
      'Le bien doit être situé dans une Zone Économique Spéciale officiellement désignée',
      'L\'exonération est accordée pour la durée prévue par le régime de la ZES',
      'L\'entreprise doit être agréée au régime de la ZES par l\'autorité compétente',
    ],
    requiredDocs: ['Agrément au régime ZES', 'Attestation de localisation dans la ZES'],
  },
};

const ExemptionPropertyTaxForm: React.FC<ExemptionPropertyTaxFormProps> = ({
  formData, setFormData, parcelData, onSubmit
}) => {
  const currentYear = new Date().getFullYear();

  const toggleExemption = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedExemptions: checked
        ? [...prev.selectedExemptions, type]
        : prev.selectedExemptions.filter(e => e !== type),
    }));
  };

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
      supportingDocuments: [...prev.supportingDocuments, ...newFiles],
    }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (formData.selectedExemptions.length === 0) {
      toast.error('Veuillez sélectionner au moins un motif d\'exonération');
      return;
    }
    if (!formData.justification.trim()) {
      toast.error('Veuillez fournir une justification pour votre demande');
      return;
    }
    if (formData.supportingDocuments.length === 0) {
      toast.error('Veuillez joindre au moins un document justificatif');
      return;
    }
    onSubmit();
  };

  return (
    <div className="space-y-3 px-4 py-4">
      {/* Info banner */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
        <Shield className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
            Exonération d'impôt foncier
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5 leading-relaxed">
            Remplissez ce formulaire pour demander un certificat d'exonération auprès de la Direction Générale des Impôts (DGI). 
            Chaque motif d'exonération est détaillé avec sa base légale et les documents requis.
          </p>
        </div>
      </div>

      {/* Section: Localisation (auto-populated) */}
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Commune</Label>
              <Input value={formData.commune || '—'} disabled className="h-9 text-sm rounded-xl opacity-70" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Superficie</Label>
              <Input value={formData.areaSqm ? `${Number(formData.areaSqm).toLocaleString('fr-FR')} m²` : '—'} disabled className="h-9 text-sm rounded-xl opacity-70" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Exercice fiscal */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <Label className="text-sm font-semibold">Exercice fiscal visé</Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'exonération demandée s'appliquera à partir de l'exercice fiscal suivant. Elle ne modifie pas votre déclaration pour l'exercice en cours.
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

      {/* Section: Motifs d'exonération */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Motifs d'exonération
              <SectionHelpPopover
                title="Motifs d'exonération"
                description="Sélectionnez tous les motifs applicables. Chaque motif est accompagné de sa base légale et des conditions requises pour en bénéficier."
              />
            </Label>
          </div>

          <div className="space-y-3">
            {EXEMPTION_DEFINITIONS.map(ex => {
              const details = PROPERTY_EXEMPTION_DETAILS[ex.type];
              const isSelected = formData.selectedExemptions.includes(ex.type);
              return (
                <div 
                  key={ex.type} 
                  className={`rounded-xl border-2 transition-all ${
                    isSelected ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-2.5 p-3">
                    <Checkbox
                      id={`exemption-${ex.type}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleExemption(ex.type, !!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor={`exemption-${ex.type}`} className="text-sm font-medium cursor-pointer">{ex.label}</label>
                      <p className="text-xs text-muted-foreground mt-0.5">{ex.description}</p>
                    </div>
                  </div>

                  {isSelected && details && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2 ml-7">
                      <div className="flex gap-1.5 items-start">
                        <Info className="h-3 w-3 text-purple-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">{details.legalBasis}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Conditions requises :</p>
                        <ul className="space-y-0.5">
                          {details.conditions.map((c, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <span className="text-purple-400">•</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Documents requis :</p>
                        <ul className="space-y-0.5">
                          {details.requiredDocs.map((d, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <FileText className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" /> {d}
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
            Expliquez en détail pourquoi vous estimez être éligible à l'exonération. Décrivez la situation de votre bien et les raisons qui justifient votre demande.
          </p>
          <Textarea
            value={formData.justification}
            onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
            placeholder="Ex: Le bâtiment situé sur la parcelle est affecté exclusivement au culte religieux depuis 2018. Il s'agit d'une église reconnue par l'arrêté ministériel n°..."
            className="min-h-[100px] text-sm rounded-xl"
          />
        </CardContent>
      </Card>

      {/* Section: Documents justificatifs */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Upload className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <Label className="text-sm font-semibold">Documents justificatifs *</Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Joignez tous les documents qui appuient votre demande (attestations, titres, permis, PV, etc.). 
            Format PDF ou image, max 10 Mo par fichier.
          </p>

          {formData.supportingDocuments.length > 0 && (
            <div className="space-y-1.5">
              {formData.supportingDocuments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate flex-1">{file.name}</span>
                  <button onClick={() => removeDocument(i)} className="p-1 rounded-md hover:bg-muted transition-colors">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ajouter un document…</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => handleAddDocument(e.target.files)}
            />
          </label>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white gap-2"
      >
        <Shield className="h-4 w-4" />
        Voir le récapitulatif
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ExemptionPropertyTaxForm;
