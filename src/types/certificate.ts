export interface CertificateTemplate {
  id: string;
  certificate_type: CertificateType;
  template_name: string;
  header_title: string;
  header_subtitle: string;
  header_organization: string;
  body_text: string;
  footer_text: string;
  legal_text: string;
  signature_name: string;
  signature_title: string;
  logo_url: string | null;
  signature_image_url: string | null;
  stamp_text: string;
  primary_color: string;
  secondary_color: string;
  show_qr_code: boolean;
  show_border: boolean;
  show_stamp: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CertificateType =
  | 'expertise_immobiliere'
  | 'titre_foncier'
  | 'permis_construire'
  | 'mutation_fonciere'
  | 'lotissement';

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  expertise_immobiliere: 'Expertise Immobilière',
  titre_foncier: 'Titre Foncier',
  permis_construire: 'Permis de Construire',
  mutation_fonciere: 'Mutation Foncière',
  lotissement: 'Lotissement',
};

export interface CertificateGenerationData {
  templateId?: string;
  referenceNumber: string;
  recipientName: string;
  recipientEmail?: string;
  parcelNumber: string;
  issueDate: string;
  expiryDate?: string;
  approvedBy: string;
  // Type-specific data
  additionalData?: Record<string, any>;
}
