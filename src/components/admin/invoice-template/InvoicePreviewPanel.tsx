import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, RefreshCw, Info, ExternalLink } from 'lucide-react';
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

const STATUS_LABELS: Record<StatusVariant, string> = {
  paid: 'PAYÉE',
  pending: 'EN ATTENTE',
  failed: 'ÉCHEC',
};

const STATUS_COLORS: Record<StatusVariant, string> = {
  paid: '#27ae60',
  pending: '#e74c3c',
  failed: '#c0392b',
};

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
    payment_method: v.paymentMethod,
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
  { id: 'svc-preview-1', service_id: 'svc-preview-1', name: 'Fiche cadastrale complète', description: '', price: 30, category: 'cadastre', icon_name: 'file', is_active: true } as any,
  { id: 'svc-preview-2', service_id: 'svc-preview-2', name: 'Historique de propriété', description: '', price: 20, category: 'cadastre', icon_name: 'history', is_active: true } as any,
]);

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBilingual = (usd: number, rate: number) => rate > 1 ? `${fmt(usd)} USD  /  ${fmt(usd * rate)} CDF` : `${fmt(usd)} USD`;

/**
 * APERÇU A4 — miroir visuel exact du PDF généré par `generateA4InvoicePDF` (src/lib/pdf.ts).
 * Source de vérité : le PDF. Toute évolution doit être faite côté PDF puis reflétée ici.
 */
