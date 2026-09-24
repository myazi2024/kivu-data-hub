import { useCallback, useEffect, useState } from "react";
import { Upload, FileText, X, CheckCircle2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BUCKET = "cadastral-documents";
const MAX_SIZE = 10 * 1024 * 1024;

interface StoredDocument {
  /** Chemin complet dans le bucket — sert de clé stable. */
  path: string;
  name: string;
  size: number;
  uploadedAt: Date;
}

interface DocumentUploadSectionProps {
  contributionId: string;
  /** Conservé pour compatibilité d'appel ; la source de vérité est le stockage. */
  existingDocuments?: unknown[];
  onUploadComplete?: () => void;
}

export function DocumentUploadSection({ contributionId, onUploadComplete }: DocumentUploadSectionProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const folder = user ? `${user.id}/permit-documents/${contributionId}` : null;

  const loadDocuments = useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      console.error("list permit documents", error);
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setDocuments(
      (data ?? [])
        .filter((f) => f.id !== null)
        .map((f) => ({
          path: `${folder}/${f.name}`,
          name: (f.metadata?.originalName as string) ?? f.name,
          size: Number(f.metadata?.size ?? 0),
          uploadedAt: new Date(f.created_at ?? Date.now()),
        })),
    );
    setLoading(false);
  }, [folder]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!folder) {
      toast.error("Vous devez être connecté pour déposer un document");
      return;
    }

    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} dépasse 10 Mo`);
          continue;
        }
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
          metadata: { originalName: file.name },
        });
        if (error) {
          console.error("upload permit document", error);
          toast.error(`Échec de l'envoi de ${file.name}`);
          continue;
        }
        uploaded += 1;
      }

      if (uploaded > 0) {
        toast.success(`${uploaded} document(s) enregistré(s)`);
        await loadDocuments();
        onUploadComplete?.();
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveDocument = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error("remove permit document", error);
      toast.error("Impossible de supprimer ce document");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.path !== path));
    toast.success("Document supprimé");
  };

  const handleOpenDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      console.error("signed url permit document", error);
      toast.error("Lien du document indisponible");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["o", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Documents justificatifs</span>
          <Badge variant="outline">{documents.length} document(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading || !user}
          />
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary">
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {uploading ? "Envoi en cours..." : "Cliquez pour déposer des documents"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG (max 10 Mo)</p>
          </div>
        </div>

        {loadError && (
          <p className="text-xs text-destructive">
            Impossible de charger vos documents.{" "}
            <button type="button" className="underline" onClick={() => void loadDocuments()}>
              Réessayer
            </button>
          </p>
        )}

        {loading && !loadError && <p className="text-xs text-muted-foreground">Chargement des documents…</p>}

        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.path}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {format(doc.uploadedAt, "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Ouvrir ${doc.name}`}
                    onClick={() => void handleOpenDocument(doc.path)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Supprimer ${doc.name}`}
                    onClick={() => void handleRemoveDocument(doc.path)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-lg bg-muted/50 p-4">
          <h4 className="text-sm font-semibold">Documents généralement requis :</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Titre de propriété ou certificat d'enregistrement</li>
            <li>Plan de situation de la parcelle</li>
            <li>Plan architectural du projet</li>
            <li>Étude d'impact environnemental (si applicable)</li>
            <li>Autorisation du service d'urbanisme</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
