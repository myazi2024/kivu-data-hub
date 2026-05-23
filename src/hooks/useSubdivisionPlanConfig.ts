import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type PlanConfigKey =
  | 'header'
  | 'watermarks'
  | 'paper_format'
  | 'scale_tiers'
  | 'report_program'
  | 'footer_text';

const QK = ['subdivision_plan_config'] as const;

export interface PlanConfigRow { config_key: string; config_value: any; updated_at?: string; }

export function useSubdivisionPlanConfig() {
  return useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('app_subdivision_plan_config')
        .select('config_key, config_value, updated_at');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((r: PlanConfigRow) => { map[r.config_key] = r.config_value; });
      return map as Record<PlanConfigKey, any>;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePlanConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: PlanConfigKey; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('app_subdivision_plan_config')
        .upsert({ config_key: key, config_value: value, updated_by: user?.id }, { onConflict: 'config_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: 'Configuration enregistrée' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

// ---------- Signature frames ----------
const FRAMES_QK = ['subdivision_signature_frames'] as const;

export interface SignatureFrameRow {
  id: string;
  name: string;
  title_template: string;
  authority: string;
  applies_to: 'urban' | 'rural' | 'both';
  province_filter: string[];
  display_order: number;
  show_seal: boolean;
  active: boolean;
}

export function useSignatureFrames() {
  return useQuery({
    queryKey: FRAMES_QK,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('subdivision_signature_frames')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as SignatureFrameRow[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertSignatureFrame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<SignatureFrameRow>) => {
      const { error } = await (supabase as any).from('subdivision_signature_frames').upsert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: FRAMES_QK }); toast({ title: 'Cadre enregistré' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteSignatureFrame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('subdivision_signature_frames').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: FRAMES_QK }); toast({ title: 'Cadre supprimé' }); },
  });
}

// ---------- Legend symbols ----------
const SYMBOLS_QK = ['subdivision_legend_symbols'] as const;

export interface LegendSymbolRow {
  id: string;
  code: string;
  label: string;
  svg_icon: string;
  color: string;
  source_element_type: string | null;
  display_order: number;
  active: boolean;
}

export function useLegendSymbols() {
  return useQuery({
    queryKey: SYMBOLS_QK,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('subdivision_legend_symbols')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as LegendSymbolRow[];
    },
    staleTime: 60_000,
  });
}

export function useUpsertLegendSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<LegendSymbolRow>) => {
      const { error } = await (supabase as any).from('subdivision_legend_symbols').upsert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: SYMBOLS_QK }); toast({ title: 'Symbole enregistré' }); },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteLegendSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('subdivision_legend_symbols').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: SYMBOLS_QK }); toast({ title: 'Symbole supprimé' }); },
  });
}
