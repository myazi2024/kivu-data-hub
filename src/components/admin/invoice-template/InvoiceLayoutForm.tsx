import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';

export const InvoiceLayoutForm = () => {
  const { config, loading, saving, updateMany } = useInvoiceTemplateConfig();
  const [headerColor, setHeaderColor] = useState('#dc2626');
  const [secondaryColor, setSecondaryColor] = useState('#1f2937');
  const [footerText, setFooterText] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [showQr, setShowQr] = useState(true);
  const [defaultFormat, setDefaultFormat] = useState<'a4' | 'mini'>('a4');

  useEffect(() => {
    if (!loading) {
      setHeaderColor(config.header_color);
      setSecondaryColor(config.secondary_color);
      setFooterText(config.footer_text);
      setPaymentTerms(config.payment_terms);
      setShowQr(config.show_verification_qr);
      setDefaultFormat(config.default_format);
    }
  }, [loading, config]);

  const handleSave = async () => {
    const ok = await updateMany({
      header_color: headerColor,
      secondary_color: secondaryColor,
      footer_text: footerText,
      payment_terms: paymentTerms,
      show_verification_qr: showQr,
      default_format: defaultFormat,
    });
    if (ok) toast.success('Mise en page enregistrée');
    else toast.error('Erreur lors de la sauvegarde');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mise en page</CardTitle>
        <CardDescription>Couleurs, format par défaut, mentions et QR de vérification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Couleur principale (en-tête)</Label>
            <div className="flex gap-2">
              <Input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="w-20 h-11 p-1 cursor-pointer" />
              <Input value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} placeholder="#dc2626" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Couleur secondaire</Label>
            <div className="flex gap-2">
              <Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-20 h-11 p-1 cursor-pointer" />
              <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#1f2937" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Format par défaut</Label>
            <Select value={defaultFormat} onValueChange={(v: 'a4' | 'mini') => setDefaultFormat(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (facture complète)</SelectItem>
                <SelectItem value="mini">Mini (reçu thermique)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Conditions de paiement</Label>
          <Textarea rows={2} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Texte du pied de page</Label>
          <Textarea rows={3} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">QR code de vérification</Label>
            <p className="text-xs text-muted-foreground mt-1">Affiche le QR de vérification publique sur les factures.</p>
          </div>
          <Switch checked={showQr} onCheckedChange={setShowQr} />
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

export default InvoiceLayoutForm;
