import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, FileText, Loader2, Trash2, Info, Image as ImageIcon } from 'lucide-react';
import type { SubdivisionDocuments } from '../types';

export type { SubdivisionDocuments };

interface StepDocumentsProps {
  documents: SubdivisionDocuments;
  onChange: (next: SubdivisionDocuments) => void;
  userId?: string;
}

const MAX_SIZE_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

type DocKey = keyof SubdivisionDocuments;

const DOC_CONFIG: { key: DocKey; label: string; required: boolean; help: string }[] = [
  {
    key: 'requester_id_document_url',
    label: "Pièce d'identité du demandeur",
    required: true,
    help: "Carte d'électeur, passeport ou permis de conduire (recto/verso si nécessaire).",
  },
  {
    key: 'proof_of_ownership_url',
    label: 'Preuve de propriété',
    required: true,
    help: "Certificat d'enregistrement, contrat de location, ou autre titre foncier valide.",
  },
  {
    key: 'subdivision_sketch_url',
    label: 'Croquis annexe (optionnel)',
    required: false,
    help: 'Schéma manuscrit ou plan annexe complémentaire.',
  },
];

const StepDocuments: React.FC<StepDocumentsProps> = ({ documents, onChange, userId }) => {
  const { toast } = useToast();
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRefs = useRef<Record<DocKey, HTMLInputElement | null>>({
    requester_id_document_url: null,
    proof_of_ownership_url: null,
    subdivision_sketch_url: null,
  });

  const handleUpload = async (key: DocKey, file: File) => {
    if (!userId) {
      toast({ title: 'Authentification requise', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: `Maximum ${MAX_SIZE_MB} MB.`, variant: 'destructive' });
      return;
    }

    setUploadingKey(key);
    setProgress(20);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      // RLS storage policy requires the user id to be the FIRST folder segment.
      const path = `${userId}/subdivision-documents/${key}/${fileName}`;
      setProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('cadastral-documents')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      setProgress(80);

      // Bucket is private — store the path; admins generate signed URLs on demand.
      onChange({ ...documents, [key]: path });
      setProgress(100);
      toast({ title: 'Fichier ajouté', description: file.name });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: "Échec de l'upload", description: err.message, variant: 'destructive' });
    } finally {
      setTimeout(() => {
        setUploadingKey(null);
        setProgress(0);
      }, 400);
    }
  };

  const handleRemove = (key: DocKey) => {
    onChange({ ...documents, [key]: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Pièces justificatives</h3>
      </div>

      <Alert className="py-2">
        <Info className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs">
          Les pièces marquées <span className="text-destructive font-medium">obligatoires</span> sont requises pour soumettre la demande.
          Formats acceptés : JPEG, PNG, WebP, PDF · taille maximale {MAX_SIZE_MB} MB.
        </AlertDescription>
      </Alert>

      {DOC_CONFIG.map((doc) => {
        const url = documents[doc.key];
        const isUploading = uploadingKey === doc.key;
        return (
          <Card key={doc.key} className={url ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="pt-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    {url && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    {doc.label}
                    {doc.required && <span className="text-destructive">*</span>}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{doc.help}</p>
                </div>
              </div>

              {url ? (
                <div className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                  <button
                    type="button"
                    onClick={async () => {
                      const { data, error } = await supabase.storage
                        .from('cadastral-documents')
                        .createSignedUrl(url, 60 * 5);
                      if (error || !data?.signedUrl) {
                        toast({ title: 'Aperçu indisponible', description: error?.message, variant: 'destructive' });
                        return;
                      }
                      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs text-primary hover:underline truncate flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Fichier ajouté — Voir</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(doc.key)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Retirer
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={(el) => (inputRefs.current[doc.key] = el)}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(doc.key, file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => inputRefs.current[doc.key]?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Téléversement…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Téléverser
                      </>
                    )}
                  </Button>
                  {isUploading && <Progress value={progress} className="h-1" />}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StepDocuments;
