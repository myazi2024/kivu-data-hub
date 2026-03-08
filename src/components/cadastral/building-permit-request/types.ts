export interface PermitFormData {
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
  plannedArea: string;
  numberOfFloors: string;
  estimatedCost: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  projectDescription: string;
  startDate: string;
  estimatedDuration: string;
  constructionDate: string;
  currentState: string;
  complianceIssues: string;
  regularizationReason: string;
  originalPermitNumber: string;
  architectName: string;
  architectLicense: string;
  roofingType: string;
  numberOfRooms: string;
  waterSupply: string;
  electricitySupply: string;
}

export const INITIAL_FORM_DATA: PermitFormData = {
  constructionType: '', constructionNature: '', declaredUsage: '', plannedArea: '',
  numberOfFloors: '1', estimatedCost: '', applicantName: '', applicantPhone: '',
  applicantEmail: '', applicantAddress: '', projectDescription: '', startDate: '',
  estimatedDuration: '', constructionDate: '', currentState: '', complianceIssues: '',
  regularizationReason: '', originalPermitNumber: '', architectName: '', architectLicense: '',
  roofingType: '', numberOfRooms: '', waterSupply: '', electricitySupply: '',
};

export interface AttachmentFile {
  file: File;
  label: string;
}

export interface FeeItem {
  id: string;
  fee_name: string;
  amount_usd: number;
  description: string | null;
  is_mandatory: boolean;
}

export interface PaymentProvider {
  value: string;
  label: string;
  prefix: string;
  color: string;
}

export type PermitStep = 'form' | 'preview' | 'payment' | 'confirmation';

export const ATTACHMENT_FIELDS = [
  { key: 'architectural_plans', label: 'Plans architecturaux', required: true, help: 'Façades, coupes et plan d\'implantation' },
  { key: 'id_document', label: 'Pièce d\'identité', required: true, help: 'Carte d\'identité, passeport ou permis de conduire' },
  { key: 'property_title', label: 'Titre de propriété', required: false, help: 'Certificat d\'enregistrement ou contrat de concession' },
  { key: 'environmental_study', label: 'Étude d\'impact environnemental', required: false, help: 'Requise pour les projets commerciaux/industriels' },
  { key: 'site_photos', label: 'Photos du site', required: false, help: 'Photos récentes du terrain ou de la construction existante' },
  { key: 'other', label: 'Autre document', required: false, help: 'Tout document complémentaire pertinent' },
] as const;

export const INITIAL_ATTACHMENTS: Record<string, AttachmentFile | null> = {
  architectural_plans: null,
  id_document: null,
  property_title: null,
  environmental_study: null,
  site_photos: null,
  other: null,
};

/** Simple email validation */
export const isValidEmail = (email: string): boolean => {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** Validate phone number: at least 9 digits */
export const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
};
