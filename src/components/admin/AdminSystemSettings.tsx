import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  timezone: { label: 'Fuseau horaire', description: 'Format IANA (ex: Africa/Kinshasa)' },
  default_currency: { label: 'Devise par défaut', description: 'Code ISO (USD, CDF)' },
  locale: { label: 'Locale', description: 'Format BCP 47 (fr-CD, en-US)' },
  max_upload_mb: { label: 'Taille upload max (MB)', description: 'Nombre entier' },
  latency_thresholds: { label: 'Seuils latence (ms)', description: 'JSON {"db":500,"auth":300,"storage":500,"edge":2000}' },
  audit_logs_purge_days: { label: 'Rétention logs audit (jours)', description: 'Cron purge mensuel' },
  test_mode_max_hours: { label: 'Alerte mode test (h)', description: 'Heures avant alerte si test mode actif' },
  health_db_threshold_ms: { label: 'Seuil santé BD (ms)', description: 'Au-delà, la base est marquée dégradée' },
  health_edge_threshold_ms: { label: 'Seuil santé Edge (ms)', description: 'Au-delà, les edge functions sont marquées dégradées' },
};

const AdminSystemSettings = () => {
  const { rows, loading, updateSetting, refetch } = useSystemSettings();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, string> = {};
    rows.forEach(r => {
      init[r.setting_key] = typeof r.setting_value === 'object' ? JSON.stringify(r.setting_value) : String(r.setting_value).replace(/^"|"$/g, '');
    });
    setEdits(init);
  }, [rows]);

  const handleSave = async (key: string) => {
    setSaving(key);
    let value: any = edits[key];
    try {
      if (value.startsWith('{') || value.startsWith('[')) value = JSON.parse(value);
      else if (!isNaN(Number(value))) value = Number(value);
      else value = String(value);
    } catch { /* keep as string */ }
    await updateSetting(key, value);
    setSaving(null);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />Paramètres système</h2>
        <p className="text-xs text-muted-foreground">Configuration globale de l'application</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Paramètres</CardTitle>
          <CardDescription className="text-xs">Modifications appliquées immédiatement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map(row => {
            const meta = SETTING_LABELS[row.setting_key] || { label: row.setting_key, description: '' };
            return (
              <div key={row.setting_key} className="space-y-1.5 pb-3 border-b last:border-b-0">
                <Label className="text-xs">{meta.label}</Label>
                <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                <div className="flex gap-2">
                  <Input
                    value={edits[row.setting_key] || ''}
                    onChange={(e) => setEdits({ ...edits, [row.setting_key]: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                  <Button size="sm" onClick={() => handleSave(row.setting_key)} disabled={saving === row.setting_key}>
                    {saving === row.setting_key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemSettings;
