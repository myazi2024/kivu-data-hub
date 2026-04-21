import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { useCompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';
import { generateInvoicePDF, type CadastralInvoice } from '@/lib/pdf';
import type { CadastralService } from '@/hooks/useCadastralServices';

const buildSampleInvoice = (): CadastralInvoice => ({
  id: 'preview',
  parcel_number: 'KIN/GOM/2025/0001',
  search_date: new Date().toISOString(),
  selected_services: ['svc-preview-1', 'svc-preview-2'],
  total_amount_usd: 50,
  status: 'paid',
  invoice_number: 'BIC-PREVIEW-0001',
  client_name: 'Jean Mukendi',
  client_email: 'client@example.cd',
  client_organization: null,
  client_type: 'individual',
  client_address: 'Avenue de la Paix 12, Kinshasa',
  geographical_zone: 'Gombe',
  payment_method: 'mobile_money',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  paid_at: new Date().toISOString(),
  currency_code: 'USD',
  exchange_rate_used: 2800,
  discount_amount_usd: 0,
  original_amount_usd: 50,
});

const buildSampleServices = (): CadastralService[] => ([
  { id: 'svc-preview-1', service_id: 'svc-preview-1', name: 'Fiche cadastrale complète', description: '', price: 30, category: 'cadastre', icon_name: 'file', is_active: true } as any,
  { id: 'svc-preview-2', service_id: 'svc-preview-2', name: 'Historique de propriété', description: '', price: 20, category: 'cadastre', icon_name: 'history', is_active: true } as any,
]);

export const InvoicePreviewPanel = () => {
  const { config, loading } = useInvoiceTemplateConfig();
  const { info } = useCompanyLegalInfo();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (format: 'a4' | 'mini') => {
    setGenerating(true);
    try {
      await generateInvoicePDF(buildSampleInvoice(), buildSampleServices(), format, `apercu_facture_${format}.pdf`);
      toast.success('Aperçu PDF généré');
    } catch (e: any) {
      toast.error(e.message || 'Erreur génération PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aperçu de la facture</CardTitle>
        <CardDescription>
          Aperçu visuel et génération d'un PDF d'exemple avec la configuration courante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mini-preview HTML */}
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="px-6 py-4 text-white" style={{ backgroundColor: config.header_color }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs opacity-90">{info.legal_name}</p>
                <p className="text-[10px] opacity-75">{info.address_line1}, {info.city}</p>
                <p className="text-[10px] opacity-75">NIF: {info.nif} • RCCM: {info.rccm}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold">{config.show_dgi_mention ? 'FACTURE NORMALISÉE' : 'FACTURE'}</p>
                <p className="text-[10px] opacity-90">N° {config.invoice_number_prefix}-PREVIEW-0001</p>
              </div>
            </div>
          </div>
          <div className="p-6 text-foreground space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold uppercase text-muted-foreground text-[10px]">Facturé à</p>
                <p>Jean Mukendi</p>
                <p className="text-muted-foreground">client@example.cd</p>
              </div>
              <div className="text-right">
                <p className="font-semibold uppercase text-muted-foreground text-[10px]">Référence</p>
                <p>Parcelle: KIN/GOM/2025/0001</p>
                <p className="text-muted-foreground">Zone: Gombe</p>
              </div>
            </div>
            <table className="w-full text-xs border-t border-b">
              <thead>
                <tr style={{ backgroundColor: config.secondary_color, color: '#fff' }}>
                  <th className="text-left p-2">Désignation</th>
                  <th className="text-right p-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-2">Fiche cadastrale complète</td><td className="text-right p-2">30,00 USD</td></tr>
                <tr><td className="p-2">Historique de propriété</td><td className="text-right p-2">20,00 USD</td></tr>
              </tbody>
            </table>
            <div className="text-xs space-y-1 ml-auto w-1/2">
              <div className="flex justify-between"><span>Base HT</span><span>{(50 / (1 + config.tva_rate)).toFixed(2)} USD</span></div>
              <div className="flex justify-between"><span>{config.tva_label}</span><span>{(50 - 50 / (1 + config.tva_rate)).toFixed(2)} USD</span></div>
              <div className="flex justify-between font-bold pt-1 border-t"><span>TOTAL TTC</span><span>50,00 USD</span></div>
            </div>
            <p className="text-[10px] text-muted-foreground italic pt-2 border-t">{config.payment_terms}</p>
            <p className="text-[10px] text-muted-foreground">{config.footer_text}</p>
            {config.show_verification_qr && (
              <p className="text-[10px] text-right text-muted-foreground italic">[ QR de vérification activé ]</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => handleGenerate('mini')} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Aperçu PDF Mini
          </Button>
          <Button onClick={() => handleGenerate('a4')} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Aperçu PDF A4
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicePreviewPanel;
