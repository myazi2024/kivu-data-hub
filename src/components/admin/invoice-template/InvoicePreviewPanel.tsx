import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplateConfig, type InvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { useCompanyLegalInfo, type CompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';
import { generateInvoicePDF, type CadastralInvoice } from '@/lib/pdf';
import type { CadastralService } from '@/hooks/useCadastralServices';

const buildSampleInvoice = (prefix: string): CadastralInvoice => ({
  id: 'preview',
  parcel_number: 'KIN/GOM/2025/0001',
  search_date: new Date().toISOString(),
  selected_services: ['svc-preview-1', 'svc-preview-2'],
  total_amount_usd: 50,
  status: 'paid',
  invoice_number: `${prefix}-PREVIEW-0001`,
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

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

const InvoicePreviewA4 = ({ config, info }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo }) => {
  const total = 50;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border"
      style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10pt' }}
    >
      {/* Header */}
      <div style={{ backgroundColor: config.header_color, color: '#fff', padding: '12px 16px', borderRadius: '4px' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {info.logo_url && (
              <img src={info.logo_url} alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: 2 }} />
            )}
            <div style={{ fontSize: '9pt', lineHeight: 1.4 }}>
              <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0 }}>{info.legal_name}</p>
              {info.legal_form && <p style={{ margin: 0, opacity: 0.9 }}>{info.legal_form}{info.capital_amount ? ` • Capital : ${info.capital_amount}` : ''}</p>}
              <p style={{ margin: 0, opacity: 0.9 }}>{info.address_line1}{info.address_line2 ? `, ${info.address_line2}` : ''}</p>
              <p style={{ margin: 0, opacity: 0.9 }}>{info.city}, {info.province}, {info.country}</p>
              {(info.phone || info.email) && <p style={{ margin: 0, opacity: 0.9 }}>{info.phone}{info.phone && info.email ? ' • ' : ''}{info.email}</p>}
              {info.website && <p style={{ margin: 0, opacity: 0.9 }}>{info.website}</p>}
            </div>
          </div>
          <div className="text-right" style={{ fontSize: '9pt' }}>
            <p style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0 }}>{config.show_dgi_mention ? 'FACTURE NORMALISÉE' : 'FACTURE'}</p>
            <p style={{ margin: '4px 0 0' }}>N° {config.invoice_number_prefix}-PREVIEW-0001</p>
            <p style={{ margin: 0, opacity: 0.9 }}>Émise le {dateStr}</p>
            <p style={{ margin: 0, opacity: 0.9 }}>Payée le {dateStr}</p>
          </div>
        </div>
      </div>

      {/* Identifiants légaux */}
      <div style={{ marginTop: 12, padding: '6px 10px', background: '#f3f4f6', borderRadius: 4, fontSize: '8.5pt', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span><strong>RCCM:</strong> {info.rccm}</span>
        <span><strong>ID Nat:</strong> {info.id_nat}</span>
        <span><strong>NIF:</strong> {info.nif}</span>
        {info.tva_number && <span><strong>N° TVA:</strong> {info.tva_number}</span>}
      </div>

      {/* Client + Référence */}
      <div className="grid grid-cols-2 gap-6" style={{ marginTop: 16 }}>
        <div>
          <p style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>Facturé à</p>
          <p style={{ margin: '4px 0 0', fontWeight: 600 }}>Jean Mukendi</p>
          <p style={{ margin: 0, color: '#4b5563' }}>client@example.cd</p>
          <p style={{ margin: 0, color: '#4b5563' }}>Avenue de la Paix 12, Kinshasa</p>
        </div>
        <div className="text-right">
          <p style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>Référence</p>
          <p style={{ margin: '4px 0 0' }}>Parcelle: <strong>KIN/GOM/2025/0001</strong></p>
          <p style={{ margin: 0, color: '#4b5563' }}>Zone: Gombe</p>
          <p style={{ margin: 0, color: '#4b5563' }}>Mode: Mobile Money</p>
        </div>
      </div>

      {/* Tableau prestations */}
      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
        <thead>
          <tr style={{ backgroundColor: config.secondary_color, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px' }}>Désignation</th>
            <th style={{ textAlign: 'center', padding: '8px 10px', width: 60 }}>Qté</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', width: 100 }}>P.U. (USD)</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', width: 100 }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px 10px' }}>Fiche cadastrale complète</td>
            <td style={{ padding: '8px 10px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>30,00</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>30,00</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={{ padding: '8px 10px' }}>Historique de propriété</td>
            <td style={{ padding: '8px 10px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>20,00</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>20,00</td>
          </tr>
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ marginTop: 12, marginLeft: 'auto', width: '50%', fontSize: '9.5pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Sous-total</span><span>{fmt(total)} USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#6b7280' }}><span>Remise</span><span>0,00 USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #e5e7eb' }}><span>Base HT</span><span>{fmt(baseHT)} USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{config.tva_label}</span><span>{fmt(tva)} USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', marginTop: 4, background: config.header_color, color: '#fff', fontWeight: 'bold', borderRadius: 3 }}>
          <span>TOTAL TTC</span><span>{fmt(total)} USD</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '7.5pt', color: '#6b7280', textAlign: 'right' }}>Équivalent : {fmt(total * 2800)} CDF (taux 2 800)</p>
      </div>

      {/* Mentions DGI */}
      {config.show_dgi_mention && (
        <div style={{ marginTop: 16, padding: 8, border: '1px dashed #9ca3af', borderRadius: 4, fontSize: '8pt', color: '#374151' }}>
          <p style={{ margin: 0 }}><strong>Mention DGI :</strong> Facture normalisée conforme à la réglementation fiscale RDC.</p>
          <p style={{ margin: 0 }}>Code de validation DGI : <strong>DGI-PREVIEW-XXXX-XXXX</strong></p>
        </div>
      )}

      {/* Conditions + banque + QR */}
      <div className="grid grid-cols-3 gap-4" style={{ marginTop: 16, fontSize: '8pt' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <p style={{ fontWeight: 'bold', margin: 0 }}>Conditions de paiement</p>
          <p style={{ margin: '2px 0 8px', color: '#4b5563' }}>{config.payment_terms}</p>
          {(info.bank_name || info.bank_account) && (
            <>
              <p style={{ fontWeight: 'bold', margin: 0 }}>Coordonnées bancaires</p>
              <p style={{ margin: '2px 0', color: '#4b5563' }}>
                {info.bank_name && <>Banque : {info.bank_name}<br /></>}
                {info.bank_account && <>IBAN : {info.bank_account}<br /></>}
                {info.bank_swift && <>SWIFT : {info.bank_swift}</>}
              </p>
            </>
          )}
        </div>
        {config.show_verification_qr && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 12px 12px', border: '1px solid #000' }} />
            <p style={{ margin: '4px 0 0', fontSize: '7pt', color: '#6b7280' }}>QR de vérification</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 8, borderTop: '1px solid #e5e7eb', fontSize: '7.5pt', color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>
        {config.footer_text}
      </div>
    </div>
  );
};

const InvoicePreviewMini = ({ config, info }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo }) => {
  const total = 50;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border"
      style={{ width: 280, padding: 12, fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.4 }}
    >
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 8 }}>
        {info.logo_url && <img src={info.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'contain', margin: '0 auto 4px' }} />}
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11px' }}>{info.legal_name}</p>
        <p style={{ margin: 0 }}>{info.address_line1}</p>
        <p style={{ margin: 0 }}>{info.city}</p>
        <p style={{ margin: 0 }}>NIF: {info.nif}</p>
        <p style={{ margin: 0 }}>RCCM: {info.rccm}</p>
      </div>

      <div style={{ textAlign: 'center', padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{config.show_dgi_mention ? 'FACTURE NORMALISÉE' : 'FACTURE'}</p>
        <p style={{ margin: 0 }}>N° {config.invoice_number_prefix}-PREVIEW-0001</p>
        <p style={{ margin: 0 }}>{dateStr}</p>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <p style={{ margin: 0 }}>Client : Jean Mukendi</p>
        <p style={{ margin: 0 }}>Parcelle : KIN/GOM/2025/0001</p>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fiche cadastrale</span><span>30,00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hist. propriété</span><span>20,00</span></div>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base HT</span><span>{fmt(baseHT)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{config.tva_label}</span><span>{fmt(tva)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: 4 }}><span>TOTAL</span><span>{fmt(total)} USD</span></div>
      </div>

      {config.show_dgi_mention && (
        <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: '9px' }}>Code DGI : PREVIEW-XXXX</p>
      )}

      {config.show_verification_qr && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px', border: '1px solid #000' }} />
          <p style={{ margin: '2px 0 0', fontSize: '8px' }}>Vérification</p>
        </div>
      )}

      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '9px', fontStyle: 'italic' }}>{config.footer_text}</p>
    </div>
  );
};

