import { supabase } from '@/integrations/supabase/client';
import type { SubdivisionRequest } from './types';

export const getPlanRoads = (req: SubdivisionRequest) => req.subdivision_plan_data?.roads || [];
export const getPlanCommonSpaces = (req: SubdivisionRequest) =>
  req.subdivision_plan_data?.commonSpaces || [];
export const getPlanServitudes = (req: SubdivisionRequest) =>
  req.subdivision_plan_data?.servitudes || [];

export const getRoadsCount = (req: SubdivisionRequest): number => getPlanRoads(req).length;
export const getCommonSpacesCount = (req: SubdivisionRequest): number => getPlanCommonSpaces(req).length;

/** Open a stored cadastral-documents path with a short-lived signed URL. */
export async function openDocument(
  path: string | null | undefined,
  onError: (msg?: string) => void,
) {
  if (!path) {
    onError();
    return;
  }
  // Backward compat: legacy rows may still hold a full public URL — open as-is
  if (/^https?:\/\//i.test(path)) {
    window.open(path, '_blank', 'noopener,noreferrer');
    return;
  }
  const { data, error } = await supabase.storage
    .from('cadastral-documents')
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    onError(error?.message);
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
