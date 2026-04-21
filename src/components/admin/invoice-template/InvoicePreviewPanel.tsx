import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplateConfig, type InvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { useCompanyLegalInfo, type CompanyLegalInfo, TAX_REGIME_LABELS } from '@/hooks/useCompanyLegalInfo';
import { generateInvoicePDF, type CadastralInvoice } from '@/lib/pdf';
import { downloadInvoicePDF } from '@/lib/invoiceDownload';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { supabase } from '@/integrations/supabase/client';

type ClientType = 'individual' | 'company';
type StatusVariant = 'paid' | 'pending' | 'failed';
type DiscountPct = 0 | 10 | 25;

interface SimVariants {
  clientType: ClientType;
  status: StatusVariant;
  discountPct: DiscountPct;
  paymentMethod: string;
  showBank: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
};

const STATUS_LABELS: Record<StatusVariant, string> = {
  paid: 'Payée',
  pending: 'En attente',
  failed: 'Échec',
};

const SAMPLE_TOTAL = 50;

const buildSampleInvoice = (prefix: string, v: SimVariants): CadastralInvoice => {
  const discountAmount = (SAMPLE_TOTAL * v.discountPct) / 100;
  const isCompany = v.clientType === 'company';
  return {
    id: 'preview',
    parcel_number: 'KIN/GOM/2025/0001',
    search_date: new Date().toISOString(),
    selected_services: ['svc-preview-1', 'svc-preview-2'],
    total_amount_usd: SAMPLE_TOTAL - discountAmount,
    status: v.status,
    invoice_number: `${prefix}-PREVIEW-0001`,
    client_name: isCompany ? 'SARL Mukendi & Frères' : 'Jean Mukendi',
    client_email: 'client@example.cd',
    client_organization: isCompany ? 'SARL Mukendi & Frères' : null,
    client_type: v.clientType,
    client_nif: isCompany ? 'A1234567B' : null,
    client_rccm: isCompany ? 'CD/KIN/RCCM/24-B-12345' : null,
    client_id_nat: isCompany ? null : '01-A123-B456789',
    client_address: 'Avenue de la Paix 12, Kinshasa',
    client_tax_regime: isCompany ? 'reel' : null,
    geographical_zone: 'Gombe',
    payment_method: v.paymentMethod,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paid_at: v.status === 'paid' ? new Date().toISOString() : null,
    currency_code: 'USD',
    exchange_rate_used: 2800,
    discount_amount_usd: discountAmount,
    original_amount_usd: SAMPLE_TOTAL,
  };
};

const buildSampleServices = (): CadastralService[] => ([
  { id: 'svc-preview-1', service_id: 'svc-preview-1', name: 'Fiche cadastrale complète', description: '', price: 30, category: 'cadastre', icon_name: 'file', is_active: true } as any,
  { id: 'svc-preview-2', service_id: 'svc-preview-2', name: 'Historique de propriété', description: '', price: 20, category: 'cadastre', icon_name: 'history', is_active: true } as any,
]);

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

const StatusBadge = ({ status }: { status: StatusVariant }) => {
  const colors: Record<StatusVariant, string> = {
    paid: '#27ae60',
    pending: '#e67e22',
    failed: '#c0392b',
  };
  return <span style={{ color: colors[status], fontWeight: 'bold' }}>{STATUS_LABELS[status].toUpperCase()}</span>;
};

