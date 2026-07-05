/**
 * Constants et helpers purs extraits de MarketValueTab.tsx (modularisation P1).
 * Aucune logique React ici — utilisables depuis le tab ou de futurs sous-blocs.
 */
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';
import type { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';

export const SOUND_ENV_LABELS: Record<string, string> = {
  tres_calme: 'Très calme',
  calme: 'Calme',
  modere: 'Modéré',
  bruyant: 'Bruyant',
  tres_bruyant: 'Très bruyant',
};

export const LEASE_TYPE_LABELS: Record<string, string> = {
  meuble: 'Meublé',
  non_meuble: 'Non meublé',
  court_sejour: 'Court séjour',
  bureau: 'Bureau / professionnel',
};

export const CONTACT_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
  email: 'Email',
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

export const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/cadastral-documents/';

/** Extrait le path Storage d'une URL publique Supabase, ou null si non reconnu. */
export const pathFromPublicUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const i = url.indexOf(STORAGE_PUBLIC_MARKER);
  if (i === -1) return null;
  return url.slice(i + STORAGE_PUBLIC_MARKER.length).split('?')[0] || null;
};

/** Bornes de dates pour les champs de date de disponibilité / expertise (±6 mois). */
export const MIN_DATE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
})();
export const TODAY = new Date().toISOString().slice(0, 10);

/** Formate un montant en USD selon la locale FR. */
export const fmtUSD = (n?: number): string =>
  `${(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD`;

/** Récupère un libellé contextuel pour un bien. */
export const subjectFor = (cat?: string, type?: string): string => {
  const c = (cat || '').trim();
  const t = (type || '').trim();
  return c || t || 'bien';
};

export const pluralizeSubject = (subject: string, count: number): string => {
  const base = subject.toLowerCase();
  if (count <= 1) return base;
  if (base.endsWith('s')) return base;
  return `${base}s`;
};

export type VacantTarget = {
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

/** Construit la liste des locaux vacants dans les constructions louées. */
export const buildVacantTargets = (
  formData: CadastralContributionData,
  additional: AdditionalConstruction[],
): VacantTarget[] => {
  const out: VacantTarget[] = [];
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
