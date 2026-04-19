import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { pick, randInt } from './_shared';

/**
 * Génère les sous-tables d'un lotissement (lots + voies) après création de la
 * demande, pour que AdminSubdivision et LotCanvas affichent du contenu en mode
 * test. Récupère lots_data depuis subdivision_requests pour calculer N lots.
 */
export const generateSubdivisionLotsAndRoads = async (
  subdivisionRequestIds: Array<{ id: string }>
) => {
  if (subdivisionRequestIds.length === 0) return;

  const { data: requests, error: fetchErr } = await supabase
    .from('subdivision_requests')
    .select('id, parcel_number, lots_data, number_of_lots, status')
    .in('id', subdivisionRequestIds.map((r) => r.id));
  if (fetchErr || !requests) {
    console.error('Lots/routes: fetch demandes échoué (non-bloquant):', fetchErr);
    return;
  }

  const INTENDED_USES = ['Résidentielle', 'Commerciale', 'Mixte', 'Institutionnelle'];
  const FENCE_TYPES = ['Mur', 'Grillage', 'Haie', null];
  const ROAD_SURFACES = ['Asphalte', 'Pavé', 'Terre battue', 'Béton'];

  const lotRecords: Record<string, unknown>[] = [];
  const roadRecords: Record<string, unknown>[] = [];

  for (const req of requests) {
    const lotsData = (Array.isArray(req.lots_data) ? req.lots_data : []) as Array<Record<string, unknown>>;
    const n = req.number_of_lots ?? lotsData.length ?? 3;
    const baseParcel = req.parcel_number ?? `TEST-SUB-${req.id.slice(0, 6)}`;

    for (let j = 0; j < n; j++) {
      const lot = (lotsData[j] ?? {}) as Record<string, unknown>;
      const area = typeof lot.area_sqm === 'number' ? lot.area_sqm : randInt(200, 800);
      lotRecords.push({
        subdivision_request_id: req.id,
        parcel_number: `${baseParcel}-L${String(j + 1).padStart(2, '0')}`,
        lot_number: String(j + 1),
        lot_label: `Lot ${j + 1}`,
        area_sqm: area,
        perimeter_m: Math.round(Math.sqrt(area) * 4),
        intended_use: pick(INTENDED_USES, j),
        owner_name: `Test Acquéreur ${j + 1}`,
        is_built: j % 3 === 0,
        has_fence: j % 2 === 0,
        fence_type: pick(FENCE_TYPES, j),
        construction_type: j % 3 === 0 ? 'Résidentielle' : null,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][j % 5],
      });
    }

    // 1-2 voies par demande approuvée
    if (req.status === 'approved') {
      const numRoads = randInt(1, 2);
      for (let k = 0; k < numRoads; k++) {
        roadRecords.push({
          subdivision_request_id: req.id,
          road_name: `Voie ${k === 0 ? 'principale' : 'secondaire'}`,
          width_m: k === 0 ? 8 : 5,
          surface_type: pick(ROAD_SURFACES, k),
          is_existing: k === 0,
        });
      }
    }
  }

  for (let i = 0; i < lotRecords.length; i += 200) {
    const batch = lotRecords.slice(i, i + 200);
    const { error } = await supabase.from('subdivision_lots').insert(batch as never);
    if (error) console.error(`Lots de lotissement (batch ${i}, non-bloquant):`, error);
  }

  if (roadRecords.length > 0) {
    const { error } = await supabase.from('subdivision_roads').insert(roadRecords as never);
    if (error) console.error('Voies de lotissement (non-bloquant):', error);
  }
};
