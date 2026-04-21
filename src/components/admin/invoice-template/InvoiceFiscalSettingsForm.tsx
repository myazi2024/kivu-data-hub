import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';

export const InvoiceFiscalSettingsForm = () => {
  const { config, loading, saving, updateMany } = useInvoiceTemplateConfig();
  const [tvaPct, setTvaPct] = useState('16');
  const [tvaLabel, setTvaLabel] = useState('TVA (16%)');
  const [showDgi, setShowDgi] = useState(true);
  const [prefix, setPrefix] = useState('BIC');

  useEffect(() => {
    if (!loading) {
      setTvaPct(String(Math.round(config.tva_rate * 10000) / 100));
      setTvaLabel(config.tva_label);
      setShowDgi(config.show_dgi_mention);
      setPrefix(config.invoice_number_prefix);
    }
  }, [loading, config]);

  const handleSave = async () => {
    const rate = Number(tvaPct) / 100;
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      toast.error('Taux de TVA invalide (0-100)');
      return;
    }
    const ok = await updateMany({
      tva_rate: rate,
      tva_label: tvaLabel,
      show_dgi_mention: showDgi,
      invoice_number_prefix: prefix,
    });
    if (ok) toast.success('Paramètres fiscaux enregistrés');
    else toast.error('Erreur lors de la sauvegarde');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres fiscaux</CardTitle>
        <CardDescription>TVA, mentions DGI et numérotation des factures.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Taux de TVA (%)</Label>
            <Input type="number" step="0.01" min="0" max="100" value={tvaPct} onChange={(e) => setTvaPct(e.target.value)} />
            <p className="text-xs text-muted-foreground">Appliqué à toutes les factures générées.</p>
          </div>
          <div className="space-y-2">
            <Label>Libellé TVA affiché</Label>
            <Input value={tvaLabel} onChange={(e) => setTvaLabel(e.target.value)} placeholder="TVA (16%)" />
          </div>
          <div className="space-y-2">
            <Label>Préfixe numéro de facture</Label>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="BIC" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">Mention « FACTURE NORMALISÉE »</Label>
            <p className="text-xs text-muted-foreground mt-1">Affiche le bandeau de conformité DGI sur les factures A4.</p>
          </div>
          <Switch checked={showDgi} onCheckedChange={setShowDgi} />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFiscalSettingsForm;
