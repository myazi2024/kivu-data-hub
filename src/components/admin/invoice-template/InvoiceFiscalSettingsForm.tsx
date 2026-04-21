import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplate } from '@/contexts/InvoiceTemplateContext';

export const InvoiceFiscalSettingsForm = () => {
  const { config, loading, savingConfig, isConfigDirty, setConfigDraft, saveConfig, revertConfig } = useInvoiceTemplate();

  const tvaPct = String(Math.round(config.tva_rate * 10000) / 100);

  const handleSave = async () => {
    if (config.tva_rate < 0 || config.tva_rate > 1 || Number.isNaN(config.tva_rate)) {
      toast.error('Taux de TVA invalide (0-100)');
      return;
    }
    const ok = await saveConfig();
    if (ok) toast.success('Paramètres fiscaux enregistrés');
    else toast.error('Erreur lors de la sauvegarde');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Paramètres fiscaux
          {isConfigDirty && <Badge variant="outline" className="text-warning border-warning">Modifications non enregistrées</Badge>}
        </CardTitle>
        <CardDescription>TVA, mentions DGI et numérotation des factures. Aperçu mis à jour en temps réel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Taux de TVA (%)</Label>
            <Input
              type="number" step="0.01" min="0" max="100"
              value={tvaPct}
              onChange={(e) => setConfigDraft({ tva_rate: Number(e.target.value) / 100 })}
            />
            <p className="text-xs text-muted-foreground">Appliqué à toutes les factures générées.</p>
          </div>
          <div className="space-y-2">
            <Label>Libellé TVA affiché</Label>
            <Input value={config.tva_label} onChange={(e) => setConfigDraft({ tva_label: e.target.value })} placeholder="TVA (16%)" />
          </div>
          <div className="space-y-2">
            <Label>Préfixe numéro de facture</Label>
            <Input value={config.invoice_number_prefix} onChange={(e) => setConfigDraft({ invoice_number_prefix: e.target.value })} placeholder="BIC" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">Mention « FACTURE NORMALISÉE »</Label>
            <p className="text-xs text-muted-foreground mt-1">Affiche le bandeau de conformité DGI sur les factures A4.</p>
          </div>
          <Switch checked={config.show_dgi_mention} onCheckedChange={(v) => setConfigDraft({ show_dgi_mention: v })} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isConfigDirty && (
            <Button variant="ghost" onClick={revertConfig} disabled={savingConfig}>
              <RotateCcw className="h-4 w-4 mr-2" />Annuler
            </Button>
          )}
          <Button onClick={handleSave} disabled={savingConfig || !isConfigDirty}>
            {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFiscalSettingsForm;
