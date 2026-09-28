// ============= Full file contents =============

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, FileText, MessageCircle, CheckCircle, ArrowRight, Smartphone, MapPin, Building2, ClipboardList, Info } from 'lucide-react';
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
      <DialogContent className="flex flex-col w-[calc(100%-1rem)] max-w-[320px] max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999] sm:left-auto sm:right-0 sm:top-0 sm:translate-x-0 sm:translate-y-0 sm:h-dvh sm:max-h-none sm:w-[368px] sm:max-w-none sm:rounded-none sm:rounded-l-2xl sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right">
        <div className="px-4 pt-8 pb-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-center text-primary">
              Enregistrement d'une parcelle
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Veuillez lire attentivement avant de continuer
            </p>
          </DialogHeader>
        </div>

        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 space-y-2.5 px-3 pb-28 overflow-y-auto"
        >
          {/* Temps estimé */}
          <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Durée estimée</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Le formulaire prend environ <strong className="text-foreground">15 à 20 minutes</strong> à compléter. Votre progression est sauvegardée automatiquement : vous pouvez fermer et reprendre plus tard (brouillons conservés 30 jours, 5 brouillons maximum).
                </p>
              </div>
            </div>
          </Card>

          {/* Documents et informations à préparer */}
          <Card className="p-3 rounded-xl border-accent/20 bg-accent/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Documents et informations à préparer</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Titre foncier :</strong> type de titre détenu, son numéro de référence et scans ou photos (jusqu'à 5 fichiers — JPEG, PNG, WebP ou PDF)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Propriétaires :</strong> pour chacun, nom, coordonnées et pièce d'identité (photo ou PDF)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Adresse :</strong> circonscription foncière, province, territoire ou commune, quartier, avenue ou rue</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Parcelle :</strong> longueurs des côtés en mètres (pour le tracé sur la carte), côté(s) donnant sur la route, servitudes éventuelles</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Historique :</strong> noms des propriétaires précédents dans l'ordre</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Obligations :</strong> impôts déjà payés (foncier, impôt sur le revenu locatif) avec leurs années, hypothèques existantes</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Location :</strong> mise en location éventuelle (loyer mensuel, année de début) et valeur de revente estimée</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Constructions */}
          <Card className="p-3 rounded-xl border-warning/20 bg-warning/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-warning/20 rounded-lg flex-shrink-0">
                <Building2 className="h-4 w-4 text-warning-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Constructions</h3>
                <p className="text-sm text-foreground/80 mb-1.5">
                  Si le terrain comporte des constructions, préparez pour chacune :
                </p>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>type et nature, matériaux, usage réel, standing</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>année de construction, état (achevée ou en cours), hauteur et nombre d'étages</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>permis de construire et leur numéro, si disponibles</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Terrain vide : la section « Construction » ne s'applique pas.
                </p>
              </div>
            </div>
          </Card>

          {/* Ce qui se passe après la soumission */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <ClipboardList className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Après la soumission</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span>Vos données sont <strong className="text-foreground">vérifiées par notre équipe</strong> avant publication</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span>Le suivi se fait depuis <strong className="text-foreground">votre espace utilisateur</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Appareil recommandé */}
          <Card className="p-3 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Appareil recommandé</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Un <strong className="text-foreground">téléphone mobile</strong> facilite la prise de photos des documents. Un <strong className="text-foreground">ordinateur</strong> est plus confortable pour tracer la parcelle sur la carte.
                </p>
              </div>
            </div>
          </Card>

          {/* Conseils pratiques */}
          <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Bon à savoir</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  Le préfixe <strong className="text-foreground">SU ou SR</strong> de votre parcelle est déduit automatiquement de la circonscription foncière choisie : inutile de le saisir vous-même.
                </p>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-2">Assistance disponible</h3>
                <div className="space-y-1.5 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span><strong className="text-foreground">Bulles d'aide</strong> contextuelles sur chaque champ</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span><strong className="text-foreground">Notifications</strong> et conseils personnalisés</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <FaWhatsapp className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Support WhatsApp</strong> disponible 24h/24</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="mt-auto bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2 sm:rounded-bl-2xl">
          <Button
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full h-10 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              hasScrolledToBottom
                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            <span className="mr-1.5">Commencer l'enregistrement</span>
            <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>

          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">
              Veuillez défiler vers le bas ou patienter 2 secondes
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Info className="h-3 w-3 flex-shrink-0" />
            Toutes les informations sont vérifiées par notre équipe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
