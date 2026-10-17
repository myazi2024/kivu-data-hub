import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Inquiry { id: string; organization: string | null; message: string; status: string; created_at: string; updated_at: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Demande envoyée', cls: 'bg-warning/10 text-warning border-warning/30' },
  new: { label: 'Demande envoyée', cls: 'bg-warning/10 text-warning border-warning/30' },
  in_review: { label: 'En examen', cls: 'bg-primary/10 text-primary border-primary/30' },
  approved: { label: 'Acceptée', cls: 'bg-success/10 text-success border-success/30' },
  completed: { label: 'Acceptée', cls: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'Refusée', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const BENEFITS = [
  'Toutes les données de base de la formule Paiement à l’usage',
  'Analyses critiques : hypothèques, litiges fonciers, valeurs marchandes',
  'Accès complet à tous les onglets, sans achat à l’unité',
];

export function MyPartnership() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const isPartner = profile?.role === 'partner';
  const [form, setForm] = useState({ organization: '', message: '' });
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);

  const q = useQuery({
    queryKey: ['my-partner-inquiries', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Inquiry[]> => {
      const { data, error } = await (supabase as any).from('partner_inquiries')
        .select('id, organization, message, status, created_at, updated_at').eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const latest = q.data?.[0];
  const hasOpen = !!latest && ['pending', 'new', 'in_review'].includes(latest.status);

  const submit = async () => {
    if (form.message.trim().length < 10) { toast.error('Décrivez votre demande (10 caractères minimum).'); return; }
    setSending(true);
    const { error } = await (supabase as any).from('partner_inquiries').insert({
      name: ((profile as any)?.full_name || user?.email || 'Utilisateur').slice(0, 200),
      email: user?.email ?? '',
      organization: form.organization.trim() || null,
      message: form.message.trim().slice(0, 5000),
    });
    setSending(false);
    if (error) { toast.error('Envoi impossible. Réessayez.'); return; }
    toast.success('Demande envoyée. BIC vous répondra rapidement.');
    setForm({ organization: '', message: '' }); setShowForm(false);
    qc.invalidateQueries({ queryKey: ['my-partner-inquiries'] });
  };

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
        {showForm && !hasOpen && !isPartner && (
          <div className="mt-4 space-y-2">
            <Input placeholder="Organisation (facultatif)" maxLength={200} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
            <Textarea placeholder="Présentez votre organisation et vos besoins en données foncières" maxLength={5000} rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            <Button size="sm" onClick={submit} disabled={sending}>{sending ? 'Envoi…' : 'Envoyer la demande'}</Button>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card">
        <h2 className="border-b px-3 py-2 text-sm font-semibold">Mes demandes</h2>
        {q.isLoading ? <div className="py-6"><LoadingIndicator /></div>
          : !q.data?.length ? <p className="p-4 text-sm text-muted-foreground">Aucune demande envoyée.</p>
          : <ul className="divide-y">{q.data.map(i => {
              const s = STATUS[i.status] ?? { label: i.status, cls: '' };
              return (
                <li key={i.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.organization || 'Demande de partenariat'}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{i.message}</p>
                    <p className="text-xs text-muted-foreground">Envoyée le {new Date(i.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                </li>
              );
            })}</ul>}
      </section>
    </div>
  );
}