const InvoicePreviewA4 = ({ config, info, variants }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo; variants: SimVariants }) => {
  const subtotal = SAMPLE_TOTAL;
  const discount = (subtotal * variants.discountPct) / 100;
  const total = subtotal - discount;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const isCompany = variants.clientType === 'company';
  const showBank = variants.showBank && (info.bank_name || info.bank_account);

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
            {variants.status === 'paid' && <p style={{ margin: 0, opacity: 0.9 }}>Payée le {dateStr}</p>}
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
          <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{isCompany ? 'SARL Mukendi & Frères' : 'Jean Mukendi'}</p>
          <p style={{ margin: 0, color: '#4b5563' }}>client@example.cd</p>
          <p style={{ margin: 0, color: '#4b5563' }}>Avenue de la Paix 12, Kinshasa</p>
          {isCompany ? (
            <>
              <p style={{ margin: 0, color: '#4b5563' }}>NIF: A1234567B</p>
              <p style={{ margin: 0, color: '#4b5563' }}>RCCM: CD/KIN/RCCM/24-B-12345</p>
              <p style={{ margin: 0, color: '#4b5563' }}>Régime: {TAX_REGIME_LABELS['reel']}</p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#4b5563' }}>ID National: 01-A123-B456789</p>
          )}
        </div>
        <div className="text-right">
          <p style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', margin: 0 }}>Référence</p>
          <p style={{ margin: '4px 0 0' }}>Parcelle: <strong>KIN/GOM/2025/0001</strong></p>
          <p style={{ margin: 0, color: '#4b5563' }}>Zone: Gombe</p>
          <p style={{ margin: 0, color: '#4b5563' }}>Mode: {PAYMENT_METHOD_LABELS[variants.paymentMethod] || variants.paymentMethod}</p>
          <p style={{ margin: '4px 0 0' }}>Statut: <StatusBadge status={variants.status} /></p>
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
          <tr style={{ borderBottom: `1px solid ${config.secondary_color}33` }}>
            <td style={{ padding: '8px 10px' }}>Fiche cadastrale complète</td>
            <td style={{ padding: '8px 10px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>30,00</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>30,00</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${config.secondary_color}33` }}>
            <td style={{ padding: '8px 10px' }}>Historique de propriété</td>
            <td style={{ padding: '8px 10px', textAlign: 'center' }}>1</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>20,00</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>20,00</td>
          </tr>
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ marginTop: 12, marginLeft: 'auto', width: '50%', fontSize: '9.5pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Sous-total</span><span>{fmt(subtotal)} USD</span></div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#c0392b' }}>
            <span>Remise commerciale ({variants.discountPct}%)</span><span>-{fmt(discount)} USD</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #e5e7eb' }}><span>Base HT</span><span>{fmt(baseHT)} USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{config.tva_label}</span><span>{fmt(tva)} USD</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', marginTop: 4, background: config.header_color, color: '#fff', fontWeight: 'bold', borderRadius: 3 }}>
          <span>TOTAL TTC</span><span>{fmt(total)} USD</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '7.5pt', color: '#6b7280', textAlign: 'right' }}>Équivalent : {fmt(total * 2800)} CDF (taux 2 800)</p>
      </div>

      {/* Mentions DGI — placeholder explicite */}
      {config.show_dgi_mention && (
        <div style={{ marginTop: 16, padding: 8, border: '1px dashed #9ca3af', borderRadius: 4, fontSize: '8pt', color: '#374151' }}>
          <p style={{ margin: 0 }}><strong>Mention DGI :</strong> Facture normalisée conforme à la réglementation fiscale RDC.</p>
          <p style={{ margin: '4px 0 0', padding: '4px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 3, fontStyle: 'italic' }}>
            Le code de validation DGI réel sera injecté lors de la génération de chaque facture.
          </p>
        </div>
      )}

      {/* Conditions + banque + QR */}
      <div className="grid grid-cols-3 gap-4" style={{ marginTop: 16, fontSize: '8pt' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <p style={{ fontWeight: 'bold', margin: 0 }}>Conditions de paiement</p>
          <p style={{ margin: '2px 0 8px', color: '#4b5563' }}>{config.payment_terms}</p>
          {showBank && (
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
            <p style={{ margin: '4px 0 0', fontSize: '7pt', color: '#6b7280' }}>QR de vérification (placeholder)</p>
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

const InvoicePreviewMini = ({ config, info, variants }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo; variants: SimVariants }) => {
  const subtotal = SAMPLE_TOTAL;
  const discount = (subtotal * variants.discountPct) / 100;
  const total = subtotal - discount;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const isCompany = variants.clientType === 'company';

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
        <p style={{ margin: 0 }}>Statut : <StatusBadge status={variants.status} /></p>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <p style={{ margin: 0 }}>Client : {isCompany ? 'SARL Mukendi & Frères' : 'Jean Mukendi'}</p>
        {isCompany && <p style={{ margin: 0 }}>NIF Client : A1234567B</p>}
        <p style={{ margin: 0 }}>Parcelle : KIN/GOM/2025/0001</p>
        <p style={{ margin: 0 }}>Mode : {PAYMENT_METHOD_LABELS[variants.paymentMethod] || variants.paymentMethod}</p>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fiche cadastrale</span><span>30,00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hist. propriété</span><span>20,00</span></div>
      </div>

      <div style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Remise ({variants.discountPct}%)</span><span>-{fmt(discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base HT</span><span>{fmt(baseHT)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{config.tva_label}</span><span>{fmt(tva)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: 4 }}><span>TOTAL</span><span>{fmt(total)} USD</span></div>
      </div>

      {config.show_dgi_mention && (
        <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: '9px', padding: '3px', background: '#fef3c7', color: '#92400e', fontStyle: 'italic' }}>
          Code DGI ‒ injecté à la génération
        </p>
      )}

      {config.show_verification_qr && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px', border: '1px solid #000' }} />
          <p style={{ margin: '2px 0 0', fontSize: '8px' }}>Vérification (placeholder)</p>
        </div>
      )}

      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '9px', fontStyle: 'italic' }}>{config.footer_text}</p>
    </div>
  );
};

interface RecentInvoiceOption {
  id: string;
  invoice_number: string;
  client_name: string | null;
  parcel_number: string;
  total_amount_usd: number;
}

export const InvoicePreviewPanel = () => {
  const { config, loading, refetch } = useInvoiceTemplateConfig();
  const { info, refetch: refetchInfo } = useCompanyLegalInfo();
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'a4' | 'mini'>(config.default_format || 'a4');
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [variants, setVariants] = useState<SimVariants>({
    clientType: 'individual',
    status: 'paid',
    discountPct: 0,
    paymentMethod: 'mobile_money',
    showBank: true,
  });

  // Source de données : sample ou facture réelle
  const [dataSource, setDataSource] = useState<'sample' | string>('sample');
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceOption[]>([]);
  const [realInvoice, setRealInvoice] = useState<CadastralInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Charger 20 dernières factures
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('cadastral_invoices')
        .select('id, invoice_number, client_name, parcel_number, total_amount_usd')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setRecentInvoices(data as RecentInvoiceOption[]);
    })();
  }, []);

  // Quand on choisit une facture réelle, la charger entièrement
  useEffect(() => {
    if (dataSource === 'sample') {
      setRealInvoice(null);
      return;
    }
    setLoadingInvoice(true);
    (async () => {
      const { data } = await supabase
        .from('cadastral_invoices')
        .select('*')
        .eq('id', dataSource)
        .maybeSingle();
      if (data) setRealInvoice(data as unknown as CadastralInvoice);
      setLoadingInvoice(false);
    })();
  }, [dataSource]);

  // Compute scale to fit A4 into wrapper width — recompute when info/logo change
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
  }, [format, info]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchInfo()]);
    toast.success('Aperçu rafraîchi');
  };

  const handleGenerate = async (fmtKey: 'a4' | 'mini') => {
    setGenerating(true);
    try {
      if (realInvoice) {
        await downloadInvoicePDF(realInvoice, { format: fmtKey });
      } else {
        await generateInvoicePDF(
          buildSampleInvoice(config.invoice_number_prefix, variants),
          buildSampleServices(),
          fmtKey,
          `apercu_facture_${fmtKey}.pdf`
        );
      }
      toast.success('Aperçu PDF généré');
    } catch (e: any) {
      toast.error(e.message || 'Erreur génération PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Variantes effectives — si facture réelle chargée, on dérive depuis ses champs
  const effectiveVariants: SimVariants = useMemo(() => {
    if (!realInvoice) return variants;
    const subtotal = Number(realInvoice.original_amount_usd || realInvoice.total_amount_usd);
    const disc = Number(realInvoice.discount_amount_usd || 0);
    const pct = subtotal > 0 ? Math.round((disc / subtotal) * 100) : 0;
    const discountPct: DiscountPct = pct >= 25 ? 25 : pct >= 10 ? 10 : 0;
    return {
      clientType: (realInvoice.client_type === 'company' ? 'company' : 'individual') as ClientType,
      status: (realInvoice.status === 'paid' ? 'paid' : realInvoice.status === 'pending' ? 'pending' : 'failed') as StatusVariant,
      discountPct,
      paymentMethod: realInvoice.payment_method || 'mobile_money',
      showBank: variants.showBank,
    };
  }, [realInvoice, variants]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aperçu de la facture</CardTitle>
        <CardDescription>
          Rendu fidèle (A4 ou mini reçu thermique) mis à jour en direct selon la configuration.
          Les couleurs, mentions DGI et identité émetteur sont synchronisées entre l'aperçu HTML et le PDF généré.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre format + actions */}
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
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir config + identité
          </Button>
        </div>

        {/* Panneau variantes de simulation */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Info className="h-3.5 w-3.5" /> Variantes de simulation
          </div>

          {/* Source de données */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source des données</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">Sample (paramétrable)</SelectItem>
                  {recentInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.client_name || 'Sans nom'} ({inv.total_amount_usd}$)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingInvoice && <p className="text-xs text-muted-foreground">Chargement de la facture...</p>}
              {realInvoice && <p className="text-xs text-amber-600">Facture réelle chargée — les variantes sont dérivées de ses champs.</p>}
            </div>

            <div className="flex items-end gap-2 justify-end">
              <Label htmlFor="bank-toggle" className="text-xs cursor-pointer">Coordonnées bancaires</Label>
              <Switch
                id="bank-toggle"
                checked={variants.showBank}
                onCheckedChange={(v) => setVariants({ ...variants, showBank: v })}
              />
            </div>
          </div>

          {/* Variantes (désactivées si facture réelle) */}
          <fieldset disabled={!!realInvoice} className={realInvoice ? 'opacity-50 pointer-events-none' : ''}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type client</Label>
                <Select value={variants.clientType} onValueChange={(v) => setVariants({ ...variants, clientType: v as ClientType })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Particulier</SelectItem>
                    <SelectItem value="company">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Statut</Label>
                <Select value={variants.status} onValueChange={(v) => setVariants({ ...variants, status: v as StatusVariant })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Remise commerciale</Label>
                <Select value={String(variants.discountPct)} onValueChange={(v) => setVariants({ ...variants, discountPct: Number(v) as DiscountPct })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mode paiement</Label>
                <Select value={variants.paymentMethod} onValueChange={(v) => setVariants({ ...variants, paymentMethod: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
        </div>

        <div ref={wrapperRef} className="bg-muted/40 rounded-lg p-4 overflow-auto" style={{ minHeight: 400 }}>
          {format === 'a4' ? (
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '210mm', height: `${297 * scale}mm` }}>
              <InvoicePreviewA4 config={config} info={info} variants={effectiveVariants} />
            </div>
          ) : (
            <div className="py-4">
              <InvoicePreviewMini config={config} info={info} variants={effectiveVariants} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => handleGenerate('mini')} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            {realInvoice ? 'Télécharger PDF Mini' : 'Aperçu PDF Mini'}
          </Button>
          <Button onClick={() => handleGenerate('a4')} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            {realInvoice ? 'Télécharger PDF A4' : 'Aperçu PDF A4'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicePreviewPanel;
