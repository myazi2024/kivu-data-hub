import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FileText, Handshake, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { canCancelPartnerInquiry, openPartnerDoc, ORGANIZATION_TYPES, PartnerDoc } from '@/lib/partnerInquiry';
import { PartnerInquiryForm } from './PartnerInquiryForm';

interface Inquiry {
  id: string; organization: string | null; organization_type: string | null; registration_number: string | null;
  address: string | null; city: string | null; website: string | null; name: string; contact_role: string | null;
  phone: string | null; message: string; status: string; documents: PartnerDoc[] | null; created_at: string; cancelled_at: string | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Demande envoyée', cls: 'bg-warning/10 text-warning border-warning/30' },
  new: { label: 'Demande envoyée', cls: 'bg-warning/10 text-warning border-warning/30' },
  in_review: { label: 'En examen', cls: 'bg-primary/10 text-primary border-primary/30' },
  approved: { label: 'Acceptée', cls: 'bg-success/10 text-success border-success/30' },
  completed: { label: 'Acceptée', cls: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'Refusée', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  cancelled: { label: 'Annulée', cls: 'bg-muted text-muted-foreground' },
};

const BENEFITS = [
  'Toutes les données de base de la formule Paiement à l’usage',
  'Analyses critiques : hypothèques, litiges fonciers, valeurs marchandes',
  'Accès complet à tous les onglets, sans achat à l’unité',
];

function InquiryItem({ i, onCancelled }: { i: Inquiry; onCancelled: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = STATUS[i.status] ?? { label: i.status, cls: '' };
  const cancel = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('cancel_partner_inquiry', { p_id: i.id });
    setBusy(false);
    if (error) { toast.error(error.message || 'Annulation impossible.'); return; }
    toast.success('Demande annulée.');
    onCancelled();
  };
  const rows: [string, string | null][] = [
    ['Type', i.organization_type ? ORGANIZATION_TYPES[i.organization_type] ?? i.organization_type : null],
    ['RCCM / N° d’identification', i.registration_number], ['Adresse', [i.address, i.city].filter(Boolean).join(', ') || null],
    ['Site web', i.website], ['Contact', [i.name, i.contact_role].filter(Boolean).join(' · ')], ['Téléphone', i.phone],
  ];
  return (
    <li className="px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <p className="flex items-center gap-1 truncate font-medium">{i.organization || 'Demande de partenariat'}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></p>
          <p className="text-xs text-muted-foreground">Envoyée le {new Date(i.created_at).toLocaleDateString('fr-FR')}
            {i.cancelled_at && ` · annulée le ${new Date(i.cancelled_at).toLocaleDateString('fr-FR')}`}</p>
        </button>
        <Badge variant="outline" className={s.cls}>{s.label}</Badge>
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2 text-xs">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {rows.filter(([, v]) => v).map(([k, v]) => <><dt key={k + 'k'} className="text-muted-foreground">{k}</dt><dd key={k} className="break-words">{v}</dd></>)}
          </dl>
          <p className="whitespace-pre-line">{i.message}</p>
          {!!i.documents?.length && (
            <div className="flex flex-wrap gap-1.5">{i.documents.map(d => (
              <Button key={d.path} variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => openPartnerDoc(d.path).catch(() => toast.error('Document indisponible.'))}>
                <FileText className="mr-1 h-3.5 w-3.5" /><span className="max-w-[160px] truncate">{d.name}</span>
              </Button>))}
            </div>
          )}
          {canCancelPartnerInquiry(i.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs text-destructive" disabled={busy}>Annuler la demande</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
                  <AlertDialogDescription>BIC ne l’examinera plus. Vous pourrez envoyer une nouvelle demande ensuite.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Garder</AlertDialogCancel>
                  <AlertDialogAction onClick={cancel}>Annuler la demande</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </li>
  );
}

export function MyPartnership() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const isPartner = profile?.role === 'partner';
  const [showForm, setShowForm] = useState(false);

  const q = useQuery({
    queryKey: ['my-partner-inquiries', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Inquiry[]> => {
      const { data, error } = await (supabase as any).from('partner_inquiries')
        .select('id, organization, organization_type, registration_number, address, city, website, name, contact_role, phone, message, status, documents, created_at, cancelled_at')
        .eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-partner-inquiries'] });
  const latest = q.data?.[0];
  const hasOpen = !!latest && canCancelPartnerInquiry(latest.status);

  const status = isPartner ? { label: 'Partenaire actif', cls: 'bg-success/10 text-success border-success/30' }
    : latest ? (STATUS[latest.status] ?? { label: latest.status, cls: '' }) : { label: 'Non partenaire', cls: 'bg-muted text-muted-foreground' };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Partenariat BIC</h1>
        <p className="text-sm text-muted-foreground">Statut de votre formule partenaire et suivi de vos demandes.</p>
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Handshake className="h-5 w-5 text-primary" /><span className="text-sm font-semibold">Statut</span></div>
          <Badge variant="outline" className={status.cls}>{status.label}</Badge>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {BENEFITS.map(b => <li key={b} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>)}
        </ul>
        {!isPartner && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowForm(v => !v)} disabled={hasOpen}>{hasOpen ? 'Demande en cours' : 'Devenir Partenaire'}</Button>
            <Button asChild size="sm" variant="outline"><Link to="/partnership">En savoir plus</Link></Button>
          </div>
        )}
        {showForm && !hasOpen && !isPartner && user && (
          <PartnerInquiryForm userId={user.id} defaultName={(profile as any)?.full_name} onDone={() => { setShowForm(false); refresh(); }} />
        )}
      </section>

      <section className="rounded-md border bg-card">
        <h2 className="border-b px-3 py-2 text-sm font-semibold">Mes demandes</h2>
        {q.isLoading ? <div className="py-6"><LoadingIndicator /></div>
          : !q.data?.length ? <p className="p-4 text-sm text-muted-foreground">Aucune demande envoyée.</p>
          : <ul className="divide-y">{q.data.map(i => <InquiryItem key={i.id} i={i} onCancelled={refresh} />)}</ul>}
      </section>
    </div>
  );
}
