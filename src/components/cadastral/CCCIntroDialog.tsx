import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, FileText, MessageCircle, CheckCircle, ArrowRight, Smartphone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

interface CCCIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  parcelNumber: string;
}

const CCCIntroDialog = ({ open, onOpenChange, onContinue }: CCCIntroDialogProps) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Activer le bouton après 2 secondes même sans scroll
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setHasScrolledToBottom(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 rounded-2xl z-[9999]">
        <div className="p-6 sm:p-8 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Recherche cadastrale manuelle
            </DialogTitle>
            <p className="text-base sm:text-lg text-muted-foreground text-center mt-2 px-2">
              Avant de commencer, lisez ceci
            </p>
          </DialogHeader>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-4 sm:space-y-6 py-4 px-6 sm:px-8 pb-32 overflow-y-auto max-h-[calc(90vh-200px)]"
        >
          {/* Temps estimé */}
          <Card className="p-4 sm:p-6 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg sm:text-xl mb-2">Rapide et simple</h3>
                <p className="text-base leading-relaxed text-foreground/80">
                  <strong className="text-foreground">3 à 5 minutes</strong> suffisent pour remplir ce formulaire. 
                  Remplissez étape par étape et sauvegardez votre progression à tout moment.
                </p>
              </div>
            </div>
          </Card>

          {/* Appareil recommandé */}
          <Card className="p-4 sm:p-6 border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg sm:text-xl mb-2">C'est pratique avec un téléphone</h3>
                <p className="text-base leading-relaxed text-foreground/80">
                  Vous allez ajouter directement quelques documents. Le téléphone vous permet de <strong className="text-foreground">les photographier et de les ajouter facilement</strong>.
                </p>
              </div>
            </div>
          </Card>

          {/* Type d'informations */}
          <Card className="p-4 sm:p-6 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-accent/20 rounded-lg flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg sm:text-xl mb-3">Informations demandées</h3>
                <div className="space-y-2 text-base text-foreground/80">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Données de base :</strong> Numéro cadastral, superficie, type de terrain
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Localisation :</strong> Mesures de chaque côté de la parcelle, coordonnées GPS de chaque coin
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Historique :</strong> Propriétaires précédents
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Obligations :</strong> Paiement des taxes foncières, hypothèques éventuelles
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-4 sm:p-6 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg sm:text-xl mb-2">Aide disponible</h3>
                <div className="space-y-2 text-base text-foreground/80">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <strong className="text-foreground">Bulles d'aide :</strong> Survolez chaque champ pour voir les explications
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <strong className="text-foreground">Notifications :</strong> Conseils et rappels pendant le remplissage
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex items-start gap-1.5">
                      <FaWhatsapp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">WhatsApp 24/7 :</strong> Cliquez sur le bouton flottant pour une aide immédiate
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Bouton flottant fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-4 sm:p-6 space-y-3">
          <Button 
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full h-14 text-lg font-semibold group relative overflow-hidden transition-all duration-500 shadow-lg ${
              hasScrolledToBottom 
                ? 'bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]' 
                : 'bg-gradient-to-r from-muted via-muted to-muted cursor-not-allowed opacity-60'
            }`}
          >
            {hasScrolledToBottom && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            )}
            <span className="mr-2 relative z-10">Passer au formulaire</span>
            <ArrowRight className={`h-5 w-5 relative z-10 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              Faites défiler jusqu'en bas pour continuer (ou attendez 2 secondes)
            </p>
          )}
          
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Vos informations seront vérifiées par notre équipe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
