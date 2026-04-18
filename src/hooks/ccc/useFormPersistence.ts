/**
 * 💾 Sous-hook de persistance localStorage + tracking des fichiers uploadés
 *  pour le formulaire CCC (extraction du hook monolithique useCCCFormState).
 *
 * Contrat: comportement strictement identique à l'inline précédent.
 *  - même clé localStorage (`cadastral_contribution_${parcelNumber}`)
 *  - même schemaVersion (2) et TTL (30j)
 *  - même debounce (1500ms)
 *  - mêmes toasts
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';
import type { CurrentOwner, BuildingPermit } from '@/components/cadastral/ccc-tabs/GeneralTab';
import type { PreviousOwner } from '@/components/cadastral/ccc-tabs/HistoryTab';
import type { TaxRecord, MortgageRecord } from '@/components/cadastral/ccc-tabs/ObligationsTab';
import type { AdditionalConstruction } from '@/components/cadastral/AdditionalConstructionBlock';

const STORAGE_SCHEMA_VERSION = 2;
const STORAGE_TTL_DAYS = 30;
const DEBOUNCE_MS = 1500;

interface UseFormPersistenceParams {
  open: boolean;
  parcelNumber: string;
  editingContributionId?: string;
  isLoadingFromDbRef: React.MutableRefObject<boolean>;

  // State slices (lecture pour save)
  formData: CadastralContributionData;
  currentOwners: CurrentOwner[];
  previousOwners: PreviousOwner[];
  taxRecords: TaxRecord[];
  mortgageRecords: MortgageRecord[];
  permitMode: any;
  buildingPermits: BuildingPermit[];
  permitRequest: any;
  gpsCoordinates: any[];
  parcelSides: any[];
  obligationType: any;
  sectionType: 'urbaine' | 'rurale' | '';
  hasMortgage: boolean | null;
  hasDispute: boolean | null;
  ownershipMode: 'unique' | 'multiple';
  leaseYears: number;
  roadSides: any[];
  servitude: { hasServitude: boolean; width?: number };
  customTitleName: string;
  constructionMode: any;
  additionalConstructions: AdditionalConstruction[];
  buildingShapes: any[];
  disputeFormData: any;
  soundEnvironment: string;
  nearbySoundSources: string;

  // Setters (écriture pour restore)
  setFormData: React.Dispatch<React.SetStateAction<CadastralContributionData>>;
  setCurrentOwners: React.Dispatch<React.SetStateAction<CurrentOwner[]>>;
  setPreviousOwners: React.Dispatch<React.SetStateAction<PreviousOwner[]>>;
  setTaxRecords: React.Dispatch<React.SetStateAction<TaxRecord[]>>;
  setMortgageRecords: React.Dispatch<React.SetStateAction<MortgageRecord[]>>;
  setPermitMode: React.Dispatch<React.SetStateAction<any>>;
  setBuildingPermits: React.Dispatch<React.SetStateAction<BuildingPermit[]>>;
  setPermitRequest: React.Dispatch<React.SetStateAction<any>>;
  setGpsCoordinates: React.Dispatch<React.SetStateAction<any[]>>;
  setParcelSides: React.Dispatch<React.SetStateAction<any[]>>;
  setObligationType: React.Dispatch<React.SetStateAction<any>>;
  setSectionType: React.Dispatch<React.SetStateAction<'urbaine' | 'rurale' | ''>>;
  setHasMortgage: React.Dispatch<React.SetStateAction<boolean | null>>;
  setHasDispute: React.Dispatch<React.SetStateAction<boolean | null>>;
  setOwnershipMode: React.Dispatch<React.SetStateAction<'unique' | 'multiple'>>;
  setLeaseYears: React.Dispatch<React.SetStateAction<number>>;
  setRoadSides: React.Dispatch<React.SetStateAction<any[]>>;
  setServitude: React.Dispatch<React.SetStateAction<{ hasServitude: boolean; width?: number }>>;
  setCustomTitleName: React.Dispatch<React.SetStateAction<string>>;
  setConstructionMode: React.Dispatch<React.SetStateAction<any>>;
  setAdditionalConstructions: React.Dispatch<React.SetStateAction<AdditionalConstruction[]>>;
  setBuildingShapes: React.Dispatch<React.SetStateAction<any[]>>;
  setDisputeFormData: React.Dispatch<React.SetStateAction<any>>;
  setSoundEnvironment: React.Dispatch<React.SetStateAction<string>>;
  setNearbySoundSources: React.Dispatch<React.SetStateAction<string>>;
}

export interface UseFormPersistenceResult {
  /** Sauvegarde manuelle immédiate du brouillon (utilisée avant redirection auth). */
  saveFormDataToStorage: () => void;
  /** Purge du brouillon localStorage. */
  clearSavedFormData: () => void;
  /** Tracking d'un chemin Storage uploadé pendant le cycle de soumission. */
  trackUploadedPath: (path: string) => void;
  /** Suppression des fichiers Storage uploadés (rollback en cas d'échec). */
  rollbackUploadedFiles: () => Promise<void>;
  /** Reset du tracker (succès → on garde les fichiers). */
  resetUploadedTracker: () => void;
  /** Indique si un brouillon a été restauré au montage. */
  hasRestoredDraft: boolean;
}

