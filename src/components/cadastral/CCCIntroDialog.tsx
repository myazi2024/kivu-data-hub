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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Recherche cadastrale manuelle
          </DialogTitle>
          <p className="text-sm sm:text-base text-muted-foreground text-center mt-2 px-2">
            Contribuez à enrichir notre base de données en partageant les informations de votre parcelle
          </p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4">
          {/* Temps estimé */}
          <Card className="p-4 sm:p-6 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg sm:text-xl mb-2">Rapide et simple</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Remplissez le formulaire en seulement <strong className="text-foreground">3 à 5 minutes</strong> ! 
                  Nous avons conçu cette expérience pour être la plus fluide possible. Vous pourrez renseigner 
                  les informations de votre parcelle étape par étape, sans stress. Si vous avez besoin de faire 
                  une pause, pas de souci : vous pouvez sauvegarder votre progression et revenir plus tard.
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
                <h3 className="font-semibold text-lg sm:text-xl mb-2">Utilisez votre téléphone</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Le téléphone est l'appareil idéal pour cette recherche ! Pourquoi ? Parce qu'il vous permet de 
                  <strong className="text-foreground"> photographier directement vos documents</strong> (titre de propriété, 
                  certificat d'enregistrement, etc.) et de les ajouter instantanément au formulaire. C'est beaucoup plus 
                  rapide et pratique que de scanner ou transférer des fichiers depuis un ordinateur.
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
                <h3 className="font-semibold text-lg sm:text-xl mb-3">Ce que nous allons vous demander</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3 leading-relaxed">
                  Ne vous inquiétez pas, nous allons vous guider à chaque étape. Voici un aperçu des informations 
                  dont nous aurons besoin :
                </p>
                <div className="space-y-3 text-sm sm:text-base text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Informations générales :</strong> Les données de base de votre parcelle 
                      (numéro cadastral, superficie, type de terrain, etc.). Ce sont les informations que vous connaissez 
                      probablement déjà ou qui figurent sur vos documents.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Localisation :</strong> Où se trouve exactement votre parcelle ? 
                      Nous aurons besoin des coordonnées GPS si vous les avez, ainsi que des informations sur les limites 
                      cadastrales (parcelles voisines, points de repère, etc.).
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Historique :</strong> L'histoire de la parcelle. Qui en sont les 
                      propriétaires actuels et passés ? Y a-t-il des taxes foncières payées ? Des hypothèques ou crédits 
                      associés ? Ces informations nous aident à avoir une vision complète.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Obligations légales :</strong> Existe-t-il des contraintes 
                      particulières sur cette parcelle ? Des servitudes de passage, des zones protégées, ou d'autres 
                      obligations légales ? Même si vous n'en avez pas, nous devons le vérifier.
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
                <h3 className="font-semibold text-lg sm:text-xl mb-2">Vous n'êtes pas seul(e)</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3 leading-relaxed">
                  Nous comprenons que remplir un formulaire cadastral peut sembler intimidant. C'est pourquoi nous avons 
                  mis en place plusieurs outils pour vous accompagner à chaque étape :
                </p>
                <div className="space-y-3 text-sm sm:text-base text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <strong className="text-foreground">Bulles d'aide contextuelles :</strong> Survolez n'importe quel 
                      champ et vous verrez apparaître une explication claire de ce qui est attendu. Plus besoin de deviner !
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <strong className="text-foreground">Notifications intelligentes :</strong> Au fur et à mesure que vous 
                      remplissez le formulaire, nous vous enverrons des petits conseils et des rappels pour vous assurer 
                      que tout est bien complet.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex items-start gap-1.5">
                      <FaWhatsapp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">Chatbot WhatsApp flottant :</strong> Besoin d'aide immédiate ? 
                        Cliquez sur le petit bouton WhatsApp qui apparaîtra en bas à droite de votre écran. Un assistant 
                        virtuel est là pour répondre à toutes vos questions en temps réel, 24h/24.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Bouton de continuer */}
          <div className="pt-4 sm:pt-6">
            <Button 
              onClick={onContinue}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold group bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">Commencer le formulaire</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-3 px-2 leading-relaxed">
              Rassurez-vous : vos informations seront soigneusement vérifiées par notre équipe avant d'être 
              intégrées dans notre base de données. Nous nous engageons à maintenir des données fiables et de qualité.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
