import { useState, useEffect } from 'react';
import { CadastralContributionData } from './useCadastralContribution';

export interface FormOwner {
  lastName: string;
  middleName: string;
  firstName: string;
  legalStatus: string;
  since: string;
}

export interface PreviousOwner {
  name: string;
  legalStatus: string;
  startDate: string;
  endDate: string;
  mutationType: string;
}

export interface TaxRecord {
  taxType: string;
  taxYear: string;
  taxAmount: string;
  paymentStatus: string;
  paymentDate: string;
  receiptFile: File | null;
}

export interface MortgageRecord {
  mortgageAmount: string;
  duration: string;
  creditorName: string;
  creditorType: string;
  contractDate: string;
  mortgageStatus: string;
  receiptFile: File | null;
}

export interface BuildingPermit {
  permitType: 'construction' | 'regularization';
  permitNumber: string;
  issuingService: string;
  issueDate: string;
  validityMonths: string;
  administrativeStatus: string;
  issuingServiceContact: string;
  attachmentFile: File | null;
}

export interface GPSCoordinate {
  borne: string;
  lat: string;
  lng: string;
}

export interface ParcelSide {
  name: string;
  length: string;
}

export const useCCCFormState = (parcelNumber: string) => {
  const STORAGE_KEY = `cadastral_contribution_${parcelNumber}`;

  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
  });

  const [currentOwners, setCurrentOwners] = useState<FormOwner[]>([{
    lastName: '',
    middleName: '',
    firstName: '',
    legalStatus: 'Personne physique',
    since: ''
  }]);

  const [previousOwners, setPreviousOwners] = useState<PreviousOwner[]>([{
    name: '',
    legalStatus: 'Personne physique',
    startDate: '',
    endDate: '',
    mutationType: 'Vente'
  }]);

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([{
    taxType: 'Taxe foncière',
    taxYear: '',
    taxAmount: '',
    paymentStatus: 'Non payée',
    paymentDate: '',
    receiptFile: null
  }]);

  const [mortgageRecords, setMortgageRecords] = useState<MortgageRecord[]>([{
    mortgageAmount: '',
    duration: '',
    creditorName: '',
    creditorType: 'Banque',
    contractDate: '',
    mortgageStatus: 'Active',
    receiptFile: null
  }]);

  const [buildingPermits, setBuildingPermits] = useState<BuildingPermit[]>([{
    permitType: 'construction',
    permitNumber: '',
    issuingService: '',
    issueDate: '',
    validityMonths: '36',
    administrativeStatus: 'En attente',
    issuingServiceContact: '',
    attachmentFile: null
  }]);

  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinate[]>([]);

  const [parcelSides, setParcelSides] = useState<ParcelSide[]>([
    { name: 'Côté Nord', length: '' },
    { name: 'Côté Sud', length: '' },
    { name: 'Côté Est', length: '' },
    { name: 'Côté Ouest', length: '' }
  ]);

  const [sectionType, setSectionType] = useState<'urbaine' | 'rurale' | ''>('');
  const [permitMode, setPermitMode] = useState<'existing' | 'request'>('existing');
  const [obligationType, setObligationType] = useState<'taxes' | 'mortgages'>('taxes');

  // Save to localStorage
  const saveToStorage = () => {
    const dataToSave = {
      formData,
      currentOwners,
      previousOwners,
      taxRecords: taxRecords.map(tax => ({ ...tax, receiptFile: null })),
      mortgageRecords: mortgageRecords.map(m => ({ ...m, receiptFile: null })),
      buildingPermits: buildingPermits.map(p => ({ ...p, attachmentFile: null })),
      gpsCoordinates,
      parcelSides,
      sectionType,
      permitMode,
      obligationType,
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.currentOwners) setCurrentOwners(parsed.currentOwners);
        if (parsed.previousOwners) setPreviousOwners(parsed.previousOwners);
        if (parsed.taxRecords) setTaxRecords(parsed.taxRecords);
        if (parsed.mortgageRecords) setMortgageRecords(parsed.mortgageRecords);
        if (parsed.buildingPermits) setBuildingPermits(parsed.buildingPermits);
        if (parsed.gpsCoordinates) setGpsCoordinates(parsed.gpsCoordinates);
        if (parsed.parcelSides) setParcelSides(parsed.parcelSides);
        if (parsed.sectionType) setSectionType(parsed.sectionType);
        if (parsed.permitMode) setPermitMode(parsed.permitMode);
        if (parsed.obligationType) setObligationType(parsed.obligationType);
        return true;
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
    return false;
  };

  // Clear storage
  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  // Auto-detect section type from parcel number
  useEffect(() => {
    if (parcelNumber) {
      const upper = parcelNumber.toUpperCase().trim();
      if (upper.startsWith('SU')) {
        setSectionType('urbaine');
      } else if (upper.startsWith('SR')) {
        setSectionType('rurale');
      }
    }
  }, [parcelNumber]);

  // Auto-calculate area from parcel sides
  useEffect(() => {
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    if (sides.length < 2) return;

    const lengths = sides.map(s => parseFloat(s.length));

    // Rectangle
    if (sides.length === 4 && Math.abs(lengths[0] - lengths[1]) < 0.1 && Math.abs(lengths[2] - lengths[3]) < 0.1) {
      const area = lengths[0] * lengths[2];
      setFormData(prev => ({ ...prev, areaSqm: parseFloat(area.toFixed(2)) }));
    }
    // Simple rectangle (2 sides)
    else if (sides.length === 2) {
      const area = lengths[0] * lengths[1];
      setFormData(prev => ({ ...prev, areaSqm: parseFloat(area.toFixed(2)) }));
    }
  }, [parcelSides]);

  return {
    formData,
    setFormData,
    currentOwners,
    setCurrentOwners,
    previousOwners,
    setPreviousOwners,
    taxRecords,
    setTaxRecords,
    mortgageRecords,
    setMortgageRecords,
    buildingPermits,
    setBuildingPermits,
    gpsCoordinates,
    setGpsCoordinates,
    parcelSides,
    setParcelSides,
    sectionType,
    setSectionType,
    permitMode,
    setPermitMode,
    obligationType,
    setObligationType,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  };
};
