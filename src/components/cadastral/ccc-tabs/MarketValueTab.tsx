import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, DollarSign, FileText, Home, Building2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import StorageFileUpload from '@/components/shared/StorageFileUpload';
import { useCurrencyConfig, type CurrencyCode } from '@/hooks/useCurrencyConfig';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import type { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';

export interface MarketListingEntry {
  constructionRef: string; // 'main' | 'additional:<idx>' | 'additional:<idx>:unit:<i>'
  unitLabel?: string;
  listForRent: boolean;
  targetRentUsd?: number;
  availableFrom?: string;
}

interface MarketValueTabProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  additionalConstructions: AdditionalConstruction[];
  handleTabChange: (tab: string) => void;
  handleNextTab: (current: string, next: string) => void;
  highlightRequiredFields?: boolean;
}

const MIN_DATE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
})();
const TODAY = new Date().toISOString().slice(0, 10);

const fmtUSD = (n?: number) => `${(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD`;

/** Récupère un libellé contextuel pour un bien. */
const subjectFor = (cat?: string, type?: string): string => {
  const c = (cat || '').trim();
  const t = (type || '').trim();
  return c || t || 'bien';
};

const pluralizeSubject = (subject: string, count: number): string => {
  const base = subject.toLowerCase();
  if (count <= 1) return base;
  if (base.endsWith('s')) return base;
  return `${base}s`;
};

/** Construit la liste des locaux vacants dans les constructions louées. */
const buildVacantTargets = (
  formData: CadastralContributionData,
  additional: AdditionalConstruction[],
) => {
  type Target = {
    ref: string; // unique
    constructionRef: 'main' | `additional:${number}`;
    unitIndex?: number;
    label: string;
    subject: string;
    currentRentUsd?: number;
    hostingCapacity?: number;
    floor?: string;
    constructionType?: string;
    constructionNature?: string;
    constructionMaterials?: string;
    standing?: string;
  };
  const out: Target[] = [];

  const pushFor = (
    base: 'main' | `additional:${number}`,
    cat: string | undefined,
    type: string | undefined,
    nature: string | undefined,
    materials: string | undefined,
    standing: string | undefined,
    declaredUsage: string | undefined,
    isOccupied: boolean | undefined,
    hostingCapacity: number | undefined,
    rentalConfiguration: 'single' | 'multi' | undefined,
    monthlyRentUsd: number | undefined,
    rentalUnits: Array<any> | undefined,
    suffix: string,
  ) => {
    if (declaredUsage !== 'Location') return;
    const subj = subjectFor(cat, type);
    if (rentalConfiguration === 'multi' && Array.isArray(rentalUnits) && rentalUnits.length > 0) {
      // En multi : chaque local a son propre isOccupied.
      rentalUnits.forEach((u, i) => {
        if (u?.isOccupied !== false) return;
        const floorLbl = u?.floor === 'RDC' ? 'RDC' : (u?.floor ? `${u.floor}e étage` : undefined);
        out.push({
          ref: `${base}:unit:${i}`,
          constructionRef: base,
          unitIndex: i,
          label: u?.label || `Local #${i + 1}${floorLbl ? ` · ${floorLbl}` : ''}`,
          subject: subj,
          currentRentUsd: u?.monthlyRentUsd,
          hostingCapacity: u?.hostingCapacity,
          floor: u?.floor,
          constructionType: type,
          constructionNature: nature,
          constructionMaterials: materials,
          standing,
        });
      });
    } else {
      // En single : on regarde l'occupation globale de la construction.
      if (isOccupied !== false) return;
      out.push({
        ref: base,
        constructionRef: base,
        label: `${subj.charAt(0).toUpperCase()}${subj.slice(1)}${suffix}`,
        subject: subj,
        currentRentUsd: monthlyRentUsd,
        hostingCapacity,
        constructionType: type,
        constructionNature: nature,
        constructionMaterials: materials,
        standing,
      });
    }
  };

  pushFor(
    'main',
    formData.propertyCategory,
    formData.constructionType,
    formData.constructionNature,
    formData.constructionMaterials,
    formData.standing,
    formData.declaredUsage,
    formData.isOccupied,
    formData.hostingCapacity,
    formData.rentalConfiguration,
    formData.monthlyRentUsd,
    formData.rentalUnits,
    ' principal',
  );
  additional.forEach((c, idx) => {
    pushFor(
      `additional:${idx}` as const,
      c.propertyCategory,
      c.constructionType,
      c.constructionNature,
      c.constructionMaterials,
      c.standing,
      c.declaredUsage,
      c.isOccupied,
      c.hostingCapacity,
      c.rentalConfiguration as 'single' | 'multi' | undefined,
      c.monthlyRentUsd,
      c.rentalUnits as Array<any> | undefined,
      ` #${idx + 2}`,
    );
  });

  return out;
};

