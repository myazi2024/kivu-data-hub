import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Home, Building2, Factory, Tractor, Landmark, ArrowRight, DollarSign, MapPin,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import {
  TaxCalculationInput, getLatePenaltyInfo,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';
import IRLTenantsList, { TenantEntry } from './IRLTenantsList';

const ZONE_OPTIONS = [
  { value: 'urban', label: 'Urbaine', icon: Building2, desc: 'Ville, commune urbaine' },
  { value: 'rural', label: 'Rurale', icon: Tractor, desc: 'Territoire, collectivité' },
];

const USAGE_OPTIONS = [
  { value: 'residential', label: 'Résidentiel', icon: Home, desc: 'Habitation' },
  { value: 'commercial', label: 'Commercial', icon: Building2, desc: 'Bureau, boutique' },
  { value: 'industrial', label: 'Industriel', icon: Factory, desc: 'Usine, atelier' },
  { value: 'agricultural', label: 'Agricole', icon: Tractor, desc: 'Exploitation' },
  { value: 'mixed', label: 'Mixte', icon: Landmark, desc: 'Usage combiné' },
];

interface IRLQuestionsStepProps {
  parcelNumber: string;
  parcelData?: any;
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  nif: string;
  setNif: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  tenants: TenantEntry[];
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>;
  zoneAutoDetected?: boolean;
  onCalculate: () => void;
  onOpenServiceCatalog?: () => void;
}

const IRLQuestionsStep: React.FC<IRLQuestionsStepProps> = ({
  parcelNumber, parcelData, input, setInput, nif, setNif,
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile, hasNif, setHasNif,
  tenants, setTenants, zoneAutoDetected,
  onCalculate, onOpenServiceCatalog
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Section 1: Identité du contribuable */}
      <TaxpayerIdentitySection
        ownerName={ownerName}
        setOwnerName={setOwnerName}
        idDocumentFile={idDocumentFile}
        setIdDocumentFile={setIdDocumentFile}
        hasNif={hasNif}
        setHasNif={setHasNif}
        nif={nif}
        setNif={setNif}
        onOpenServiceCatalog={onOpenServiceCatalog}
      />

      {/* Section 2: IRL Info */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Impôt sur le Revenu Locatif
                <SectionHelpPopover
                  title="IRL — Ordonnance-loi n°69-009"
                  description="Taux de 22% sur les revenus locatifs bruts ou nets (après déduction forfaitaire de 30% pour frais d'entretien). Perçu par la Direction Générale des Recettes (DGR)."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
            </div>
          </div>

          {/* Fiscal year */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Exercice fiscal *</Label>
            <Select
              value={input.fiscalYear.toString()}
              onValueChange={(v) => setInput(prev => ({ ...prev, fiscalYear: parseInt(v) }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Localisation & zone fiscale — aligné sur le formulaire CCC (onglet Lieu) */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <Label className="text-sm font-semibold">Localisation & zone fiscale</Label>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal ml-auto">Données auto-remplies</span>
          </div>

          {/* Province */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Province
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
            </Label>
            <Input value={input.province || '—'} disabled className="h-10 text-sm rounded-xl opacity-70" />
          </div>

          {/* Type de zone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Type de zone
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto (préfixe {input.zoneType === 'rural' ? 'SR' : 'SU'})</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ZONE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = input.zoneType === opt.value;
                return (
                  <div
                    key={opt.value}
                    className={`p-3 rounded-xl border-2 text-left opacity-70 cursor-not-allowed ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ville — urban only */}
          {input.zoneType === 'urban' && (parcelData?.ville || input.ville) && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Ville
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData?.ville || input.ville || '—'} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Commune */}
          {parcelData?.commune && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Commune
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.commune} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Quartier */}
          {parcelData?.quartier && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Quartier
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.quartier} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Avenue */}
          {parcelData?.avenue && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Avenue
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.avenue} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Territoire — rural */}
          {parcelData?.territoire && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Territoire
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.territoire} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Collectivité — rural */}
          {parcelData?.collectivite && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Collectivité
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.collectivite} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Village — rural */}
          {parcelData?.village && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Village
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
              </Label>
              <Input value={parcelData.village} disabled className="h-10 text-sm rounded-xl opacity-70" />
            </div>
          )}

          {/* Usage déclaré */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Usage déclaré
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
            </Label>
            <Input
              value={
                USAGE_OPTIONS.find(o => o.value === input.usageType)?.label
                  ? `${USAGE_OPTIONS.find(o => o.value === input.usageType)?.label} — ${USAGE_OPTIONS.find(o => o.value === input.usageType)?.desc}`
                  : input.usageType
              }
              disabled
              className="h-10 text-sm rounded-xl opacity-70"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Locataires & revenus locatifs */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <IRLTenantsList
            tenants={tenants}
            setTenants={setTenants}
            fiscalYear={input.fiscalYear}
          />

          {/* 30% deduction */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex-1">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Déduction forfaitaire 30%
                <SectionHelpPopover
                  title="Déduction pour frais d'entretien"
                  description="Art. 13 de l'Ordonnance-loi n°69-009 : déduction forfaitaire de 30% sur le revenu brut locatif pour frais d'entretien et de réparation. Cette déduction réduit la base imposable."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Frais d'entretien et réparation</p>
            </div>
            <Switch
              checked={input.applyDeduction30}
              onCheckedChange={(v) => setInput(prev => ({ ...prev, applyDeduction30: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Retard de paiement — calcul automatique */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Retard de paiement
            <SectionHelpPopover
              title="Calendrier IRL — DGRK"
              description="L'IRL est exigible au 1er trimestre. À Kinshasa, l'échéance est fixée au 28 février (prorogée en 2026). Après cette date : intérêts de 2%/mois (max 24%) et majoration de 25% au-delà de 3 mois."
            />
          </Label>
          {(() => {
            const info = getLatePenaltyInfo(input.fiscalYear, 'irl');
            if (!info.isLate) {
              return (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Pas de retard</p>
                    <p className="text-xs text-muted-foreground">
                      Échéance IRL : {info.deadlineStr}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm font-semibold text-destructive">
                    Retard de {info.monthsLate} mois
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Échéance dépassée : {info.deadlineStr}
                </p>
                <div className="text-xs space-y-1 pl-6">
                  <p>• Intérêts moratoires : <span className="font-semibold">{info.penaltyRate}%</span> ({info.monthsLate} × 2%)</p>
                  {info.hasSurcharge && (
                    <p>• Majoration supplémentaire : <span className="font-semibold">25%</span> (retard &gt; 3 mois)</p>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2"
      >
        <DollarSign className="h-4 w-4" />
        Calculer l'IRL
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default IRLQuestionsStep;
