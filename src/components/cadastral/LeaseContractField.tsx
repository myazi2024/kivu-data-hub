import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Loader2, Upload, X } from 'lucide-react';
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
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs font-medium text-muted-foreground">Contrat de location (optionnel)</Label>

      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-foreground underline truncate flex-1"
          >
            Contrat joint
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
            className="h-9 w-full rounded-xl text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {busy ? 'Envoi en cours…' : 'Joindre le contrat (PDF, JPG, PNG — 5 Mo max)'}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Facultatif : si vous n'avez pas le contrat sous la main, vous pourrez l'ajouter plus tard depuis votre espace utilisateur.
          </p>
        </>
      )}
    </div>
  );
};

export default LeaseContractField;
