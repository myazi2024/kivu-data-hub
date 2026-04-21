import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, RefreshCw, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { type InvoiceTemplateConfig } from '@/hooks/useInvoiceTemplateConfig';
import { type CompanyLegalInfo, TAX_REGIME_LABELS } from '@/hooks/useCompanyLegalInfo';
import { useInvoiceTemplate } from '@/contexts/InvoiceTemplateContext';
import {
  generateInvoicePDF,
  type CadastralInvoice,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  resolveInvoiceStatus,
  type InvoiceStatusKey,
} from '@/lib/pdf';
import { downloadInvoicePDF } from '@/lib/invoiceDownload';
import type { CadastralService } from '@/hooks/useCadastralServices';
import { supabase } from '@/integrations/supabase/client';
import { fetchAppLogo } from '@/utils/pdfLogoHelper';

type ClientType = 'individual' | 'company';
type DiscountPct = 0 | 10 | 25;

interface SimVariants {
  clientType: ClientType;
  status: InvoiceStatusKey;
  discountPct: DiscountPct;
  showBank: boolean;
}

const SAMPLE_TOTAL = 50;
const SAMPLE_EXCHANGE_RATE = 2800;
const SAMPLE_DGI_CODE = 'DGI-SAMPLE-2025-0001';
const SAMPLE_VERIFICATION_CODE = 'VER-PREVIEW-XXXX';

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
    payment_method: 'mobile_money',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paid_at: v.status === 'paid' ? new Date().toISOString() : null,
    currency_code: 'USD',
    exchange_rate_used: SAMPLE_EXCHANGE_RATE,
    discount_amount_usd: discountAmount,
    original_amount_usd: SAMPLE_TOTAL,
    dgi_validation_code: SAMPLE_DGI_CODE,
  };
};

const buildSampleServices = (): CadastralService[] => ([
  { id: 'svc-preview-1', service_id: 'svc-preview-1', name: 'Fiche cadastrale complète', description: 'Document officiel reprenant l\'ensemble des informations cadastrales d\'une parcelle.', price: 30, category: 'cadastre', icon_name: 'file', is_active: true } as any,
  { id: 'svc-preview-2', service_id: 'svc-preview-2', name: 'Historique de propriété', description: 'Chaîne complète de propriété depuis la création de la parcelle, toutes les transactions, mutations, héritages et transferts. Crucial pour vérifier la légalité des transactions passées.', price: 20, category: 'cadastre', icon_name: 'history', is_active: true } as any,
]);

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBilingual = (usd: number, rate: number) => rate > 1 ? `${fmt(usd)} USD  /  ${fmt(usd * rate)} CDF` : `${fmt(usd)} USD`;

const getSelectedServiceIds = (inv: CadastralInvoice): string[] =>
  Array.isArray(inv.selected_services)
    ? inv.selected_services as string[]
    : (typeof inv.selected_services === 'string' ? JSON.parse(inv.selected_services || '[]') : []);

interface PreviewProps {
  config: InvoiceTemplateConfig;
  info: CompanyLegalInfo;
  invoice: CadastralInvoice;
  services: CadastralService[];
  logoBase64: string | null;
  qrDataUrl: string | null;
  showBank: boolean;
}

/**
 * APERÇU A4 — miroir visuel exact du PDF généré par `generateA4InvoicePDF`.
 * Toutes les données viennent de l'objet `invoice` réel (ou sample) et des `services` chargés.
 */
