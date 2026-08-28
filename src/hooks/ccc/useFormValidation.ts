import { isConstructionRented, isNonResidentialCategory } from '@/utils/rentalStatus';
import { useMemo, useCallback } from 'react';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { CurrentOwner, BuildingPermit } from '@/components/cadastral/ccc-tabs/GeneralTab';
import { PreviousOwner } from '@/components/cadastral/ccc-tabs/HistoryTab';
import { TaxRecord, MortgageRecord } from '@/components/cadastral/ccc-tabs/ObligationsTab';
import { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';
import { normalizeConstructionNature } from '@/utils/constructionNatureNormalizer';
import { isTerrainNuCategory, isUnbuiltLand, computeParcelNumberRequired } from '@/utils/cccPredicates';
import { buildVacantTargets } from '@/components/cadastral/ccc-tabs/market-value/marketValueUtils';

export type MissingField = { field: string; label: string; tab: string };

export interface UseFormValidationParams {
  formData: CadastralContributionData;
  customTitleName: string;
  currentOwners: CurrentOwner[];
  previousOwners: PreviousOwner[];
  sectionType: 'urbaine' | 'rurale' | '';
  permitMode: 'existing' | 'request' | null;
  buildingPermits: BuildingPermit[];
  parcelSides: Array<{ name: string; length: string }>;
  taxRecords: TaxRecord[];
  hasMortgage: boolean | null;
  hasDispute: boolean | null;
  mortgageRecords: MortgageRecord[];
  ownerDocFile: File | null;
  titleDocFiles: File[];
  editingContributionId?: string;
  roadSides: any[];
  servitude: { hasServitude: boolean; width?: number };
  buildingShapes: any[];
  constructionMode: 'unique' | 'multiple';
  additionalConstructions: AdditionalConstruction[];
  soundEnvironment: string;
  nearbySoundSources: string;
  /** Données du formulaire de litige (requises quand hasDispute === true). */
  disputeFormData?: any;
  /**
   * Le n° SU/SR est-il demandé ? Calculé en amont (origine de la recherche
   * cadastrale incluse) pour rester aligné avec l'affichage du champ.
   */
  parcelNumberRequired?: boolean;
}

const TAB_ORDER = ['general', 'location', 'history', 'obligations', 'market-value', 'review'];

/**
 * Parse sûr d'une date de formulaire : renvoie null pour une valeur vide,
 * non-chaîne ou invalide. Évite les comparaisons silencieusement fausses
 * (`new Date('')` produit un Invalid Date dont toute comparaison est `false`).
 */
const safeDate = (value?: string | null): Date | null => {
  if (!value || typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Comparaison sûre : `true` seulement si les deux dates sont valides et a < b. */
const isBefore = (a?: string | null, b?: string | null): boolean => {
  const da = safeDate(a); const db = safeDate(b);
  return !!da && !!db && da.getTime() < db.getTime();
};

/** Comparaison sûre : `true` seulement si les deux dates sont valides et a > b. */
const isAfter = (a?: string | null, b?: string | null): boolean => {
  const da = safeDate(a); const db = safeDate(b);
  return !!da && !!db && da.getTime() > db.getTime();
};

/** `true` si la date est valide et antérieure au 01/01/`year`. */
const isBeforeConstructionYear = (value: string | undefined, year?: number): boolean => {
  const d = safeDate(value);
  if (!d || !year) return false;
  return d.getTime() < new Date(year, 0, 1).getTime();
};

export function useFormValidation(params: UseFormValidationParams) {
  const {
    formData, customTitleName, currentOwners, previousOwners, sectionType,
    permitMode, buildingPermits, parcelSides, taxRecords, hasMortgage, hasDispute,
    mortgageRecords, ownerDocFile, titleDocFiles, editingContributionId,
    roadSides, servitude, buildingShapes, constructionMode, additionalConstructions,
    soundEnvironment, nearbySoundSources, disputeFormData, parcelNumberRequired: parcelNumberRequiredParam,
  } = params;

  const missingFieldsList = useMemo<MissingField[]>(() => {
    const missing: MissingField[] = [];
    const isTerrainNu = isTerrainNuCategory(formData);
    const isAppartement = formData.propertyCategory === 'Appartement';
    // Catégorie non résidentielle (Local commercial, Entrepôt/Hangar) :
    // la capacité d'accueil et l'occupation ne sont pas pertinentes.
    const isNonResidential = isNonResidentialCategory(formData.propertyCategory);

    // GENERAL
    if (!formData.propertyTitleType || formData.propertyTitleType.trim() === '') missing.push({ field: 'propertyTitleType', label: 'Type de titre de propriété', tab: 'general' });
    if (formData.propertyTitleType === 'Autre' && (!customTitleName || customTitleName.trim() === '')) missing.push({ field: 'customTitleName', label: 'Nom du titre de propriété (Autre)', tab: 'general' });
    if (formData.titleReferenceNumber && formData.titleReferenceNumber.trim() !== '' && formData.isTitleInCurrentOwnerName === undefined) missing.push({ field: 'isTitleInCurrentOwnerName', label: 'Ce titre est-il au nom du propriétaire actuel ?', tab: 'general' });
    if (!ownerDocFile && !(editingContributionId && formData.ownerDocumentUrl)) missing.push({ field: 'ownerDocFile', label: 'Pièce jointe du propriétaire', tab: 'general' });
    if (titleDocFiles.length === 0 && !(editingContributionId && formData.titleDocumentUrl)) missing.push({ field: 'titleDocFiles', label: 'Pièce jointe du titre de propriété', tab: 'general' });

    const firstOwner = currentOwners[0];
    if (firstOwner?.legalStatus === 'Personne physique') {
      if (!firstOwner.lastName || firstOwner.lastName.trim() === '') missing.push({ field: 'ownerLastName', label: 'Nom du propriétaire', tab: 'general' });
      if (!firstOwner.firstName || firstOwner.firstName.trim() === '') missing.push({ field: 'ownerFirstName', label: 'Prénom du propriétaire', tab: 'general' });
      if (!firstOwner.gender) missing.push({ field: 'ownerGender', label: 'Sexe du propriétaire', tab: 'general' });
    } else if (firstOwner?.legalStatus === 'Personne morale') {
      if (!firstOwner.entityType) missing.push({ field: 'ownerEntityType', label: "Type d'entreprise du propriétaire", tab: 'general' });
    }
    if (!firstOwner?.since) missing.push({ field: 'ownerSince', label: 'Date "Propriétaire depuis"', tab: 'general' });
    if (!firstOwner?.nationality) missing.push({ field: 'ownerNationality', label: 'Nationalité du propriétaire', tab: 'general' });

    if (formData.isTitleInCurrentOwnerName === false && formData.titleIssueDate) {
      if (isBefore(firstOwner?.since, formData.titleIssueDate)) missing.push({ field: 'ownerSinceDate', label: 'Date "Propriétaire depuis" doit être ≥ date de délivrance', tab: 'general' });
    }
    if (formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate) {
      if (isBefore(firstOwner?.since, formData.titleIssueDate) && !firstOwner?.previousTitleType) {
        missing.push({ field: 'previousTitleType', label: 'Titre de propriété antérieur', tab: 'general' });
      }
      if (firstOwner?.previousTitleType === 'Autre' && !firstOwner.previousTitleCustomName?.trim()) {
        missing.push({ field: 'previousTitleCustomName', label: 'Nom du titre antérieur', tab: 'general' });
      }
      const firstPreviousOwner = previousOwners[0];
      if (isAfter(firstPreviousOwner?.startDate, formData.titleIssueDate)) missing.push({ field: 'previousOwnerStartDate', label: `Date début Ancien #1 doit être ≤ date de ${formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'}`, tab: 'history' });
    }

    // Numéro de parcelle : saisissable dans le bloc « Localisation de la parcelle ».
    // Non demandé pour « Fiche parcellaire » → le numéro du titre sert de référence.
    const parcelNum = (formData.parcelNumber || '').trim().toUpperCase();
    // Source de vérité unique : le drapeau calculé en amont (origine de recherche
    // incluse) ; repli local pour les usages sans paramètre.
    const parcelNumberRequired = parcelNumberRequiredParam ?? computeParcelNumberRequired(
      formData.propertyTitleType,
      parcelNum.length >= 3,
    );
    if (!parcelNumberRequired) {
      if (!formData.titleReferenceNumber?.trim()) {
        missing.push({ field: 'titleReferenceNumber', label: 'Numéro du titre (Fiche parcellaire)', tab: 'general' });
      }
    } else if (parcelNum.length < 3) {
      missing.push({ field: 'parcelNumber', label: 'Numéro de la parcelle (SU/SR)', tab: 'location' });
    }

    if (!formData.propertyCategory) missing.push({ field: 'propertyCategory', label: 'Catégorie de bien', tab: 'location' });
    if (!formData.constructionType) missing.push({ field: 'constructionType', label: 'Type de construction', tab: 'location' });
    if (!isTerrainNu && !formData.constructionNature) missing.push({ field: 'constructionNature', label: 'Nature de construction', tab: 'location' });
    if (!isTerrainNu && !formData.declaredUsage) missing.push({ field: 'declaredUsage', label: 'Usage déclaré', tab: 'location' });
    if (isConstructionRented(formData as any)) {
      // Date globale de mise en location : requise uniquement en mode « single »
      if (formData.rentalConfiguration === 'single') {
        if (!formData.rentalStartDate) {
          missing.push({ field: 'rentalStartDate', label: 'En location depuis quand ? (construction principale)', tab: 'location' });
        } else if (isBeforeConstructionYear(formData.rentalStartDate, formData.constructionYear)) {
          missing.push({ field: 'rentalStartDate', label: `Date de mise en location < 01/01/${formData.constructionYear}`, tab: 'location' });
        }
      }
      if (!formData.rentalConfiguration) {
        missing.push({ field: 'rentalConfiguration', label: 'Configuration locative (un seul local ou plusieurs locaux)', tab: 'location' });
      } else if (formData.rentalConfiguration === 'single') {
        if (!formData.monthlyRentUsd || Number(formData.monthlyRentUsd) <= 0) {
          missing.push({ field: 'monthlyRentUsd', label: 'Loyer mensuel actuel (USD)', tab: 'location' });
        }
        // Symétrie avec le mode multi : occupation et capacité sont requises
        // (non pertinent pour un terrain nu ni pour une catégorie non résidentielle)
        if (!isTerrainNu && !isNonResidential) {
          if (formData.isOccupied === undefined || formData.isOccupied === null) {
            missing.push({ field: 'isOccupied', label: "Statut d'occupation du local", tab: 'location' });
          }
          if (!formData.hostingCapacity || Number(formData.hostingCapacity) <= 0) {
            missing.push({ field: 'hostingCapacity', label: "Capacité d'accueil", tab: 'location' });
          }
          if (formData.isOccupied === true && (!formData.occupantCount || Number(formData.occupantCount) <= 0)) {
            missing.push({ field: 'occupantCount', label: 'Nombre de personnes qui y vivent', tab: 'location' });
          }
        }
      } else if (formData.rentalConfiguration === 'multi') {
        const count = Number(formData.rentalUnitsCount) || 0;
        if (count < 2) {
          missing.push({ field: 'rentalUnitsCount', label: 'Nombre de locaux mis en location (min. 2)', tab: 'location' });
        }
        const units = Array.isArray(formData.rentalUnits) ? formData.rentalUnits : [];
        if (units.length !== count) {
          missing.push({ field: 'rentalUnits', label: 'Locaux : nombre de saisies incohérent', tab: 'location' });
        }
        const showFloor = !isTerrainNu && formData.floorNumber ? parseInt(formData.floorNumber, 10) >= 1 : false;
        const unitWord = isTerrainNu ? 'Terrain' : 'Local';
        units.forEach((u: any, i: number) => {
          if (!u || !u.monthlyRentUsd || Number(u.monthlyRentUsd) <= 0) {
            missing.push({ field: `rentalUnit_${i}`, label: `Loyer mensuel du ${unitWord.toLowerCase()} #${i + 1}`, tab: 'location' });
          }
          if (!isTerrainNu) {
            if (!u || u.isOccupied === undefined || u.isOccupied === null) {
              missing.push({ field: `rentalUnitOccupied_${i}`, label: `${unitWord} #${i + 1} : statut d'occupation`, tab: 'location' });
            } else if (!u.hostingCapacity || Number(u.hostingCapacity) <= 0) {
              missing.push({ field: `rentalUnitCapacity_${i}`, label: `${unitWord} #${i + 1} : capacité d'accueil`, tab: 'location' });
            }
            if (u && u.isOccupied === true) {
              if (!u.occupantCount || Number(u.occupantCount) <= 0) {
                missing.push({ field: `rentalUnitOccupants_${i}`, label: `${unitWord} #${i + 1} : nombre de personnes qui y vivent`, tab: 'location' });
              }
            }
          }
          if (!u || !u.rentalStartDate) {
            missing.push({ field: `rentalUnitDate_${i}`, label: `${unitWord} #${i + 1} : date de mise en location`, tab: 'location' });
          } else if (isBeforeConstructionYear(u.rentalStartDate, formData.constructionYear)) {
            missing.push({ field: `rentalUnitDate_${i}`, label: `${unitWord} #${i + 1} : date < 01/01/${formData.constructionYear}`, tab: 'location' });
          }
          if (showFloor && (!u || !u.floor)) {
            missing.push({ field: `rentalUnitFloor_${i}`, label: `${unitWord} #${i + 1} : emplacement (étage)`, tab: 'location' });
          }
        });
      }
    }
    additionalConstructions.forEach((c, idx) => {
      const cIsTerrainNu =
        (c as any).propertyCategory === 'Terrain nu' || c.constructionType === 'Terrain nu';
      if (isConstructionRented(c as any)) {
        if (c.rentalConfiguration === 'single') {
          if (!c.rentalStartDate) {
            missing.push({ field: `additionalRentalStartDate_${idx}`, label: `En location depuis quand ? (construction #${idx + 2})`, tab: 'location' });
          } else if (isBeforeConstructionYear(c.rentalStartDate, Number(c.constructionYear) || undefined)) {
            missing.push({ field: `additionalRentalStartDate_${idx}`, label: `Date de mise en location < 01/01/${c.constructionYear} (construction #${idx + 2})`, tab: 'location' });
          }
        }
        if (!c.rentalConfiguration) {
          missing.push({ field: `additionalRentalConfig_${idx}`, label: `Configuration locative (construction #${idx + 2})`, tab: 'location' });
        } else if (c.rentalConfiguration === 'single') {
          if (!c.monthlyRentUsd || Number(c.monthlyRentUsd) <= 0) {
            missing.push({ field: `additionalMonthlyRent_${idx}`, label: `Loyer mensuel (construction #${idx + 2})`, tab: 'location' });
          }
          if (!cIsTerrainNu) {
            if ((c as any).isOccupied === undefined || (c as any).isOccupied === null) {
              missing.push({ field: `additionalIsOccupied_${idx}`, label: `Statut d'occupation (construction #${idx + 2})`, tab: 'location' });
            }
            if (!(c as any).hostingCapacity || Number((c as any).hostingCapacity) <= 0) {
              missing.push({ field: `additionalHostingCapacity_${idx}`, label: `Capacité d'accueil (construction #${idx + 2})`, tab: 'location' });
            }
            if ((c as any).isOccupied === true && (!(c as any).occupantCount || Number((c as any).occupantCount) <= 0)) {
              missing.push({ field: `additionalOccupantCount_${idx}`, label: `Nombre d'occupants (construction #${idx + 2})`, tab: 'location' });
            }
          }
        } else if (c.rentalConfiguration === 'multi') {
          const count = Number(c.rentalUnitsCount) || 0;
          const unitWord = cIsTerrainNu ? 'Terrain' : 'Local';
          if (count < 2) {
            missing.push({ field: `additionalRentalUnitsCount_${idx}`, label: `Nombre de ${cIsTerrainNu ? 'terrains' : 'locaux'} (construction #${idx + 2})`, tab: 'location' });
          }
          const units = Array.isArray(c.rentalUnits) ? c.rentalUnits : [];
          if (units.length !== count) {
            missing.push({ field: `additionalRentalUnits_${idx}`, label: `${unitWord}s : nombre incohérent (construction #${idx + 2})`, tab: 'location' });
          }
          const showFloor = !cIsTerrainNu && c.floorNumber ? parseInt(c.floorNumber, 10) >= 1 : false;
          units.forEach((u: any, i: number) => {
            if (!u || !u.monthlyRentUsd || Number(u.monthlyRentUsd) <= 0) {
              missing.push({ field: `additionalRentalUnit_${idx}_${i}`, label: `Loyer du ${unitWord.toLowerCase()} #${i + 1} (construction #${idx + 2})`, tab: 'location' });
            }
            if (!cIsTerrainNu) {
              if (!u || u.isOccupied === undefined || u.isOccupied === null) {
                missing.push({ field: `additionalRentalUnitOccupied_${idx}_${i}`, label: `${unitWord} #${i + 1} : occupation (construction #${idx + 2})`, tab: 'location' });
              } else if (!u.hostingCapacity || Number(u.hostingCapacity) <= 0) {
                missing.push({ field: `additionalRentalUnitCapacity_${idx}_${i}`, label: `${unitWord} #${i + 1} : capacité (construction #${idx + 2})`, tab: 'location' });
              }
              if (u && u.isOccupied === true) {
                if (!u.occupantCount || Number(u.occupantCount) <= 0) {
                  missing.push({ field: `additionalRentalUnitOccupants_${idx}_${i}`, label: `${unitWord} #${i + 1} : nombre d'occupants (construction #${idx + 2})`, tab: 'location' });
                }
              }
            }
            if (!u || !u.rentalStartDate) {
              missing.push({ field: `additionalRentalUnitDate_${idx}_${i}`, label: `${unitWord} #${i + 1} : date de mise en location (construction #${idx + 2})`, tab: 'location' });
            } else if (isBeforeConstructionYear(u.rentalStartDate, Number(c.constructionYear) || undefined)) {
              missing.push({ field: `additionalRentalUnitDate_${idx}_${i}`, label: `${unitWord} #${i + 1} : date < 01/01/${c.constructionYear} (construction #${idx + 2})`, tab: 'location' });
            }
            if (showFloor && (!u || !u.floor)) {
              missing.push({ field: `additionalRentalUnitFloor_${idx}_${i}`, label: `${unitWord} #${i + 1} : emplacement (construction #${idx + 2})`, tab: 'location' });
            }
          });

        }
      }
    });
    const normalizedNature = formData.constructionNature ? normalizeConstructionNature(formData.constructionNature) : '';
    const isPrecaireOrUnbuilt = normalizedNature === 'Précaire' || normalizedNature === 'Non bâti';
    // Un bien non bâti (terrain nu, terrain agricole) n'a ni matériaux, ni standing, ni année de construction.
    const isUnbuilt = isUnbuiltLand(formData);
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.constructionMaterials) missing.push({ field: 'constructionMaterials', label: 'Matériaux de construction', tab: 'location' });
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.standing) missing.push({ field: 'standing', label: 'Standing', tab: 'location' });
    if (!isUnbuilt && formData.propertyCategory && !formData.constructionYear) missing.push({ field: 'constructionYear', label: 'Année de construction', tab: 'location' });

    if (isAppartement) {
      if (!formData.apartmentNumber) missing.push({ field: 'apartmentNumber', label: "Numéro de l'appartement", tab: 'location' });
      if (!formData.floorNumber) missing.push({ field: 'floorNumber', label: "Numéro de l'étage", tab: 'location' });
    }

    // LOCATION
    if (!formData.province || formData.province.trim() === '') missing.push({ field: 'province', label: 'Province', tab: 'location' });
    if (!isAppartement && (!formData.areaSqm || Number(formData.areaSqm) <= 0)) missing.push({ field: 'areaSqm', label: 'Superficie (m²)', tab: 'location' });
    if (!sectionType || (sectionType !== 'urbaine' && sectionType !== 'rurale')) missing.push({ field: 'sectionType', label: 'Type de section (Urbaine/Rurale)', tab: 'location' });
    if (sectionType === 'urbaine') {
      if (!formData.ville || formData.ville.trim() === '') missing.push({ field: 'ville', label: 'Ville', tab: 'location' });
      if (!formData.commune || formData.commune.trim() === '') missing.push({ field: 'commune', label: 'Commune', tab: 'location' });
      if (!formData.quartier || formData.quartier.trim() === '') missing.push({ field: 'quartier', label: 'Quartier', tab: 'location' });
    } else if (sectionType === 'rurale') {
      if (!formData.territoire || formData.territoire.trim() === '') missing.push({ field: 'territoire', label: 'Territoire', tab: 'location' });
      if (!formData.collectivite || formData.collectivite.trim() === '') missing.push({ field: 'collectivite', label: 'Collectivité', tab: 'location' });
      if (!formData.groupement || formData.groupement.trim() === '') missing.push({ field: 'groupement', label: 'Groupement', tab: 'location' });
      if (!formData.village || formData.village.trim() === '') missing.push({ field: 'village', label: 'Village', tab: 'location' });
    }
    if (!isAppartement) {
      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
      if (filledSides.length < 3) missing.push({ field: 'parcelSides', label: 'Dimensions de la parcelle (au moins 3 côtés)', tab: 'location' });
    }
    if (isAppartement) {
      if (!formData.apartmentLength || formData.apartmentLength <= 0) missing.push({ field: 'apartmentLength', label: "Longueur de l'appartement", tab: 'location' });
      if (!formData.apartmentWidth || formData.apartmentWidth <= 0) missing.push({ field: 'apartmentWidth', label: "Largeur de l'appartement", tab: 'location' });
      if (!formData.apartmentOrientation) missing.push({ field: 'apartmentOrientation', label: "Orientation de l'appartement", tab: 'location' });
    }

    // LOCATION - BUILDING SHAPES
    if (!isUnbuilt && !isAppartement) {
      const expectedBuildingCount = constructionMode === 'multiple' ? 1 + additionalConstructions.length : 1;
      if (buildingShapes.length < expectedBuildingCount) {
        missing.push({ field: 'buildingShapes', label: `Tracés de construction dans le croquis (${buildingShapes.length}/${expectedBuildingCount})`, tab: 'location' });
      }
      const missingHeight = buildingShapes.some((s: any) => !s.heightM || s.heightM <= 0);
      if (buildingShapes.length > 0 && missingHeight) {
        missing.push({ field: 'buildingHeight', label: 'Hauteur de construction manquante', tab: 'location' });
      }
      const tooShort = buildingShapes.some((s: any) => s.heightM != null && s.heightM > 0 && s.heightM < 3);
      if (buildingShapes.length > 0 && tooShort) {
        missing.push({ field: 'buildingHeightMin', label: 'Hauteur de construction inférieure à 3 m (minimum requis)', tab: 'location' });
      }
    }

    // HISTORY
    const hasValidPreviousOwner = previousOwners.some(o => o.name && o.name.trim() !== '');
    if (!hasValidPreviousOwner) missing.push({ field: 'previousOwner', label: 'Historique de propriété (au moins un ancien propriétaire)', tab: 'history' });
    previousOwners.forEach((o, idx) => {
      if (!o.name || o.name.trim() === '') return;
      if (!o.startDate) {
        missing.push({ field: `previousOwnerStart_${idx}`, label: `Date de début de propriété — Ancien #${idx + 1}`, tab: 'history' });
      } else if (o.endDate && o.startDate > o.endDate) {
        missing.push({ field: `previousOwnerDates_${idx}`, label: `Dates incohérentes — Ancien #${idx + 1} (début après fin)`, tab: 'history' });
      }
      if (!o.mutationType) {
        missing.push({ field: `previousOwnerMutation_${idx}`, label: `Type de mutation — Ancien #${idx + 1}`, tab: 'history' });
      }
    });

    // OBLIGATIONS - TAXES
    const PAID_TAX_STATUSES = ['Payé', 'Payé partiellement'];
    taxRecords.forEach((tax, idx) => {
      const isDeclared = Boolean(tax.taxAmount && tax.taxYear);
      if (!isDeclared) return;
      const isPaid = PAID_TAX_STATUSES.includes(tax.paymentStatus);
      if (isPaid && !tax.receiptFile && !tax.existingReceiptUrl) {
        missing.push({ field: `taxReceipt_${idx}`, label: `Reçu de ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
      }
      if (isPaid && !tax.paymentDate) {
        missing.push({ field: `taxPaymentDate_${idx}`, label: `Date de paiement — ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
      }
      if (tax.paymentStatus === 'Payé partiellement') {
        const remaining = parseFloat(tax.remainingAmount || '');
        if (!tax.remainingAmount || Number.isNaN(remaining) || remaining <= 0) {
          missing.push({ field: `taxRemaining_${idx}`, label: `Montant restant à payer — ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
        }
      }
      if (parseFloat(tax.taxAmount) <= 0) {
        missing.push({ field: `taxAmount_${idx}`, label: `Montant invalide — ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
      }
      const duplicate = taxRecords.some((other, otherIdx) =>
        otherIdx !== idx &&
        other.taxType === tax.taxType &&
        other.taxYear === tax.taxYear &&
        (other.constructionRef || '') === (tax.constructionRef || '')
      );
      if (duplicate) {
        missing.push({ field: `taxDuplicate_${idx}`, label: `Doublon : ${tax.taxType} ${tax.taxYear} déclaré deux fois`, tab: 'obligations' });
      }
    });


    // OBLIGATIONS - IRL × Constructions en location
    const rentalRefs: string[] = [];
    const rentalLabels: Record<string, string> = {};
    if (isConstructionRented(formData as any)) {
      rentalRefs.push('main');
      rentalLabels['main'] = 'Construction principale';
    }
    additionalConstructions.forEach((c, idx) => {
      if (isConstructionRented(c as any)) {
        const ref = `additional:${idx}`;
        rentalRefs.push(ref);
        const parts = [c.propertyCategory || c.constructionType || 'Construction', c.constructionYear ? String(c.constructionYear) : null].filter(Boolean);
        rentalLabels[ref] = `Construction #${idx + 2} (${parts.join(', ')})`;
      }
    });

    if (rentalRefs.length > 0) {
      const irlRecords = taxRecords.filter(t => t.taxType === 'Impôt sur les revenus locatifs' && t.taxAmount && t.taxYear);
      const irlRefs = irlRecords.map(t => t.constructionRef).filter(Boolean) as string[];

      // La déclaration IRL est facultative : aucune erreur si elle est absente.


      const orphanRefs = irlRefs.filter(r => !rentalRefs.includes(r));
      orphanRefs.forEach(r => {
        missing.push({ field: `irlOrphan_${r}`, label: `IRL orphelin (la construction associée n'est plus en Location) — à supprimer`, tab: 'obligations' });
      });

      const unassignedCount = irlRecords.filter(t => !t.constructionRef).length;
      if (unassignedCount > 0) {
        missing.push({ field: 'irlUnassigned', label: `${unassignedCount} déclaration(s) IRL sans construction rattachée`, tab: 'obligations' });
      }

      const refCounts = irlRefs.reduce<Record<string, number>>((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
      Object.entries(refCounts).filter(([, n]) => n > 1).forEach(([r, n]) => {
        missing.push({ field: `irlDuplicate_${r}`, label: `${n} IRL déclarés pour la même construction (${rentalLabels[r] || r})`, tab: 'obligations' });
      });
    }

    // OBLIGATIONS - MORTGAGE
    if (hasMortgage === null) missing.push({ field: 'hasMortgage', label: 'Statut hypothécaire (Oui/Non)', tab: 'obligations' });
    if (hasMortgage === true) {
      const hasValidMortgage = mortgageRecords.some(m => m.mortgageAmount && m.creditorName);
      if (!hasValidMortgage) missing.push({ field: 'mortgageDetails', label: "Détails de l'hypothèque (montant et créancier)", tab: 'obligations' });
      mortgageRecords.forEach((m, idx) => {
        const isDeclared = Boolean(m.mortgageAmount || m.creditorName || m.contractDate);
        if (!isDeclared) return;
        if (!(parseFloat(m.mortgageAmount) > 0)) missing.push({ field: `mortgageAmount_${idx}`, label: `Montant de l'hypothèque #${idx + 1} (supérieur à 0)`, tab: 'obligations' });
        if (!(parseInt(m.duration, 10) > 0)) missing.push({ field: `mortgageDuration_${idx}`, label: `Durée en mois de l'hypothèque #${idx + 1}`, tab: 'obligations' });
        if (!m.creditorName || m.creditorName.trim() === '') missing.push({ field: `mortgageCreditor_${idx}`, label: `Créancier de l'hypothèque #${idx + 1}`, tab: 'obligations' });
        if (!m.contractDate) missing.push({ field: `mortgageContractDate_${idx}`, label: `Date du contrat de l'hypothèque #${idx + 1}`, tab: 'obligations' });
        if (m.mortgageAmount && m.creditorName && !m.receiptFile && !m.existingReceiptUrl) missing.push({ field: `mortgageReceipt_${idx}`, label: `Document hypothèque #${idx + 1}`, tab: 'obligations' });
      });
    }

    // OBLIGATIONS - DISPUTE
    if (hasDispute === null) missing.push({ field: 'hasDispute', label: 'Statut litige foncier (Oui/Non)', tab: 'obligations' });
    if (hasDispute === true && (!disputeFormData || Object.keys(disputeFormData || {}).length === 0)) {
      missing.push({ field: 'disputeData', label: 'Détails du litige foncier (formulaire de signalement)', tab: 'obligations' });
    }

    // LOCATION - ENTRANCE & SERVITUDE
    if (!isAppartement && roadSides.length > 0) {
      const hasEntrance = roadSides.some((s: any) => s.hasEntrance === true);
      if (!hasEntrance) missing.push({ field: 'parcelEntrance', label: "Entrée de la parcelle (cochez le côté ayant une porte d'accès)", tab: 'location' });

      const hasRoadSide = roadSides.some((s: any) => s.bordersRoad === true);
      if (!hasRoadSide && (!servitude.hasServitude || !servitude.width || servitude.width <= 0)) {
        missing.push({ field: 'servitudeWidth', label: "Largeur de la servitude de passage (aucune route ne borde la parcelle)", tab: 'location' });
      }
    }

    // PERMIT MODE MANDATORY
    if (!isTerrainNu && !isAppartement && permitMode === null) {
      missing.push({ field: 'permitMode', label: "Avez-vous obtenu une autorisation de bâtir ?", tab: 'location' });
    }

    // SOUND ENVIRONMENT
    if (!soundEnvironment || soundEnvironment.trim() === '') {
      missing.push({ field: 'soundEnvironment', label: 'Environnement sonore', tab: 'location' });
    }
    if (soundEnvironment && soundEnvironment !== 'tres_calme' && (!nearbySoundSources || nearbySoundSources.trim() === '')) {
      missing.push({ field: 'nearbySoundSources', label: 'Sources de bruit à proximité', tab: 'location' });
    }

    // BUILDING PERMITS
    if (!isTerrainNu && !isAppartement && permitMode === 'existing') {
      const hasValidExistingPermit = buildingPermits.some(permit => permit.permitNumber && permit.permitNumber.trim() !== '' && permit.issueDate && permit.issueDate.trim() !== '');
      if (!hasValidExistingPermit) missing.push({ field: 'buildingPermit', label: 'Informations du permis existant', tab: 'location' });
      buildingPermits.forEach((permit, idx) => {
        if (permit.permitNumber && permit.permitNumber.trim() !== '' && !permit.attachmentFile && !permit.existingAttachmentUrl) missing.push({ field: `permitAttachment_${idx}`, label: `Pièce jointe du permis #${idx + 1}`, tab: 'location' });
      });
      if (formData.constructionYear) {
        const invalidPermit = buildingPermits.find(permit => {
          if (!permit.issueDate) return false;
          const permitYear = new Date(permit.issueDate).getFullYear();
          if (permit.permitType === 'construction') return permitYear > formData.constructionYear! || permitYear < formData.constructionYear! - 3;
          else return permitYear < formData.constructionYear! || new Date(permit.issueDate) > new Date();
        });
        if (invalidPermit) {
          const msg = invalidPermit.permitType === 'construction'
            ? `Date de l'autorisation de bâtir doit être entre ${formData.constructionYear - 3} et ${formData.constructionYear}`
            : `Date de l'autorisation de régularisation doit être ≥ ${formData.constructionYear} et ≤ date actuelle`;
          missing.push({ field: 'permitIssueDate', label: msg, tab: 'location' });
        }
      }
    }

    // MARKET VALUE
    if (formData.wouldSellIfOffered === undefined || formData.wouldSellIfOffered === null) {
      missing.push({ field: 'wouldSellIfOffered', label: 'Disposition à vendre la parcelle (Oui/Non)', tab: 'market-value' });
    } else if (formData.wouldSellIfOffered === true) {
      const hasAmt = !!formData.resalePriceAmount && Number(formData.resalePriceAmount) > 0;
      const hasCur = !!formData.resalePriceCurrency;
      if (!hasAmt) {
        missing.push({ field: 'resalePriceAmount', label: 'Prix de revente proposé', tab: 'market-value' });
      }
      // Une devise sélectionnée sans montant est incohérente ; un montant sans devise explicite vaut USD.
      if (hasCur && !hasAmt) {
        missing.push({ field: 'resalePricePair', label: 'Indiquez à la fois la devise et le montant du prix de revente', tab: 'market-value' });
      }
      // L'onglet Valeur est un recueil d'avis : photos et disponibilité de
      // l'annonce restent facultatives et ne bloquent pas la soumission.
      const sale = formData.saleListing || {};
      if ((sale.description || '').length > 500) {
        missing.push({ field: 'saleListingDescription', label: "Description de la vente : 500 caractères max", tab: 'market-value' });
      }
      // Contact optionnel mais valide si renseigné
      if (sale.contactValue) {
        const v = sale.contactValue.trim();
        const okEmail = /.+@.+\..+/.test(v);
        const okPhone = /^\+?\d[\d\s\-]{6,}$/.test(v);
        if (sale.contactChannel === 'email' ? !okEmail : !okPhone) {
          missing.push({ field: 'saleListingContact', label: "Coordonnée de contact (annonce de vente) invalide", tab: 'market-value' });
        }
      }
    }
    if (formData.hasRecentAppraisal === undefined || formData.hasRecentAppraisal === null) {
      missing.push({ field: 'hasRecentAppraisal', label: 'Expertise immobilière récente (Oui/Non)', tab: 'market-value' });
    } else if (formData.hasRecentAppraisal === true) {
      if (!formData.appraisalDate) {
        missing.push({ field: 'appraisalDate', label: "Date de l'expertise immobilière", tab: 'market-value' });
      } else {
        // Fenêtre 6 mois cohérente avec la question posée
        const min = new Date(); min.setMonth(min.getMonth() - 6);
        const minStr = min.toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (formData.appraisalDate < minStr || formData.appraisalDate > today) {
          missing.push({ field: 'appraisalDateWindow', label: "Date de l'expertise hors fenêtre 6 mois — corrigez la date ou décochez « expertise récente »", tab: 'market-value' });
        }
      }
      if (!formData.appraisedValueAmount || Number(formData.appraisedValueAmount) <= 0) {
        missing.push({ field: 'appraisedValueAmount', label: 'Valeur vénale retenue', tab: 'market-value' });
      }
      if (!formData.appraisedValueCurrency) {
        missing.push({ field: 'appraisedValueCurrency', label: 'Devise de la valeur vénale', tab: 'market-value' });
      }
      if (!formData.appraisalReportUrl) {
        missing.push({ field: 'appraisalReportUrl', label: "Rapport d'expertise (pièce jointe)", tab: 'market-value' });
      }
    }

    // Loyer cible positif si saisi + au moins 1 image par local proposé
    if (Array.isArray(formData.marketListings)) {
      // Seules les annonces rattachées à un local réellement vacant sont validées
      // (une annonce orpheline n'a plus de bloc affiché : elle ne doit pas bloquer l'envoi).
      const vacantRefs = new Set(
        buildVacantTargets(formData, additionalConstructions, soundEnvironment).map(t => t.ref),
      );
      formData.marketListings.forEach((l: any, i: number) => {
        if (!vacantRefs.has(l?.constructionRef)) return;
        if (l?.listForRent && l.targetRentUsd !== undefined && l.targetRentUsd !== null && Number(l.targetRentUsd) < 0) {
          missing.push({ field: `marketListingRent_${i}`, label: `Loyer cible du local "${l.unitLabel || i + 1}" invalide`, tab: 'market-value' });
        }
        if (l?.listForRent) {
          const imgs = Array.isArray(l.coverImageUrls) ? l.coverImageUrls.filter(Boolean) : [];
          if (imgs.length < 1) {
            missing.push({ field: `marketListingImages_${i}`, label: `Au moins une image de couverture est requise pour le local "${l.unitLabel || i + 1}"`, tab: 'market-value' });
          }
          if ((l.description || '').length > 500) {
            missing.push({ field: `marketListingDesc_${i}`, label: `Description du local "${l.unitLabel || i + 1}" : 500 caractères max`, tab: 'market-value' });
          }
          const hasAmt = l.rentAmount !== undefined && l.rentAmount !== null && l.rentAmount !== '';
          const hasCur = !!l.rentCurrency;
          // Devise choisie sans montant = incomplet ; montant sans devise explicite = USD par défaut.
          if (hasCur && !hasAmt) {
            missing.push({ field: `marketListingRentPair_${i}`, label: `Loyer du local "${l.unitLabel || i + 1}" : indiquez le montant du loyer`, tab: 'market-value' });
          }
          if (l.contactValue) {
            const v = String(l.contactValue).trim();
            const okEmail = /.+@.+\..+/.test(v);
            const okPhone = /^\+?\d[\d\s\-]{6,}$/.test(v);
            if (l.contactChannel === 'email' ? !okEmail : !okPhone) {
              missing.push({ field: `marketListingContact_${i}`, label: `Coordonnée de contact du local "${l.unitLabel || i + 1}" invalide`, tab: 'market-value' });
            }
          }
        }
      });
    }


    return missing;
  }, [formData, customTitleName, currentOwners, previousOwners, sectionType, permitMode, buildingPermits, parcelSides, taxRecords, hasMortgage, hasDispute, mortgageRecords, ownerDocFile, titleDocFiles, editingContributionId, roadSides, servitude, buildingShapes, constructionMode, additionalConstructions, soundEnvironment, nearbySoundSources, disputeFormData, parcelNumberRequiredParam]);

  const getMissingFields = useCallback(() => missingFieldsList, [missingFieldsList]);

  const getMissingFieldsForTab = useCallback(
    (tab: string) => missingFieldsList.filter(f => f.tab === tab),
    [missingFieldsList],
  );

  const isTabComplete = useCallback(
    (tab: string) => missingFieldsList.every(f => f.tab !== tab),
    [missingFieldsList],
  );

  const isTabAccessible = useCallback((tab: string) => {
    const tabIndex = TAB_ORDER.indexOf(tab);
    if (tabIndex <= 0) return true;
    for (let i = 0; i < tabIndex; i++) {
      if (!isTabComplete(TAB_ORDER[i])) return false;
    }
    return true;
  }, [isTabComplete]);

  const isFormValidForSubmission = useCallback(
    () => missingFieldsList.length === 0,
    [missingFieldsList],
  );

  return {
    missingFieldsList,
    getMissingFields,
    getMissingFieldsForTab,
    isTabComplete,
    isTabAccessible,
    isFormValidForSubmission,
  };
}