const InvoicePreviewA4 = ({ config, info, variants }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo; variants: SimVariants }) => {
  const subtotal = SAMPLE_TOTAL;
  const discount = (subtotal * variants.discountPct) / 100;
  const total = subtotal - discount;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const isCompany = variants.clientType === 'company';
  const hasBank = !!(info.bank_name || info.bank_account || info.bank_swift);
  const showBank = variants.showBank && hasBank;
  const services = [
    { name: 'Fiche cadastrale complète', priceTTC: 30 },
    { name: 'Historique de propriété', priceTTC: 20 },
  ];
  const tvaPctLabel = `${(config.tva_rate * 100).toFixed(config.tva_rate * 100 % 1 === 0 ? 0 : 2)}%`;

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border relative"
      style={{ width: '210mm', minHeight: '297mm', padding: '18mm', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '8.5pt', color: '#212529' }}
    >
      {/* ===== EN-TÊTE BICOLONNE (miroir PDF) ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        {/* Émetteur (gauche) */}
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {info.logo_url && (
            <img src={info.logo_url} alt="" style={{ width: 53, height: 53, objectFit: 'contain' }} />
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
        {/* Titre + N° (droite) */}
        <div style={{ textAlign: 'right', minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold', color: config.header_color }}>
            {config.show_dgi_mention ? 'FACTURE NORMALISÉE' : 'FACTURE'}
          </p>
          {config.show_dgi_mention && (
            <p style={{ margin: '2px 0 0', fontSize: '8pt', color: '#505050' }}>Direction Générale des Impôts (DGI) — RDC</p>
          )}
          <p style={{ margin: '6px 0 0', fontSize: '10pt', fontWeight: 'bold', color: '#212529' }}>N° {config.invoice_number_prefix}-PREVIEW-0001</p>
          <p style={{ margin: '2px 0 0', fontSize: '8pt' }}>Date facturation: {dateStr}</p>
          {variants.status === 'paid' && <p style={{ margin: '2px 0 0', fontSize: '8pt' }}>Date paiement: {dateStr}</p>}
        </div>
      </div>

      {/* Ligne séparatrice header_color */}
      <div style={{ marginTop: 6, height: 1, background: config.header_color }} />

      {/* ===== BLOC CLIENT + RÉFÉRENCE ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold', color: config.header_color }}>FACTURÉ À</p>
          <p style={{ margin: '4px 0 0', fontSize: '8.5pt', fontWeight: 600 }}>{isCompany ? 'SARL Mukendi & Frères' : 'Jean Mukendi'}</p>
          <div style={{ fontSize: '7.5pt', color: '#505050', lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>Avenue de la Paix 12, Kinshasa</p>
            <p style={{ margin: 0 }}>Email: client@example.cd</p>
            {isCompany ? (
              <>
                <p style={{ margin: 0 }}>NIF: A1234567B</p>
                <p style={{ margin: 0 }}>RCCM: CD/KIN/RCCM/24-B-12345</p>
                <p style={{ margin: 0 }}>Régime: {TAX_REGIME_LABELS['reel']}</p>
              </>
            ) : (
              <p style={{ margin: 0 }}>ID National: 01-A123-B456789</p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold', color: config.header_color }}>RÉFÉRENCE</p>
          <p style={{ margin: '4px 0 0', fontSize: '8pt' }}>Parcelle: KIN/GOM/2025/0001</p>
          <p style={{ margin: 0, fontSize: '8pt' }}>Zone: Gombe</p>
          <p style={{ margin: '4px 0 0', fontSize: '8pt', fontWeight: 'bold', color: STATUS_COLORS[variants.status] }}>
            Statut: {STATUS_LABELS[variants.status]}
          </p>
        </div>
      </div>

      {/* ===== TABLEAU PRESTATIONS (colonnes alignées PDF) ===== */}
      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: '8.5pt' }}>
        <thead>
          <tr style={{ backgroundColor: config.secondary_color, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '4px 6px', width: '50%' }}>Désignation</th>
            <th style={{ textAlign: 'center', padding: '4px 6px', width: '10%' }}>Qté</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: '20%' }}>Prix unitaire HT</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', width: '20%' }}>Total TTC</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => {
            const ht = s.priceTTC / (1 + config.tva_rate);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #dcdcdc' }}>
                <td style={{ padding: '4px 6px' }}>{s.name}</td>
                <td style={{ padding: '4px 6px', textAlign: 'center' }}>1</td>
                <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(ht)} USD</td>
                <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(s.priceTTC)} USD</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== TOTAUX (alignés droite, miroir PDF) ===== */}
      <div style={{ marginTop: 8, marginLeft: 'auto', width: '55%', fontSize: '9pt' }}>
        {discount > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Sous-total (TTC)</span><span>{fmtBilingual(subtotal, SAMPLE_EXCHANGE_RATE)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Remise commerciale</span><span>-{fmtBilingual(discount, SAMPLE_EXCHANGE_RATE)}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>Base HT</span><span>{fmtBilingual(baseHT, SAMPLE_EXCHANGE_RATE)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>{config.tva_label}</span><span>{fmtBilingual(tva, SAMPLE_EXCHANGE_RATE)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', marginTop: 2, background: config.header_color, color: '#fff', fontWeight: 'bold', fontSize: '10pt' }}>
          <span>TOTAL TTC</span><span>{fmtBilingual(total, SAMPLE_EXCHANGE_RATE)}</span>
        </div>
      </div>

      {SAMPLE_EXCHANGE_RATE > 1 && (
        <p style={{ margin: '6px 0 0', fontSize: '7pt', fontStyle: 'italic', color: '#212529' }}>
          Taux de change appliqué : 1 USD = {SAMPLE_EXCHANGE_RATE} CDF (figé à l'émission)
        </p>
      )}

      {/* ===== CONDITIONS + COORDONNÉES BANCAIRES (miroir PDF) ===== */}
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

      {/* ===== MENTIONS LÉGALES DGI (5 lignes texte réel) ===== */}
      <div style={{ position: 'absolute', bottom: '18mm', left: '18mm', right: '18mm' }}>
        <div style={{ height: 1, background: '#c8c8c8' }} />
        <p style={{ margin: '4px 0 2px', fontSize: '7.5pt', fontWeight: 'bold', color: config.header_color }}>MENTIONS LÉGALES (DGI)</p>
        <div style={{ fontSize: '6.5pt', color: '#505050', lineHeight: 1.5, paddingRight: 80 }}>
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
          <p style={{ margin: 0 }}>Code de validation DGI : {SAMPLE_DGI_CODE}</p>
          <p style={{ margin: 0 }}>{config.footer_text}</p>
        </div>

        {/* QR vérification bas-droite (16mm équiv ≈ 60px) */}
        {config.show_verification_qr && (
          <div style={{ position: 'absolute', right: 0, bottom: 0, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px', border: '1px solid #000' }} />
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
const InvoicePreviewMini = ({ config, info, variants }: { config: InvoiceTemplateConfig; info: CompanyLegalInfo; variants: SimVariants }) => {
  const subtotal = SAMPLE_TOTAL;
  const discount = (subtotal * variants.discountPct) / 100;
  const total = subtotal - discount;
  const baseHT = total / (1 + config.tva_rate);
  const tva = total - baseHT;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const isCompany = variants.clientType === 'company';
  const services = [
    { name: 'Fiche cadastrale complète', price: 30 },
    { name: 'Historique de propriété', price: 20 },
  ];

  return (
    <div
      className="bg-white text-black mx-auto shadow-2xl border border-border"
      style={{ width: 280, padding: 12, fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '8.5px', color: '#000', lineHeight: 1.5 }}
    >
      {/* En-tête centré (logo + nom + mention + identifiants) — pas de séparateur tirets, fidèle au PDF */}
      <div style={{ textAlign: 'center' }}>
        {info.logo_url && <img src={info.logo_url} alt="" style={{ width: 22, height: 22, objectFit: 'contain', margin: '0 auto 2px' }} />}
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11px' }}>{info.legal_name}</p>
        {config.show_dgi_mention && <p style={{ margin: 0, fontWeight: 'bold', fontSize: '8px' }}>FACTURE NORMALISÉE</p>}
        <p style={{ margin: 0, fontSize: '6px' }}>NIF: {info.nif} • RCCM: {info.rccm}</p>
      </div>

      {/* Infos facture (alignées gauche, sans séparateur visuel — comme PDF) */}
      <div style={{ marginTop: 6, fontSize: '7px' }}>
        <p style={{ margin: 0 }}>N°: {config.invoice_number_prefix}-PREVIEW-0001</p>
        <p style={{ margin: 0 }}>Date: {dateStr}</p>
        <p style={{ margin: 0 }}>Parcelle: KIN/GOM/2025/0001</p>
        <p style={{ margin: 0 }}>Client: {isCompany ? 'SARL Mukendi & Frères' : 'Jean Mukendi'}</p>
        {isCompany && <p style={{ margin: 0 }}>NIF Client: A1234567B</p>}
        <p style={{ margin: 0 }}>Statut: {variants.status === 'paid' ? 'Payée' : variants.status === 'pending' ? 'En attente' : 'Échec'}</p>
      </div>

      {/* Prestations (TTC) */}
      <div style={{ marginTop: 6, fontSize: '7px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Prestations (TTC)</p>
        {services.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{s.name.substring(0, 26)}</span><span>{s.price.toFixed(2)}$</span>
          </div>
        ))}
      </div>

      {/* Décomposition fiscale avec ligne séparatrice (miroir PDF) */}
      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #b4b4b4', fontSize: '7px' }}>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Remise:</span><span>-{discount.toFixed(2)}$</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base HT:</span><span>{baseHT.toFixed(2)}$</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{config.tva_label}:</span><span>{tva.toFixed(2)}$</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px', marginTop: 2 }}>
          <span>TOTAL TTC:</span><span>{total.toFixed(2)}$</span>
        </div>
      </div>

      {/* Équivalent CDF centré */}
      {SAMPLE_EXCHANGE_RATE > 1 && (
        <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: '7px' }}>
          ({fmt(total * SAMPLE_EXCHANGE_RATE)} CDF au taux {SAMPLE_EXCHANGE_RATE})
        </p>
      )}

      {/* Téléphone + régime fiscal centrés */}
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

  const [dataSource, setDataSource] = useState<'sample' | string>('sample');
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceOption[]>([]);
  const [realInvoice, setRealInvoice] = useState<CadastralInvoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

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

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchInfo()]);
    toast.success('Aperçu rafraîchi');
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
          Aperçu HTML <strong>miroir fidèle</strong> du PDF généré (mêmes sections, mêmes colonnes, même bandeau total).
          Le bouton « Comparer ↔ PDF » ouvre le PDF réel dans un onglet à côté pour validation visuelle.
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
              {realInvoice && <p className="text-xs text-amber-600">Facture réelle chargée — les variantes sont dérivées de ses champs.</p>}
            </div>

            <div className="flex items-end gap-2 justify-end">
              <Label htmlFor="bank-toggle" className="text-xs cursor-pointer">Coordonnées bancaires</Label>
              <Switch id="bank-toggle" checked={variants.showBank} onCheckedChange={(v) => setVariants({ ...variants, showBank: v })} />
            </div>
          </div>

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
