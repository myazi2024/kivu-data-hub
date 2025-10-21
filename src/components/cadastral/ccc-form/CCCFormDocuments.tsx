import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Image } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface CCCFormDocumentsProps {
  ownerDocFile: File | null;
  titleDocFiles: File[];
  onOwnerDocChange: (file: File | null) => void;
  onTitleDocAdd: (file: File) => void;
  onTitleDocRemove: (index: number) => void;
}

export const CCCFormDocuments: React.FC<CCCFormDocumentsProps> = ({
  ownerDocFile,
  titleDocFiles,
  onOwnerDocChange,
  onTitleDocAdd,
  onTitleDocRemove
}) => {
  const handleOwnerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOwnerDocChange(file);
    }
    e.target.value = '';
  };

  const handleTitleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onTitleDocAdd(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Documents justificatifs</h3>
      </div>

      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          Les documents augmentent la valeur de votre code CCC mais ne sont pas obligatoires.
          Formats acceptés: JPG, PNG, WEBP, PDF (max 5 MB par fichier)
        </AlertDescription>
      </Alert>

      {/* Owner Document */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Document du propriétaire
          </Label>
          <p className="text-xs text-muted-foreground">
            Carte d'identité, passeport, ou document officiel du propriétaire
          </p>

          {ownerDocFile ? (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-accent/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {ownerDocFile.type.startsWith('image/') ? (
                  <Image className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ownerDocFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(ownerDocFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOwnerDocChange(null)}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleOwnerFileChange}
                className="hidden"
                id="owner-doc-file"
              />
              <Label
                htmlFor="owner-doc-file"
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation min-h-[100px]"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-sm font-medium">Cliquez pour choisir un fichier</span>
                  <p className="text-xs text-muted-foreground mt-1">ou glissez-le ici</p>
                </div>
              </Label>
            </div>
          )}
        </div>
      </Card>

      {/* Title Documents */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Documents du titre de propriété
          </Label>
          <p className="text-xs text-muted-foreground">
            Certificat d'enregistrement, contrat de vente, bail, etc. (max 5 fichiers)
          </p>

          {titleDocFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {titleDocFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-accent/50">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onTitleDocRemove(index)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {titleDocFiles.length < 5 && (
            <div className="relative">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleTitleFileChange}
                className="hidden"
                id="title-doc-file"
              />
              <Label
                htmlFor="title-doc-file"
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation min-h-[100px]"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-sm font-medium">
                    {titleDocFiles.length > 0 ? 'Ajouter un autre fichier' : 'Cliquez pour choisir un fichier'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {titleDocFiles.length}/5 fichiers
                  </p>
                </div>
              </Label>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
