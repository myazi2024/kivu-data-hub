import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, FileText, KeyRound, Loader2, Paperclip, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  CLAIM_STATUS_LABELS, searchClaimableParcels, useMyOwnershipClaims, useOwnershipClaimActions,
  type ClaimableParcel,
} from '@/hooks/useOwnership';
import {
  EXPLOITATION_KINDS, PROOF_LABELS, RIGHTS_KINDS, missingClaimRequirements, openProof, removeProofs,
  uploadProof, validateProofFile, type ProofDoc, type ProofKind,
} from '@/lib/ownership';

type Picked = { kind: ProofKind; file: File };

const FileSlot: React.FC<{ kind: ProofKind; label: string; picked?: File; onPick: (k: ProofKind, f?: File) => void; onClear: (k: ProofKind) => void }> = ({ kind, label, picked, onPick, onClear }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border p-2">
    {picked ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />}
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {picked && <p className="truncate text-[11px] text-muted-foreground">{picked.name}</p>}
    </div>
    {picked ? (
      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Retirer ${label}`} onClick={() => onClear(kind)}><X className="h-4 w-4" /></Button>
    ) : (
      <label className="cursor-pointer rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted">
        Joindre
        <input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => { onPick(kind, e.target.files?.[0]); e.target.value = ''; }} />
      </label>
    )}
  </div>
);

export const UserOwnershipClaims: React.FC = () => {
  const { user } = useAuth();
  const { data: claims = [], isLoading } = useMyOwnershipClaims();
  const { submit, cancel } = useOwnershipClaimActions();

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ClaimableParcel[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ClaimableParcel | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [statement, setStatement] = useState('');
  const [sending, setSending] = useState(false);
  const [toCancel, setToCancel] = useState<string | null>(null);

  useEffect(() => {
    if (selected || term.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchClaimableParcels(term)); } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [term, selected]);

  const fileFor = (k: ProofKind) => picked.find((p) => p.kind === k)?.file;
  const pick = (kind: ProofKind, file?: File) => {
    if (!file) return;
    const err = validateProofFile(file);
    if (err) { toast.error(err); return; }
    setPicked((p) => [...p.filter((x) => x.kind !== kind), { kind, file }]);
  };
  const clear = (kind: ProofKind) => setPicked((p) => p.filter((x) => x.kind !== kind));

  const reset = () => { setSelected(null); setTerm(''); setPicked([]); setStatement(''); };
  const missing = selected ? missingClaimRequirements(selected.claim_type, picked, statement) : [];

  const send = async () => {
    if (!user || !selected || missing.length) return;
    setSending(true);
    const uploaded: ProofDoc[] = [];
    try {
      const relevant = selected.claim_type === 'contest' ? picked : picked.filter((p) => p.kind === 'identity');
      for (const p of relevant) uploaded.push(await uploadProof(user.id, p.kind, p.file));
      await submit.mutateAsync({
        parcelNumber: selected.parcel_number,
        identity: uploaded.filter((d) => d.kind === 'identity'),
        rights: uploaded.filter((d) => RIGHTS_KINDS.some((k) => k.kind === d.kind)),
        exploitation: uploaded.filter((d) => EXPLOITATION_KINDS.some((k) => k.kind === d.kind)),
        statement,
      });
      toast.success('Demande envoyée. Vous serez notifié de la décision.');
      reset();
    } catch (e: any) {
      await removeProofs(uploaded.map((d) => d.path));
      toast.error(e?.message || "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  };

  const allDocs = (c: (typeof claims)[number]) => [...(c.identity_docs || []), ...(c.rights_docs || []), ...(c.exploitation_docs || [])];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Revendiquer une parcelle</CardTitle>
          <p className="text-xs text-muted-foreground">
            Vous êtes propriétaire d'une parcelle déjà enregistrée ? Demandez que sa gestion soit rattachée à votre compte.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Numéro de parcelle (3 caractères minimum)" value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
              {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {!searching && term.trim().length >= 3 && results.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune parcelle trouvée. Si elle n'est pas encore enregistrée, ajoutez-la depuis la carte cadastrale.</p>
              )}
              {results.map((r) => (
                <button key={r.parcel_number} type="button" onClick={() => setSelected(r)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border p-2 text-left hover:bg-muted">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{r.parcel_number}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{[r.commune, r.ville, r.province].filter(Boolean).join(', ')}</span>
                  </span>
                  <Badge variant={r.claim_type === 'contest' ? 'secondary' : 'outline'} className="shrink-0 text-[10px]">
                    {r.claim_type === 'contest' ? 'Déjà déclarée par un propriétaire' : 'Contribution'}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selected.parcel_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selected.claim_type === 'contest'
                      ? 'Cette parcelle est déjà gérée par un compte qui se déclare propriétaire. Votre dossier sera examiné et le titulaire actuel en sera informé.'
                      : 'Cette parcelle a été ajoutée comme contribution. Une pièce d\'identité suffit pour demander le rattachement.'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={reset} disabled={sending}>Changer</Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Identité</p>
                <FileSlot kind="identity" label="Copie de votre pièce d'identité" picked={fileFor('identity')} onPick={pick} onClear={clear} />
              </div>

              {selected.claim_type === 'contest' && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Vos droits sur la parcelle (au moins un)</p>
                    {RIGHTS_KINDS.map((k) => <FileSlot key={k.kind} kind={k.kind} label={k.label} picked={fileFor(k.kind)} onPick={pick} onClear={clear} />)}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Preuve que vous l'exploitez actuellement (au moins une, moins de 6 mois)</p>
                    {EXPLOITATION_KINDS.map((k) => <FileSlot key={k.kind} kind={k.kind} label={k.label} picked={fileFor(k.kind)} onPick={pick} onClear={clear} />)}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Expliquez votre revendication</p>
                    <Textarea rows={3} maxLength={2000} value={statement} onChange={(e) => setStatement(e.target.value)}
                      placeholder="Depuis quand, comment vous avez acquis la parcelle, qui l'occupe…" />
                  </div>
                </>
              )}

              {missing.length > 0 && <p className="text-[11px] text-muted-foreground">À fournir : {missing.join(', ')}.</p>}
              <Button className="w-full" disabled={missing.length > 0 || sending} onClick={send}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.claim_type === 'contest' ? 'Envoyer ma revendication' : 'Migrer la gestion de cette parcelle sur mon compte'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Mes revendications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isLoading && claims.length === 0 && <p className="text-xs text-muted-foreground">Aucune revendication pour le moment.</p>}
          {claims.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{c.parcel_number}</p>
                <Badge variant={c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {CLAIM_STATUS_LABELS[c.status]}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {c.claim_type === 'contest' ? 'Contestation de propriété' : 'Rattachement d\'une contribution'} · {new Date(c.created_at).toLocaleDateString('fr-FR')}
              </p>
              {c.rejection_reason && <p className="text-xs text-destructive">Motif : {c.rejection_reason}</p>}
              <div className="flex flex-wrap gap-1">
                {allDocs(c).map((d) => (
                  <Button key={d.path} size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => openProof(d.path).catch(() => toast.error('Document indisponible'))}>
                    <FileText className="h-3 w-3 mr-1" />{PROOF_LABELS[d.kind] ?? d.kind}
                  </Button>
                ))}
              </div>
              {(c.status === 'pending' || c.status === 'in_review') && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setToCancel(c.id)}>Annuler la demande</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette revendication ?</AlertDialogTitle>
            <AlertDialogDescription>Vous pourrez en déposer une nouvelle plus tard.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try { await cancel.mutateAsync(toCancel!); toast.success('Revendication annulée.'); }
              catch (e: any) { toast.error(e?.message || "Échec de l'annulation."); }
              setToCancel(null);
            }}>Annuler la demande</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserOwnershipClaims;
