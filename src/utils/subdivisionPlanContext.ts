/**
 * Résout le contexte administratif (urbain vs rural) d'une parcelle pour
 * adapter les libellés des cadres de signature dans le plan de lotissement.
 *
 * - Contexte URBAIN : la parcelle a une `commune` ET une `ville`.
 *   → cadres : « Approuvé par la ville de {ville} »,
 *              « Vu par le Bureau de la Commune de {commune} ».
 * - Contexte RURAL : sinon, on utilise `territoire` / `groupement`.
 *   → cadres : « Approuvé par le Bureau de la Chefferie {groupement} »,
 *              « Vu par le Chef du Territoire de {territoire} ».
 *
 * Le 1er cadre reste toujours « Certifié conforme au plan cadastral —
 * Bureau d'Information Cadastrale ».
 */
import { supabase } from '@/integrations/supabase/client';

export interface SignatureFrame {
  title: string;
  authority: string;
}

export interface SubdivisionPlanContext {
  isUrban: boolean;
  commune?: string | null;
  ville?: string | null;
  territoire?: string | null;
  groupement?: string | null;
  province?: string | null;
  frames: [SignatureFrame, SignatureFrame, SignatureFrame];
}

interface ParcelGeoFields {
  commune?: string | null;
  ville?: string | null;
  territoire?: string | null;
  groupement?: string | null;
  province?: string | null;
}

const trim = (v?: string | null) => (typeof v === 'string' ? v.trim() : '') || '';

export function buildSignatureFrames(p: ParcelGeoFields): SubdivisionPlanContext {
  const commune = trim(p.commune);
  const ville = trim(p.ville);
  const territoire = trim(p.territoire);
  const groupement = trim(p.groupement);
  const isUrban = !!(commune && ville);

  const cadastral: SignatureFrame = {
    title: 'Certifié conforme au plan cadastral',
    authority: "Bureau d'Information Cadastrale",
  };

  let urbanOrRural1: SignatureFrame;
  let urbanOrRural2: SignatureFrame;

  if (isUrban) {
    urbanOrRural1 = {
      title: `Approuvé par la ville de ${ville}`,
      authority: 'Hôtel de Ville',
    };
    urbanOrRural2 = {
      title: `Vu par le Bureau de la Commune${commune ? ' de ' + commune : ''}`,
      authority: 'Bureau Communal',
    };
  } else {
    urbanOrRural1 = {
      title: `Approuvé par le Bureau de la Chefferie${groupement ? ' ' + groupement : ''}`,
      authority: 'Chefferie',
    };
    urbanOrRural2 = {
      title: `Vu par le Chef du Territoire${territoire ? ' de ' + territoire : ''}`,
      authority: 'Administration du Territoire',
    };
  }

  return {
    isUrban,
    commune: commune || null,
    ville: ville || null,
    territoire: territoire || null,
    groupement: groupement || null,
    province: trim(p.province) || null,
    frames: [cadastral, urbanOrRural1, urbanOrRural2],
  };
}

/**
 * Charge la parcelle-mère et calcule le contexte (urbain/rural) + cadres.
 * Fallback sur `parent_parcel_location` parsé sommairement si la parcelle
 * n'est pas trouvée.
 */
export async function resolveSubdivisionPlanContext(
  parcelNumber: string,
  fallbackLocation?: string | null,
): Promise<SubdivisionPlanContext> {
  let geo: ParcelGeoFields = {};
  try {
    const { data } = await (supabase as any)
      .from('cadastral_parcels')
      .select('commune, ville, territoire, groupement, province')
      .eq('parcel_number', parcelNumber)
      .maybeSingle();
    if (data) geo = data;
  } catch {
    /* ignore */
  }
  // Best-effort fallback: cherche "Commune de X" / "Ville de Y" dans le texte libre
  if (!geo.commune && !geo.ville && !geo.territoire && fallbackLocation) {
    const loc = fallbackLocation;
    const mVille = /ville de\s+([\p{L}\- ]{2,40})/iu.exec(loc);
    const mCommune = /commune de\s+([\p{L}\- ]{2,40})/iu.exec(loc);
    const mTerr = /territoire de\s+([\p{L}\- ]{2,40})/iu.exec(loc);
    if (mVille) geo.ville = mVille[1].trim();
    if (mCommune) geo.commune = mCommune[1].trim();
    if (mTerr) geo.territoire = mTerr[1].trim();
  }
  return buildSignatureFrames(geo);
}
