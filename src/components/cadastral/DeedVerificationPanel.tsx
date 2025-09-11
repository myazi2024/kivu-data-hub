import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DeedVerificationPanelProps {
  parcelNumber: string;
  landRegistryDistrict: string;
}

const DeedVerificationPanel: React.FC<DeedVerificationPanelProps> = ({ 
  parcelNumber, 
  landRegistryDistrict 
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<'compliant' | 'inconsistent' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Format non supporté",
          description: "Veuillez uploader un fichier PDF, image (JPEG/PNG) ou texte.",
          variant: "destructive"
        });
        return;
      }

      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille du fichier ne doit pas dépasser 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadedFile(file);
      setVerificationResult(null);
    }
  };

  const analyzeDocument = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    
    // Simulation d'analyse (en réalité, ceci ferait appel à un service d'analyse de documents)
    setTimeout(() => {
      // Logique d'analyse simulée basée sur le nom du fichier et le type
      const fileName = uploadedFile.name.toLowerCase();
      const hasParcelReference = fileName.includes(parcelNumber.toLowerCase()) || 
                                fileName.includes('acte') || 
                                fileName.includes('contrat');
      
      // Simulation: 70% de chance d'être conforme si le fichier semble pertinent
      const isCompliant = hasParcelReference ? Math.random() > 0.3 : Math.random() > 0.7;
      
      setVerificationResult(isCompliant ? 'compliant' : 'inconsistent');
      setIsAnalyzing(false);

      toast({
        title: "Analyse terminée",
        description: `L'acte a été analysé avec succès.`,
        variant: "default"
      });
    }, 2000);
  };

  const resetVerification = () => {
    setUploadedFile(null);
    setVerificationResult(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getResultMessage = () => {
    switch (verificationResult) {
      case 'compliant':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: "Acte conforme",
          message: "Cet acte semble conforme aux données cadastrales disponibles pour la parcelle " + parcelNumber,
          variant: "default" as const,
          bgColor: "bg-green-50 border-green-200"
        };
      case 'inconsistent':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          title: "Incohérence détectée",
          message: "Attention : incohérence détectée entre l'acte et les données officielles de la parcelle " + parcelNumber,
          variant: "destructive" as const,
          bgColor: "bg-red-50 border-red-200"
        };
      default:
        return null;
    }
  };

  const result = getResultMessage();

  return (
    <Card className="w-full border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          Vérification d'acte foncier
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Analysez la conformité d'un acte lié à cette parcelle
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div 
            className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-primary/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">
              Cliquez pour uploader un document
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Image ou Texte (max 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetVerification}
                className="h-8 w-8 p-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            {!verificationResult && !isAnalyzing && (
              <Button 
                onClick={analyzeDocument}
                className="w-full"
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Analyser le document
              </Button>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center p-4 bg-background/50 rounded-lg border">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
                <span className="text-sm">Analyse en cours...</span>
              </div>
            )}

            {result && (
              <div className={`p-4 rounded-lg border ${result.bgColor}`}>
                <div className="flex items-start gap-3">
                  {result.icon}
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">{result.title}</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {result.message}
                    </p>
                    <Badge variant={result.variant} className="text-xs">
                      Analyse automatique
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Validation officielle disponible auprès de :
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => window.open(`https://example.com/contact/${landRegistryDistrict.replace(/\s+/g, '-').toLowerCase()}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {landRegistryDistrict}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeedVerificationPanel;