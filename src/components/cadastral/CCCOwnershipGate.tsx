import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, HeartHandshake, Loader2, Map, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  EXPLOITATION_KINDS, isOwnerDeclarationComplete, removeProofs, uploadProof, validateProofFile,
  type ExploitationKind, type OwnerDeclaration,
} from '@/lib/ownership';

interface Props {
  onDone: (declaration: OwnerDeclaration) => void;
  onBack: () => void;
  onCloseAll: () => void;
}

type Step = 'owner' | 'exploit' | 'proofs' | 'refused';

const CCCOwnershipGate: React.FC<Props> = ({ onDone, onBack, onCloseAll }) => {
  const [step, setStep] = useState<Step>('owner');
  const [files, setFiles] = useState<Partial<Record<ExploitationKind, File>>>({});
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const chosen = Object.entries(files).filter(([, f]) => f) as [ExploitationKind, File][];
  const ready = isOwnerDeclarationComplete(chosen.map(([kind]) => ({ kind })));

  const pick = (kind: ExploitationKind, file?: File) => {
    if (!file) return;
    const err = validateProofFile(file);
    if (err) { toast.error(err); return; }
    setFiles((p) => ({ ...p, [kind]: file }));
  };

  const confirmProofs = async () => {
    if (!user) { toast.error('Connectez-vous pour joindre vos justificatifs.'); return; }
    setUploading(true);
    const done: string[] = [];
    try {
      const proofs = [];
      for (const [kind, file] of chosen) {
        const doc = await uploadProof(user.id, kind, file);
        done.push(doc.path);
        proofs.push(doc);
      }
      onDone({ role: 'owner', proofs });
    } catch {
      await removeProofs(done);
      toast.error("L'envoi des justificatifs a échoué. Réessayez.");
    } finally {
      setUploading(false);
    }
  };

  const YesNo = ({ onYes, onNo }: { onYes: () => void; onNo: () => void }) => (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-11 rounded-xl" onClick={onNo}>Non</Button>
      <Button className="h-11 rounded-xl" onClick={onYes}>Oui</Button>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-3">
        {step === 'owner' && (
          <Card className="p-4 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-foreground">Êtes-vous le propriétaire de la parcelle que vous allez soumettre ?</p>
            <p className="text-xs text-muted-foreground">
              Si vous n'êtes pas propriétaire, votre envoi sera enregistré comme une contribution. Si vous l'êtes, vous pourrez ensuite gérer la parcelle depuis votre espace.
            </p>
            <YesNo onYes={() => setStep('exploit')} onNo={() => onDone({ role: 'contributor', proofs: [] })} />
          </Card>
        )}

        {step === 'exploit' && (
          <Card className="p-4 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-foreground">Est-ce vous qui exploitez actuellement cette parcelle ?</p>
            <p className="text-xs text-muted-foreground">Exploiter signifie l'occuper, la louer ou la faire fonctionner vous-même aujourd'hui.</p>
            <YesNo onYes={() => setStep('proofs')} onNo={() => setStep('refused')} />
          </Card>
        )}

        {step === 'proofs' && (
          <Card className="p-4 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-foreground">Prouvez que vous exploitez la parcelle</p>
            <p className="text-xs text-muted-foreground">
              Joignez au moins un document récent (moins de 6 mois). Deux documents accélèrent la vérification. PDF ou image, 10 Mo maximum.
            </p>
            <div className="space-y-2">
              {EXPLOITATION_KINDS.map(({ kind, label }) => {
                const f = files[kind];
                return (
                  <div key={kind} className="flex items-center gap-2 rounded-lg border border-border p-2">
                    {f ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      {f && <p className="truncate text-[11px] text-muted-foreground">{f.name}</p>}
                    </div>
                    {f ? (
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Retirer ${label}`}
                        onClick={() => setFiles((p) => ({ ...p, [kind]: undefined }))}><X className="h-4 w-4" /></Button>
                    ) : (
                      <label className="cursor-pointer rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted">
                        Joindre
                        <input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(e) => { pick(kind, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <Button className="w-full h-10 rounded-xl" disabled={!ready || uploading} onClick={confirmProofs}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuer vers le formulaire'}
            </Button>
          </Card>
        )}

        {step === 'refused' && (
          <Card className="p-4 rounded-xl space-y-3 border-primary/25 bg-primary/5">
            <HeartHandshake className="h-8 w-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">Merci pour votre honnêteté</p>
            <p className="text-sm text-foreground/80">
              Pour soumettre une parcelle en tant que propriétaire, il faut en être l'exploitant au moment de la soumission. Vous ne remplissez donc pas ce critère pour le moment.
            </p>
            <p className="text-xs text-muted-foreground">
              Vous pouvez toujours partager les informations comme simple contributeur : elles aideront à compléter le cadastre numérique.
            </p>
            <Button className="w-full h-10 rounded-xl" onClick={() => { onCloseAll(); navigate('/cadastral-map'); }}>
              <Map className="h-4 w-4 mr-1.5" /> Revenir à la carte cadastrale
            </Button>
            <Button variant="outline" className="w-full h-10 rounded-xl" onClick={() => onDone({ role: 'contributor', proofs: [] })}>
              Soumettre plutôt comme contributeur
            </Button>
          </Card>
        )}
      </div>
      <div className="border-t border-border/20 p-3">
        <Button variant="ghost" size="sm" className="w-full" disabled={uploading}
          onClick={() => (step === 'owner' ? onBack() : setStep(step === 'proofs' || step === 'refused' ? 'exploit' : 'owner'))}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
      </div>
    </div>
  );
};

export default CCCOwnershipGate;