const InvoicePreviewA4 = ({ config, info, invoice, services, logoBase64, qrDataUrl, showBank: showBankProp }: PreviewProps) => {
  const subtotalTTC = services.reduce((s, x) => s + Number(x.price), 0);
  const discount = Number(invoice.discount_amount_usd || 0);
  const totalTTC = subtotalTTC - discount;
  const baseHT = totalTTC / (1 + config.tva_rate);
  const tva = totalTTC - baseHT;
  const exchangeRate = Number(invoice.exchange_rate_used || 1);
  const dateStr = new Date(invoice.search_date).toLocaleDateString('fr-FR');
  const paidStr = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('fr-FR') : null;
  const isCompany = invoice.client_type === 'company';
  const hasBank = !!(info.bank_name || info.bank_account || info.bank_swift);
  const showBank = showBankProp && hasBank;
  const tvaPctLabel = `${(config.tva_rate * 100).toFixed(config.tva_rate * 100 % 1 === 0 ? 0 : 2)}%`;
  const statusKey = resolveInvoiceStatus(invoice.status);
  const statusColor = INVOICE_STATUS_COLORS[statusKey].hex;
  const statusLabel = INVOICE_STATUS_LABELS[statusKey];
  const clientName = invoice.client_name || invoice.client_organization || invoice.client_email || '—';
  const dgiCode = invoice.dgi_validation_code || SAMPLE_VERIFICATION_CODE;

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border"
      style={{
        width: '210mm', minHeight: '297mm', padding: '18mm',
        fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '8.5pt', color: '#212529',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}
    >
      {/* ===== EN-TÊTE BICOLONNE ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {logoBase64 && (
            <img src={logoBase64} alt="" style={{ width: '14mm', height: '14mm', objectFit: 'contain' }} />
          )}
          <div style={{ fontSize: '7.5pt', lineHeight: 1.4, color: '#505050' }}>
            <p style={{ margin: 0, fontSize: '13pt', fontWeight: 'bold', color: '#212529' }}>{info.legal_name}</p>
            <p style={{ margin: 0 }}>{info.address_line1}{info.address_line2 ? `, ${info.address_line2}` : ''}</p>
            <p style={{ margin: 0 }}>{info.city}, {info.province}, {info.country}</p>
            <p style={{ margin: 0 }}>NIF: {info.nif}  •  RCCM: {info.rccm}  •  ID-NAT: {info.id_nat}</p>
            {info.tva_number && <p style={{ margin: 0 }}>N° TVA: {info.tva_number}  •  Régime: {TAX_REGIME_LABELS[info.tax_regime] || info.tax_regime}</p>}
            {(info.phone || info.email) && <p style={{ margin: 0 }}>{info.phone}{info.phone && info.email ? '  •  ' : ''}{info.email}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold', color: config.header_color }}>
            {config.show_dgi_mention ? 'FACTURE NORMALISÉE' : 'FACTURE'}
          </p>
          {config.show_dgi_mention && (
            <p style={{ margin: '2px 0 0', fontSize: '8pt', color: '#505050' }}>Direction Générale des Impôts (DGI) — RDC</p>
          )}
          <p style={{ margin: '6px 0 0', fontSize: '10pt', fontWeight: 'bold', color: '#212529' }}>N° {invoice.invoice_number}</p>
          <p style={{ margin: '2px 0 0', fontSize: '8pt' }}>Date facturation: {dateStr}</p>
          {paidStr && <p style={{ margin: '2px 0 0', fontSize: '8pt' }}>Date paiement: {paidStr}</p>}
        </div>
      </div>

      <div style={{ marginTop: 6, height: 1, background: config.header_color }} />

      {/* ===== BLOC CLIENT + RÉFÉRENCE ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold', color: config.header_color }}>FACTURÉ À</p>
          <p style={{ margin: '4px 0 0', fontSize: '8.5pt', fontWeight: 600 }}>{clientName}</p>
          <div style={{ fontSize: '7.5pt', color: '#505050', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {invoice.client_address && <p style={{ margin: 0 }}>{invoice.client_address}</p>}
            {invoice.client_email && <p style={{ margin: 0 }}>Email: {invoice.client_email}</p>}
            {isCompany ? (
              <>
                {invoice.client_nif && <p style={{ margin: 0 }}>NIF: {invoice.client_nif}</p>}
                {invoice.client_rccm && <p style={{ margin: 0 }}>RCCM: {invoice.client_rccm}</p>}
                {invoice.client_tax_regime && <p style={{ margin: 0 }}>Régime: {TAX_REGIME_LABELS[invoice.client_tax_regime] || invoice.client_tax_regime}</p>}
              </>
            ) : (
              invoice.client_id_nat && <p style={{ margin: 0 }}>ID National: {invoice.client_id_nat}</p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold', color: config.header_color }}>RÉFÉRENCE</p>
          <p style={{ margin: '4px 0 0', fontSize: '8pt' }}>Parcelle: {invoice.parcel_number}</p>
          {invoice.geographical_zone && <p style={{ margin: 0, fontSize: '8pt' }}>Zone: {invoice.geographical_zone}</p>}
          <p style={{ margin: '4px 0 0', fontSize: '8pt', fontWeight: 'bold', color: statusColor }}>
            Statut: {statusLabel}
          </p>
        </div>
      </div>

      {/* ===== TABLEAU PRESTATIONS ===== */}
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: '8.5pt' }}>
        <thead>
          <tr style={{ backgroundColor: config.secondary_color, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '4px 6px', width: '55%' }}>Désignation</th>
            <th style={{ textAlign: 'center', padding: '4px 6px', width: '10%' }}>Qté</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: '17.5%' }}>Prix unitaire HT</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: '17.5%' }}>Total TTC</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => {
            const priceTTC = Number(s.price);
            const ht = priceTTC / (1 + config.tva_rate);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #dcdcdc' }}>
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  {s.description && (
                    <div style={{ fontSize: '7.5pt', color: '#6b7280', fontStyle: 'italic', marginTop: 2, lineHeight: 1.3 }}>
                      {s.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top' }}>{fmt(ht)} USD</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', verticalAlign: 'top' }}>{fmt(priceTTC)} USD</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== TOTAUX ===== */}
      <div style={{ marginTop: 8, marginLeft: 'auto', width: '55%', fontSize: '9pt' }}>
        {discount > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Sous-total (TTC)</span><span>{fmtBilingual(subtotalTTC, exchangeRate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Remise commerciale</span><span>-{fmtBilingual(discount, exchangeRate)}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>Base HT</span><span>{fmtBilingual(baseHT, exchangeRate)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>{config.tva_label}</span><span>{fmtBilingual(tva, exchangeRate)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', marginTop: 2, background: config.header_color, color: '#fff', fontWeight: 'bold', fontSize: '10pt' }}>
          <span>TOTAL TTC</span><span>{fmtBilingual(totalTTC, exchangeRate)}</span>
        </div>
      </div>

      {exchangeRate > 1 && (
        <p style={{ margin: '6px 0 0', fontSize: '7pt', fontStyle: 'italic', color: '#212529' }}>
          Taux de change appliqué : 1 USD = {exchangeRate} CDF (figé à l'émission)
        </p>
      )}

      {/* ===== CONDITIONS + BANQUE ===== */}
      {(config.payment_terms || showBank) && (
        <>
          <div style={{ marginTop: 10, height: 1, background: '#dcdcdc' }} />
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            {config.payment_terms && (
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '8pt', fontWeight: 'bold', color: config.header_color }}>CONDITIONS DE PAIEMENT</p>
                <p style={{ margin: '2px 0 0', fontSize: '7.5pt', color: '#505050' }}>{config.payment_terms}</p>
              </div>
            )}
            {showBank && (
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '8pt', fontWeight: 'bold', color: config.header_color }}>COORDONNÉES BANCAIRES</p>
                <div style={{ fontSize: '7.5pt', color: '#505050', lineHeight: 1.5 }}>
                  {info.bank_name && <p style={{ margin: 0 }}>Banque : {info.bank_name}</p>}
                  {info.bank_account && <p style={{ margin: 0 }}>IBAN : {info.bank_account}</p>}
                  {info.bank_swift && <p style={{ margin: 0 }}>SWIFT : {info.bank_swift}</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== MENTIONS LÉGALES (en flux normal, comme PDF) ===== */}
      <div style={{ marginTop: 'auto', paddingTop: 12, position: 'relative' }}>
        <div style={{ height: 1, background: '#c8c8c8' }} />
        <p style={{ margin: '4px 0 2px', fontSize: '7.5pt', fontWeight: 'bold', color: config.header_color }}>MENTIONS LÉGALES (DGI)</p>
        <div style={{ fontSize: '6.5pt', color: '#505050', lineHeight: 1.5, paddingRight: qrDataUrl ? 80 : 0 }}>
          <p style={{ margin: 0 }}>
            {config.show_dgi_mention
              ? 'Facture normalisée émise conformément à la réglementation fiscale en vigueur en République Démocratique du Congo.'
              : `Facture émise par ${info.legal_name}.`}
          </p>
          <p style={{ margin: 0 }}>
            Émetteur : {info.legal_name} — NIF {info.nif} — RCCM {info.rccm} — ID-NAT {info.id_nat} — {TAX_REGIME_LABELS[info.tax_regime] || info.tax_regime}.
          </p>
          <p style={{ margin: 0 }}>
            TVA appliquée au taux de {tvaPctLabel}. {config.payment_terms || 'Tout règlement effectué vaut acceptation des conditions générales de vente.'}
          </p>
          <p style={{ margin: 0 }}>Code de validation DGI : {dgiCode}</p>
          <p style={{ margin: 0 }}>{config.footer_text}</p>
        </div>

        {config.show_verification_qr && (
          <div style={{ position: 'absolute', right: 0, bottom: 0, textAlign: 'center' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR vérification" style={{ width: 60, height: 60 }} />
            ) : (
              <div style={{ width: 60, height: 60, background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px', border: '1px solid #000' }} />
            )}
            <p style={{ margin: '2px 0 0', fontSize: '6pt', fontStyle: 'italic', color: '#505050' }}>Vérifier l'authenticité</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * APERÇU MINI — miroir visuel exact du PDF `generateMiniInvoicePDF`.
 */
const InvoicePreviewMini = ({ config, info, invoice, services, logoBase64 }: Omit<PreviewProps, 'qrDataUrl' | 'showBank'>) => {
  const subtotalTTC = services.reduce((s, x) => s + Number(x.price), 0);
  const discount = Number(invoice.discount_amount_usd || 0);
  const totalTTC = subtotalTTC - discount;
  const baseHT = totalTTC / (1 + config.tva_rate);
  const tva = totalTTC - baseHT;
  const exchangeRate = Number(invoice.exchange_rate_used || 1);
  const dateStr = new Date(invoice.search_date).toLocaleDateString('fr-FR');
  const isCompany = invoice.client_type === 'company';
  const statusKey = resolveInvoiceStatus(invoice.status);
  const statusFr = statusKey === 'paid' ? 'Payée' : statusKey === 'pending' ? 'En attente' : 'Échec';
  const clientName = invoice.client_name || invoice.client_organization || invoice.client_email || '—';

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border"
      style={{ width: 280, padding: 12, fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '8.5px', color: '#000', lineHeight: 1.5 }}
    >
      <div style={{ textAlign: 'center' }}>
        {logoBase64 && <img src={logoBase64} alt="" style={{ width: 22, height: 22, objectFit: 'contain', margin: '0 auto 2px' }} />}
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11px' }}>{info.legal_name}</p>
        {config.show_dgi_mention && <p style={{ margin: 0, fontWeight: 'bold', fontSize: '8px' }}>FACTURE NORMALISÉE</p>}
        <p style={{ margin: 0, fontSize: '6px' }}>NIF: {info.nif} • RCCM: {info.rccm}</p>
      </div>

      <div style={{ marginTop: 6, fontSize: '7px' }}>
        <p style={{ margin: 0 }}>N°: {invoice.invoice_number}</p>
        <p style={{ margin: 0 }}>Date: {dateStr}</p>
        <p style={{ margin: 0 }}>Parcelle: {invoice.parcel_number}</p>
        <p style={{ margin: 0 }}>Client: {clientName.substring(0, 30)}</p>
        {isCompany && invoice.client_nif && <p style={{ margin: 0 }}>NIF Client: {invoice.client_nif}</p>}
        <p style={{ margin: 0 }}>Statut: {statusFr}</p>
      </div>

      <div style={{ marginTop: 6, fontSize: '7px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Prestations (TTC)</p>
        {services.map((s, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.name.substring(0, 26)}</span><span>{Number(s.price).toFixed(2)}$</span>
            </div>
            {s.description && (
              <div style={{ fontSize: '6px', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.2 }}>
                {s.description.length > 50 ? `${s.description.substring(0, 50)}…` : s.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #b4b4b4', fontSize: '7px' }}>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Remise:</span><span>-{discount.toFixed(2)}$</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base HT:</span><span>{baseHT.toFixed(2)}$</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{config.tva_label}:</span><span>{tva.toFixed(2)}$</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px', marginTop: 2 }}>
          <span>TOTAL TTC:</span><span>{totalTTC.toFixed(2)}$</span>
        </div>
      </div>

      {exchangeRate > 1 && (
        <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: '7px' }}>
          ({fmt(totalTTC * exchangeRate)} CDF au taux {exchangeRate})
        </p>
      )}

      <div style={{ marginTop: 6, textAlign: 'center', fontSize: '6px' }}>
        {info.phone && <p style={{ margin: 0 }}>{info.phone}</p>}
        <p style={{ margin: 0 }}>Régime: {TAX_REGIME_LABELS[info.tax_regime] || info.tax_regime}</p>
      </div>
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
  const { config, info, loading, reload } = useInvoiceTemplate();
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState<'a4' | 'mini'>(config.default_format || 'a4');
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [variants, setVariants] = useState<SimVariants>({
    clientType: 'individual',
    status: 'paid',
    discountPct: 0,
    showBank: true,
  });

  const [dataSource, setDataSource] = useState<'sample' | string>('sample');
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceOption[]>([]);
  const [realInvoice, setRealInvoice] = useState<CadastralInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [servicesCatalog, setServicesCatalog] = useState<CadastralService[]>([]);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Charger catalogue services + factures récentes (logo géré séparément, réactif à info.logo_url)
  useEffect(() => {
    (async () => {
      const [svc, recent] = await Promise.all([
        supabase.from('cadastral_services_config').select('*').eq('is_active', true),
        supabase
          .from('cadastral_invoices')
          .select('id, invoice_number, client_name, parcel_number, total_amount_usd')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (svc.data) setServicesCatalog(svc.data as unknown as CadastralService[]);
      if (recent.data) setRecentInvoices(recent.data as RecentInvoiceOption[]);
    })();
  }, []);

  // Logo réactif : suit info.logo_url du draft, fallback sur fetchAppLogo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (info.logo_url) {
        try {
          const res = await fetch(info.logo_url);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => { if (!cancelled) setLogoBase64(reader.result as string); };
          reader.readAsDataURL(blob);
        } catch {
          if (!cancelled) {
            const fallback = await fetchAppLogo();
            if (!cancelled) setLogoBase64(fallback);
          }
        }
      } else {
        const fallback = await fetchAppLogo();
        if (!cancelled) setLogoBase64(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, [info.logo_url]);

  useEffect(() => {
    if (dataSource === 'sample') { setRealInvoice(null); return; }
    setLoadingInvoice(true);
    (async () => {
      const { data } = await supabase.from('cadastral_invoices').select('*').eq('id', dataSource).maybeSingle();
      if (data) setRealInvoice(data as unknown as CadastralInvoice);
      setLoadingInvoice(false);
    })();
  }, [dataSource]);

  useEffect(() => {
    const compute = () => {
      if (!wrapperRef.current || format !== 'a4') { setScale(1); return; }
      const w = wrapperRef.current.clientWidth;
      const A4_PX = 794;
      setScale(Math.min(1, (w - 32) / A4_PX));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [format, info]);

  const previewInvoice: CadastralInvoice = useMemo(() => {
    if (realInvoice) return realInvoice;
    return buildSampleInvoice(config.invoice_number_prefix, variants);
  }, [realInvoice, config.invoice_number_prefix, variants]);

  const previewServices: CadastralService[] = useMemo(() => {
    if (realInvoice) {
      const ids = getSelectedServiceIds(realInvoice);
      return servicesCatalog.filter(s => ids.includes(s.id));
    }
    return buildSampleServices();
  }, [realInvoice, servicesCatalog]);

  // QR réel quand facture réelle (encode l'URL de vérification probable)
  useEffect(() => {
    if (!config.show_verification_qr) { setQrDataUrl(null); return; }
    if (!realInvoice) { setQrDataUrl(null); return; }
    const url = `${window.location.origin}/verify/${realInvoice.invoice_number}`;
    QRCode.toDataURL(url, { margin: 0, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [realInvoice, config.show_verification_qr]);

  const handleRefresh = async () => {
    await reload();
    toast.success('Aperçu rafraîchi depuis la base');
  };

  const handleGenerate = async (fmtKey: 'a4' | 'mini', openInNewTab = false) => {
    setGenerating(true);
    try {
      if (realInvoice) {
        await downloadInvoicePDF(realInvoice, { format: fmtKey, openInNewTab });
      } else {
        await generateInvoicePDF(
          buildSampleInvoice(config.invoice_number_prefix, variants),
          buildSampleServices(),
          fmtKey,
          `apercu_facture_${fmtKey}.pdf`,
          { openInNewTab },
        );
      }
      toast.success(openInNewTab ? 'PDF ouvert dans un nouvel onglet' : 'Aperçu PDF généré');
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
          Aperçu HTML <strong>miroir fidèle</strong> du PDF généré (mêmes sections, mêmes données, même bandeau total).
          Quand une facture réelle est sélectionnée, l'aperçu reflète ses vraies valeurs (N°, client, date, taux, prestations, code DGI, QR).
          Le bouton « Comparer ↔ PDF » ouvre le PDF réel dans un onglet pour validation visuelle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-border p-1 bg-muted">
            <button onClick={() => setFormat('a4')} className={`px-4 py-1.5 text-sm rounded transition ${format === 'a4' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'}`}>A4</button>
            <button onClick={() => setFormat('mini')} className={`px-4 py-1.5 text-sm rounded transition ${format === 'mini' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground'}`}>Mini reçu</button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir config + identité
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Info className="h-3.5 w-3.5" /> Variantes de simulation
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source des données</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
              {realInvoice && <p className="text-xs text-warning">Facture réelle chargée — aperçu reflète ses vraies données.</p>}
            </div>

            <div className="flex items-end gap-2 justify-end">
              <Label htmlFor="bank-toggle" className="text-xs cursor-pointer">Coordonnées bancaires</Label>
              <Switch id="bank-toggle" checked={variants.showBank} onCheckedChange={(v) => setVariants({ ...variants, showBank: v })} />
            </div>
          </div>

          <fieldset disabled={!!realInvoice} className={realInvoice ? 'opacity-50 pointer-events-none' : ''}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <Select value={variants.status} onValueChange={(v) => setVariants({ ...variants, status: v as InvoiceStatusKey })}>
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
            </div>
          </fieldset>
        </div>

        <div ref={wrapperRef} className="bg-muted/40 rounded-lg p-4 overflow-auto" style={{ minHeight: 400 }}>
          {format === 'a4' ? (
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '210mm', height: `${297 * scale}mm` }}>
              <InvoicePreviewA4
                config={config}
                info={info}
                invoice={previewInvoice}
                services={previewServices}
                logoBase64={logoBase64}
                qrDataUrl={qrDataUrl}
                showBank={variants.showBank}
              />
            </div>
          ) : (
            <div className="py-4">
              <InvoicePreviewMini
                config={config}
                info={info}
                invoice={previewInvoice}
                services={previewServices}
                logoBase64={logoBase64}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={() => handleGenerate(format, true)} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Comparer ↔ PDF (nouvel onglet)
          </Button>
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
