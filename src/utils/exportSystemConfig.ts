import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

const TABLES = [
  'app_appearance_config',
  'parcel_actions_config',
  'cadastral_search_config',
  'cadastral_results_config',
  'cadastral_contribution_config',
  'cadastral_services_config',
  'system_settings',
  'analytics_charts_config',
  'catalog_config',
  'certificate_templates',
];

export async function exportSystemConfigZip(adminEmail?: string) {
  const zip = new JSZip();
  const manifest: any = {
    exported_at: new Date().toISOString(),
    exported_by: adminEmail || 'unknown',
    tables: [] as { name: string; rows: number }[],
  };

  const results = await Promise.all(
    TABLES.map(async (t) => {
      const { data, error } = await (supabase as any).from(t).select('*');
      return { table: t, data: data || [], error: error?.message || null };
    })
  );

  for (const r of results) {
    zip.file(`${r.table}.json`, JSON.stringify(r.data, null, 2));
    manifest.tables.push({ name: r.table, rows: r.data.length, error: r.error });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system-config-${new Date().toISOString().split('T')[0]}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return manifest;
}
