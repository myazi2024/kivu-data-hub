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
import { useSubdivisionRequiredDocuments } from '@/hooks/useSubdivisionRequiredDocuments';

export type { SubdivisionDocuments };

interface StepDocumentsProps {
  documents: SubdivisionDocuments;
  onChange: (next: SubdivisionDocuments) => void;
  userId?: string;
  /** Type de demandeur sélectionné, pour filtrer les documents requis configurés. */
  requesterType?: string;
}

// Convention: chaque doc_key configuré est stocké dans `documents` sous la clé `${doc_key}_url`.
const urlKey = (docKey: string): keyof SubdivisionDocuments => `${docKey}_url`;

const StepDocuments: React.FC<StepDocumentsProps> = ({ documents, onChange, userId, requesterType }) => {
  const { toast } = useToast();
  const { documents: requiredDocs, loading } = useSubdivisionRequiredDocuments(requesterType);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async (
    docKey: string,
    file: File,
    accepted: string[],
    maxSizeMb: number,
  ) => {
    if (!userId) {
      toast({ title: 'Authentification requise', variant: 'destructive' });
      return;
    }
    if (!accepted.includes(file.type)) {
      toast({
        title: 'Format non accepté',
        description: `Formats autorisés : ${accepted.map(m => m.split('/')[1]?.toUpperCase()).join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: `Maximum ${maxSizeMb} Mo.`, variant: 'destructive' });
      return;
    }

    setUploadingKey(docKey);
    setProgress(20);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      // RLS storage policy requires the user id to be the FIRST folder segment.
      const path = `${userId}/subdivision-documents/${docKey}/${fileName}`;
      setProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('cadastral-documents')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      setProgress(80);

      onChange({ ...documents, [urlKey(docKey)]: path });
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

  const handleRemove = (docKey: string) => {
    onChange({ ...documents, [urlKey(docKey)]: null });
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
          Les formats et tailles autorisés sont indiqués sur chaque pièce.
        </AlertDescription>
      </Alert>

      {loading && (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement de la liste…
        </div>
      )}

      {!loading && requiredDocs.length === 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            Aucun document configuré par l'administration pour ce type de demande.
          </AlertDescription>
        </Alert>
      )}

      {requiredDocs.map((doc) => {
        const key = urlKey(doc.doc_key);
        const url = documents[key];
        const isUploading = uploadingKey === doc.doc_key;
        const acceptAttr = doc.accepted_mime_types.join(',');
        const formatLabel = doc.accepted_mime_types.map(m => m.split('/')[1]?.toUpperCase()).join(', ');
        return (
          <Card key={doc.doc_key} className={url ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="pt-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    {url && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    {doc.label}
                    {doc.is_required && <span className="text-destructive">*</span>}
                  </Label>
                  {doc.help_text && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{doc.help_text}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Formats : {formatLabel} · Taille max : {doc.max_size_mb} Mo
                  </p>
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
                    onClick={() => handleRemove(doc.doc_key)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Retirer
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={(el) => { inputRefs.current[doc.doc_key] = el; }}
                    type="file"
                    accept={acceptAttr}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(doc.doc_key, file, doc.accepted_mime_types, doc.max_size_mb);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => inputRefs.current[doc.doc_key]?.click()}
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