export const InvoicePreviewPanel = () => {
  const { config, loading, refetch } = useInvoiceTemplateConfig();
  const { info } = useCompanyLegalInfo();
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'a4' | 'mini'>(config.default_format || 'a4');
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Compute scale to fit A4 (210mm ~ 794px @96dpi) into wrapper width
  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current || format !== 'a4') {
        setScale(1);
        return;
      }
      const w = wrapperRef.current.clientWidth;
      const A4_PX = 794; // 210mm at 96dpi
      setScale(Math.min(1, (w - 32) / A4_PX));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [format]);

  const handleGenerate = async (fmtKey: 'a4' | 'mini') => {
    setGenerating(true);
    try {
      await generateInvoicePDF(buildSampleInvoice(config.invoice_number_prefix), buildSampleServices(), fmtKey, `apercu_facture_${fmtKey}.pdf`);
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
          Rendu fidèle (A4 ou mini reçu thermique) mis à jour en direct selon la configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-border p-1 bg-muted">
            <button
              onClick={() => setFormat('a4')}
              className={`px-4 py-1.5 text-sm rounded transition ${format === 'a4' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'}`}
            >
              A4
            </button>
            <button
              onClick={() => setFormat('mini')}
              className={`px-4 py-1.5 text-sm rounded transition ${format === 'mini' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'}`}
            >
              Mini reçu
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
          </Button>
        </div>

        <div ref={wrapperRef} className="bg-muted/40 rounded-lg p-4 overflow-auto" style={{ minHeight: 400 }}>
          {format === 'a4' ? (
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '210mm', height: `${297 * scale}mm` }}>
              <InvoicePreviewA4 config={config} info={info} />
            </div>
          ) : (
            <div className="py-4">
              <InvoicePreviewMini config={config} info={info} />
            </div>
          )}
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
