import { supabase } from '@/integrations/supabase/client';

export type DocumentType = 'report' | 'invoice' | 'permit' | 'certificate' | 'expertise' | 'mortgage_receipt';

interface CreateVerificationParams {
  documentType: DocumentType;
  parcelNumber: string;
  clientName?: string | null;
  clientEmail?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Creates a document verification record and returns the verification code + URL.
 * Must be called before generating the PDF so the QR code points to a real URL.
 */
export async function createDocumentVerification(params: CreateVerificationParams): Promise<{
  verificationCode: string;
  verifyUrl: string;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user for document verification');
      return null;
    }

    // Generate code via RPC
    const { data: codeData, error: codeError } = await supabase.rpc('generate_verification_code');
    if (codeError || !codeData) {
      console.error('Failed to generate verification code:', codeError);
      return null;
    }

    const verificationCode = codeData as string;

    const { error: insertError } = await supabase
      .from('document_verifications')
      .insert({
        verification_code: verificationCode,
        document_type: params.documentType,
        parcel_number: params.parcelNumber,
        user_id: user.id,
        client_name: params.clientName || null,
        client_email: params.clientEmail || null,
        metadata: params.metadata || {},
      });

    if (insertError) {
      console.error('Failed to insert document verification:', insertError);
      return null;
    }

    const verifyUrl = `${window.location.origin}/verify/${verificationCode}`;

    return { verificationCode, verifyUrl };
  } catch (error) {
    console.error('Document verification creation failed:', error);
    return null;
  }
}
