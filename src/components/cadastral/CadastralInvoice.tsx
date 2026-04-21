import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, FileText, CheckCircle, AlertTriangle, QrCode, Printer, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { useCadastralServices } from '@/hooks/useCadastralServices';
import { TVA_RATE } from '@/constants/billing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePrintScope } from '@/hooks/usePrintScope';

interface CadastralInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  result: CadastralSearchResult;
  paidServices: string[];
  onDownloadPDF: () => void;
  isDownloadingPDF?: boolean;
}

interface DbInvoice {
  invoice_number: string;
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  client_organization: string | null;
  client_type: string | null;
  payment_method: string | null;
  search_date: string | null;
  created_at: string;
  paid_at: string | null;
  original_amount_usd: number;
  discount_amount_usd: number;
  discount_code_used: string | null;
  total_amount_usd: number;
  currency_code: string | null;
  exchange_rate_used: number | null;
  dgi_validation_code: string | null;
  geographical_zone: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  orange_money: 'Orange Money',
  mpesa: 'M-Pesa',
  vodacom_mpesa: 'M-Pesa',
  stripe: 'Carte bancaire (Stripe)',
  card: 'Carte bancaire',
  test: 'Paiement test (mode sandbox)',
};

const formatPaymentMethod = (raw: string | null | undefined): string => {
  if (!raw) return 'Non spécifié';
  return PAYMENT_METHOD_LABELS[raw] || raw;
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '—';
  }
};

const BIC_COMPANY_INFO = {
  name: "Bureau d'Informations Cadastrales",
  abbreviation: 'BIC',
  address: 'Avenue Patrice Lumumba, Goma, Nord-Kivu, RDC',
  rccm: 'RCCM/GOMA/2024/B/001234',
  idNat: '01-234-N12345C',
  numImpot: 'A1234567890',
  email: 'contact@bic-congo.cd',
  phone: '+243 997 123 456',
};