export function useFormPersistence(params: UseFormPersistenceParams): UseFormPersistenceResult {
  const { toast } = useToast();
  const {
    open, parcelNumber, editingContributionId, isLoadingFromDbRef,
    formData, currentOwners, previousOwners, taxRecords, mortgageRecords,
    permitMode, buildingPermits, permitRequest, gpsCoordinates, parcelSides,
    obligationType, sectionType, hasMortgage, hasDispute, ownershipMode, leaseYears,
    roadSides, servitude, customTitleName, constructionMode, additionalConstructions,
    buildingShapes, disputeFormData, soundEnvironment, nearbySoundSources,
    setFormData, setCurrentOwners, setPreviousOwners, setTaxRecords, setMortgageRecords,
    setPermitMode, setBuildingPermits, setPermitRequest, setGpsCoordinates, setParcelSides,
    setObligationType, setSectionType, setHasMortgage, setHasDispute, setOwnershipMode,
    setLeaseYears, setRoadSides, setServitude, setCustomTitleName, setConstructionMode,
    setAdditionalConstructions, setBuildingShapes, setDisputeFormData,
    setSoundEnvironment, setNearbySoundSources,
  } = params;

  const STORAGE_KEY = `cadastral_contribution_${parcelNumber}`;
  const submitUploadedPathsRef = useRef<string[]>([]);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // ─── Save (manual + debounced) ───
  const saveFormDataToStorage = useCallback(() => {
    const dataToSave = {
      formData, currentOwners, previousOwners,
      taxRecords: taxRecords.map(tax => ({ ...tax, receiptFile: null })),
      mortgageRecords: mortgageRecords.map(m => ({ ...m, receiptFile: null })),
      permitMode,
      buildingPermits: buildingPermits.map(p => ({ ...p, attachmentFile: null })),
      permitRequest: { ...permitRequest, architecturalPlanImages: [], constructionPhotos: [] },
      gpsCoordinates, parcelSides, obligationType, sectionType,
      hasMortgage, hasDispute, ownershipMode, leaseYears, roadSides, servitude, customTitleName, buildingShapes, disputeFormData,
      isTitleInCurrentOwnerName: formData.isTitleInCurrentOwnerName,
      constructionMode,
      additionalConstructions: additionalConstructions.map(c => ({
        ...c, permit: c.permit ? { ...c.permit, attachmentFile: null } : undefined
      })),
      soundEnvironment, nearbySoundSources,
      isOccupied: formData.isOccupied, occupantCount: formData.occupantCount, hostingCapacity: formData.hostingCapacity,
      timestamp: new Date().toISOString()
    };
    try {
      const wrapped = {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        data: dataToSave,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapped));
      localStorage.setItem('auth_redirect_url', window.location.pathname + window.location.search);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  }, [formData, currentOwners, previousOwners, taxRecords, mortgageRecords, permitMode, buildingPermits, permitRequest, gpsCoordinates, parcelSides, obligationType, sectionType, hasMortgage, hasDispute, ownershipMode, leaseYears, roadSides, servitude, customTitleName, constructionMode, additionalConstructions, buildingShapes, disputeFormData, soundEnvironment, nearbySoundSources, STORAGE_KEY]);

  const clearSavedFormData = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('auth_redirect_url'); } catch (error) { console.error(error); }
  }, [STORAGE_KEY]);

  // ─── Load (initial mount) ───
  const loadFormDataFromStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      let envelope: any;
      try {
        envelope = JSON.parse(savedData);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      let parsed: any;
      if (envelope && typeof envelope === 'object' && 'schemaVersion' in envelope && 'data' in envelope) {
        if (envelope.schemaVersion !== STORAGE_SCHEMA_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        if (envelope.savedAt) {
          const ageDays = (Date.now() - new Date(envelope.savedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays > STORAGE_TTL_DAYS) {
            localStorage.removeItem(STORAGE_KEY);
            return;
          }
        }
        parsed = envelope.data;
      } else {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      if (parsed.formData) setFormData(parsed.formData);
      if (parsed.currentOwners) setCurrentOwners(parsed.currentOwners);
      if (parsed.previousOwners) setPreviousOwners(parsed.previousOwners);
      if (parsed.taxRecords) setTaxRecords(parsed.taxRecords);
      if (parsed.mortgageRecords) setMortgageRecords(parsed.mortgageRecords);
      if (parsed.permitMode) setPermitMode(parsed.permitMode);
      if (parsed.buildingPermits) setBuildingPermits(parsed.buildingPermits);
      if (parsed.permitRequest) setPermitRequest(parsed.permitRequest);
      if (parsed.gpsCoordinates) setGpsCoordinates(parsed.gpsCoordinates);
      if (parsed.parcelSides) setParcelSides(parsed.parcelSides);
      if (parsed.obligationType) setObligationType(parsed.obligationType);
      if (parsed.sectionType) setSectionType(parsed.sectionType);
      if (parsed.hasMortgage !== undefined) setHasMortgage(parsed.hasMortgage);
      if (parsed.hasDispute !== undefined) setHasDispute(parsed.hasDispute);
      if (parsed.ownershipMode) setOwnershipMode(parsed.ownershipMode);
      if (parsed.leaseYears !== undefined) setLeaseYears(parsed.leaseYears);
      if (parsed.roadSides) setRoadSides(parsed.roadSides);
      if (parsed.servitude) setServitude(parsed.servitude);
      if (parsed.customTitleName) setCustomTitleName(parsed.customTitleName);
      if (parsed.constructionMode) setConstructionMode(parsed.constructionMode);
      if (parsed.additionalConstructions) setAdditionalConstructions(parsed.additionalConstructions);
      if (parsed.buildingShapes) setBuildingShapes(parsed.buildingShapes);
      if (parsed.disputeFormData) setDisputeFormData(parsed.disputeFormData);
      if (parsed.soundEnvironment) setSoundEnvironment(parsed.soundEnvironment);
      if (parsed.nearbySoundSources) setNearbySoundSources(parsed.nearbySoundSources);
      if (parsed.isOccupied !== undefined) setFormData(prev => ({ ...prev, isOccupied: parsed.isOccupied, occupantCount: parsed.occupantCount, hostingCapacity: parsed.hostingCapacity }));
      setHasRestoredDraft(true);
      toast({ title: "Données restaurées", description: "Vos données précédentes ont été restaurées." });
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  }, [STORAGE_KEY, toast, setFormData, setCurrentOwners, setPreviousOwners, setTaxRecords, setMortgageRecords, setPermitMode, setBuildingPermits, setPermitRequest, setGpsCoordinates, setParcelSides, setObligationType, setSectionType, setHasMortgage, setHasDispute, setOwnershipMode, setLeaseYears, setRoadSides, setServitude, setCustomTitleName, setConstructionMode, setAdditionalConstructions, setBuildingShapes, setDisputeFormData, setSoundEnvironment, setNearbySoundSources]);

  // Effet: chargement initial au montage / ouverture
  useEffect(() => {
    if (open && !editingContributionId) loadFormDataFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingContributionId]);

  // Effet: sauvegarde debounced sur changement d'état pertinent
  useEffect(() => {
    if (open && formData.parcelNumber && !editingContributionId && !isLoadingFromDbRef.current) {
      const timeoutId = setTimeout(() => saveFormDataToStorage(), DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [open, formData, currentOwners, previousOwners, taxRecords, mortgageRecords, buildingPermits, gpsCoordinates, parcelSides, permitMode, permitRequest, hasMortgage, hasDispute, ownershipMode, leaseYears, roadSides, obligationType, sectionType, saveFormDataToStorage, editingContributionId, isLoadingFromDbRef]);

  // ─── Tracking fichiers uploadés ───
  const trackUploadedPath = useCallback((path: string) => {
    submitUploadedPathsRef.current.push(path);
  }, []);

  const resetUploadedTracker = useCallback(() => {
    submitUploadedPathsRef.current = [];
  }, []);

  const rollbackUploadedFiles = useCallback(async () => {
    const paths = submitUploadedPathsRef.current;
    if (paths.length === 0) return;
    try {
      await supabase.storage.from('cadastral-documents').remove(paths);
      console.warn(`🧹 Rollback: ${paths.length} fichier(s) orphelin(s) supprimé(s)`);
    } catch (e) {
      console.error('Rollback uploads échoué (fichiers orphelins possibles):', e);
    } finally {
      submitUploadedPathsRef.current = [];
    }
  }, []);

  return {
    saveFormDataToStorage,
    clearSavedFormData,
    trackUploadedPath,
    rollbackUploadedFiles,
    resetUploadedTracker,
    hasRestoredDraft,
  };
}
