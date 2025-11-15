import { useState } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  url?: string;
}

interface DocumentUploadSectionProps {
  contributionId: string;
  existingDocuments?: Document[];
  onUploadComplete?: () => void;
}

export function DocumentUploadSection({
  contributionId,
  existingDocuments = [],
  onUploadComplete,
}: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<Document[]>(existingDocuments);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // TODO: Implémenter l'upload vers Supabase Storage
      const newDocuments: Document[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
      }));

      setDocuments([...documents, ...newDocuments]);
      toast.success(`${files.length} document(s) téléchargé(s) avec succès`);
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erreur lors du téléchargement des documents");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== docId));
    toast.success("Document supprimé");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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
        {/* Zone de téléchargement */}
        <div className="relative">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {uploading ? "Téléchargement en cours..." : "Cliquez pour télécharger des documents"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, DOCX, JPG, PNG (max 10 MB)
            </p>
          </div>
        </div>

        {/* Liste des documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {format(doc.uploadedAt, "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveDocument(doc.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documents requis */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-semibold">Documents généralement requis :</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
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