const CadastralInvoice: React.FC<CadastralInvoiceProps> = ({
  isOpen,
  onClose,
  result,
  paidServices,
  onDownloadPDF,
  isDownloadingPDF = false,
}) => {
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [dbInvoice, setDbInvoice] = useState<DbInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { services: catalogServices } = useCadastralServices();
  const { user } = useAuth();
  const { printRef, print } = usePrintScope<HTMLDivElement>();

  // Load full invoice from DB (source of truth)
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const { data, error } = await supabase
        .from('cadastral_invoices')
        .select('invoice_number, client_name, client_email, client_address, client_organization, client_type, payment_method, search_date, created_at, paid_at, original_amount_usd, discount_amount_usd, discount_code_used, total_amount_usd, currency_code, exchange_rate_used, dgi_validation_code, geographical_zone')
        .eq('parcel_number', result.parcel.parcel_number)
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError("Erreur lors du chargement de la facture.");
      } else if (!data) {
        setLoadError("Aucune facture payée trouvée pour cette parcelle.");
      } else {
        setDbInvoice({
          ...data,
          original_amount_usd: Number(data.original_amount_usd ?? data.total_amount_usd ?? 0),
          discount_amount_usd: Number(data.discount_amount_usd ?? 0),
          total_amount_usd: Number(data.total_amount_usd ?? 0),
          exchange_rate_used: data.exchange_rate_used != null ? Number(data.exchange_rate_used) : 1,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isOpen, user, result.parcel.parcel_number]);

  const selectedServices = useMemo(
    () => catalogServices.filter((s) => paidServices.includes(s.id)),
    [catalogServices, paidServices],
  );

  const totals = useMemo(() => {
    const subtotalCatalog = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
    const subtotal = dbInvoice?.original_amount_usd ?? subtotalCatalog;
    const discount = dbInvoice?.discount_amount_usd ?? 0;
    const net = Math.max(0, subtotal - discount);
    const tva = net * TVA_RATE;
    const total = dbInvoice?.total_amount_usd ?? net + tva;
    return { subtotal, discount, tva, net, total };
  }, [selectedServices, dbInvoice]);

  // QR code (verification link)
  useEffect(() => {
    if (!isOpen || !dbInvoice) return;
    (async () => {
      try {
        const url = `${window.location.origin}/cadastral/${result.parcel.parcel_number}?invoice=${dbInvoice.invoice_number}`;
        const png = await QRCode.toDataURL(url, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        setQrCodeUrl(png);
      } catch (e) {
        console.error('QR error', e);
      }
    })();
  }, [isOpen, dbInvoice, result.parcel.parcel_number]);

  if (!isOpen) return null;

  const handleClose = () => setShowCloseWarning(true);
  const confirmClose = () => { setShowCloseWarning(false); onClose(); };
  const cancelClose = () => setShowCloseWarning(false);

  const issueDate = dbInvoice?.created_at;
  const paidDate = dbInvoice?.paid_at || dbInvoice?.created_at;

  return (
    <div
      ref={printRef}
      className="fixed inset-0 z-[1700] bg-black/80 backdrop-blur-sm p-2 md:p-6 flex items-start justify-center overflow-auto"
    >
      <div className="w-full max-w-3xl bg-background border shadow-2xl rounded-lg my-2 md:my-4 flex flex-col max-h-[95vh]">
        {/* Action bar — hidden on print */}
        <div data-print-hide className="flex items-center justify-between gap-2 p-3 md:p-4 border-b bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-semibold text-sm md:text-base truncate">Facture — Services cadastraux</h2>
          </div>
          {!showCloseWarning && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={print} className="h-8">
                <Printer className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Imprimer</span>
              </Button>
              <Button
                size="sm"
                onClick={onDownloadPDF}
                disabled={isDownloadingPDF || !dbInvoice}
                className="h-8"
              >
                {isDownloadingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin md:mr-1" />
                ) : (
                  <Download className="h-4 w-4 md:mr-1" />
                )}
                <span className="hidden md:inline">{isDownloadingPDF ? 'Génération…' : 'Télécharger PDF'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Close warning — hidden on print */}
        {showCloseWarning && (
          <div data-print-hide className="p-3 md:p-4 border-b">
            <Alert className="border-warning/40 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-foreground">
                <p className="font-medium text-sm mb-1">Cette facture ne sera plus accessible après fermeture.</p>
                <p className="text-xs mb-3">Téléchargez-la avant de fermer.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={cancelClose}>Annuler</Button>
                  <Button size="sm" onClick={onDownloadPDF} disabled={isDownloadingPDF}>
                    {isDownloadingPDF ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                    Télécharger PDF
                  </Button>
                  <Button variant="destructive" size="sm" onClick={confirmClose}>Fermer</Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Document body */}
        <div className="overflow-auto flex-1 min-h-0 p-4 md:p-8 bg-white">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement de la facture…</span>
            </div>
          )}

          {!loading && loadError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {!loading && !loadError && dbInvoice && (
            <article className="space-y-6 text-foreground">
              {/* Header: emitter + invoice meta */}
              <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b">
                <div>
                  <h1 className="text-lg md:text-xl font-bold leading-tight">{BIC_COMPANY_INFO.name}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{BIC_COMPANY_INFO.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {BIC_COMPANY_INFO.email} · {BIC_COMPANY_INFO.phone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    RCCM: {BIC_COMPANY_INFO.rccm} · ID NAT: {BIC_COMPANY_INFO.idNat} · N° IMPÔT: {BIC_COMPANY_INFO.numImpot}
                  </p>
                </div>
                <div className="md:text-right space-y-1 shrink-0">
                  <div className="inline-flex items-center gap-2">
                    <Badge variant="default" className="status-success text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" /> Payée
                    </Badge>
                  </div>
                  <h2 className="text-base md:text-lg font-semibold">FACTURE</h2>
                  <p className="text-sm font-mono">{dbInvoice.invoice_number || '—'}</p>
                  <p className="text-xs text-muted-foreground">Émise le {formatDate(issueDate)}</p>
                  <p className="text-xs text-muted-foreground">Payée le {formatDate(paidDate)}</p>
                </div>
              </header>

              {/* Client + Parcel info */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Facturé à</h3>
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium">{dbInvoice.client_name || 'Client'}</p>
                    {dbInvoice.client_organization && <p>{dbInvoice.client_organization}</p>}
                    {dbInvoice.client_address && <p className="text-muted-foreground">{dbInvoice.client_address}</p>}
                    {dbInvoice.client_email && <p className="text-muted-foreground">{dbInvoice.client_email}</p>}
                    {dbInvoice.client_type && (
                      <p className="text-xs text-muted-foreground capitalize">Type : {dbInvoice.client_type}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Référence parcelle</h3>
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium font-mono">{result.parcel.parcel_number}</p>
                    <p className="text-muted-foreground">
                      {dbInvoice.geographical_zone || `${result.parcel.commune || ''}${result.parcel.quartier ? ', ' + result.parcel.quartier : ''}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mode de paiement : <span className="text-foreground">{formatPaymentMethod(dbInvoice.payment_method)}</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Services table */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Prestations
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Service</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Description</TableHead>
                        <TableHead className="text-xs text-right">Prix (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                            Aucun service détaillé disponible.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedServices.map((service) => (
                          <TableRow key={service.id}>
                            <TableCell className="text-sm font-medium align-top">{service.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell align-top">
                              {service.description || 'Service cadastral professionnel'}
                            </TableCell>
                            <TableCell className="text-sm text-right align-top tabular-nums">
                              ${Number(service.price).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* Totals */}
              <section className="flex justify-end">
                <div className="w-full md:w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="tabular-nums">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Remise{dbInvoice.discount_code_used ? ` (${dbInvoice.discount_code_used})` : ''}</span>
                      <span className="tabular-nums">-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA ({(TVA_RATE * 100).toFixed(0)}%)</span>
                    <span className="tabular-nums">${totals.tva.toFixed(2)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total TTC</span>
                    <span className="tabular-nums">${totals.total.toFixed(2)} USD</span>
                  </div>
                  {dbInvoice.exchange_rate_used && dbInvoice.exchange_rate_used !== 1 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Taux : 1 USD = {dbInvoice.exchange_rate_used} CDF
                    </p>
                  )}
                </div>
              </section>

              {/* Verification + legal */}
              <section className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 pt-4 border-t">
                {qrCodeUrl && (
                  <div className="flex items-start gap-3">
                    <img src={qrCodeUrl} alt="QR vérification" className="w-20 h-20 border rounded" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <QrCode className="h-3 w-3" /> Vérification
                      </p>
                      <p>Scannez pour vérifier l'authenticité de cette facture.</p>
                      {dbInvoice.dgi_validation_code && (
                        <p className="mt-1 font-mono">Code DGI : {dbInvoice.dgi_validation_code}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Mentions légales</p>
                  <p>
                    Facture officielle émise par {BIC_COMPANY_INFO.name}. Les informations cadastrales fournies
                    proviennent des sources officielles du Ministère des Affaires Foncières.
                  </p>
                  <p>Document généré le {formatDateTime(new Date().toISOString())}</p>
                </div>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
};

export default CadastralInvoice;
