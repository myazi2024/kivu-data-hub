import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics } from '@/lib/adminAnalytics';
import { generateExpertiseCertificatePDF } from '@/utils/generateExpertiseCertificatePDF';
import { getExtendedData } from '@/components/admin/expertise/expertiseHelpers';
import { validateFile, MAX_FILE_SIZES } from '@/utils/fileUploadValidation';
import type { ExpertiseRequest } from '@/types/expertise';

export interface ProcessDraft {
  action: 'complete' | 'reject';
  marketValue: string;
  processingNotes: string;
  rejectionReason: string;
  expertName: string;
  expertTitle: string;
  stampImageUrl: string;
}

export const initialDraft: ProcessDraft = {
  action: 'complete',
  marketValue: '',
  processingNotes: '',
  rejectionReason: '',
  expertName: '',
  expertTitle: "L'Expert Évaluateur Agréé",
  stampImageUrl: '',
};

/**
 * Encapsulates server-backed expertise processing actions.
 * - assign / escalate / reject delegate to SECURITY DEFINER RPCs.
 * - complete generates the PDF (browser fallback while we wait for an edge fn),
 *   uploads to the PRIVATE bucket, then atomically finalizes via RPC.
 */
export function useExpertiseProcessing(refresh: () => void) {
  const { user } = useAuth();
  const { trackAdminAction } = useAdminAnalytics();
  const [processing, setProcessing] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const uploadStamp = useCallback(async (file: File): Promise<string | null> => {
    const validation = validateFile(file, 'image');
    if (!validation.valid) { toast.error(validation.error!); return null; }
    setUploadingStamp(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `stamps/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('expertise-certificates')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      // Stamps are referenced inside generated certificates only; signed URL on the fly.
      const { data: signed, error: signErr } = await supabase.storage
        .from('expertise-certificates')
        .createSignedUrl(path, 60 * 60);
      if (signErr) throw signErr;
      toast.success('Sceau uploadé');
      return signed.signedUrl;
    } catch (err: any) {
      toast.error(`Erreur upload sceau : ${err.message}`);
      return null;
    } finally {
      setUploadingStamp(false);
    }
  }, []);

  const assign = useCallback(async (requestId: string, expertId: string) => {
    const { error } = await (supabase as any).rpc('assign_expertise_request', {
      p_request_id: requestId, p_expert_id: expertId,
    });
    if (error) throw error;
    trackAdminAction({ module: 'expertise', action: 'assign', ref: { request_id: requestId } });
    refresh();
  }, [trackAdminAction, refresh]);

  const escalate = useCallback(async (requestId: string, reason?: string) => {
    const { error } = await (supabase as any).rpc('escalate_expertise_request', {
      p_request_id: requestId, p_reason: reason ?? null,
    });
    if (error) throw error;
    trackAdminAction({ module: 'expertise', action: 'escalate', ref: { request_id: requestId } });
    refresh();
  }, [trackAdminAction, refresh]);

  const reject = useCallback(async (requestId: string, reason: string) => {
    const { error } = await (supabase as any).rpc('reject_expertise_request', {
      p_request_id: requestId, p_reason: reason,
    });
    if (error) throw error;
    trackAdminAction({ module: 'expertise', action: 'reject', ref: { request_id: requestId } });
    refresh();
  }, [trackAdminAction, refresh]);

  const complete = useCallback(async (request: ExpertiseRequest, draft: ProcessDraft) => {
    if (!user) throw new Error('Non authentifié');
    if (!draft.marketValue) throw new Error('Veuillez renseigner la valeur vénale');
    if (request.payment_status !== 'paid') throw new Error('Le certificat ne peut être généré que pour une demande payée');

    toast.info('Génération du certificat en cours…');
    const issueDate = new Date().toISOString();
    const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 6);
    const expiryDate = expiry.toISOString();

    const { extendedData } = getExtendedData(request);
    const pdfBlob = await generateExpertiseCertificatePDF({
      referenceNumber: request.reference_number,
      parcelNumber: request.parcel_number,
      requesterName: request.requester_name,
      requesterEmail: request.requester_email,
      propertyDescription: request.property_description,
      constructionYear: request.construction_year,
      constructionQuality: request.construction_quality,
      numberOfFloors: request.number_of_floors,
      totalBuiltAreaSqm: request.total_built_area_sqm,
      propertyCondition: request.property_condition,
      hasWaterSupply: request.has_water_supply,
      hasElectricity: request.has_electricity,
      hasSewageSystem: request.has_sewage_system,
      hasInternet: request.has_internet || false,
      hasSecuritySystem: request.has_security_system || false,
      hasParking: request.has_parking || false,
      parkingSpaces: request.parking_spaces,
      hasGarden: request.has_garden || false,
      gardenAreaSqm: request.garden_area_sqm,
      roadAccessType: request.road_access_type,
      distanceToMainRoadM: request.distance_to_main_road_m,
      distanceToHospitalKm: request.distance_to_hospital_km,
      distanceToSchoolKm: request.distance_to_school_km,
      distanceToMarketKm: request.distance_to_market_km,
      floodRiskZone: request.flood_risk_zone || false,
      erosionRiskZone: request.erosion_risk_zone || false,
      marketValueUsd: parseFloat(draft.marketValue),
      expertiseDateStr: issueDate,
      issueDate,
      expiryDate,
      approvedBy: draft.expertName || "Bureau d'Information Cadastrale",
      expertName: draft.expertName || undefined,
      expertTitle: draft.expertTitle || undefined,
      stampImageUrl: draft.stampImageUrl || undefined,
      extendedData,
    });

    if (pdfBlob.size > MAX_FILE_SIZES.pdf) {
      throw new Error('Le PDF généré dépasse 10 Mo');
    }

    const safeRef = request.reference_number.replace(/[^a-zA-Z0-9-]/g, '_');
    const filePath = `certificates/${safeRef}_${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('expertise-certificates')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    // Store relative path; consumers fetch a signed URL via RPC.
    const storedRef = filePath;

    const { error: rpcError } = await (supabase as any).rpc('complete_expertise_request', {
      p_request_id: request.id,
      p_market_value: parseFloat(draft.marketValue),
      p_certificate_url: storedRef,
      p_issue_date: issueDate,
      p_expiry_date: expiryDate,
      p_notes: draft.processingNotes || null,
    });
    if (rpcError) throw rpcError;

    trackAdminAction({
      module: 'expertise', action: 'complete',
      ref: { request_id: request.id, parcel_number: request.parcel_number },
    });
    refresh();
  }, [user, trackAdminAction, refresh]);

  const processDecision = useCallback(async (request: ExpertiseRequest, draft: ProcessDraft) => {
    setProcessing(true);
    try {
      if (draft.action === 'complete') {
        await complete(request, draft);
        toast.success('Certificat généré et notifié');
      } else {
        if (!draft.rejectionReason) throw new Error('Veuillez indiquer la raison du rejet');
        await reject(request.id, draft.rejectionReason);
        toast.success('Demande rejetée');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du traitement');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [complete, reject]);

  return { processing, uploadingStamp, uploadStamp, assign, escalate, reject, processDecision };
}
