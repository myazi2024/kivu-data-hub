import { supabase } from '@/integrations/supabase/client';
import { generateCertificatePDF } from '@/utils/generateCertificatePDF';
import type { CertificateTemplate, CertificateType, CertificateGenerationData } from '@/types/certificate';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificate';

const DEFAULT_TEMPLATES: Record<CertificateType, Partial<CertificateTemplate>> = {
  expertise_immobiliere: {
    certificate_type: 'expertise_immobiliere',
    template_name: 'Expertise Immobilière',
    header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
    header_subtitle: "Service d'Expertise Immobilière Agréé",
    body_text: "CERTIFICAT D'EXPERTISE IMMOBILIÈRE\nLe présent certificat atteste de la valeur vénale estimée du bien immobilier décrit ci-dessous.",
    footer_text: "Document officiel - Toute falsification est passible de poursuites.",
    legal_text: "Ce certificat est valide pour une durée de six (6) mois à compter de sa date d'émission.",
    signature_name: '',
    signature_title: "L'Expert Évaluateur Agréé",
    stamp_text: "CERTIFIÉ\nCONFORME",
    primary_color: '#006432',
    secondary_color: '#004020',
    show_qr_code: true,
    show_border: true,
    show_stamp: true,
  },
  titre_foncier: {
    certificate_type: 'titre_foncier',
    template_name: 'Titre Foncier',
    header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
    header_subtitle: "Service des Titres Fonciers",
    body_text: "CERTIFICAT D'APPROBATION DE TITRE FONCIER\nLe présent certificat atteste que la demande de titre foncier a été approuvée pour la parcelle référencée ci-dessous.",
    footer_text: "Document officiel - Toute falsification est passible de poursuites.",
    legal_text: "Ce certificat est délivré conformément à la loi foncière de la RDC.",
    signature_name: '',
    signature_title: "Le Conservateur des Titres Immobiliers",
    stamp_text: "APPROUVÉ\nCONFORME",
    primary_color: '#1a365d',
    secondary_color: '#0d1b3e',
    show_qr_code: true,
    show_border: true,
    show_stamp: true,
  },
  permis_construire: {
    certificate_type: 'permis_construire',
    template_name: 'Permis de Construire',
    header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
    header_subtitle: "Service d'Urbanisme et Habitat",
    body_text: "PERMIS DE CONSTRUIRE\nLe présent permis autorise le bénéficiaire à réaliser les travaux de construction sur la parcelle référencée ci-dessous.",
    footer_text: "Ce permis est valide pour une durée de 36 mois à compter de sa date d'émission.",
    legal_text: "La construction doit respecter les normes urbanistiques en vigueur. Tout changement doit faire l'objet d'une nouvelle demande.",
    signature_name: '',
    signature_title: "Le Chef de Service d'Urbanisme",
    stamp_text: "AUTORISÉ\nURBANISME",
    primary_color: '#744210',
    secondary_color: '#5a3208',
    show_qr_code: true,
    show_border: true,
    show_stamp: true,
  },
  mutation_fonciere: {
    certificate_type: 'mutation_fonciere',
    template_name: 'Mutation Foncière',
    header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
    header_subtitle: "Service des Mutations Foncières",
    body_text: "CERTIFICAT DE MUTATION FONCIÈRE\nLe présent certificat atteste du transfert de droits fonciers pour la parcelle référencée ci-dessous.",
    footer_text: "Document officiel - Toute falsification est passible de poursuites.",
    legal_text: "Cette mutation a été enregistrée conformément aux dispositions de la loi foncière de la RDC.",
    signature_name: '',
    signature_title: "Le Conservateur des Titres Immobiliers",
    stamp_text: "ENREGISTRÉ\nCONFORME",
    primary_color: '#276749',
    secondary_color: '#1a4731',
    show_qr_code: true,
    show_border: true,
    show_stamp: true,
  },
  lotissement: {
    certificate_type: 'lotissement',
    template_name: 'Lotissement',
    header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
    header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
    header_subtitle: "Service d'Aménagement du Territoire",
    body_text: "CERTIFICAT D'APPROBATION DE LOTISSEMENT\nLe présent certificat atteste que le plan de lotissement de la parcelle référencée ci-dessous a été approuvé.",
    footer_text: "Document officiel - Toute falsification est passible de poursuites.",
    legal_text: "Le lotissement doit être réalisé conformément au plan approuvé. Toute modification nécessite une nouvelle demande.",
    signature_name: '',
    signature_title: "Le Chef de Service d'Aménagement",
    stamp_text: "APPROUVÉ\nAMÉNAGEMENT",
    primary_color: '#553c9a',
    secondary_color: '#3c2a6e',
    show_qr_code: true,
    show_border: true,
    show_stamp: true,
  },
};

export async function generateAndUploadCertificate(
  type: CertificateType,
  data: CertificateGenerationData,
  extraSections?: { label: string; value: string }[],
  userId?: string
): Promise<{ url: string; path: string } | null> {
  try {
    // Try to fetch custom template from DB
    const { data: templateData } = await (supabase as any)
      .from('certificate_templates')
      .select('*')
      .eq('certificate_type', type)
      .eq('is_active', true)
      .single();

    const template = (templateData || DEFAULT_TEMPLATES[type]) as CertificateTemplate;

    // Generate PDF
    const pdfBlob = await generateCertificatePDF({
      template,
      data,
      extraSections,
    });

    // Upload to storage
    const fileName = `cert_${type}_${data.referenceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`;
    const filePath = `certificates/${type}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('expertise-certificates')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('expertise-certificates')
      .getPublicUrl(filePath);

    const certificateUrl = urlData.publicUrl;

    // Log in generated_certificates
    await (supabase as any)
      .from('generated_certificates')
      .insert([{
        certificate_type: type,
        reference_number: data.referenceNumber,
        recipient_name: data.recipientName,
        parcel_number: data.parcelNumber,
        certificate_url: certificateUrl,
        generated_by: userId || null,
        request_id: data.additionalData?.requestId || null,
        metadata: data.additionalData || {},
      }]);

    return { url: certificateUrl, path: filePath };
  } catch (error) {
    console.error('Error generating certificate:', error);
    return null;
  }
}
