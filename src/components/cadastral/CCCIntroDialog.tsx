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
      <DialogContent className="max-w-[360px] sm:max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999]">
        <div className="px-4 pt-4 pb-2">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Contribution CCC
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              À lire avant de commencer
            </p>
          </DialogHeader>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2.5 py-2 px-4 pb-28 overflow-y-auto max-h-[calc(85vh-160px)]"
        >
          {/* Temps estimé */}
          <Card className="p-3 border-primary/20 bg-primary/5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">3-5 minutes</h3>
                <p className="text-xs leading-relaxed text-foreground/80">
                  Remplissez étape par étape, sauvegarde automatique.
                </p>
              </div>
            </div>
          </Card>

          {/* Appareil recommandé */}
          <Card className="p-3 border-green-500/20 bg-green-500/5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Téléphone recommandé</h3>
                <p className="text-xs leading-relaxed text-foreground/80">
                  Pour photographier et ajouter vos documents facilement.
                </p>
              </div>
            </div>
          </Card>

          {/* Type d'informations */}
          <Card className="p-3 border-accent/20 bg-accent/5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1.5">Infos demandées</h3>
                <div className="space-y-1 text-xs text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span><strong>Base :</strong> N° cadastral, superficie</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span><strong>Lieu :</strong> Côtés, GPS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span><strong>Passé :</strong> Anciens propriétaires</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span><strong>Taxes :</strong> Foncier, hypothèques</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-3 border-blue-500/20 bg-blue-500/5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1.5">Aide disponible</h3>
                <div className="space-y-1 text-xs text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span>Bulles d'aide sur chaque champ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span>Conseils pendant le remplissage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FaWhatsapp className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>WhatsApp 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2">
          <Button 
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full h-11 text-sm font-semibold group relative overflow-hidden transition-all duration-300 rounded-xl shadow-md ${
              hasScrolledToBottom 
                ? 'bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]' 
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            {hasScrolledToBottom && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            )}
            <span className="mr-1.5 relative z-10">Commencer</span>
            <ArrowRight className={`h-4 w-4 relative z-10 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-0.5' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-[10px] text-center text-muted-foreground animate-pulse">
              Défiler ou attendre 2s
            </p>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Vos infos seront vérifiées par notre équipe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
