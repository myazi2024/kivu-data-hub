import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Calculator, Info, ArrowLeft, Loader2, MapPin, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SectionHelpPopover from './SectionHelpPopover';
import { validateNIF, NIF_FORMAT_ERROR } from './tax-calculator/taxFormConstants';
import { SummaryRow, PlainRow } from './tax-calculator/SummaryRowComponents';
import {
  getFiscalZoneCategory,
  FISCAL_ZONE_MULTIPLIERS,
  FISCAL_ZONE_LABELS,
  calculateBuildingTaxMonthsLate,
} from '@/hooks/usePropertyTaxCalculator';
import { checkDuplicateTaxSubmission } from './tax-calculator/taxSharedUtils';

interface BuildingTaxCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  onOpenServiceCatalog?: () => void;
}

type CalcStep = 'questions' | 'summary';

const BUILDING_TAX_RATES: Record<string, Record<string, number>> = {
  urban: { en_dur: 500, semi_dur: 300, en_paille: 100 },
  rural: { en_dur: 300, semi_dur: 150, en_paille: 50 },
};

const CONSTRUCTION_LABELS: Record<string, string> = {
  en_dur: 'En dur (béton, briques)',
  semi_dur: 'Semi-dur (mixte)',
  en_paille: 'En paille / bois',
};

const BuildingTaxCalculator: React.FC<BuildingTaxCalculatorProps> = ({
  parcelNumber, parcelId, parcelData, onOpenServiceCatalog
}) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [calcStep, setCalcStep] = useState<CalcStep>('questions');
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(2800);

  const [nif, setNif] = useState('');
  const [hasNif, setHasNif] = useState<boolean | null>(null);
  const [ownerName, setOwnerName] = useState(parcelData?.current_owner_name || '');

  useEffect(() => {
    if (parcelData?.current_owner_name && !ownerName) setOwnerName(parcelData.current_owner_name);
  }, [parcelData?.current_owner_name]);

  // Fetch exchange rate from config (fallback to 2800)
  useEffect(() => {
    const fetchRate = async () => {
      const { data } = await supabase
        .from('cadastral_contribution_config')
        .select('config_value')
        .eq('config_key', 'cdf_usd_exchange_rate')
        .eq('is_active', true)
        .maybeSingle();
      if (data?.config_value && typeof data.config_value === 'number') {
        setExchangeRate(data.config_value as number);
      } else if (data?.config_value && typeof (data.config_value as any).rate === 'number') {
        setExchangeRate((data.config_value as any).rate);
      }
    };
    fetchRate();
  }, []);

  const defaultZone = parcelNumber?.startsWith('SR') ? 'rural' : 'urban';
  const defaultConstruction = parcelData?.construction_type === 'En dur' ? 'en_dur'
    : parcelData?.construction_type === 'Semi-dur' ? 'semi_dur'
    : parcelData?.construction_type === 'En paille' ? 'en_paille' : 'en_dur';

  const [zoneType, setZoneType] = useState(defaultZone);
  const [constructionType, setConstructionType] = useState(defaultConstruction);
  const [areaSqm, setAreaSqm] = useState(Number(parcelData?.area_sqm) || 0);
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [numberOfFloors, setNumberOfFloors] = useState(1);
  const [constructionYear, setConstructionYear] = useState<number | null>(parcelData?.construction_year || null);
  const [buildingCondition, setBuildingCondition] = useState('bon');

  useEffect(() => {
    if (parcelData?.area_sqm && !areaSqm) setAreaSqm(Number(parcelData.area_sqm));
  }, [parcelData?.area_sqm]);

  // Use centralized fiscal zone logic
  const ville = parcelData?.ville || '';
  const province = parcelData?.province || '';
  const fiscalZoneCategory = getFiscalZoneCategory(province, ville || null, zoneType as 'urban' | 'rural');
  const zoneMultiplier = FISCAL_ZONE_MULTIPLIERS[fiscalZoneCategory];

  // Auto-calculate months late using centralized function
  const monthsLate = useMemo(() => calculateBuildingTaxMonthsLate(fiscalYear), [fiscalYear]);

  // Memoized calculation
  const calculation = useMemo(() => {
    const baseTaxRate = BUILDING_TAX_RATES[zoneType]?.[constructionType] || 0;
    const conditionMultiplier = buildingCondition === 'bon' ? 1.0 : buildingCondition === 'moyen' ? 0.75 : 0.5;
    const buildingAge = constructionYear ? currentYear - constructionYear : 0;
    const ageReduction = buildingAge > 20 ? 0.9 : 1.0;
    const totalSurface = areaSqm * (numberOfFloors || 1);
    const baseTaxCDF = totalSurface * baseTaxRate * zoneMultiplier * conditionMultiplier * ageReduction;
    const baseTaxUSD = Math.round((baseTaxCDF / exchangeRate) * 100) / 100;

    // Aligned penalty formula with usePropertyTaxCalculator: 2%/month capped at 24% + 25% majoration if > 3 months
    const penaltyRate = Math.min(monthsLate * 2, 24) / 100;
    const majorationRate = monthsLate > 3 ? 0.25 : 0;
    const penaltyAmountUSD = Math.round(baseTaxUSD * penaltyRate * 100) / 100;
    const majorationAmountUSD = Math.round(baseTaxUSD * majorationRate * 100) / 100;
    const totalPenaltiesUSD = penaltyAmountUSD + majorationAmountUSD;
    const totalTaxUSD = Math.round((baseTaxUSD + totalPenaltiesUSD) * 100) / 100;

    return {
      baseTaxRate, conditionMultiplier, buildingAge, ageReduction,
      totalSurface, baseTaxCDF, baseTaxUSD,
      penaltyRate, majorationRate, penaltyAmountUSD, majorationAmountUSD, totalPenaltiesUSD, totalTaxUSD,
    };
  }, [zoneType, constructionType, buildingCondition, constructionYear, currentYear, areaSqm, numberOfFloors, zoneMultiplier, exchangeRate, monthsLate]);

  const canCalculate = areaSqm > 0 && constructionType;

  const handleCalculate = () => {
    if (!canCalculate) { toast.error('Renseignez la superficie et le type de construction'); return; }
    if (hasNif === true && nif && !validateNIF(nif)) { toast.error(NIF_FORMAT_ERROR); return; }
    setCalcStep('summary');
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Vous devez être connecté'); return; }
    setLoading(true);
    try {
      // Persist to cadastral_contributions (was missing — critical fix)
      const { error } = await supabase.from('cadastral_contributions').insert({
        parcel_number: parcelNumber,
        original_parcel_id: parcelId || null,
        user_id: user.id,
        contribution_type: 'update',
        status: 'pending',
        tax_history: [{
          tax_type: 'Taxe de bâtisse',
          tax_year: fiscalYear,
          amount_usd: calculation.totalTaxUSD,
          base_amount_cdf: calculation.baseTaxCDF,
          construction_type: constructionType,
          zone_type: zoneType,
          building_condition: buildingCondition,
          total_surface: calculation.totalSurface,
          floors: numberOfFloors,
          construction_year: constructionYear,
          penalty_amount_usd: calculation.totalPenaltiesUSD,
          payment_status: 'En attente',
          nif: hasNif ? nif : null,
        }],
      });

      if (error) throw error;

      // Fire-and-forget notification
      supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Déclaration taxe de bâtisse',
        message: `Déclaration taxe de bâtisse pour ${parcelNumber} (exercice ${fiscalYear}). Montant: ${calculation.totalTaxUSD.toFixed(2)} USD.`,
        type: 'info',
        action_url: '/user-dashboard',
      }).then(() => {});

      toast.success('Déclaration soumise avec succès');
      setCalcStep('questions');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  if (calcStep === 'summary') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setCalcStep('questions')} className="h-8 w-8 p-0 rounded-lg"><ArrowLeft className="h-4 w-4" /></Button>
          <h3 className="text-sm font-bold">Fiche — Taxe de bâtisse</h3>
        </div>
        <Card className="rounded-xl border-primary/20">
          <CardContent className="p-3 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Exercice {fiscalYear}</Badge>
              <Badge variant="outline" className="text-xs">{zoneType === 'urban' ? 'Urbain' : 'Rural'}</Badge>
              <Badge variant="outline" className="text-xs">{FISCAL_ZONE_LABELS[fiscalZoneCategory]}</Badge>
            </div>
            <Separator />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Identification</h4>
            <SummaryRow label="Parcelle" value={parcelNumber} bold mono />
            <SummaryRow label="Propriétaire" value={ownerName || '—'} />
            {hasNif && nif && <SummaryRow label="NIF" value={nif} mono />}
            <Separator />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Bâtiment</h4>
            <SummaryRow label="Construction" value={CONSTRUCTION_LABELS[constructionType] || constructionType} />
            <SummaryRow label="Superficie au sol" value={`${areaSqm.toLocaleString('fr-FR')} m²`} />
            <SummaryRow label="Étages" value={String(numberOfFloors || 1)} />
            <SummaryRow label="Surface imposable" value={`${calculation.totalSurface.toLocaleString('fr-FR')} m²`} bold />
            {constructionYear && <SummaryRow label="Année construction" value={String(constructionYear)} />}
            <SummaryRow label="État" value={buildingCondition === 'bon' ? 'Bon' : buildingCondition === 'moyen' ? 'Moyen' : 'Mauvais'} />
            <Separator />
            <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Calcul</h4>
            <PlainRow label="Taux de base" value={`${calculation.baseTaxRate} CDF/m²`} />
            {zoneMultiplier !== 1.0 && <PlainRow label={`Coeff. zone (${FISCAL_ZONE_LABELS[fiscalZoneCategory]})`} value={`×${zoneMultiplier}`} />}
            {calculation.conditionMultiplier !== 1.0 && <PlainRow label="Réduction état" value={`×${calculation.conditionMultiplier}`} />}
            {calculation.ageReduction !== 1.0 && <PlainRow label="Réduction ancienneté" value="×0.90" />}
            <PlainRow label="Taux de change" value={`1 USD = ${exchangeRate.toLocaleString('fr-FR')} CDF`} />
            <SummaryRow label="Taxe de base" value={`${calculation.baseTaxCDF.toLocaleString('fr-FR')} CDF ≈ ${calculation.baseTaxUSD.toFixed(2)} USD`} />
            {calculation.penaltyAmountUSD > 0 && (
              <PlainRow label={`Pénalité (${monthsLate} mois × 2%, max 24%)`} value={`+${calculation.penaltyAmountUSD.toFixed(2)} USD`} />
            )}
            {calculation.majorationAmountUSD > 0 && (
              <PlainRow label="Majoration (25%)" value={`+${calculation.majorationAmountUSD.toFixed(2)} USD`} />
            )}
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-bold text-base">Total dû</span>
              <span className="font-bold text-base text-primary">{calculation.totalTaxUSD.toFixed(2)} USD</span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCalcStep('questions')} className="flex-1 h-10 rounded-xl text-sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Modifier</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-10 rounded-xl text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Soumettre'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Taxe de bâtisse</h3>
          <p className="text-xs text-muted-foreground">Impôt provincial annuel sur les constructions</p>
        </div>
      </div>

      <Alert className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
          La taxe de bâtisse est un impôt annuel assis sur la superficie construite. Le taux dépend de la zone (urbaine/rurale), du type de construction et de l'état du bâtiment. Cette taxe est perçue par l'administration fiscale provinciale.
        </AlertDescription>
      </Alert>

      {/* Identité */}
      <Card className="rounded-xl border-2">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-semibold">Contribuable</h4>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">Propriétaire</span>
            <span className="text-sm font-medium">{ownerName || '—'}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Avez-vous un NIF ?</Label>
            <RadioGroup value={hasNif === null ? '' : hasNif ? 'yes' : 'no'} onValueChange={(v) => setHasNif(v === 'yes')} className="flex gap-3">
              <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="bt-nif-yes" /><Label htmlFor="bt-nif-yes" className="text-sm cursor-pointer">Oui</Label></div>
              <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="bt-nif-no" /><Label htmlFor="bt-nif-no" className="text-sm cursor-pointer">Non</Label></div>
            </RadioGroup>
          </div>
          {hasNif === true && (
            <div className="space-y-1.5">
              <Label className="text-sm">NIF</Label>
              <Input
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="Ex: A0123456B"
                className={`h-10 text-sm rounded-xl ${nif && !validateNIF(nif) ? 'border-destructive' : ''}`}
              />
              {nif && !validateNIF(nif) && (
                <p className="text-xs text-destructive">{NIF_FORMAT_ERROR}</p>
              )}
            </div>
          )}
          {hasNif === false && (
            <Alert className="rounded-lg"><AlertDescription className="text-xs">Un NIF vous sera attribué d'office après paiement.</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>

      {/* Localisation synchronisée */}
      <Card className="rounded-xl border-2">
        <CardContent className="p-3 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> Localisation
            <Lock className="h-3 w-3 text-muted-foreground" />
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-1.5 bg-muted/50 rounded-lg"><span className="text-muted-foreground">Province</span><span className="font-medium">{province || '—'}</span></div>
            <div className="flex justify-between p-1.5 bg-muted/50 rounded-lg"><span className="text-muted-foreground">Ville</span><span className="font-medium">{ville || '—'}</span></div>
            <div className="flex justify-between p-1.5 bg-muted/50 rounded-lg"><span className="text-muted-foreground">Commune</span><span className="font-medium">{parcelData?.commune || '—'}</span></div>
            <div className="flex justify-between p-1.5 bg-muted/50 rounded-lg"><span className="text-muted-foreground">Zone</span><span className="font-medium">{zoneType === 'urban' ? 'Urbaine' : 'Rurale'}</span></div>
          </div>
          <div className="p-1.5 bg-muted/50 rounded-lg text-xs flex justify-between">
            <span className="text-muted-foreground">Catégorie fiscale</span>
            <span className="font-medium">{FISCAL_ZONE_LABELS[fiscalZoneCategory]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bâtiment */}
      <Card className="rounded-xl border-2">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-amber-600" /> Caractéristiques du bâtiment
            <SectionHelpPopover title="Bâtiment" description="Le taux de la taxe de bâtisse varie selon le matériau de construction, l'état et l'ancienneté du bâtiment." />
          </h4>
          <div className="space-y-1.5">
            <Label className="text-sm">Type de construction *</Label>
            <Select value={constructionType} onValueChange={setConstructionType}>
              <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_dur">En dur (béton, briques, ciment)</SelectItem>
                <SelectItem value="semi_dur">Semi-dur (matériaux mixtes)</SelectItem>
                <SelectItem value="en_paille">En paille / bois (traditionnel)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Superficie (m²)</Label>
              <Input type="number" min={0} value={areaSqm || ''} onChange={(e) => setAreaSqm(Math.max(0, Number(e.target.value)))} className="h-10 text-sm rounded-xl border-2" disabled={!!parcelData?.area_sqm} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nombre d'étages</Label>
              <Input type="number" min={1} value={numberOfFloors} onChange={(e) => setNumberOfFloors(Math.max(1, Number(e.target.value) || 1))} className="h-10 text-sm rounded-xl border-2" />
            </div>
          </div>
          {calculation.totalSurface > 0 && (
            <div className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
              <span className="text-muted-foreground">Surface imposable</span>
              <span className="font-bold">{calculation.totalSurface.toLocaleString('fr-FR')} m²</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Année construction</Label>
              <Input type="number" min={1900} max={currentYear} value={constructionYear || ''} onChange={(e) => setConstructionYear(e.target.value ? Number(e.target.value) : null)} className="h-10 text-sm rounded-xl border-2" disabled={!!parcelData?.construction_year} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">État du bâtiment</Label>
              <Select value={buildingCondition} onValueChange={setBuildingCondition}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bon">Bon état</SelectItem>
                  <SelectItem value="moyen">État moyen</SelectItem>
                  <SelectItem value="mauvais">Mauvais / vétuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercice fiscal */}
      <Card className="rounded-xl border-2">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-semibold">Exercice fiscal</h4>
          <div className="space-y-1.5">
            <Label className="text-sm">Année</Label>
            <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))}>
              <SelectTrigger className="h-10 text-sm rounded-xl border-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {monthsLate > 0 && (
            <Alert className="rounded-lg border-destructive/30 bg-destructive/5">
              <AlertDescription className="text-xs text-destructive">
                Retard de {monthsLate} mois — Pénalité: {(calculation.penaltyRate * 100).toFixed(0)}%
                {calculation.majorationRate > 0 && ` + majoration 25%`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Aperçu */}
      {canCalculate && (
        <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 rounded-xl">
          <CardContent className="p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-xs">Estimation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxe de base</span>
              <span>{calculation.baseTaxCDF.toLocaleString('fr-FR')} CDF ≈ {calculation.baseTaxUSD.toFixed(2)} USD</span>
            </div>
            {calculation.totalPenaltiesUSD > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Pénalités</span><span>+{calculation.totalPenaltiesUSD.toFixed(2)} USD</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total estimé</span><span className="text-primary">{calculation.totalTaxUSD.toFixed(2)} USD</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleCalculate} disabled={!canCalculate} className="w-full h-10 rounded-xl text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
        <Calculator className="h-4 w-4 mr-1.5" />Générer la fiche de déclaration
      </Button>
    </div>
  );
};

export default BuildingTaxCalculator;
