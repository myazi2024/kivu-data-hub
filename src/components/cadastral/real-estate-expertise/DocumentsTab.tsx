import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Camera, Image, Upload, X, CheckCircle2 } from 'lucide-react';
import SectionHelpPopover from '../SectionHelpPopover';

export interface DocumentsTabProps {
  parcelDocsInputRef: React.RefObject<HTMLInputElement>;
  constructionImagesInputRef: React.RefObject<HTMLInputElement>;
  constructionGalleryInputRef: React.RefObject<HTMLInputElement>;
  parcelDocuments: File[];
  onParcelDocSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveParcelDoc: (index: number) => void;
  constructionImages: File[];
  constructionImageUrls: string[];
  onConstructionImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveConstructionImage: (index: number) => void;
  additionalNotes: string;
  setAdditionalNotes: (value: string) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({
  parcelDocsInputRef,
  constructionImagesInputRef,
  constructionGalleryInputRef,
  parcelDocuments,
  onParcelDocSelect,
  onRemoveParcelDoc,
  constructionImages,
  constructionImageUrls,
  onConstructionImageSelect,
  onRemoveConstructionImage,
  additionalNotes,
  setAdditionalNotes,
}) => (
  <>
    {/* Documents parcelle */}
    <Card className="border rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          Documents de la parcelle
          <SectionHelpPopover
            title="Documents de la parcelle"
            description="Joignez les documents juridiques liés à la parcelle : titre foncier, certificat d'enregistrement, PV de bornage. Ces documents accéléreront le processus d'expertise."
          />
        </h4>
        <p className="text-xs text-muted-foreground">
          Titre foncier, certificat d'enregistrement, PV de bornage, attestation de propriété...
        </p>

        <input
          ref={parcelDocsInputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          onChange={onParcelDocSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => parcelDocsInputRef.current?.click()}
          className="w-full h-10 text-sm rounded-xl border-2 border-dashed"
        >
          <Upload className="h-4 w-4 mr-2" />
          Documents parcelle (PDF, images)
        </Button>

        {parcelDocuments.length > 0 && (
          <div className="space-y-2">
            {parcelDocuments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveParcelDoc(index)}
                  className="h-7 w-7 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Images construction */}
    <Card className="border rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Camera className="h-4 w-4 text-green-600" />
          Photos de la construction
          <SectionHelpPopover
            title="Photos de la construction"
            description="Ajoutez des photos récentes de votre bien (façade, intérieur, cuisine, chambres, jardin). Plus vous fournissez de photos, plus l'expert pourra préparer sa visite efficacement."
          />
        </h4>
        <p className="text-xs text-muted-foreground">
          Façade, intérieur, cuisine, chambres, salles de bain, jardin, terrasse...
        </p>

        <input
          ref={constructionImagesInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={onConstructionImageSelect}
          className="hidden"
        />
        <input
          ref={constructionGalleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onConstructionImageSelect}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => constructionImagesInputRef.current?.click()}
            className="h-10 text-xs sm:text-sm rounded-xl border-2 border-dashed"
          >
            <Camera className="h-4 w-4 mr-1.5 flex-shrink-0" />
            Prendre photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => constructionGalleryInputRef.current?.click()}
            className="h-10 text-xs sm:text-sm rounded-xl border-2 border-dashed"
          >
            <Image className="h-4 w-4 mr-1.5 flex-shrink-0" />
            Galerie
          </Button>
        </div>

        {constructionImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {constructionImages.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={constructionImageUrls[index] || ''}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onRemoveConstructionImage(index)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Notes additionnelles */}
    <Card className="border rounded-xl">
      <CardContent className="p-3 space-y-3">
        <h4 className="text-sm font-semibold">Notes additionnelles</h4>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Autres informations pertinentes : servitudes, litiges, potentiel de développement, travaux récents, historique du bien..."
          className="min-h-[100px] text-sm rounded-xl border-2"
        />
      </CardContent>
    </Card>

    <Alert className="rounded-xl bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-sm text-green-800 dark:text-green-200">
        Plus vous fournissez d'informations et de photos, plus l'expertise sera précise et rapide !
      </AlertDescription>
    </Alert>
  </>
);

export default DocumentsTab;
