import { useMemo, useCallback } from 'react';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { CurrentOwner, BuildingPermit } from '@/components/cadastral/ccc-tabs/GeneralTab';
import { PreviousOwner } from '@/components/cadastral/ccc-tabs/HistoryTab';
import { TaxRecord, MortgageRecord } from '@/components/cadastral/ccc-tabs/ObligationsTab';
import { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';
import { normalizeConstructionNature } from '@/utils/constructionNatureNormalizer';

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
}

const TAB_ORDER = ['general', 'location', 'history', 'obligations', 'review'];

export function useFormValidation(params: UseFormValidationParams) {
  const {
    formData, customTitleName, currentOwners, previousOwners, sectionType,
    permitMode, buildingPermits, parcelSides, taxRecords, hasMortgage, hasDispute,
    mortgageRecords, ownerDocFile, titleDocFiles, editingContributionId,
    roadSides, servitude, buildingShapes, constructionMode, additionalConstructions,
    soundEnvironment, nearbySoundSources,
  } = params;

  const missingFieldsList = useMemo<MissingField[]>(() => {
    const missing: MissingField[] = [];
    const isTerrainNu = formData.constructionType === 'Terrain nu';
    const isAppartement = formData.propertyCategory === 'Appartement';

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
      if (firstOwner?.since && new Date(firstOwner.since) < new Date(formData.titleIssueDate)) missing.push({ field: 'ownerSinceDate', label: 'Date "Propriétaire depuis" doit être ≥ date de délivrance', tab: 'general' });
    }
    if (formData.isTitleInCurrentOwnerName === true && formData.titleIssueDate) {
      if (firstOwner?.since && new Date(firstOwner.since) < new Date(formData.titleIssueDate) && !firstOwner.previousTitleType) {
        missing.push({ field: 'previousTitleType', label: 'Titre de propriété antérieur', tab: 'general' });
      }
      if (firstOwner?.previousTitleType === 'Autre' && !firstOwner.previousTitleCustomName?.trim()) {
        missing.push({ field: 'previousTitleCustomName', label: 'Nom du titre antérieur', tab: 'general' });
      }
      const firstPreviousOwner = previousOwners[0];
      if (firstPreviousOwner?.startDate && new Date(firstPreviousOwner.startDate) > new Date(formData.titleIssueDate)) missing.push({ field: 'previousOwnerStartDate', label: `Date début Ancien #1 doit être ≤ date de ${formData.leaseType === 'renewal' ? 'renouvellement' : 'délivrance'}`, tab: 'history' });
    }

    if (!formData.propertyCategory) missing.push({ field: 'propertyCategory', label: 'Catégorie de bien', tab: 'general' });
    if (!formData.constructionType) missing.push({ field: 'constructionType', label: 'Type de construction', tab: 'general' });
    if (!formData.constructionNature) missing.push({ field: 'constructionNature', label: 'Nature de construction', tab: 'general' });
    if (!formData.declaredUsage) missing.push({ field: 'declaredUsage', label: 'Usage déclaré', tab: 'general' });
    if (formData.declaredUsage === 'Location') {
      if (!formData.rentalStartDate) {
        missing.push({ field: 'rentalStartDate', label: 'En location depuis quand ? (construction principale)', tab: 'general' });
      } else if (formData.constructionYear) {
        const min = new Date(formData.constructionYear, 0, 1);
        if (new Date(formData.rentalStartDate) < min) {
          missing.push({ field: 'rentalStartDate', label: `Date de mise en location < 01/01/${formData.constructionYear}`, tab: 'general' });
        }
      }
    }
    additionalConstructions.forEach((c, idx) => {
      if (c.declaredUsage === 'Location') {
        if (!c.rentalStartDate) {
          missing.push({ field: `additionalRentalStartDate_${idx}`, label: `En location depuis quand ? (construction #${idx + 2})`, tab: 'general' });
        } else if (c.constructionYear) {
          const min = new Date(c.constructionYear, 0, 1);
          if (new Date(c.rentalStartDate) < min) {
            missing.push({ field: `additionalRentalStartDate_${idx}`, label: `Date de mise en location < 01/01/${c.constructionYear} (construction #${idx + 2})`, tab: 'general' });
          }
        }
      }
    });
    const normalizedNature = formData.constructionNature ? normalizeConstructionNature(formData.constructionNature) : '';
    const isPrecaireOrUnbuilt = normalizedNature === 'Précaire' || normalizedNature === 'Non bâti';
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.constructionMaterials) missing.push({ field: 'constructionMaterials', label: 'Matériaux de construction', tab: 'general' });
    if (!isTerrainNu && formData.constructionNature && !isPrecaireOrUnbuilt && !formData.standing) missing.push({ field: 'standing', label: 'Standing', tab: 'general' });
    if (!isTerrainNu && formData.propertyCategory && formData.propertyCategory !== 'Terrain nu' && !formData.constructionYear) missing.push({ field: 'constructionYear', label: 'Année de construction', tab: 'general' });
    if (isAppartement) {
      if (!formData.apartmentNumber) missing.push({ field: 'apartmentNumber', label: "Numéro de l'appartement", tab: 'general' });
      if (!formData.floorNumber) missing.push({ field: 'floorNumber', label: "Numéro de l'étage", tab: 'general' });
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
    if (!isTerrainNu && !isAppartement) {
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

    // OBLIGATIONS - TAXES
    taxRecords.forEach((tax, idx) => {
      if (tax.taxAmount && tax.taxYear && !tax.receiptFile && !tax.existingReceiptUrl) missing.push({ field: `taxReceipt_${idx}`, label: `Reçu de ${tax.taxType} ${tax.taxYear}`, tab: 'obligations' });
    });

    // OBLIGATIONS - IRL × Constructions en location
    const rentalRefs: string[] = [];
    const rentalLabels: Record<string, string> = {};
    if (formData.declaredUsage === 'Location') {
      rentalRefs.push('main');
      rentalLabels['main'] = 'Construction principale';
    }
    additionalConstructions.forEach((c, idx) => {
      if (c.declaredUsage === 'Location') {
        const ref = `additional:${idx}`;
        rentalRefs.push(ref);
        const parts = [c.propertyCategory || c.constructionType || 'Construction', c.constructionYear ? String(c.constructionYear) : null].filter(Boolean);
        rentalLabels[ref] = `Construction #${idx + 2} (${parts.join(', ')})`;
      }
    });

    if (rentalRefs.length > 0) {
      const irlRecords = taxRecords.filter(t => t.taxType === 'Impôt sur les revenus locatifs' && t.taxAmount && t.taxYear);
      const irlRefs = irlRecords.map(t => t.constructionRef).filter(Boolean) as string[];

      const missingRefs = rentalRefs.filter(r => !irlRefs.includes(r));
      missingRefs.forEach(r => {
        missing.push({ field: `irlMissing_${r}`, label: `IRL manquant pour : ${rentalLabels[r]}`, tab: 'obligations' });
      });

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
        if (m.mortgageAmount && m.creditorName && !m.receiptFile && !m.existingReceiptUrl) missing.push({ field: `mortgageReceipt_${idx}`, label: `Document hypothèque #${idx + 1}`, tab: 'obligations' });
      });
    }

    // OBLIGATIONS - DISPUTE
    if (hasDispute === null) missing.push({ field: 'hasDispute', label: 'Statut litige foncier (Oui/Non)', tab: 'obligations' });

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
    if (!isTerrainNu && !isAppartement && formData.constructionType !== 'Terrain nu' && permitMode === null) {
      missing.push({ field: 'permitMode', label: "Avez-vous obtenu une autorisation de bâtir ?", tab: 'general' });
    }

    // SOUND ENVIRONMENT
    if (!soundEnvironment || soundEnvironment.trim() === '') {
      missing.push({ field: 'soundEnvironment', label: 'Environnement sonore', tab: 'location' });
    }
    if (soundEnvironment && soundEnvironment !== 'tres_calme' && (!nearbySoundSources || nearbySoundSources.trim() === '')) {
      missing.push({ field: 'nearbySoundSources', label: 'Sources de bruit à proximité', tab: 'location' });
    }

    // BUILDING PERMITS
    if (!isTerrainNu && !isAppartement && formData.constructionType !== 'Terrain nu' && permitMode === 'existing') {
      const hasValidExistingPermit = buildingPermits.some(permit => permit.permitNumber && permit.permitNumber.trim() !== '' && permit.issueDate && permit.issueDate.trim() !== '');
      if (!hasValidExistingPermit) missing.push({ field: 'buildingPermit', label: 'Informations du permis existant', tab: 'general' });
      buildingPermits.forEach((permit, idx) => {
        if (permit.permitNumber && permit.permitNumber.trim() !== '' && !permit.attachmentFile && !permit.existingAttachmentUrl) missing.push({ field: `permitAttachment_${idx}`, label: `Pièce jointe du permis #${idx + 1}`, tab: 'general' });
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
          missing.push({ field: 'permitIssueDate', label: msg, tab: 'general' });
        }
      }
    }

    return missing;
  }, [formData, customTitleName, currentOwners, previousOwners, sectionType, permitMode, buildingPermits, parcelSides, taxRecords, hasMortgage, hasDispute, mortgageRecords, ownerDocFile, titleDocFiles, editingContributionId, roadSides, servitude, buildingShapes, constructionMode, additionalConstructions, soundEnvironment, nearbySoundSources]);

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
