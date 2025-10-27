import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, FileText, MessageCircle, CheckCircle, ArrowRight } from 'lucide-react';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Contribution Cadastrale Citoyenne
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Aidez-nous à enrichir la base de données cadastrale
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Temps estimé */}
          <Card className="p-6 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Temps moyen</h3>
                <p className="text-sm text-muted-foreground">
                  Le formulaire prend en moyenne <strong className="text-foreground">10-15 minutes</strong> à compléter. 
                  Vous pouvez le remplir en plusieurs étapes et sauvegarder votre progression.
                </p>
              </div>
            </div>
          </Card>

          {/* Type d'informations */}
          <Card className="p-6 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <FileText className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Informations requises</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Informations générales :</strong> Données de base de la parcelle</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Localisation :</strong> Coordonnées GPS et limites cadastrales</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Historique :</strong> Propriétaires, taxes, et hypothèques</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Obligations :</strong> Contraintes et servitudes légales</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-6 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Assistance pas-à-pas</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Nous vous accompagnons tout au long du processus avec :
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span><strong className="text-foreground">Bulles d'aide contextuelles</strong> sur chaque champ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span><strong className="text-foreground">Notifications intelligentes</strong> pour vous guider</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="flex items-center gap-1.5">
                      <FaWhatsapp className="h-4 w-4 text-green-500" />
                      <span><strong className="text-foreground">Chatbot WhatsApp flottant</strong> pour assistance immédiate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Bouton de continuer */}
          <div className="pt-4">
            <Button 
              onClick={onContinue}
              className="w-full h-14 text-base font-semibold group bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">Commencer le formulaire</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Vos informations seront vérifiées avant d'être intégrées dans la base de données
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCIntroDialog;
