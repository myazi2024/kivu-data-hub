import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DeedVerificationPanelProps {
  parcelNumber: string;
  currentOwner: string;
  circonscriptionFonciere?: string | null;
}

interface VerificationResult {
  status: 'valid' | 'warning' | 'invalid';
  message: string;
  details: string[];
}

export const DeedVerificationPanel: React.FC<DeedVerificationPanelProps> = ({
  parcelNumber,
  currentOwner,
  circonscriptionFonciere
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [deedText, setDeedText] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setVerificationResult(null);
    }
  };

  const performVerification = async () => {
    setIsVerifying(true);
    
    // Simulation de vérification - En production, ceci ferait appel à un service d'analyse
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Logique de vérification basique
    const checks = [];
    let status: 'valid' | 'warning' | 'invalid' = 'valid';
    
    // Vérification du numéro de parcelle
    if (deedText.toLowerCase().includes(parcelNumber.toLowerCase())) {
      checks.push('✓ Numéro de parcelle confirmé dans l\'acte');
    } else {
      checks.push('⚠ Numéro de parcelle non trouvé dans l\'acte');
      status = 'warning';
    }
    
    // Vérification du propriétaire
    if (deedText.toLowerCase().includes(currentOwner.toLowerCase().split(' ')[0])) {
      checks.push('✓ Nom du propriétaire cohérent');
    } else {
      checks.push('⚠ Incohérence potentielle avec le propriétaire actuel');
      status = 'warning';
    }
    
    // Vérification de la circonscription
    if (circonscriptionFonciere && deedText.toLowerCase().includes(circonscriptionFonciere.toLowerCase())) {
      checks.push('✓ Circonscription foncière confirmée');
    } else if (circonscriptionFonciere) {
      checks.push('⚠ Circonscription foncière non mentionnée');
      status = 'warning';
    }
    
    const messages = {
      'valid': 'Cet acte semble conforme aux données cadastrales disponibles',
      'warning': 'Attention : incohérences détectées entre l\'acte et les données officielles',
      'invalid': 'Acte non conforme aux données cadastrales'
    };
    
    setVerificationResult({
      status,
      message: messages[status],
      details: checks
    });
    
    setIsVerifying(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'invalid':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'invalid':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4" />
          </div>
          Vérification d'Acte Foncier
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Analysez la conformité d'un acte lié à cette parcelle avant toute opération de mutation
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zone d'upload */}
        <div className="space-y-3">
          <Label htmlFor="deed-upload" className="text-sm font-medium">
            Document à vérifier
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="deed-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {uploadedFile && (
              <Badge variant="outline" className="text-xs">
                {uploadedFile.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Zone de texte alternative */}
        <div className="space-y-2">
          <Label htmlFor="deed-text" className="text-sm font-medium">
            Ou saisir le contenu de l'acte
          </Label>
          <Textarea
            id="deed-text"
            placeholder="Collez ici le contenu textuel de l'acte à vérifier..."
            value={deedText}
            onChange={(e) => setDeedText(e.target.value)}
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Bouton de vérification */}
        <Button
          onClick={performVerification}
          disabled={!uploadedFile && !deedText.trim() || isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Vérification en cours...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Vérifier la conformité
            </>
          )}
        </Button>

        {/* Résultat de la vérification */}
        {verificationResult && (
          <Alert className={`mt-4 ${
            verificationResult.status === 'valid' ? 'border-green-200 bg-green-50' :
            verificationResult.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start gap-3">
              {getStatusIcon(verificationResult.status)}
              <div className="flex-1">
                <AlertDescription className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{verificationResult.message}</span>
                    <Badge variant={getStatusBadge(verificationResult.status)} className="text-xs">
                      {verificationResult.status === 'valid' ? 'Conforme' :
                       verificationResult.status === 'warning' ? 'À vérifier' : 'Non conforme'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    {verificationResult.details.map((detail, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {detail}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Lien vers la circonscription */}
        {circonscriptionFonciere && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Pour validation officielle:
              </span>
              <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary hover:text-primary/80">
                <ExternalLink className="h-3 w-3 mr-1" />
                {circonscriptionFonciere}
              </Button>
            </div>
          </div>
        )}

        {/* Information sur le service */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Service de pré-analyse</p>
              <p>Cette vérification est indicative. Pour une validation juridique officielle, contactez la circonscription foncière compétente.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};