const MarketValueTab: React.FC<MarketValueTabProps> = ({
  formData,
  handleInputChange,
  additionalConstructions,
  handleTabChange,
  handleNextTab,
  highlightRequiredFields,
}) => {
  const { currencies, convertFromUsd } = useCurrencyConfig();
  const cdfRate = useMemo(() => {
    const c = currencies.find(x => x.currency_code === 'CDF');
    return c?.exchange_rate_to_usd ?? 2850;
  }, [currencies]);

  // ─── Helpers de conversion ───
  const toUsd = useCallback(
    (amount: number | undefined, currency: CurrencyCode | undefined): number | undefined => {
      if (amount === undefined || amount === null || !Number.isFinite(Number(amount))) return undefined;
      const cur = currency || 'USD';
      if (cur === 'USD') return Number(amount);
      return Number(amount) / cdfRate;
    },
    [cdfRate],
  );

  const equivalent = (amount: number | undefined, currency: CurrencyCode | undefined): string => {
    if (!amount || !currency) return '';
    if (currency === 'USD') {
      const cdf = convertFromUsd(amount, 'CDF');
      return `≈ ${cdf.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CDF`;
    }
    const usd = amount / cdfRate;
    return `≈ ${usd.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD`;
  };

  // ─── 1.1 — Valeur de revente ───
  const wouldSell = formData.wouldSellIfOffered;
  const resaleCurrency = (formData.resalePriceCurrency || 'USD') as CurrencyCode;
  const resaleAmount = formData.resalePriceAmount;

  const setWouldSell = (v: boolean) => {
    if (!v) {
      handleInputChange('wouldSellIfOffered', false);
      handleInputChange('resalePriceAmount', undefined);
      handleInputChange('resalePriceCurrency', undefined);
      handleInputChange('resalePriceUsd', undefined);
    } else {
      handleInputChange('wouldSellIfOffered', true);
      if (!formData.resalePriceCurrency) handleInputChange('resalePriceCurrency', 'USD');
    }
  };

  const setResaleAmount = (raw: string) => {
    const n = raw === '' ? undefined : Number(raw);
    handleInputChange('resalePriceAmount', n);
    handleInputChange('resalePriceUsd', toUsd(n, resaleCurrency));
  };
  const setResaleCurrency = (cur: CurrencyCode) => {
    handleInputChange('resalePriceCurrency', cur);
    handleInputChange('resalePriceUsd', toUsd(resaleAmount, cur));
  };

  // ─── 1.2 — Valeur vénale ───
  const hasAppraisal = formData.hasRecentAppraisal;
  const appraisedCurrency = (formData.appraisedValueCurrency || 'USD') as CurrencyCode;
  const appraisedAmount = formData.appraisedValueAmount;
  const appraisalOutOfWindow =
    !!formData.appraisalDate && (formData.appraisalDate < MIN_DATE || formData.appraisalDate > TODAY);

  const setHasAppraisal = (v: boolean) => {
    if (!v) {
      handleInputChange('hasRecentAppraisal', false);
      handleInputChange('appraisalDate', undefined);
      handleInputChange('appraiserName', undefined);
      handleInputChange('appraisedValueAmount', undefined);
      handleInputChange('appraisedValueCurrency', undefined);
      handleInputChange('appraisedValueUsd', undefined);
      handleInputChange('appraisalReportUrl', undefined);
    } else {
      handleInputChange('hasRecentAppraisal', true);
      if (!formData.appraisedValueCurrency) handleInputChange('appraisedValueCurrency', 'USD');
    }
  };
  const setAppraisedAmount = (raw: string) => {
    const n = raw === '' ? undefined : Number(raw);
    handleInputChange('appraisedValueAmount', n);
    handleInputChange('appraisedValueUsd', toUsd(n, appraisedCurrency));
  };
  const setAppraisedCurrency = (cur: CurrencyCode) => {
    handleInputChange('appraisedValueCurrency', cur);
    handleInputChange('appraisedValueUsd', toUsd(appraisedAmount, cur));
  };

  // ─── 2 — Locaux vacants ───
  const vacantTargets = useMemo(
    () => buildVacantTargets(formData, additionalConstructions),
    [formData, additionalConstructions],
  );

  const listings = useMemo<MarketListingEntry[]>(
    () => Array.isArray(formData.marketListings) ? formData.marketListings as MarketListingEntry[] : [],
    [formData.marketListings],
  );

  const updateListing = (ref: string, patch: Partial<MarketListingEntry>, defaults: Partial<MarketListingEntry>) => {
    const next = [...listings];
    const idx = next.findIndex(l => l.constructionRef === ref);
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...patch };
    } else {
      next.push({ constructionRef: ref, listForRent: false, ...defaults, ...patch } as MarketListingEntry);
    }
    handleInputChange('marketListings', next);
  };

  const findListing = (ref: string) => listings.find(l => l.constructionRef === ref);

  const showBlock2 = formData.declaredUsage === 'Location'
    || additionalConstructions.some(c => c.declaredUsage === 'Location');

  const totalSubject = vacantTargets[0]?.subject || 'bien';
  const subjectLabel = pluralizeSubject(totalSubject, vacantTargets.length);

  // ─── Validation locale (UI seulement) ───
  const missingResale = highlightRequiredFields && wouldSell === undefined;
  const missingResaleAmount = highlightRequiredFields && wouldSell === true && (!resaleAmount || resaleAmount <= 0);
  const missingAppraisal = highlightRequiredFields && hasAppraisal === undefined;
  const missingAppraisalDetails = highlightRequiredFields && hasAppraisal === true && (
    !formData.appraisalDate || !appraisedAmount || appraisedAmount <= 0 || !formData.appraisalReportUrl
  );

  return (
    <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-3 animate-fade-in">
      {/* ════════ BLOC 1 — VALEUR MARCHANDE DE LA PARCELLE ════════ */}
      <Card className="border-2 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-3 sm:p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Valeur marchande de la parcelle</h3>
              <p className="text-xs text-muted-foreground">Estimation commerciale et expertise éventuelle</p>
            </div>
          </div>

          {/* ─── Sous-bloc 1.1 ─── */}
          <div className={cn(
            "rounded-2xl border-2 p-3 sm:p-4 space-y-3 bg-background",
            missingResale ? "ring-2 ring-destructive border-destructive/40" : "border-border",
          )}>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                Si un acheteur sérieux se présentait aujourd'hui, accepteriez-vous de vendre cette parcelle ?
                <span className="text-destructive ml-1">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Hypothèse de cession — n'engage à rien.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: true, label: 'Oui' },
                { v: false, label: 'Non' },
              ].map(opt => {
                const active = wouldSell === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    onClick={() => setWouldSell(opt.v)}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-md"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {wouldSell === true && (
              <div className="space-y-2 animate-fade-in">
                <Label className="text-sm font-medium text-foreground">
                  Après négociation, à quel prix raisonnable accepteriez-vous de vendre ?
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={resaleCurrency} onValueChange={(v) => setResaleCurrency(v as CurrencyCode)}>
                    <SelectTrigger className="w-24 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Montant"
                    value={resaleAmount ?? ''}
                    onChange={(e) => setResaleAmount(e.target.value)}
                    className={cn(
                      "flex-1 h-11 rounded-xl",
                      missingResaleAmount && "ring-2 ring-destructive border-destructive",
                    )}
                  />
                </div>
                {resaleAmount && resaleAmount > 0 && (
                  <p className="text-xs text-muted-foreground">{equivalent(resaleAmount, resaleCurrency)}</p>
                )}
              </div>
            )}
          </div>

          {/* ─── Sous-bloc 1.2 ─── */}
          <div className={cn(
            "rounded-2xl border-2 p-3 sm:p-4 space-y-3 bg-background",
            missingAppraisal ? "ring-2 ring-destructive border-destructive/40" : "border-border",
          )}>
            <div className="flex items-start gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-medium text-foreground">
                  Valeur vénale — une expertise immobilière a-t-elle été réalisée au cours des 6 derniers mois ?
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">Joignez le rapport pour appuyer la valeur déclarée.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: true, label: 'Oui' },
                { v: false, label: 'Non' },
              ].map(opt => {
                const active = hasAppraisal === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    onClick={() => setHasAppraisal(opt.v)}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-md"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {hasAppraisal === true && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">
                      Date de l'expertise<span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      type="date"
                      max={TODAY}
                      value={formData.appraisalDate || ''}
                      onChange={(e) => handleInputChange('appraisalDate', e.target.value || undefined)}
                      className={cn(
                        "h-11 rounded-xl",
                        missingAppraisalDetails && !formData.appraisalDate && "ring-2 ring-destructive border-destructive",
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Nom de l'expert / cabinet</Label>
                    <Input
                      type="text"
                      placeholder="Optionnel"
                      value={formData.appraiserName || ''}
                      onChange={(e) => handleInputChange('appraiserName', e.target.value || undefined)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                {appraisalOutOfWindow && (
                  <div className="flex gap-2 items-start rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>L'expertise date de plus de 6 mois — la valeur déclarée pourrait être considérée comme non actuelle.</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">
                    Valeur vénale retenue<span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select value={appraisedCurrency} onValueChange={(v) => setAppraisedCurrency(v as CurrencyCode)}>
                      <SelectTrigger className="w-24 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="CDF">CDF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder="Montant"
                      value={appraisedAmount ?? ''}
                      onChange={(e) => setAppraisedAmount(e.target.value)}
                      className={cn(
                        "flex-1 h-11 rounded-xl",
                        missingAppraisalDetails && (!appraisedAmount || appraisedAmount <= 0) && "ring-2 ring-destructive border-destructive",
                      )}
                    />
                  </div>
                  {appraisedAmount && appraisedAmount > 0 && (
                    <p className="text-xs text-muted-foreground">{equivalent(appraisedAmount, appraisedCurrency)}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">
                    Rapport d'expertise (PDF, JPG ou PNG — max 10 Mo)<span className="text-destructive ml-1">*</span>
                  </Label>
                  <div className={cn(
                    "rounded-xl",
                    missingAppraisalDetails && !formData.appraisalReportUrl && "ring-2 ring-destructive rounded-xl p-1",
                  )}>
                    <StorageFileUpload
                      bucket="cadastral-documents"
                      value={formData.appraisalReportUrl || null}
                      onChange={(url) => handleInputChange('appraisalReportUrl', url || undefined)}
                      accept="application/pdf,image/jpeg,image/png"
                      isPublic={true}
                      label="Rapport d'expertise"
                      maxSizeMB={10}
                      pathPrefix="appraisal-reports"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ════════ BLOC 2 — LOCAUX VACANTS À METTRE SUR LE MARCHÉ ════════ */}
      {showBlock2 && (
        <Card className="border-2 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Mise sur le marché des locaux vacants</h3>
                <p className="text-xs text-muted-foreground">Aidez de futurs locataires à trouver vos biens disponibles.</p>
              </div>
            </div>

            {vacantTargets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                Aucun local n'a été déclaré comme inoccupé dans l'onglet « Infos ».
                Si vous souhaitez signaler un local disponible, retournez dans l'onglet « Infos » et indiquez que la
                catégorie de bien <strong>n'est pas habitée</strong>.
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs sm:text-sm text-foreground leading-relaxed">
                  Vous avez indiqué dans l'onglet <strong>Infos</strong> que{' '}
                  <strong>{vacantTargets.length} {subjectLabel}</strong>{' '}
                  {vacantTargets.length > 1 ? 'ne sont pas actuellement occupés' : "n'est pas actuellement occupé"}.
                  Souhaitez-vous les proposer à la location ?
                </div>

                <div className="space-y-2">
                  {vacantTargets.map((t) => {
                    const entry = findListing(t.ref);
                    const checked = entry?.listForRent === true;
                    return (
                      <div
                        key={t.ref}
                        className={cn(
                          "rounded-2xl border-2 p-3 transition-all",
                          checked ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`listing-${t.ref}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              updateListing(
                                t.ref,
                                { listForRent: !!v },
                                { unitLabel: t.label },
                              )
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <Label htmlFor={`listing-${t.ref}`} className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              {t.label}
                            </Label>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {t.currentRentUsd ? <span>Loyer actuel : {fmtUSD(t.currentRentUsd)}/mois</span> : null}
                              {t.hostingCapacity ? <span>Capacité : {t.hostingCapacity} pers.</span> : null}
                              {t.constructionType ? <span>Type : {t.constructionType}</span> : null}
                              {t.constructionNature ? <span>Nature : {t.constructionNature}</span> : null}
                              {t.constructionMaterials ? <span>Matériaux : {t.constructionMaterials}</span> : null}
                              {t.standing ? <span>Standing : {t.standing}</span> : null}
                            </div>

                            {checked && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-fade-in">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-foreground">Loyer cible (USD/mois)</Label>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="any"
                                    placeholder="Optionnel"
                                    value={entry?.targetRentUsd ?? ''}
                                    onChange={(e) =>
                                      updateListing(t.ref, {
                                        targetRentUsd: e.target.value === '' ? undefined : Number(e.target.value),
                                      }, { unitLabel: t.label })
                                    }
                                    className="h-10 rounded-xl text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-foreground">Disponible à partir du</Label>
                                  <Input
                                    type="date"
                                    value={entry?.availableFrom || ''}
                                    onChange={(e) =>
                                      updateListing(t.ref, {
                                        availableFrom: e.target.value || undefined,
                                      }, { unitLabel: t.label })
                                    }
                                    className="h-10 rounded-xl text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════ NAVIGATION ════════ */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={() => handleTabChange('obligations')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
        </Button>
        <Button
          type="button"
          className="h-10 rounded-xl"
          onClick={() => handleNextTab('market-value', 'review')}
        >
          Suivant <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default MarketValueTab;
