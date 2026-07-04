import React, { useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, DollarSign, FileText, Home, Building2, AlertCircle, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import StorageFileUpload from '@/components/shared/StorageFileUpload';
import { InputWithPopover } from '@/components/cadastral/InputWithPopover';
import { useCurrencyConfig, type CurrencyCode } from '@/hooks/useCurrencyConfig';

import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import type { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';

const SOUND_ENV_LABELS: Record<string, string> = {
  tres_calme: 'Très calme',
  calme: 'Calme',
  modere: 'Modéré',
  bruyant: 'Bruyant',
  tres_bruyant: 'Très bruyant',
};

export interface MarketListingEntry {
  constructionRef: string; // 'main' | 'additional:<idx>' | 'additional:<idx>:unit:<i>'
  unitLabel?: string;
  listForRent: boolean;
  targetRentUsd?: number;
  availableFrom?: string;
  coverImageUrls?: string[];
  coverImageMainUrl?: string;
  rentCurrency?: 'USD' | 'CDF';
  rentAmount?: number;
  depositMonths?: number;
  minLeaseMonths?: number;
  leaseType?: 'meuble' | 'non_meuble' | 'court_sejour' | 'bureau';
  chargesIncluded?: {
    water?: boolean;
    electricity?: boolean;
    security?: boolean;
    waste?: boolean;
    internet?: boolean;
  };
  description?: string;
  contactChannel?: 'whatsapp' | 'phone' | 'email';
  contactValue?: string;
  visitSlots?: string;
}

const LEASE_TYPE_LABELS: Record<string, string> = {
  meuble: 'Meublé',
  non_meuble: 'Non meublé',
  court_sejour: 'Court séjour',
  bureau: 'Bureau / professionnel',
};

const CONTACT_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
  email: 'Email',
};


interface MarketValueTabProps {
  formData: CadastralContributionData;
  handleInputChange: (field: keyof CadastralContributionData, value: any) => void;
  additionalConstructions: AdditionalConstruction[];
  handleTabChange: (tab: string) => void;
  handleNextTab: (current: string, next: string) => void;
  highlightRequiredFields?: boolean;
  trackUploadedPath?: (path: string) => void;
  removeUploadedPath?: (path: string) => Promise<void>;
}

const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/cadastral-documents/';
const pathFromPublicUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const i = url.indexOf(STORAGE_PUBLIC_MARKER);
  if (i === -1) return null;
  return url.slice(i + STORAGE_PUBLIC_MARKER.length).split('?')[0] || null;
};

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
    constructionYear?: number;
    soundEnvironment?: string;
  };
  const out: Target[] = [];
  const sharedSound = formData.soundEnvironment;

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
    constructionYear: number | undefined,
    suffix: string,
  ) => {
    if (declaredUsage !== 'Location') return;
    const subj = subjectFor(cat, type);
    if (rentalConfiguration === 'multi' && Array.isArray(rentalUnits) && rentalUnits.length > 0) {
      rentalUnits.forEach((u, i) => {
        if (u?.isOccupied !== false) return;
        const floorLbl = u?.floor === 'RDC' ? 'RDC' : (u?.floor ? `${u.floor}e étage` : undefined);
        const cy = Number(constructionYear) || Number(formData.constructionYear) || undefined;
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
          constructionYear: cy,
          soundEnvironment: sharedSound || undefined,
        });
      });
    } else {
      if (isOccupied !== false) return;
      const cy = Number(constructionYear) || Number(formData.constructionYear) || undefined;
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
        constructionYear: cy,
        soundEnvironment: sharedSound || undefined,
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
    formData.constructionYear,
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
      c.constructionYear,
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
  trackUploadedPath,
  removeUploadedPath,
}) => {
  const { currencies, convertFromUsd } = useCurrencyConfig();
  const dropImage = useCallback((url?: string | null) => {
    const p = pathFromPublicUrl(url);
    if (p && removeUploadedPath) void removeUploadedPath(p);
  }, [removeUploadedPath]);
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
      const rate = currencies.find(c => c.currency_code === cur)?.exchange_rate_to_usd ?? cdfRate;
      return rate > 0 ? Number(amount) / rate : undefined;
    },
    [currencies, cdfRate],
  );

  const equivalent = (amount: number | undefined, currency: CurrencyCode | undefined): string => {
    if (!amount || !currency) return '';
    if (currency === 'USD') {
      const cdf = convertFromUsd(amount, 'CDF');
      return `≈ ${cdf.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CDF`;
    }
    const usd = toUsd(amount, currency) ?? 0;
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
      // C8 — purge annonce vente si l'utilisateur repasse à Non
      handleInputChange('saleListing', undefined);
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
  // C3 — deps ciblées (évite recomputation à chaque frappe)
  const vacantTargets = useMemo(
    () => buildVacantTargets(formData, additionalConstructions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      formData.declaredUsage, formData.propertyCategory, formData.constructionType,
      formData.constructionNature, formData.constructionMaterials, formData.standing,
      formData.isOccupied, formData.hostingCapacity, formData.rentalConfiguration,
      formData.monthlyRentUsd, formData.rentalUnits, formData.constructionYear,
      formData.soundEnvironment,
      additionalConstructions,
    ],
  );

  const listings = useMemo<MarketListingEntry[]>(
    () => Array.isArray(formData.marketListings) ? formData.marketListings as MarketListingEntry[] : [],
    [formData.marketListings],
  );

  const updateListing = (ref: string, patch: Partial<MarketListingEntry>, defaults: Partial<MarketListingEntry>) => {
    const next = [...listings];
    const idx = next.findIndex(l => l.constructionRef === ref);
    if (idx >= 0) {
      // C5 — si listForRent bascule à false, purger les données annonce
      if (patch.listForRent === false) {
        next[idx] = { constructionRef: ref, unitLabel: next[idx].unitLabel, listForRent: false } as MarketListingEntry;
      } else {
        next[idx] = { ...next[idx], ...patch };
      }
    } else {
      next.push({ constructionRef: ref, listForRent: false, ...defaults, ...patch } as MarketListingEntry);
    }
    handleInputChange('marketListings', next);
  };

  const findListing = (ref: string) => listings.find(l => l.constructionRef === ref);

  // C1/C2 — Recalcul USD si devise, montant ou cdfRate changent
  useEffect(() => {
    // Resale
    if (resaleAmount !== undefined && resaleCurrency) {
      const usd = toUsd(resaleAmount, resaleCurrency);
      if (usd !== formData.resalePriceUsd) handleInputChange('resalePriceUsd', usd);
    }
    // Appraisal
    if (appraisedAmount !== undefined && appraisedCurrency) {
      const usd = toUsd(appraisedAmount, appraisedCurrency);
      if (usd !== formData.appraisedValueUsd) handleInputChange('appraisedValueUsd', usd);
    }
    // Loyers cibles des locaux proposés
    if (Array.isArray(listings) && listings.length > 0) {
      let mutated = false;
      const next = listings.map(l => {
        if (!l?.listForRent) return l;
        if (l.rentAmount === undefined || l.rentAmount === null) return l;
        const usd = toUsd(Number(l.rentAmount), (l.rentCurrency || 'USD') as CurrencyCode);
        if (usd !== l.targetRentUsd) { mutated = true; return { ...l, targetRentUsd: usd }; }
        return l;
      });
      if (mutated) handleInputChange('marketListings', next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdfRate]);

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
                  <InputWithPopover
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Montant"
                    value={resaleAmount ?? ''}
                    onChange={(e) => setResaleAmount(e.target.value)}
                    triggerImmediately
                    helpTitle="Comment estimer la valeur marchande ?"
                    helpText="Pour estimer un prix réaliste, comparez votre parcelle (vide ou bâtie) aux 3 biens voisins les plus similaires (emplacement, mise en valeur, dimensions) qui ont été récemment vendus, puis calculez la moyenne de leurs prix. Cette moyenne vous donne la valeur marchande minimale à laquelle vous pouvez raisonnablement vendre."
                    className={cn(
                      "flex-1 h-11 rounded-xl",
                      missingResaleAmount && "ring-2 ring-destructive border-destructive",
                    )}
                  />
                </div>
                {resaleAmount && resaleAmount > 0 && (
                  <p className="text-xs text-muted-foreground">{equivalent(resaleAmount, resaleCurrency)}</p>
                )}

                {/* ─── Annonce de vente ─── */}
                {(() => {
                  const sale = formData.saleListing || {};
                  const saleImages = Array.isArray(sale.coverImageUrls) ? sale.coverImageUrls.filter(Boolean) : [];
                  const saleMain = sale.coverImageMainUrl && saleImages.includes(sale.coverImageMainUrl) ? sale.coverImageMainUrl : saleImages[0];
                  const missingSaleImages = highlightRequiredFields && saleImages.length < 1;
                  const canAddSale = saleImages.length < 10;
                  const saleDesc = sale.description || '';
                  const saleTooLong = saleDesc.length > 500;
                  const updateSale = (patch: Partial<NonNullable<CadastralContributionData['saleListing']>>) => {
                    handleInputChange('saleListing', { ...sale, ...patch });
                  };
                  return (
                    <div className="space-y-3 pt-2 mt-2 border-t border-border animate-fade-in">
                      <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Home className="h-3.5 w-3.5 text-primary" /> Détails de l'annonce de vente
                      </Label>

                      {/* Images parcelle */}
                      <div className={cn(
                        "space-y-2 rounded-xl border p-2.5",
                        missingSaleImages ? "border-destructive ring-1 ring-destructive/30 bg-destructive/5" : "border-border bg-background",
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                            <ImagePlus className="h-3.5 w-3.5 text-primary" />
                            Photos de la parcelle <span className="text-destructive">*</span>
                          </Label>
                          <span className="text-[10px] text-muted-foreground">{saleImages.length}/10</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          1 à 10 photos · JPG/PNG/WebP · 5 Mo max · au moins 1 obligatoire. Cliquez sur ⭐ pour la photo principale.
                        </p>
                        {saleImages.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {saleImages.map((url, i) => {
                              const isMain = url === saleMain;
                              return (
                                <div key={`${url}-${i}`} className={cn("relative group aspect-square rounded-lg overflow-hidden border bg-muted", isMain ? "border-primary ring-2 ring-primary" : "border-border")}>
                                  <img src={url} alt={`Parcelle - photo ${i + 1}`} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => updateSale({ coverImageMainUrl: url })} className={cn("absolute top-1 left-1 h-6 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-medium shadow", isMain ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground hover:bg-primary/20")}>
                                    {isMain ? '⭐ Principale' : '⭐'}
                                  </button>
                                  <button type="button" aria-label="Supprimer" onClick={() => {
                                    const next = saleImages.filter((_, k) => k !== i);
                                    const patch: any = { coverImageUrls: next };
                                    if (isMain) patch.coverImageMainUrl = next[0];
                                    updateSale(patch);
                                  }} className="absolute top-1 right-1 h-6 w-6 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-90 hover:opacity-100 shadow">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {canAddSale ? (
                          <StorageFileUpload
                            key={`upl-sale-${saleImages.length}`}
                            bucket="cadastral-documents"
                            value={null}
                            onChange={(url) => {
                              if (!url) return;
                              if (saleImages.includes(url)) { toast.info('Image déjà ajoutée.'); return; }
                              const next = [...saleImages, url];
                              const patch: any = { coverImageUrls: next };
                              if (!saleMain) patch.coverImageMainUrl = url;
                              updateSale(patch);
                            }}

                            accept="image/jpeg,image/png,image/webp"
                            isPublic={true}
                            label="Ajouter une image"
                            maxSizeMB={5}
                            pathPrefix="sale-listings"
                          />
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Maximum 10 images atteint.</p>
                        )}
                        {missingSaleImages && (
                          <p className="text-[11px] text-destructive">Au moins une image de la parcelle est requise.</p>
                        )}
                      </div>

                      {/* Modalités de prix */}
                      <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                        <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Modalités de prix</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-foreground">Prix</Label>
                            <Select value={sale.priceNegotiable === undefined ? '' : (sale.priceNegotiable ? 'negotiable' : 'firm')} onValueChange={(v) => updateSale({ priceNegotiable: v === 'negotiable' })}>
                              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Ferme / Négociable" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="firm">Prix ferme</SelectItem>
                                <SelectItem value="negotiable">Négociable</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-foreground">Modalités de paiement <span className="text-destructive">*</span></Label>
                            <Select value={sale.paymentTerms || ''} onValueChange={(v) => updateSale({ paymentTerms: v as any })}>
                              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="installments">Échelonné</SelectItem>
                                <SelectItem value="both">Cash ou échelonné</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Disponibilité */}
                      <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                        <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Disponibilité</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-foreground">Disponible <span className="text-destructive">*</span></Label>
                            <Select value={sale.availability || ''} onValueChange={(v) => updateSale({ availability: v as any })}>
                              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">Immédiatement</SelectItem>
                                <SelectItem value="conditional">Sous conditions</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {sale.availability === 'conditional' && (
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium text-foreground">Précisions</Label>
                              <Input
                                type="text" placeholder="Ex. après récolte 2026"
                                value={sale.availabilityNote || ''}
                                onChange={(e) => updateSale({ availabilityNote: e.target.value || undefined })}
                                className="h-10 rounded-xl text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description & contact */}
                      <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                        <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Description & contact</Label>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-foreground">Description (500 caractères max)</Label>
                          <Textarea
                            rows={3} maxLength={500}
                            placeholder="Atouts de la parcelle : accès, voisinage, projets autour, raison de la vente…"
                            value={saleDesc}
                            onChange={(e) => updateSale({ description: e.target.value })}
                            className={cn("rounded-xl text-sm", saleTooLong && "ring-2 ring-destructive border-destructive")}
                          />
                          <p className="text-[10px] text-muted-foreground text-right">{saleDesc.length}/500</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-foreground">Canal de contact préféré</Label>
                            <Select value={sale.contactChannel || ''} onValueChange={(v) => {
                              const patch: any = { contactChannel: v as any };
                              if (v === 'whatsapp' && !sale.contactValue && formData.whatsappNumber) {
                                patch.contactValue = formData.whatsappNumber;
                              }
                              updateSale(patch);
                            }}>

                              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(CONTACT_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-foreground">Coordonnée</Label>
                            <Input
                              type="text"
                              placeholder={sale.contactChannel === 'email' ? 'email@exemple.com' : '+243 …'}
                              value={sale.contactValue || ''}
                              onChange={(e) => updateSale({ contactValue: e.target.value || undefined })}
                              className="h-10 rounded-xl text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-foreground">Créneaux de visite (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Ex. Lun-Ven 9h-17h, Sam matin"
                            value={sale.visitSlots || ''}
                            onChange={(e) => updateSale({ visitSlots: e.target.value || undefined })}
                            className="h-10 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                              {t.floor ? <span>Étage : {t.floor === 'RDC' ? 'RDC' : `${t.floor}e`}</span> : null}
                              {t.constructionType ? <span>Type : {t.constructionType}</span> : null}
                              {t.constructionNature ? <span>Nature : {t.constructionNature}</span> : null}
                              {t.constructionMaterials ? <span>Matériaux : {t.constructionMaterials}</span> : null}
                              {t.standing ? <span>Standing : {t.standing}</span> : null}
                              {t.constructionYear ? (
                                <span>Année : {t.constructionYear}</span>
                              ) : (
                                <button type="button" onClick={() => handleTabChange('general')} className="text-amber-700 dark:text-amber-300 hover:underline">
                                  Année : — compléter dans Infos
                                </button>
                              )}
                              {t.soundEnvironment ? (
                                <span>Environnement sonore : {SOUND_ENV_LABELS[t.soundEnvironment] || t.soundEnvironment}</span>
                              ) : (
                                <button type="button" onClick={() => handleTabChange('location')} className="text-amber-700 dark:text-amber-300 hover:underline">
                                  Environnement sonore : — compléter dans Localisation
                                </button>
                              )}
                            </div>

                            {checked && (() => {
                              const images = Array.isArray(entry?.coverImageUrls) ? entry!.coverImageUrls!.filter(Boolean) : [];
                              const mainUrl = entry?.coverImageMainUrl && images.includes(entry.coverImageMainUrl) ? entry.coverImageMainUrl : images[0];
                              const missingImages = highlightRequiredFields && images.length < 1;
                              const canAdd = images.length < 10;
                              const charges = entry?.chargesIncluded || {};
                              const rentCur = entry?.rentCurrency || 'USD';
                              const desc = entry?.description || '';
                              const tooLong = desc.length > 500;
                              return (
                                <div className="space-y-3 pt-1 animate-fade-in">
                                  {/* Loyer & caution */}
                                  <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                                    <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Loyer & caution</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Loyer mensuel souhaité</Label>
                                        <div className="flex gap-2">
                                          <Select value={rentCur} onValueChange={(v) => updateListing(t.ref, { rentCurrency: v as 'USD' | 'CDF' }, { unitLabel: t.label })}>
                                            <SelectTrigger className="w-20 h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="USD">USD</SelectItem>
                                              <SelectItem value="CDF">CDF</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            type="number" inputMode="decimal" min={0} step="any" placeholder="Montant"
                                            value={entry?.rentAmount ?? ''}
                                            onChange={(e) => {
                                              const n = e.target.value === '' ? undefined : Number(e.target.value);
                                              const usd = n === undefined ? undefined : (rentCur === 'USD' ? n : n / cdfRate);
                                              updateListing(t.ref, { rentAmount: n, targetRentUsd: usd }, { unitLabel: t.label });
                                            }}
                                            className="flex-1 h-10 rounded-xl text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Caution (mois de loyer)</Label>
                                        <Input
                                          type="number" inputMode="numeric" min={0} max={12} step="1" placeholder="Ex. 2"
                                          value={entry?.depositMonths ?? ''}
                                          onChange={(e) => updateListing(t.ref, { depositMonths: e.target.value === '' ? undefined : Number(e.target.value) }, { unitLabel: t.label })}
                                          className="h-10 rounded-xl text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Disponibilité & bail */}
                                  <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                                    <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Disponibilité & type de bail</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Libre à partir du</Label>
                                        <Input
                                          type="date"
                                          value={entry?.availableFrom || ''}
                                          onChange={(e) => updateListing(t.ref, { availableFrom: e.target.value || undefined }, { unitLabel: t.label })}
                                          className="h-10 rounded-xl text-sm"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Bail min. (mois)</Label>
                                        <Input
                                          type="number" inputMode="numeric" min={1} max={120} step="1" placeholder="Ex. 12"
                                          value={entry?.minLeaseMonths ?? ''}
                                          onChange={(e) => updateListing(t.ref, { minLeaseMonths: e.target.value === '' ? undefined : Number(e.target.value) }, { unitLabel: t.label })}
                                          className="h-10 rounded-xl text-sm"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Type de location</Label>
                                        <Select value={entry?.leaseType || ''} onValueChange={(v) => updateListing(t.ref, { leaseType: v as any }, { unitLabel: t.label })}>
                                          <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(LEASE_TYPE_LABELS).map(([k, l]) => (
                                              <SelectItem key={k} value={k}>{l}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Charges incluses */}
                                  <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                                    <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Charges incluses dans le loyer</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {([
                                        ['water', 'Eau'],
                                        ['electricity', 'Électricité'],
                                        ['internet', 'Internet'],
                                        ['security', 'Gardiennage'],
                                        ['waste', 'Ordures'],
                                      ] as const).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs cursor-pointer">
                                          <Checkbox
                                            checked={!!(charges as any)[key]}
                                            onCheckedChange={(v) => updateListing(t.ref, { chargesIncluded: { ...charges, [key]: !!v } }, { unitLabel: t.label })}
                                          />
                                          <span>{label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Images de couverture */}
                                  <div className={cn(
                                    "space-y-2 rounded-xl border p-2.5",
                                    missingImages ? "border-destructive ring-1 ring-destructive/30 bg-destructive/5" : "border-border bg-background",
                                  )}>
                                    <div className="flex items-center justify-between gap-2">
                                      <Label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                                        <ImagePlus className="h-3.5 w-3.5 text-primary" />
                                        Images de couverture pour l'annonce
                                        <span className="text-destructive">*</span>
                                      </Label>
                                      <span className="text-[10px] text-muted-foreground">{images.length}/10</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      Jusqu'à 10 photos · JPG/PNG/WebP · 5 Mo max · au moins 1 obligatoire. Cliquez sur ⭐ pour marquer la photo principale.
                                    </p>

                                    {images.length > 0 && (
                                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {images.map((url, imgIdx) => {
                                          const isMain = url === mainUrl;
                                          return (
                                            <div key={`${url}-${imgIdx}`} className={cn("relative group aspect-square rounded-lg overflow-hidden border bg-muted", isMain ? "border-primary ring-2 ring-primary" : "border-border")}>
                                              <img src={url} alt={`Local ${t.label} - photo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                              <button
                                                type="button"
                                                aria-label={isMain ? "Photo principale" : "Définir comme photo principale"}
                                                onClick={() => updateListing(t.ref, { coverImageMainUrl: url }, { unitLabel: t.label })}
                                                className={cn("absolute top-1 left-1 h-6 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-medium shadow", isMain ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground hover:bg-primary/20")}
                                              >
                                                {isMain ? '⭐ Principale' : '⭐'}
                                              </button>
                                              <button
                                                type="button"
                                                aria-label="Supprimer cette image"
                                                onClick={() => {
                                                  const next = images.filter((_, i) => i !== imgIdx);
                                                  const patch: Partial<MarketListingEntry> = { coverImageUrls: next };
                                                  if (isMain) patch.coverImageMainUrl = next[0];
                                                  updateListing(t.ref, patch, { unitLabel: t.label });
                                                }}
                                                className="absolute top-1 right-1 h-6 w-6 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-90 hover:opacity-100 shadow"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {canAdd ? (
                                      <StorageFileUpload
                                        key={`upl-${t.ref}-${images.length}`}
                                        bucket="cadastral-documents"
                                        value={null}
                                        onChange={(url) => {
                                          if (!url) return;
                                          if (images.includes(url)) { toast.info('Image déjà ajoutée.'); return; }
                                          const next = [...images, url];
                                          const patch: Partial<MarketListingEntry> = { coverImageUrls: next };
                                          if (!mainUrl) patch.coverImageMainUrl = url;
                                          updateListing(t.ref, patch, { unitLabel: t.label });
                                        }}

                                        accept="image/jpeg,image/png,image/webp"
                                        isPublic={true}
                                        label="Ajouter une image"
                                        maxSizeMB={5}
                                        pathPrefix="market-listings"
                                      />
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground italic">Maximum 10 images atteint.</p>
                                    )}

                                    {missingImages && (
                                      <p className="text-[11px] text-destructive">Au moins une image de couverture est requise.</p>
                                    )}
                                  </div>

                                  {/* Description & contact */}
                                  <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                                    <Label className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Description & contact</Label>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-medium text-foreground">Description de l'annonce (500 caractères max)</Label>
                                      <Textarea
                                        rows={3}
                                        maxLength={500}
                                        placeholder="Décrivez les atouts du local : lumière, vue, voisinage, équipements, accès…"
                                        value={desc}
                                        onChange={(e) => updateListing(t.ref, { description: e.target.value }, { unitLabel: t.label })}
                                        className={cn("rounded-xl text-sm", tooLong && "ring-2 ring-destructive border-destructive")}
                                      />
                                      <p className="text-[10px] text-muted-foreground text-right">{desc.length}/500</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Canal de contact préféré</Label>
                                       <Select value={entry?.contactChannel || ''} onValueChange={(v) => {
                                          const patch: Partial<MarketListingEntry> = { contactChannel: v as any };
                                          if (v === 'whatsapp' && !entry?.contactValue && formData.whatsappNumber) {
                                            patch.contactValue = formData.whatsappNumber;
                                          }
                                          updateListing(t.ref, patch, { unitLabel: t.label });
                                        }}>

                                          <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(CONTACT_LABELS).map(([k, l]) => (
                                              <SelectItem key={k} value={k}>{l}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-foreground">Coordonnée ({CONTACT_LABELS[entry?.contactChannel || 'phone'] || 'contact'})</Label>
                                        <Input
                                          type="text"
                                          placeholder={entry?.contactChannel === 'email' ? 'email@exemple.com' : '+243 …'}
                                          value={entry?.contactValue || ''}
                                          onChange={(e) => updateListing(t.ref, { contactValue: e.target.value || undefined }, { unitLabel: t.label })}
                                          className="h-10 rounded-xl text-sm"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-medium text-foreground">Créneaux de visite (optionnel)</Label>
                                      <Input
                                        type="text"
                                        placeholder="Ex. Lun-Ven 9h-17h, Sam matin"
                                        value={entry?.visitSlots || ''}
                                        onChange={(e) => updateListing(t.ref, { visitSlots: e.target.value || undefined }, { unitLabel: t.label })}
                                        className="h-10 rounded-xl text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
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
          onClick={() => {
            const incomplete = listings.find((l: any) => {
              if (!l?.listForRent) return false;
              const imgs = Array.isArray(l.coverImageUrls) ? l.coverImageUrls.filter(Boolean) : [];
              return imgs.length < 1;
            });
            if (incomplete) {
              toast.error("Ajoutez au moins une image de couverture pour chaque local proposé à la location.");
              return;
            }
            if (wouldSell === true) {
              const sale = formData.saleListing || {};
              const saleImgs = Array.isArray(sale.coverImageUrls) ? sale.coverImageUrls.filter(Boolean) : [];
              if (saleImgs.length < 1) {
                toast.error("Ajoutez au moins une photo de la parcelle pour l'annonce de vente.");
                return;
              }
              if (!sale.paymentTerms || !sale.availability) {
                toast.error("Renseignez les modalités de paiement et la disponibilité de la parcelle.");
                return;
              }
            }
            const tooLongDesc = (listings as any[]).find(l => (l?.description || '').length > 500);
            if (tooLongDesc) {
              toast.error("Une description de local dépasse 500 caractères.");
              return;
            }
            handleNextTab('market-value', 'review');
          }}
        >
          Suivant <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default MarketValueTab;
