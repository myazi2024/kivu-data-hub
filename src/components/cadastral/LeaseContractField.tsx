import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Loader2, Plus, X } from 'lucide-react';
import { uploadCccDocument } from '@/utils/cccUpload';
import { useToast } from '@/hooks/use-toast';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  /** URL signée du contrat déjà envoyé. */
  value?: string;
  onChange: (url: string | undefined) => void;
  className?: string;
}

/** Contrat de location (optionnel) — envoyé immédiatement dans le bucket privé. */
export const LeaseContractField: React.FC<Props> = ({ value, onChange, className }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: 'Format non accepté', description: 'Formats acceptés : PDF, JPG ou PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'Fichier trop volumineux', description: 'Taille maximale : 5 Mo.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { url, error } = await uploadCccDocument(file, 'lease-contracts');
    setBusy(false);
    if (error || !url) {
      toast({ title: "Envoi impossible", description: error || "Le contrat n'a pas pu être envoyé.", variant: 'destructive' });
      return;
    }
    onChange(url);
    toast({ title: 'Contrat joint', description: 'Le contrat de location a bien été ajouté.' });
  };

  return (
    <div className={cn('space-y-2 pt-1 border-t border-border/50', className)}>
      <Label className="text-sm font-medium">Contrat de location (optionnel)</Label>

      {value ? (
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground underline truncate flex-1 min-w-0"
          >
            Contrat de location joint
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
            aria-label="Retirer le contrat de location"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="gap-2 w-full text-sm h-10 rounded-xl border-dashed border-2 hover:bg-primary/5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? 'Envoi en cours…' : 'Ajouter le contrat de location'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">JPG, PNG, PDF • Max 5 Mo</p>
          <p className="text-[11px] text-muted-foreground leading-snug text-center">
            Facultatif : si vous n'avez pas le contrat sous la main, vous pourrez l'ajouter plus tard depuis votre espace utilisateur.
          </p>
        </>
      )}
    </div>
  );
};

export default LeaseContractField;
