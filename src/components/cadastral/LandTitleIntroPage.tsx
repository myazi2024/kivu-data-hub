import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building, 
  Clock, 
  Smartphone, 
  ClipboardList, 
  ArrowRight, 
  User, 
  MapPin, 
  Home, 
  FileText, 
  CreditCard, 
  AlertCircle, 
  Check,
  Shield
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LandTitleIntroPageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const LandTitleIntroPage: React.FC<LandTitleIntroPageProps> = ({ open, onOpenChange, onAccept }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const isMobile = useIsMobile();

  const handleAccept = () => {
    if (termsAccepted) {
      setTermsAccepted(false);
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[1100]" />
        <DialogContent className={`z-[1100] ${isMobile ? 'w-[95vw] max-w-[420px] max-h-[92vh] rounded-2xl' : 'max-w-2xl max-h-[90vh] rounded-2xl'} p-0 overflow-hidden`}>
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/10">
                <Building className="h-5 w-5 text-primary" />
              </div>
              Demande de Titre Foncier
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className={`${isMobile ? 'h-[calc(92vh-180px)]' : 'h-[calc(90vh-200px)]'}`}>
            <div className="p-6 space-y-5">
              {/* En-tête avec icône */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Obtenez votre certificat d'enregistrement officiel en RDC
                </p>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">10-15 min</p>
                      <p className="text-sm text-muted-foreground">Durée estimée</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <Smartphone className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">Mobile/PC</p>
                      <p className="text-sm text-muted-foreground">Compatible tout appareil</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Étapes du formulaire */}
              <Card className="border-2">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Informations à fournir</h3>
                      <p className="text-sm text-muted-foreground">5 étapes pour compléter votre demande</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">1</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Identité du demandeur</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Nom, prénom, téléphone et statut (propriétaire ou mandataire)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">2</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Localisation de la parcelle</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Province, ville/territoire, commune/collectivité, quartier et coordonnées GPS</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">3</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Mise en valeur</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Type de construction, nature, usage déclaré et nationalité</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">4</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Documents justificatifs</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Pièce d'identité et preuve de propriété (contrat de vente, attestation...)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-bold">5</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Frais de dossier</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Paiement par Mobile Money ou carte bancaire</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents requis */}
              <Card className="border-2 border-amber-300/50 bg-gradient-to-br from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-base font-semibold text-amber-800 dark:text-amber-300">Documents à préparer</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">Pièce d'identité valide (carte, passeport)</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">Preuve de propriété ou d'occupation</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">Dimensions exactes de la parcelle</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-white/60 dark:bg-white/5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">Coordonnées GPS (si disponibles)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Termes et conditions */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Conditions d'utilisation</h3>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                    <p>En soumettant cette demande de titre foncier, vous acceptez les conditions suivantes :</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Les informations fournies sont exactes et vérifiables</li>
                      <li>Vous êtes légalement autorisé à effectuer cette demande</li>
                      <li>Les documents soumis sont authentiques</li>
                      <li>Les frais de traitement ne sont pas remboursables une fois la demande soumise</li>
                      <li>Le traitement de la demande est soumis aux lois de la RDC</li>
                      <li>Toute fausse déclaration peut entraîner des poursuites judiciaires</li>
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl">
                    <Checkbox 
                      id="terms" 
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor="terms" 
                      className="text-sm text-foreground cursor-pointer leading-relaxed"
                    >
                      J'ai lu et j'accepte les <span className="font-semibold text-primary">conditions d'utilisation</span> et je certifie que les informations que je fournirai sont exactes.
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Bouton d'action fixe en bas */}
          <div className="p-4 border-t bg-background">
            <Button 
              onClick={handleAccept} 
              disabled={!termsAccepted}
              size="lg"
              className="w-full h-12 text-base rounded-xl gap-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              Commencer ma demande
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default LandTitleIntroPage;
