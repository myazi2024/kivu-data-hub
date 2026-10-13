import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormPersistence } from '../useFormPersistence';

// Le hook importe le client Supabase ; on le neutralise pour un test unitaire pur.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ remove: vi.fn() }) } },
}));

const STORAGE_KEY = 'cadastral_contribution_PARCEL-1';

function buildParams(markDirty: () => void) {
  const setter = vi.fn();
  return {
    open: true,
    parcelNumber: 'PARCEL-1',
    editingContributionId: undefined,
    isLoadingFromDbRef: { current: false },
    markDirty,
    formData: { parcelNumber: 'PARCEL-1' } as any,
    currentOwners: [], previousOwners: [], taxRecords: [], mortgageRecords: [],
    permitMode: null, buildingPermits: [], permitRequest: {}, gpsCoordinates: [],
    parcelSides: [], obligationType: 'taxes', sectionType: '' as const,
    hasMortgage: null, hasDispute: null, ownershipMode: 'unique' as const,
    leaseYears: 0, roadSides: [], servitude: { hasServitude: false },
    customTitleName: '', constructionMode: null, additionalConstructions: [],
    buildingShapes: [], disputeFormData: null, soundEnvironment: '', nearbySoundSources: '',
    setFormData: setter, setCurrentOwners: setter, setPreviousOwners: setter,
    setTaxRecords: setter, setMortgageRecords: setter, setPermitMode: setter,
    setBuildingPermits: setter, setPermitRequest: setter, setGpsCoordinates: setter,
    setParcelSides: setter, setObligationType: setter, setSectionType: setter,
    setHasMortgage: setter, setHasDispute: setter, setOwnershipMode: setter,
    setLeaseYears: setter, setRoadSides: setter, setServitude: setter,
    setCustomTitleName: setter, setConstructionMode: setter,
    setAdditionalConstructions: setter, setBuildingShapes: setter,
    setDisputeFormData: setter, setSoundEnvironment: setter, setNearbySoundSources: setter,
  };
}

function seedDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    schemaVersion: 2,
    savedAt: new Date().toISOString(),
    data: {
      formData: { parcelNumber: 'PARCEL-1', superficie: '250' },
      currentOwners: [{ lastName: 'Kabongo', firstName: 'Jean' }],
    },
  }));
}

describe('useFormPersistence — restauration de brouillon', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('marque le formulaire comme modifié après restauration d’un brouillon', () => {
    seedDraft();
    const markDirty = vi.fn();
    renderHook(() => useFormPersistence(buildParams(markDirty) as any));
    expect(markDirty).toHaveBeenCalledTimes(1);
  });

  it('ne marque pas le formulaire sans brouillon existant', () => {
    const markDirty = vi.fn();
    renderHook(() => useFormPersistence(buildParams(markDirty) as any));
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('ignore un brouillon expiré et ne marque pas le formulaire', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      savedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      data: { formData: { parcelNumber: 'PARCEL-1', superficie: '250' } },
    }));
    const markDirty = vi.fn();
    renderHook(() => useFormPersistence(buildParams(markDirty) as any));
    expect(markDirty).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
